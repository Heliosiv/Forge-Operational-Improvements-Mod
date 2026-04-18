# Phase 0 Performance Baseline

Branch: werks/perf-phase0-instrumentation
Date:
Collector:
World/System:

## Collection Steps

1. Launch the world with Party Operations enabled.
2. Exercise the target flows for 3-5 minutes:
   - open Rest Watch, Marching Order, Operations, and GM pages;
   - trigger launcher re-renders by opening sidebar tabs and scene controls;
   - if GM, open Audio and run one library scan on a representative folder.
3. In the browser console, capture the summarized metrics:

```js
game.partyOperations.getPerfSummary()
```

4. Optional raw snapshot for deeper debugging:

```js
game.partyOperations.getPerfState()
```

5. Paste key values below and save the filled report back into `reports/`.

## Startup

| Metric | Count | Avg | Median | P95 | Max | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| module-entry.hooks.init |  |  |  |  |  |  |
| module-entry.hooks.ready |  |  |  |  |  |  |
| lifecycle-init.run-init |  |  |  |  |  |  |
| lifecycle-ready.run-ready |  |  |  |  |  |  |

## Launcher + Render Churn

| Metric | Count | Avg | Median | P95 | Max | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| ui-hooks.launcher.ensure-request |  |  |  |  |  |  |
| ui-hooks.launcher.ensure-skipped |  |  |  |  |  |  |
| lifecycle-ready.launcher.ensure |  |  |  |  |  |  |
| page-actions.action-invoked |  |  |  |  |  |  |
| page-actions.page-main-rerender |  |  |  |  |  |  |

## Refresh + Integration Churn

| Metric | Count | Avg | Median | P95 | Max | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| runtime-hooks.refresh-open-apps |  |  |  |  |  |  |
| runtime-hooks.integration-sync |  |  |  |  |  |  |
| runtime-hooks.audio-playback-resync |  |  |  |  |  |  |

## Audio I/O

| Metric | Count | Avg | Median | P95 | Max | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| party-operations-runtime.audio-library-scan |  |  |  |  |  |  |
| party-operations-runtime.audio-library-scan-files |  |  |  |  |  |  |
| party-operations-runtime.audio-library-scan-items |  |  |  |  |  |  |
| lifecycle-ready.audio.metadata-warmup |  |  |  |  |  |  |

## Observations

-
-
-

## Next Actions

1. Compare launcher request vs skipped counts to judge whether the cooldown is materially reducing duplicate churn.
2. Identify the highest p95 startup or scan metric and target that path in the next branch.
3. Record a second copy of this report after the next Phase 1 change for before/after comparison.