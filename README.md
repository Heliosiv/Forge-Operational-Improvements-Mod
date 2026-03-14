# Party Operations

Party Operations is a Foundry VTT module for running the table-facing logistics around travel, rest, party planning, loot, downtime, merchants, environment pressure, and shared GM audio from one workspace.

## Current Build

The current repository manifest version is `2.2.7-test.12`.

## What This Module Covers

- Rest Watch planning with slot assignments, notes, visibility controls, snapshots, and player-facing sync.
- Marching Order planning for party travel and formation management.
- Operations pages for planning, reputation, base pressure, merchants, downtime, recovery, loot, and party health modifiers.
- GM quick tools for environment, downtime, merchants, audio, loot, factions, global modifiers, and session automation.
- Shared launcher support for scene controls, floating canvas access, and sidebar access.
- A built item compendium pack used by the loot and operations flows.

## Install Or Update

- Manifest: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/latest/download/module.json`
- Download: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/latest/download/module.zip`

Install the manifest in Foundry or Forge, enable the module in your world, then open Party Operations from the scene controls or launcher.

## Quick Start

1. Open `Rest Watch` as GM.
2. Use `Fill from Active Party`, adjust visibility, and save a snapshot.
3. Open `Operations` and assign roles, SOPs, and resource baselines.
4. Use the GM quick actions to open Environment, Downtime, Merchants, Audio, or Loot when needed.
5. If you want player-facing access, configure the launcher and Player Hub options in the Settings Hub.

## GM Audio Workspace

The GM Audio page is part of the current build line.

- Scan a host-served audio folder into a track catalog.
- Filter by name, tags, kind, and usage.
- Preview, hide, and restore tracks from a curated library view.
- Build mix presets, queue tracks, and run shared playback for connected users.
- Use the same filters inside the mix track browser to narrow suggested or all-track results.

## Documentation

- Usage guide: [HOW_TO_USE.md](./HOW_TO_USE.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- Fix journal: [LOGICS_JOURNAL.md](./LOGICS_JOURNAL.md)
- Build notes and fixes: [BUG_FIXES.md](./BUG_FIXES.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)

## Repository Release Flow

Validate the module before publishing:

```powershell
npm run check
```

Run baseline governance and manifest checks only:

```powershell
npm run check:baseline
```

Create a release with the helper script:

```powershell
./scripts/release.ps1 -Version 2.2.7 -Message "Release"
```

GitHub Actions runs full validation on pull requests to `main`. Tagged stable releases matching `v*.*.*` rebuild `release/module.zip` and publish the GitHub Release assets used by the manifest URLs above. Pushes to `main` still validate and package, but they no longer publish test-channel artifacts as the stable release.
