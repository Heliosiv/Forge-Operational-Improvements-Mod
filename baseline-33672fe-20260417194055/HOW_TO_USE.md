# Party Operations - How to Use

## Start Here

1. Install and enable `Party Operations` in your world.
2. Open the module from one of these entry points:
   - Scene controls
   - Floating launcher on the canvas
   - Sidebar launcher
3. Open the Settings Hub once as GM so launcher placement, Player Hub behavior, and automation defaults are configured for the world.

## GM First Session

### 1. Rest Watch

Use `Rest Watch` to build the party's overnight plan.

- Fill from the active party or add actors manually.
- Assign characters to watch slots.
- Set slot time ranges and notes.
- Toggle visibility for what players should see.
- Save a snapshot when the plan is ready.

### 2. Marching Order

Use `Marching Order` to lay out travel formation.

- Assign party members to the travel formation.
- Review travel-facing notes and marching details.
- Adjust the plan before moving into play.

### 3. Operations

Use `Operations` for the campaign management layer.

- `Planning`: roles, SOPs, resources, loot, and party health modifiers.
- `Reputation`: faction standing and access tracking.
- `Base`: safehouses, pressure, and operational site state.
- `Merchants`: merchant contacts and procurement planning.
- `Downtime`: granted hours, pending actions, and resolved outcomes.
- `Recovery`: injuries, stabilization, and recovery cycles.

### 4. GM Quick Actions

From the GM tab, open dedicated pages for:

- Environment
- Downtime
- Merchants
- Audio
- Loot
- Factions
- Global Modifiers

Use the same GM area for manual syncs, session autopilot, undo autopilot, and quick weather presets.

## GM Audio Workflow

### Library Setup

1. Open `GM -> Audio`.
2. Enter a host-served source such as `data`.
3. Enter the root folder path for your audio pack.
4. Click `Scan Library`.

Important: use a Foundry or Forge served path, not a local Windows path like `D:\...`.

### Library View

Use the Library tab to curate the catalog.

- Search by track name or tags.
- Narrow by `Kind` and `Usage`.
- Use tag chips to filter to one or more tag groups.
- Use `Clear Filters` to reset the filter set.
- Select a track to preview it.
- Hide tracks you do not want in the working catalog.
- Restore tracks from the Hidden Tracks list when needed.

### Mix Table

Use the Mix Table tab to control live playback.

- Pick a preset deck.
- Edit preset focus, playback mode, description, and tokens.
- Add selected tracks or bulk-add visible browser results.
- Queue a track next, move queue order, or remove tracks.
- Play, pause, skip, restart, stop, and adjust volume from the live console.

The current build uses the same name, tag, kind, and usage filters in the track browser that it uses in the library view.

## Player Experience

- Players interact through the Player Hub when that mode is enabled.
- GM-triggered views can auto-open for connected players when the corresponding setting is enabled.
- Player edits still respect module lock states and GM-routed actions.

## Recommended Settings

Review these first in the Settings Hub or World Settings:

- `Player Hub Mode`
- `Shared GM Permissions (Module)`
- `Launcher Placement`
- `Lock Launcher Position`
- `Lock Marching Order For Players`
- `Enable Rest Automation`
- `Auto-open Rest Watch for Players`

Enable `Show Advanced Settings` when you need inventory hook tuning, gather behavior, journal visibility defaults, or debug logging.

## API Shortcuts

The current build exposes a module API for macros and debugging:

```javascript
game.partyOperations.restWatch();
game.partyOperations.marchingOrder();
game.partyOperations.operations();
game.partyOperations.gm();
game.partyOperations.gmAudio();
game.partyOperations.settingsHub();

game.partyOperations.audio.scan({
  source: "data",
  rootPath: "assets/audio/fantasy-complete-ii"
});
```

Backward-compatible aliases are still attached for older macro snippets.

## Troubleshooting

- If launchers are missing, check `Launcher Placement` and use the module's launcher recovery tools.
- If players cannot edit expected controls, verify lock settings and confirm an active GM client is connected.
- If the Audio page has no tag chips yet, scan a library first so the catalog has tag data to work from.
- If advanced settings do not appear immediately, close and reopen the settings window after enabling them.
