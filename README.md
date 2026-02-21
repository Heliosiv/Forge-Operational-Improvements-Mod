# Forge-Operational-Improvements-Mod

## Update GitHub Repository

### Standard update workflow

From the module root:

```powershell
git status
git pull origin main
git add -A
git commit -m "Describe your changes"
git push origin main
```

### Release workflow (Forge/GitHub latest assets)

Use the release script to bump version, commit, tag, and push in one step:

```powershell
./scripts/release.ps1 -Version 2.1.0 -Message "Release"
```

What it does:
- Updates `module.json` version
- Creates a commit
- Creates tag `vX.Y.Z`
- Pushes `main` and tag to GitHub

### Export procedure (local DIST only)

Use this when you want a local test/export package without publishing to GitHub:

1. Build/export into `dist/` (or `dist/premium/`) locally.
2. Do **not** run `git add -A` for export-only steps.
3. Stage only intended source/manifest/docs files with explicit paths.

Recommended safe staging command:

```powershell
git add module.json README.md scripts/ styles/ templates/ packs/
```

Before committing, verify no build artifacts are staged:

```powershell
git status --short
```

Expected: no `dist/`, `.zip`, `.sha256.txt`, or `.staging-local-test/` entries in staged changes.

### Founder-first private manifest release

Build founders release assets (for a private GitHub repo release):

```powershell
./scripts/build-founders-release.ps1 -Version 2.1.0 -PrivateRepo <owner>/party-operations-founders
```

Then upload `dist/founders/module.json` and `dist/founders/module.zip` to the private repo release.

### Current Release Highlights (2.1.0)

- Integration sync now recovers from stale/missing ActiveEffect references instead of failing.
- Operations view uses consistent pill-style navigation and expanded single-column layout.
- Marching torchlight now supports per-actor Bright/Dim ranges with persistence and chat/export visibility.

### After pushing

1. Check GitHub Actions and confirm the release workflow succeeds.
2. Confirm the latest Release has `module.json` and `module.zip` assets.
3. Forge will detect updates from the existing `releases/latest` manifest URL.
