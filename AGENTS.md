# Agent Instructions

## Project Shape

This is a Foundry VTT module. Runtime code loads through `module.json` -> `scripts/module.js`; `scripts/party-operations.js` is still the large compatibility/runtime layer. Keep feature work scoped and prefer the existing services, test files, templates, and styles over new framework choices.

## Automatic Tool Use

Run these tools automatically when they apply:

- After any JavaScript change, run `npm run lint` and the closest focused `npm run check:*` script for the touched feature.
- After touching `module.json`, templates, styles, pack paths, or release metadata, run `npm run check:baseline`.
- Before release/package work, run `npm run check` and then `npm run prepare:release`.
- For every deployment/release, update `README.md` so `Current Build` matches `module.json` and the install/update path stays pointed at the GitHub release manifest for `Forge-Operational-Improvements-Mod`, not a manually shared local zip.
- For every tagged GitHub release, publish the same version to the official Foundry package listing with `npm run publish:foundry` so Forge can detect the update. Do not treat GitHub release assets alone as deployed for Forge; if `FOUNDRY_PACKAGE_RELEASE_TOKEN` is missing locally or as a GitHub repository secret, stop and report that Forge cannot recognize the release until the token is added.
- For formatting-supported files you touched (`.js`, `.mjs`, `.cjs`, `.json`, `.md`, `.css`), run `npm run format:check -- <touched-files>`. Use `npm run format -- <touched-files>` to format only those explicit files.
- Do not run Prettier on Foundry `.hbs` templates unless a future template-aware formatter is added; this repo uses Handlebars partials and inline blocks that Prettier rejects.
- If performance is the topic, do not rely only on `npm run check` timing. Run direct `node scripts/test-*.mjs` commands multiple times around the feature path being measured.
- For player-facing rest, march, operations, or gather delivery changes, include the focused checks that cover the path: `check:player-ui-overrides`, `check:player-hub-actions`, `check:rest-feature`, `check:march-feature`, `check:operations-player-handlers`, `check:socket-routes`, `check:socket-route-deps`, and gather-specific `check:downtime-submission-ui` / `check:bootstrap-lifecycle` when gather prompts are involved.
- For test-channel package bumps, use `powershell -NoProfile -ExecutionPolicy Bypass -File scripts\bump-test-version.ps1`, then format `module.json` if needed before rerunning `npm run format:check -- module.json`.
- When release packaging is the goal, inspect `release/module.json`, `release/module.zip`, `release/module.zip.sha256.txt`, and `tar -tf release\module.zip` after `npm run prepare:release`; release outputs are intentionally ignored, so verify the artifact rather than expecting every output in `git status`.

## Installed Tooling

- ESLint is configured by `eslint.config.js` for ES modules, Node scripts, browser APIs, and common Foundry globals.
- Prettier is configured by `.prettierrc.json` and `.prettierignore` for JSON, Markdown, JavaScript, CSS, and Handlebars.
- The existing bespoke validation remains the authority for module behavior: `scripts/run-checks.mjs`, `scripts/validate-module.mjs`, `scripts/validate-governance.mjs`, and the focused `scripts/test-*.mjs` files.
- Legacy runtime slices are regenerated with `node scripts/refactor/split-legacy-runtime.mjs`; if `legacy/party-operations-monolith.js` line ranges or `scripts/runtime/rebuild/legacy-source-map.js` change, rerun that script and `npm run check:legacy-source-map`.

## Editing Rules

- Do not overwrite unrelated dirty work. Check `git status --short` before edits and preserve user changes.
- Use small, line-verified patches in `scripts/party-operations.js`; it is large and prone to patch drift.
- Avoid deprecated Foundry APIs, duplicate hook registration, and inline runtime business logic in `scripts/module.js`.
- Keep UI templates in `templates/`, styling in `styles/`, and logic in `scripts/features`, `scripts/core`, or the existing nearby module.
