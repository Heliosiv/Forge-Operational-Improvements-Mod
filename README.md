# Party Operations

Party Operations is a Foundry VTT module for running the table-facing logistics around travel, rest, party planning, loot, downtime, merchants, environment pressure, and shared GM audio from one workspace.

## Current Build

The current released build in this repository is `2.2.4-test.18`.

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
- Build notes and fixes: [BUG_FIXES.md](./BUG_FIXES.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)

## Repository Release Flow

Validate the module before publishing:

```powershell
npm run check
```

Create a release with the helper script:

```powershell
./scripts/release.ps1 -Version 2.2.4-test.18 -Message "Release"
```

GitHub Actions runs on pushes to `main`, version tags matching `v*.*.*`, and manual dispatch. The workflow validates `module.json`, rebuilds `release/module.zip`, and updates the GitHub Release assets used by the manifest URLs above.
