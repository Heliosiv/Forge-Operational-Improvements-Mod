# Party Operations Architecture

## Canonical Runtime Policy

The canonical runtime for this module is the JavaScript tree that ships in releases.

- `module.json` must load `scripts/module.js` as the only entrypoint.
- Runtime behavior changes must land in the JavaScript runtime path used by packaging.
- TypeScript files currently in `scripts/*.ts` are not release artifacts and are not an authoritative runtime source.

If a future migration makes TypeScript canonical, that change needs its own decision record and build pipeline update first. Until then, contributors should assume JavaScript is the source of truth.

## Runtime Shape

The module currently uses a thin entrypoint and lazy bootstrap around a legacy monolith.

1. `scripts/module.js` registers Foundry lifecycle hooks only.
2. `scripts/hooks/*.js` wires `init` and `ready` registration.
3. `scripts/bootstrap/runtime.js` lazy-loads the legacy runtime.
4. `scripts/party-operations.js` still contains the majority of business logic.
5. Extracted code should continue moving into bounded modules under `scripts/core`, `scripts/features`, `scripts/hooks`, and `scripts/bootstrap`.

This means `scripts/party-operations.js` is still behaviorally authoritative for many features, but it is no longer the manifest entrypoint. New work should avoid adding more direct startup logic there when a smaller module can own it.

## Refactor Rules

- Keep `scripts/module.js` free of feature logic.
- Register hooks once, from dedicated hook modules.
- Prefer extracting pure logic into `scripts/features` or narrower folders before touching UI code.
- Treat `scripts/party-operations.js` as a compatibility adapter and extraction source, not as the preferred home for new work.
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

1. Keep extracting low-coupling domains from `scripts/party-operations.js`.
2. Expand deterministic test coverage around extracted logic before UI-heavy refactors.
3. Remove or formalize the TypeScript sidecar tree once a real migration decision is made.
