# Party Operations Logics Journal

This journal consolidates prior review themes into a current-state fix ledger. Status values here reflect the repository as of 2026-03-14, not the older review snapshots.

## Current Synthesis

### A. Architecture Scale Risk

`scripts/party-operations.js` remains the dominant risk surface at roughly 41.5k lines. The runtime entrypoint is now modular, but the behavioral core is still too centralized.

### B. Source-Of-Truth Ambiguity

The repository still contains unshipped TypeScript sidecar files alongside the JavaScript runtime. Without an explicit policy, contributors can still change the wrong tree.

### C. Release Channel Hygiene Risk

The manifest is currently on a test channel version (`2.2.7-test.12`). That is valid for preview work, but it should not be published as a stable release asset.

### D. Validation Coverage Gap

The old “syntax only” finding is stale. The repository now has a broad deterministic Node-based check suite, but governance and PR enforcement were incomplete before this journal update.

### E. UX/Latency Regression Surface

Rest and march flows now have focused validation scripts, but player-facing responsiveness remains a high-regression area because much of the interaction orchestration still routes through the monolith.

## Status Ledger

### P0 — Governance And Safety

#### J-001: Define canonical source strategy (JS vs TS)

- Goal: eliminate source ambiguity and drift.
- Status: DONE
- Notes: `ARCHITECTURE.md` now declares JavaScript as the canonical shipped runtime and limits TypeScript to non-authoritative sidecar status until a formal migration happens.

#### J-002: Add release/version guardrails

- Goal: prevent accidental test-channel production releases.
- Status: DONE
- Notes: `scripts/validate-governance.mjs`, `scripts/release.ps1`, and `.github/workflows/release.yml` now enforce stable semver for tagged releases and block `-test` releases from the release path.

#### J-003: Baseline CI validation

- Goal: make core checks automatic and non-optional.
- Status: DONE
- Notes: `.github/workflows/validate.yml` now runs `npm run check` on pull requests targeting `main`.

### P1 — Maintainability And Regression Reduction

#### J-004: Extract low-coupling modules from monolith

- Candidates: launcher UI, settings wiring, socket/event handling, utility formatting.
- Status: PARTIAL
- Notes: `scripts/module.js`, `scripts/bootstrap`, and `scripts/hooks` already existed, the operations-journal domain now has dedicated modules for view state/context (`scripts/features/operations-journal.js`), folder/write services (`scripts/features/operations-journal-service.js`), and settings reads (`scripts/features/operations-journal-settings.js`), and typed config access now lives in `scripts/core/config-access.js` with deterministic coverage. The monolith is still too large, but extraction is now active rather than just planned.

#### J-005: Build first deterministic test suite

- Targets: loot generation math, config normalization, parser/serializer invariants.
- Status: DONE
- Notes: the repository currently includes 35 deterministic `scripts/test-*.mjs` checks, including loot, runtime, navigation, rest, and march coverage, and PR CI now runs them.

#### J-006: Regression tests for previously fixed UX lag paths

- Targets: rest/march player mutation flows and delegated input handlers.
- Status: PARTIAL
- Notes: focused rest and march validation scripts exist, but the lag-prone event and rerender paths inside `scripts/party-operations.js` are still broader than the current harness.

### P2 — Product Execution With Reliability

#### J-007: GM Loot Roller implementation track

- Goal: preview/reroll/apply flow with source registry integration.
- Status: PARTIAL
- Notes: the codebase already contains loot preview, source configuration, claim publishing, archive sorting, and multiple loot-focused tests. Final roadmap completion depends on feature audit rather than greenfield build-out.

#### J-008: Operations records repository (journals/compendiums)

- Goal: persist key operations outputs in structured records.
- Status: PARTIAL
- Notes: operations journal structures and loot claim archive flows exist, but a single unified records lifecycle is not yet documented or fully bounded.

#### J-009: Injury sync/archive lifecycle hardening

- Goal: complete player-readable journal sync and archive transitions.
- Status: PARTIAL
- Notes: injury tracking, calendar sync, reminders, and journal visibility controls exist, but the full create/update/recover/archive lifecycle still lives in the monolith and needs narrower ownership.

## Suggested Next PR Order

1. Extract one low-coupling monolith slice with existing tests around it.
2. Extend lag-path regression coverage for delegated handlers and stale-client refresh behavior.
3. Audit loot and records features against the roadmap so partial items can be split into concrete “finish” tasks instead of broad themes.

## Journal Meta

- 2026-03-14: Rebased the journal on the current repository state, added architecture policy, added PR validation, added release guardrails, extracted the operations-journal helper/service/settings modules from the monolith, and moved typed config access into `scripts/core/config-access.js`.
