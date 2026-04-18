# Performance Refactor Phase Status

Date: 2026-03-20
Current branch: `werks/perf-phase0-instrumentation`

## Phase 0 — Baseline + Instrumentation

Status: **Complete**

Completed:
- Added reusable performance tracker with state + summary support (`median`, `p95`) via `scripts/core/perf.js`.
- Instrumented module entry, lifecycle, UI hooks, runtime hooks, page action rerenders, and audio scan paths.
- Exposed runtime metrics through module API (`getPerfState`, `getPerfSummary`).
- Added baseline capture scaffold: `reports/perf-phase0-baseline.md`.
- Added/updated focused tests covering new instrumentation paths.

## Phase 1 — Quick Wins

Status: **Substantially Complete**

Completed:
- Launcher churn guard added in `scripts/hooks/ui-hooks.js` with cooldown + skipped-request metrics.
- Existing refresh coalescing path instrumented in `scripts/core/app-refresh.js` (coalesced requests, batch size, render targets).
- Initial rerender reduction applied to high-traffic audio actions by switching selected handlers to `rerenderIfTruthy`.

Remaining (optional hardening pass):
- Extend change-aware rerender reductions to additional high-traffic non-audio handlers where no-op detection is robust.

## Phase 2 — Structural Refactors

Status: **Started**

Completed:
- Split oversized socket route dependency composition into domain builders in `scripts/core/socket-route-deps.js`:
  - rest,
  - march,
  - settings/folder ownership,
  - operations/SOP,
  - downtime.
- Decomposed monolithic route chain in `scripts/core/socket-routes.js` into focused routing helpers:
  - player-facing socket routes,
  - GM mutation socket routes,
  - requester-gated route dispatch map.
- Continued socket modularization by extracting reusable route helper implementations into `scripts/core/socket-route-handlers.js`.
- Added commerce route dependency builder in `scripts/core/socket-route-deps.js` for merchant/loot route passthrough wiring.
- Extracted socket dependency domain-builder implementations into `scripts/core/socket-route-domain-builders.js`, reducing `scripts/core/socket-route-deps.js` to composition/wiring.
- Extracted GM requester route map construction into `scripts/core/socket-gm-requester-routes.js`, reducing inline dispatch coupling inside `scripts/core/socket-route-handlers.js`.
- Added audio scan pipeline optimizations in `scripts/party-operations.js`:
  - in-memory short-TTL scan file cache with bounded entry pruning,
  - cache hit/miss instrumentation,
  - no-op settings write suppression when catalog signature is unchanged,
  - upload-driven scans now force a fresh browse pass (`forceRescan: true`).
- Extracted audio scan cache mechanics from monolith into `scripts/features/audio-library-scan-cache.js`, with `scripts/party-operations.js` now consuming the module.
- Extracted audio catalog signature generation from monolith into `scripts/features/audio-library-catalog-signature.js`, with `scripts/party-operations.js` now consuming the module.

Remaining:
- Continue decomposition of remaining high-coupling surfaces (`socket-route-deps` consumers and adjacent route handlers).
- Evaluate follow-up audio scan enhancements (optional chunked persistence and background index build) once perf baseline deltas are captured.

## Phase 3 — Monolith Decomposition

Status: **Started**

