# Legacy Runtime Slices

These files are generated from `legacy/party-operations-monolith.js` by `node scripts/refactor/split-legacy-runtime.mjs`.

They are reference-only text files. Do not import them from active runtime code.

Temporary tests that still need legacy source text should use `scripts/test-utils/legacy-runtime-source.mjs` with explicit slice IDs.

- legacy/slices/01-bootstrap-shared.txt: Bootstrap, Imports, Shared Constants (1-1960)
- legacy/slices/02-gather-resources.txt: Gather Resources And Upkeep State (1961-3273)
- legacy/slices/03-integration-effects.txt: Integration, Environment, And Active Effects (3274-5188)
- legacy/slices/04-navigation-notes-drafts.txt: Navigation, Reputation, Notes, And Drafts (5189-7401)
- legacy/slices/05-application-shells.txt: Application Shells And Page Adapters (7402-10810)
- legacy/slices/06-state-defaults-audio.txt: Default State And Audio Runtime (10811-14030)
- legacy/slices/07-loot-source-registry.txt: Loot Source Registry (14031-16204)
- legacy/slices/08-loot-engine.txt: Loot Generation Engine (16205-22954)
- legacy/slices/09-operations-ledger-loot-claims.txt: Operations Ledger And Loot Claim State (22955-25727)
- legacy/slices/10-merchants.txt: Merchant Domain And Workflows (25728-33097)
- legacy/slices/11-downtime-operations-actions.txt: Downtime And Operations Actions (33098-41498)
- legacy/slices/12-loot-runtime-actions.txt: Loot Runtime Actions (41499-44576)
- legacy/slices/13-weather-upkeep-autopilot.txt: Weather, Upkeep, And Session Autopilot (44577-45607)
- legacy/slices/14-injury-recovery.txt: Injury Recovery (45608-46897)
- legacy/slices/15-rest-march-runtime.txt: Rest Watch And March Runtime (46898-51039)
- legacy/slices/16-api-socket-bootstrap.txt: API, Socket Handler, And Runtime Bootstrap (51040-51669)
