# Security Review: Party Operations

## Executive Summary

I did **not** find evidence that this module contains a backdoor or obvious code intended to regain access to your computer.

The runtime module entrypoint is the browser-side Foundry loader in [module.json](D:/DND%20Stuff/Modules/party-operations/module.json#L19) and [scripts/module.js](D:/DND%20Stuff/Modules/party-operations/scripts/module.js), and my scan did not find runtime use of OS-process APIs such as `child_process`, Electron shell access, or direct filesystem access in the loaded client code.

I **did** find security issues inside the module's in-game trust model:

1. High: socket messages trust a caller-supplied `userId`, which allows a connected player to spoof another player inside Party Operations actions.
2. Medium: "Shared GM Permissions" is enabled by default, which grants all players GM-level Party Operations controls unless you turn it off.
3. Low: the stylesheet imports Google Fonts at runtime, which leaks client metadata to an external service and adds an avoidable third-party dependency.

## Findings

### SBP-001 High: Socket authorization trusts self-declared `userId`

Impact: a malicious connected player can spoof another player's identity in Party Operations socket messages and trigger unauthorized world-state changes such as rest/march mutations, loot claims, barter/trade flows, gather requests, downtime actions, and shared-note updates.

Evidence:

- [scripts/core/socket-registry.js](D:/DND%20Stuff/Modules/party-operations/scripts/core/socket-registry.js#L9) registers a raw socket handler and forwards only the message payload.
- [scripts/core/socket-registry.js](D:/DND%20Stuff/Modules/party-operations/scripts/core/socket-registry.js#L19) emits arbitrary message objects without attaching trusted sender metadata.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L1916) resolves the requester solely from `message.userId`.
- [scripts/features/operations-player-handlers.js](D:/DND%20Stuff/Modules/party-operations/scripts/features/operations-player-handlers.js#L14) uses that resolved requester as the authorization basis for activity updates.
- [scripts/features/operations-player-handlers.js](D:/DND%20Stuff/Modules/party-operations/scripts/features/operations-player-handlers.js#L160) does the same for SOP note writes.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L33136) trusts `message.userId` for gather requests.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L43732) trusts `message.userId` for merchant barter requests.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L43780) trusts `message.userId` for merchant trade requests.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L43826) trusts `message.userId` for loot claims.

Why this matters:

Any player can open the Foundry browser console and emit on the module socket channel with another player's `userId`. Because the GM-side handler trusts the payload's `userId`, authorization checks are evaluated against the impersonated user rather than the actual sender.

Recommended fix:

- Replace the raw trust-on-payload socket pattern with a transport that gives the GM a trusted caller identity.
- In Foundry terms, the safest path is to move these privileged player-to-GM operations behind a socket layer that binds the message to the real sender instead of trusting `message.userId`.
- Until that is fixed, treat all player-originating socket mutations as forgeable.

False-positive notes:

- This is not remote code execution on the host machine.
- This is an in-world authorization flaw affecting Foundry actions and stored state.

### SBP-002 Medium: Shared GM Permissions defaults to enabled

Impact: by default, non-GM users inherit GM-level Party Operations controls, which widens the blast radius of a compromised or malicious player account.

Evidence:

- [scripts/core/settings-features.js](D:/DND%20Stuff/Modules/party-operations/scripts/core/settings-features.js#L274) registers `Shared GM Permissions (Module)`.
- [scripts/core/settings-features.js](D:/DND%20Stuff/Modules/party-operations/scripts/core/settings-features.js#L280) sets its default to `true`.
- [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L1934) uses that setting in `canAccessAllPlayerOps`.

Recommended fix:

- Change the default to `false`.
- Make worlds opt into shared GM-style controls explicitly.

False-positive notes:

- This appears intentional, not hidden.
- It is still unsafe-by-default from a least-privilege standpoint.

### SBP-003 Low: Runtime CSS imports Google Fonts from an external origin

Impact: clients loading the module contact Google Fonts, which leaks IP/user-agent metadata and introduces a third-party availability/supply-chain dependency.

Evidence:

- [styles/party-operations.css](D:/DND%20Stuff/Modules/party-operations/styles/party-operations.css#L1) imports `https://fonts.googleapis.com/...`.

Recommended fix:

- Vendor the font files into the module, or switch to a local/system font stack.

False-positive notes:

- This is not code execution by itself.
- It is a privacy and dependency-hardening issue.

## Notes On What I Did Not Find

- I did not find runtime use of `child_process`, `exec`, `spawn`, Electron shell APIs, or similar host-level process-launching code in the Foundry-loaded module files.
- The filesystem-oriented scripts such as [scripts/ensure-loot-midi-dae.js](D:/DND%20Stuff/Modules/party-operations/scripts/ensure-loot-midi-dae.js#L1) are developer tooling scripts, not runtime module code loaded by Foundry.
- The `new AsyncFunction(...)` use in [scripts/party-operations.js](D:/DND%20Stuff/Modules/party-operations/scripts/party-operations.js#L43055) is used only as syntax validation during diagnostics, not to execute received code.

