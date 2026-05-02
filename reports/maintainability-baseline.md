# Maintainability Baseline

Captured: 2026-05-02

This baseline was captured before the maintainability-first implementation batch that extracted the loot item override editor and loot source-selection behavior.

## Repository State

- Working tree: clean before edits (`git status --short` produced no output).
- Runtime entrypoint: `module.json` loads `scripts/module.js`.
- Module version at capture: `2.2.27`.
- Release was not requested, so no `module.json` bump, README Current Build update, package build, tag, or Forge publication is part of this batch.

## Size Baseline

- `scripts/module.js`: 23 lines.
- `scripts/party-operations.js`: 51082 lines.
- `legacy/party-operations-monolith.js`: 48709 lines.
- `styles/party-operations.css`: 9504 lines.
- `styles/po-controls.css`: 607 lines.
- `styles/po-gm-shell.css`: 1342 lines.

## Check Baseline

- `npm run check:baseline`: passed.
- `npm run lint`: 0 errors, 273 warnings.
- Existing warning debt is treated as baseline debt; touched or extracted files should avoid adding warnings.

## Refactor Tracking

- Infrastructure surfaces are tracked in `scripts/runtime/rebuild/feature-manifest.js` with owner paths and focused checks.
- Domain surfaces remain partial while `scripts/party-operations.js` still owns compatibility dispatch and active runtime code.
- Extracted feature slices should add focused module tests and monolith guard assertions before the broad source-text tests are retired.
