# Party Operations Architecture

## Canonical Runtime Policy

The canonical runtime for this module is the JavaScript tree that ships in releases.

- `module.json` must load `scripts/module.js` as the only entrypoint.
- Runtime behavior changes must land in the JavaScript runtime path used by packaging.
- TypeScript files currently in `scripts/*.ts` are not release artifacts and are not an authoritative runtime source.

If a future migration makes TypeScript canonical, that change needs its own decision record and build pipeline update first. Until then, contributors should assume JavaScript is the source of truth.

## Runtime Shape

The module is in a deliberate modular rebuild state.

1. `scripts/module.js` registers Foundry lifecycle hooks only.
2. `scripts/hooks/*.js` wires `init` and `ready` registration.
3. `scripts/bootstrap/runtime.js` lazy-loads `scripts/party-operations.js`.
4. `scripts/party-operations.js` is now a small compatibility facade that re-exports `scripts/runtime/index.js`.
5. `scripts/runtime/*` owns the stripped rebuild shell: API registration, app stubs, lifecycle config, navigation stubs, rebuild maps, settings stubs, socket stubs, and runtime state.
6. `legacy/party-operations-monolith.js` is a reference copy of the old runtime. It is intentionally outside `scripts/` so it is not loaded, linted, or packaged as active module code.
7. `legacy/slices/*` contains generated text slices from the monolith, aligned with `scripts/runtime/rebuild/legacy-source-map.js`.

Most feature behavior is intentionally disabled in this shell. Rebuild work should move behavior into bounded modules under `scripts/core`, `scripts/features`, `scripts/apps`, `scripts/hooks`, and `scripts/runtime`, then retire the matching legacy reference sections.

## Refactor Rules

- Keep `scripts/module.js` free of feature logic.
- Register hooks once, from dedicated hook modules.
- Prefer extracting pure logic into `scripts/features` or narrower folders before touching UI code.
- Treat `scripts/party-operations.js` as a compatibility adapter only.
- Treat `legacy/party-operations-monolith.js` as read-only reference material until a feature is rebuilt.
- Regenerate legacy slices with `node scripts/refactor/split-legacy-runtime.mjs` after changing the source map.
- Keep temporary legacy source-text tests slice-scoped through `scripts/test-utils/legacy-runtime-source.mjs`.
- Do not reference `.ts` files from `module.json`, release packaging, or runtime imports.

## Release And Validation Policy

- Stable release versions use `x.y.z`.
- Test channel versions use `x.y.z-test.n`.
- Tagged releases must be stable and match `v<module.json version>`.
- Pull requests must pass repository validation before merge.

Current enforcement lives in:

- `npm run check:baseline`
- `npm run check`
- `.github/workflows/validate.yml`
- `.github/workflows/release.yml`
- `scripts/validate-governance.mjs`

## Near-Term Architecture Priorities

1. Rebuild one disabled feature at a time from the feature manifest in `scripts/runtime/rebuild/feature-manifest.js`.
2. Use `scripts/runtime/rebuild/legacy-source-map.js` to locate the old line range before extracting a feature.
3. Move rebuilt behavior into bounded modules with focused checks before reconnecting UI.
4. Replace slice-scoped legacy source-text tests as features move into active modules.
5. Remove or formalize the TypeScript sidecar tree once a real migration decision is made.
