# Legacy Runtime Reference

`party-operations-monolith.js` is the pre-refactor runtime that used to live at `scripts/party-operations.js`.

It is intentionally outside `scripts/` so the active Foundry module, lint target, and release package do not load or ship the old 2 MB compatibility layer. The import paths inside that file are preserved from its original location and are for reference while features are rebuilt into `scripts/runtime`, `scripts/core`, `scripts/features`, and `scripts/apps`.

The active rebuild shell exposes the source index in `scripts/runtime/rebuild/legacy-source-map.js`. Use those line ranges to mine one feature at a time instead of reintroducing the monolith into `scripts/`.

Generated per-slice reference files live in `legacy/slices/`. Refresh them with:

```powershell
node scripts/refactor/split-legacy-runtime.mjs
```
