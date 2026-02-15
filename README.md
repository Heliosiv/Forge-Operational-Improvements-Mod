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
./scripts/release.ps1 -Version 2.0.25 -Message "Release"
```

What it does:
- Updates `module.json` version
- Creates a commit
- Creates tag `vX.Y.Z`
- Pushes `main` and tag to GitHub

### 2.0.25 highlights

- Added a GM Non-Party Sync panel with scene actor preview, stale detection, and per-actor clear/reapply controls.
- Added one-click scene-wide non-party cleanup/reapply actions for faster recovery when effects drift.
- Extended GM Operations tabs and sync tooling to make non-party automation state visible at a glance.

### After pushing

1. Check GitHub Actions and confirm the release workflow succeeds.
2. Confirm the latest Release has `module.json` and `module.zip` assets.
3. Forge will detect updates from the existing `releases/latest` manifest URL.