Completed:
- Extracted audio library/mix UI selection actions from `scripts/party-operations.js` into `scripts/features/audio-library-ui-selection-actions.js`.
- Kept monolith function signatures intact by delegating to the extracted action module.
- Added focused regression coverage in `scripts/test-audio-library-ui-selection-actions.mjs`.
- Extracted audio library filter mutator actions from `scripts/party-operations.js` into `scripts/features/audio-library-ui-filter-actions.js`.
- Kept filter-clearing and filter-field monolith function signatures intact by delegating to the extracted module.
- Added focused regression coverage in `scripts/test-audio-library-ui-filter-actions.mjs`.
- Extracted audio library draft mutator actions from `scripts/party-operations.js` into `scripts/features/audio-library-ui-draft-actions.js`.
- Kept draft-field and draft assignment monolith function signatures intact by delegating to the extracted module (scan, picker, and upload flows).
- Added focused regression coverage in `scripts/test-audio-library-ui-draft-actions.mjs`.
- Extracted audio library folder-picker and local-upload orchestration from `scripts/party-operations.js` into `scripts/features/audio-library-ui-picker-upload-actions.js`.
- Kept picker and upload monolith function signatures intact by delegating to the extracted module.
- Added focused regression coverage in `scripts/test-audio-library-ui-picker-upload-actions.mjs`.
- Extracted responsive app-window sizing and remembered-position persistence from `scripts/party-operations.js` into `scripts/core/window-position-manager.js`.
- Kept monolith-facing window helper call sites intact by delegating to the extracted manager.
- Added focused regression coverage in `scripts/test-app-window-position-manager.mjs`.
- Extracted downtime UI session-draft storage helpers from `scripts/party-operations.js` into `scripts/features/downtime-ui-draft-storage.js`.
- Kept monolith-facing downtime draft read/write/sync helpers intact by delegating to the extracted storage module.
- Added focused regression coverage in `scripts/test-downtime-ui-draft-storage.mjs`.
- Extracted shared note draft-cache and SOP cached-note helpers from `scripts/party-operations.js` into `scripts/features/note-draft-cache.js`.
- Kept monolith-facing rest/march/SOP note cache helpers intact by delegating to the extracted cache module.
- Added focused regression coverage in `scripts/test-note-draft-cache.mjs`.
- Extracted GM quick weather draft persistence from `scripts/party-operations.js` into `scripts/features/gm-quick-weather-draft.js`.
- Kept monolith-facing weather draft storage helpers intact by delegating to the extracted module.
- Added focused regression coverage in `scripts/test-gm-quick-weather-draft.mjs`.
- Extracted loot preview draft + result persistence from `scripts/party-operations.js` into `scripts/features/loot-preview-draft-storage.js`.
- Kept monolith-facing loot preview draft/result helpers intact by delegating to the extracted module.
- Added focused regression coverage in `scripts/test-loot-preview-draft-storage.mjs`.
- Extracted reputation builder draft, filter state, and note-log selection persistence from `scripts/party-operations.js` into `scripts/features/reputation-draft-storage.js`.
- Kept all monolith-facing reputation draft/filter/selection helpers intact by delegating to the extracted storage module.
- Added focused regression coverage in `scripts/test-reputation-draft-storage.mjs` (passing).
- Extracted weather preset catalog builders, visibility helpers, DAE normalizers, and FX resolution from `scripts/party-operations.js` into `scripts/features/weather-preset-helpers.js`.
- Kept all monolith-facing weather preset call sites intact via `createWeatherPresetHelpers` factory delegation; `ensureWeatherState` (retained in monolith) uses the delegated bindings transparently.
- Added focused regression coverage in `scripts/test-weather-preset-helpers.mjs` (64 assertions, passing).
- Extracted non-party sync keyword and active-sync-tab session-state helpers from `scripts/party-operations.js` into `scripts/features/sync-effects-session-state.js`.
- Kept monolith-facing sync-effects helper signatures intact via `createSyncEffectsSessionState` delegation.
- Added focused regression coverage in `scripts/test-sync-effects-session-state.mjs`.

Remaining:
- Progressive domain extraction from `scripts/party-operations.js` into bounded modules (audio scan + signature utilities started).
- Shift tests from monolith-source assumptions toward module/API behavior assertions.

## Suggested Next Branches

1. `werks/refactor-phase2-socket-domain-split` (continue route modularization)
2. `werks/perf-phase2-audio-io-pipeline` (audio scan/cache/write optimization)
3. `werks/refactor-phase3-monolith-extraction` (long-run extraction program)
