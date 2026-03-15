# Changelog

## 2026-03-08 to 2026-03-14

Generated from local git history on 2026-03-14 and the current working tree.

### Summary

- Reviewed 36 local commits in the last 7 days, including 34 non-merge commits.
- The committed release train moved from Forge release automation into `v2.2.4-test.9` through `v2.2.6`.
- The committed weekly diff touched 154 files with 38,246 insertions and 9,313 deletions.

### Added

- Automated Forge release publishing and expanded local release packaging and validation workflows.
- New modular runtime pieces for bootstrap, lifecycle, socket routing, template loading, settings access, config access, and module API surfaces.
- New GM-facing operations features, including factions UI, operations journal modules, gather history view, and calendar bridge support.
- March doctrine flow with dedicated doctrine logic, updated marching-order templates, and wider rest-watch coverage.
- Variable treasure rolling for gems and art, curated art item import tooling, and stronger loot preview, stacking, cohesion, and selection logic.
- Shared audio store and preset management improvements, with more explicit playback persistence coverage.
- Broad automated test coverage across bootstrap, runtime, audio, loot, merchant, journal, march, rest, settings, and socket modules.

### Changed

- Continued the breakup of the legacy monolith in [`scripts/party-operations.js`](/E:/DND Stuff/Modules/party-operations/scripts/party-operations.js) into focused bootstrap, core, hook, and feature modules.
- Refactored editor workflows, GM shell navigation, merchant UI state, navigation state, and launcher startup behavior to match the modular runtime.
- Reworked major templates and styling for merchants, loot, audio, environment, marching order, and rest-watch surfaces.
- Normalized release/build tooling around package creation, manifest syncing, and export cleanup.

### Fixed

- Restored missing core modules after the refactor hotfix cycle.
- Restored audio and builder UI surfaces after `v2.2.4-test.10`.
- Fixed marching-order light-grid layout issues.
- Fixed launcher startup regressions introduced during the larger runtime refactor.

### Release Line

- 2026-03-08: automated Forge release publishing landed.
- 2026-03-09: `v2.2.4-test.9` through `v2.2.4-test.16`, including hotfixes for missing core modules and restored audio/builder UI.
- 2026-03-11: rapid `v2.2.4-test.17` through `v2.2.4-test.29` iteration focused on merchant state, loot, environment, styling, and runtime stabilization.
- 2026-03-12: `v2.2.6` shipped with loot-budget and curated-art updates.
- 2026-03-13 to 2026-03-14: refactor-heavy commits expanded GM operations, modular runtime access, governance checks, march doctrine, rest-watch coverage, and startup fixes.

### Uncommitted Local Work

- Current local edits appear to be focused on downtime phase 1 and published downtime handling across [`scripts/features/downtime-ui.js`](/E:/DND Stuff/Modules/party-operations/scripts/features/downtime-ui.js), [`scripts/features/rest-feature.js`](/E:/DND Stuff/Modules/party-operations/scripts/features/rest-feature.js), [`templates/gm-downtime.hbs`](/E:/DND Stuff/Modules/party-operations/templates/gm-downtime.hbs), [`templates/rest-watch.hbs`](/E:/DND Stuff/Modules/party-operations/templates/rest-watch.hbs), and related marching-order styling.
- New untracked local modules add downtime publication rules and phase 1 service/data extraction in [`scripts/core/downtime-policy.js`](/E:/DND Stuff/Modules/party-operations/scripts/core/downtime-policy.js), [`scripts/features/downtime-phase1-data.js`](/E:/DND Stuff/Modules/party-operations/scripts/features/downtime-phase1-data.js), and [`scripts/features/downtime-phase1-service.js`](/E:/DND Stuff/Modules/party-operations/scripts/features/downtime-phase1-service.js).
- New untracked local tests cover downtime policy and phase 1 resolution logic, including [`scripts/test-downtime-policy.mjs`](/E:/DND Stuff/Modules/party-operations/scripts/test-downtime-policy.mjs) and [`scripts/test-downtime-phase1-service.mjs`](/E:/DND Stuff/Modules/party-operations/scripts/test-downtime-phase1-service.mjs).
