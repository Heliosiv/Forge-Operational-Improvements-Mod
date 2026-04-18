# Party Operations Refactor + Performance Upgrade Plan

Branch baseline: `werks/refactor-performance-plan`
Date: 2026-03-19
Scope: whole-project runtime with priority on `scripts/` and extraction from `scripts/party-operations.js`.

## 1) Goals

- Improve runtime responsiveness without behavior regressions.
- Reduce coupling and extraction friction from the legacy monolith.
- Preserve architecture policy: JS runtime is authoritative, `scripts/module.js` remains thin.
- Establish measurable performance baselines and phase-gated success criteria.

## 2) Current Hotspots (Prioritized)

1. **Monolith coupling (`scripts/party-operations.js`)**  
   Very large mixed-responsibility module remains central to startup, state, UI, and I/O concerns.
2. **Heavy runtime import path (`scripts/bootstrap/runtime.js`)**  
   Lazy bootstrap still leads quickly to heavy graph load.
3. **Ready lifecycle fan-out (`scripts/core/lifecycle.js`)**  
   Warmups and scheduled tasks can stack at startup.
4. **UI hook churn (`scripts/hooks/ui-hooks.js`)**  
   Frequent render hooks repeatedly invoke launcher ensure paths.
5. **Runtime refresh cascades (`scripts/hooks/runtime-hooks.js`)**  
   High fan-in events increase cross-feature churn.
6. **Rerender-by-default actions (`scripts/features/page-action-helpers.js` + feature UIs)**  
   Full rerenders for common interactions increase p95 latency.
7. **Audio live monitor polling (`scripts/features/audio-ui.js`)**  
   Aggressive interval + repeated DOM queries.
8. **Audio scan I/O cost (`scripts/party-operations.js` scan path)**  
   Full tree scans + full catalog writes are expensive on large libraries.
9. **Socket dependency surface (`scripts/core/socket-route-deps.js`)**  
   Oversized dependency object limits modular tuning.
10. **Test coupling to monolith internals (`scripts/test-*.mjs`)**  
   Source-text coupling slows safe extractions.

## 3) Execution Roadmap

## Phase 0 (Days 1-3): Baseline + Instrumentation

Deliverables:
- Add timing probes at:
  - `scripts/module.js`
  - `scripts/core/lifecycle.js`
  - `scripts/hooks/ui-hooks.js`
  - `scripts/hooks/runtime-hooks.js`
  - `scripts/features/page-action-helpers.js`
  - audio scan path in `scripts/party-operations.js`
- Add counters for:
  - rerender triggers per action,
  - refresh/cascade frequency,
  - duplicate launcher ensures,
  - scan duration and asset counts.
- Write baseline report under `reports/` with median + p95 values.

Exit criteria:
- Baseline metrics captured from representative GM workflows.
- No behavioral regressions and `npm run check` passes.

## Phase 1 (Week 1-2): Quick Wins (Low Risk / High Return)

Deliverables:
- Add idempotent/debounce guard in `scripts/hooks/ui-hooks.js` for frequent render events.
- Coalesce refresh bursts in `scripts/hooks/runtime-hooks.js` with short scheduler window.
- Reduce `rerenderAlways` usage for top traffic actions (audio + loot first).
- Convert audio live monitor from fixed aggressive polling to adaptive/event-assisted polling.

Targets:
- 20-35% reduction in p95 rerender count for high-traffic actions.
- 10-20% reduction in hook-driven duplicate launcher work.

Exit criteria:
- Feature parity verified by focused suites and smoke run.
- KPI delta report shows improvement against Phase 0 baseline.

## Phase 2 (Week 3-6): Structural Performance Refactors

Deliverables:
- Split `scripts/core/socket-route-deps.js` into domain builders:
  - rest/march,
  - loot,
  - merchants,
  - downtime,
  - shared utility layer.
- Refactor audio scan pipeline to incremental cache strategy (root/source/hash), chunked writes, and bounded refresh.
- Batch template validation and expensive checks with aggregated error reporting.

Targets:
- 15-25% faster ready stabilization.
- Reduced I/O spikes on large audio libraries.
- Lower cross-domain coupling in socket route handling.

Exit criteria:
- Compatibility tests pass.
- No increased error rate in runtime hook flows.

## Phase 3 (6+ Weeks): Monolith Decomposition Program

Deliverables:
- Progressive vertical extraction from `scripts/party-operations.js` into bounded JS modules.
- Keep compatibility adapter in monolith while domains migrate.
- Move tests from source-text parsing toward public module/API behavior assertions.

Targets:
- Meaningful LOC and responsibility reduction in monolith.
- Faster and safer domain-level changes with less regression blast radius.

Exit criteria:
- Major domains operate through extracted modules.
- Monolith role reduced to compatibility glue where required.

## 4) Workstream Branching Model

Root planning branch (created):
- `werks/refactor-performance-plan`

Execution branches (off root):
- `werks/perf-phase0-instrumentation`
- `werks/perf-phase1-render-hook-throttles`
- `werks/perf-phase2-audio-io-pipeline`
- `werks/refactor-phase2-socket-domain-split`
- `werks/refactor-phase3-monolith-extraction`
- `werks/tests-api-alignment`

PR sequencing:
1. Instrumentation first.
2. Low-risk throttles/coalescing second.
3. Structural splits third.
4. Large extraction last, behind proven metrics and stable tests.

## 5) KPI Framework

Primary KPIs:
- Startup: init-to-ready completion time.
- Render: median/p95 rerender count per user action.
- State churn: refreshOpenApps calls per minute and coalescing ratio.
- I/O: scan duration, files/sec, write latency.
- Stability: error count in hook/socket flows during stress actions.

Success thresholds (overall program):
- 20-35% p95 render overhead reduction in targeted pages.
- 15-25% faster ready stabilization.
- Lower duplicate refresh/launcher events under event-heavy play.

## 6) Risk Map + Controls

Highest risk:
- Socket route behavior parity.
- Event ordering/timing changes from coalescing.
- Cache invalidation for audio scanning.

Controls:
- Keep feature flags for high-risk path changes.
- Land per-domain refactors in small, test-backed PRs.
- Preserve fallback rerender paths while introducing granular updates.
- Require before/after KPI report for each phase PR.

## 7) Definition of Done Per Phase

Each phase is done only when:
- Functional tests pass (`npm run check`).
- Baseline KPIs are compared and documented.
- Regression notes and rollback strategy are included in PR summary.
- Architecture policy remains intact (`module.json` still points to `scripts/module.js` and no TS runtime drift).

---

Implementation note: begin with Phase 0 instrumentation immediately, because it de-risks every subsequent decision and prevents refactoring blind spots.
