# Best Practices for Foundry Modules on The Forge

This checklist is tailored to `party-operations` and focuses on stable packaging, compatibility targeting, and runtime safety.

## 1) Manifest and Versioning

- Keep `module.json` at module root in every release artifact.
- Use strict semantic versions and bump for every shipped change.
- Set explicit compatibility ranges:
  - `minimum`: lowest core you support
  - `verified`: latest core actually tested
  - `maximum`: highest core you intentionally allow
- Ensure all paths in `esmodules`, `styles`, and `templates` are valid and case-accurate.

Current state in this module:
- `id`: `party-operations`
- `version`: `2.0.1`
- `compatibility`: `minimum: 12`, `verified: 12`, `maximum: 13`

## 2) Project Layout and Packaging

Recommended release contents:

- `module.json`
- `scripts/`
- `styles/`
- `templates/`
- optional: `lang/`, `packs/`, icons/assets used by the module

For Forge custom/private deployment:
- Build/package locally.
- Upload ZIP with Forge Import Wizard.
- Do not rely on server-side build workflows.

## 3) Runtime Lifecycle Discipline

- Register settings and APIs in `Hooks.once("init")`.
- Perform runtime wiring in `Hooks.once("ready")`.
- Avoid heavy initialization before `ready`.
- Use delegated events in rendered ApplicationV2 roots.

Current state in this module:
- Uses `Hooks.once("init")` for settings registration.
- Uses `Hooks.once("ready")` for runtime startup.
- Uses delegated event handling in app `_onRender`.

## 4) UI/CSS Robustness

- Scope all module CSS under `.party-operations`.
- Keep one intentional scroll container per app body.
- Use semantic controls (`button`, `input`, `select`, `textarea`).
- Respect reduced motion with `prefers-reduced-motion`.
- Avoid global style leakage.

Current state in this module:
- CSS is scoped and organized by shell/components/utilities/media queries.
- Templates now follow `header` + `po-body` + `footer` structure.

## 5) Forge Performance Guardrails

- Use dynamic import for heavy optional features.
- Debounce/throttle bursty handlers.
- Keep long lists compact and avoid unnecessary rerenders.
- Avoid recursive asset browsing patterns where possible.

## 6) Security and Permissions

- Gate privileged operations with Foundry permission checks.
- Use Foundry settings scopes (`world`, `client`, and user-scoped where applicable).
- Treat actor/document writes as privileged operations and validate authority before mutation.

## 7) Release Workflow (Practical)

Automated option in this repo: `.github/workflows/release.yml`.

Per release:
1. Update `module.json` version and compatibility fields.
2. Validate app render paths and console for runtime errors.
3. Zip release contents with `module.json` at ZIP root.
4. Publish artifact (GitHub release or private distribution).
5. Install/update through Foundry/Forge and smoke test in target core versions.

## 8) Multi-Version Strategy

If supporting multiple Foundry majors:
- Maintain separate release lines (e.g., `v12/v13` and `v14`).
- Keep compatibility ranges strict per line.
- Do not publish a single manifest claiming untested future majors.
