# Party Operations

Party Operations is a Foundry VTT module for running the table-facing logistics around travel, rest, party planning, loot, downtime, merchants, environment pressure, and shared GM audio from one workspace.

## Current Build

The current repository manifest version is `2.2.15`.

## What This Module Covers

- Rest Watch planning with slot assignments, notes, visibility controls, snapshots, and player-facing sync.
- Marching Order planning for party travel and formation management.
- Operations pages for planning, reputation, base pressure, merchants, downtime, recovery, loot, and party health modifiers.
- GM quick tools for environment, downtime, merchants, audio, loot, factions, global modifiers, and session automation.
- Shared launcher support for scene controls, floating canvas access, and sidebar access.
- A built item compendium pack used by the loot and operations flows.

## Install Or Update

- Manifest: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/latest/download/module.json`
- Download: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/latest/download/module.zip`

Install or update from the GitHub release manifest above. In Foundry or Forge, use the manifest URL for `Forge-Operational-Improvements-Mod`; do not install from a local zip unless you are testing an unpublished build. Enable the module in your world, then open Party Operations from the scene controls or launcher.

## Quick Start

1. Open `Rest Watch` as GM.
2. Use `Fill from Active Party`, adjust visibility, and save a snapshot.
3. Open `Operations` and assign roles, SOPs, and resource baselines.
4. Use the GM quick actions to open Environment, Downtime, Merchants, Audio, or Loot when needed.
5. If you want player-facing access, configure the launcher and Player Hub options in the Settings Hub.

## GM Audio Workspace

The GM Audio page is part of the current build line.

- Scan a host-served audio folder into a track catalog.
- Filter by name, tags, kind, and usage.
- Preview, hide, and restore tracks from a curated library view.
- Build mix presets, queue tracks, and run shared playback for connected users.
- Use the same filters inside the mix track browser to narrow suggested or all-track results.

## Documentation

- Usage guide: [HOW_TO_USE.md](./HOW_TO_USE.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Fix journal: [LOGICS_JOURNAL.md](./LOGICS_JOURNAL.md)
- Build notes and fixes: [BUG_FIXES.md](./BUG_FIXES.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)

## External Developer Tools

This workspace is wired to an external tooling repo at `E:\Computer Upgrades`.

Available VS Code tasks in `.vscode/tasks.json`:

- `external-tools:setup` installs or refreshes the external Python and shell tooling.
- `external-tools:verify` checks the installed toolchain.
- `external-tools:langgraph-starter` runs the minimal LangGraph smoke test.
- `external-tools:repo-health` runs a LangGraph-based repository health summary against this workspace.
- `external-tools:test-summary` runs a LangGraph-based failing-check triage workflow against this workspace.
- `external-tools:release-readiness` runs a LangGraph-based release-readiness preflight against this workspace.
- `external-tools:workflow-history` summarizes persisted workflow history and compares against prior stronger baselines.
- `external-tools:workflow-history-test-summary` summarizes persisted history for the test-summary workflow.
- `external-tools:agent-mock` runs the multi-provider agent in mock mode.
- `external-tools:agent-copilot` runs the agent with Copilot-compatible settings.
- `external-tools:agent-codex` runs the agent with OpenAI-compatible Codex settings.
- `external-tools:agent-azure` runs the agent with Azure OpenAI settings.

The external tool repo currently provides `memori`, `pydantic`, `sqlalchemy`, `langgraph`, `langchain-openai`, `python-dotenv`, `tmux`, and the `werks` wrapper.

Provider-backed agent runs load environment variables from `E:\Computer Upgrades\.env`. Use the mock task if provider credentials are not configured yet.

The repository health workflow uses LangGraph to inspect git state, package metadata, module version, and validation entry points, then emits a concise developer summary.

The test-summary workflow runs a validation command, detects failing checks from the output, and compares the result with the previous recorded run.

The release-readiness workflow inspects versioning, packaging tasks, release artifacts, and git state before zip creation, then compares the current assessment with the previous run.

For stable versions, release-readiness now applies stricter blocking rules by default for dirty worktrees and missing packaging artifacts.

## Official Package Listing

Forge Bazaar uses the official Foundry package listing, not only the GitHub `latest` release asset. After publishing a GitHub release, submit the same version to Foundry's Package Release API so Forge can see the update:

```powershell
$env:FOUNDRY_PACKAGE_RELEASE_TOKEN = "<package release token>"
npm run publish:foundry:dry-run
npm run publish:foundry
```

The Foundry package version entry should use the version-specific manifest URL, for example `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/download/v2.2.13/module.json`.

## Repository Release Flow

Every deployment must update this README before publishing:

- Update `Current Build` to match the `module.json` release version.
- Keep the install/update instructions pointed at the GitHub release manifest for `Forge-Operational-Improvements-Mod`.
- Treat `release/module.zip` as a generated release artifact. The live install/update path is the GitHub release asset, not a manually shared local zip.

Validate the module before publishing:

```powershell
npm run check
```

Run baseline governance and manifest checks only:

```powershell
npm run check:baseline
```

Create a release with the helper script:

```powershell
./scripts/release.ps1 -Version 2.2.9 -Message "Release"
```

GitHub Actions runs full validation on pull requests to `main`. Tagged stable releases matching `v*.*.*` rebuild `release/module.zip` and publish the GitHub Release assets used by the manifest URLs above. Pushes to `main` still validate and package, but they no longer publish test-channel artifacts as the stable release.
