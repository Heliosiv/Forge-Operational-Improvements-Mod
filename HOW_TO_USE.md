# Party Operations - How to Use

## Quick Start

1. Enable **Party Operations** in your world.
2. Open it from one of these entry points:
   - **Scene Controls** (compass icon -> Rest Watch / Marching Order / Operations / GM)
   - **Floating launcher** on the canvas
   - **Sidebar launcher** (if launcher placement is set to Sidebar or Both)
3. As GM, open **Rest Watch** first.

## First 5 Minutes (GM)

1. Open **Rest Watch**.
2. In the Core panel:
   - Use **Fill from Active Party** (or add actors manually)
   - Set visibility as needed
   - Save a snapshot
3. Open **Operations**:
   - Assign roles
   - Toggle SOPs
   - Set supply/resource basics
4. Open **Marching Order**:
   - Assign Front / Middle / Rear
   - Set formation posture
5. Optional: Open **GM** pages for Environment, Downtime, Merchants, and Loot.

## Player Experience

- Players use the **Player Hub** (Watch / March / Loot / Downtime) when Hub mode is enabled.
- If **Auto-open Rest Watch for Players** is enabled, opening Rest Watch as GM prompts connected players to open their player view.

## Recommended Settings (Beginner)

Open **Rest Watch -> Quick Setup -> Open Settings Hub** (or **World Settings -> Configure Settings -> Party Operations**) and review:

- `Player Hub Mode`
- `Shared GM Permissions (Module)`
- `Lock Marching Order For Players`
- `Enable Rest Automation`
- `Launcher Placement`
- `Lock Launcher Position`
- `Auto-open Rest Watch for Players`

## Advanced Settings

- Enable `Show Advanced Settings` to reveal tuning options for:
  - Auto-inventory generation
  - Gather system DC and behavior
  - Journal visibility and summary defaults
  - Inventory hook mode
  - Debug logging
- After toggling, re-open **Configure Settings** so the expanded list is refreshed.

## Optional API Shortcuts

```javascript
// Open the main tools
game.partyOperations.restWatch()
game.partyOperations.marchingOrder()
game.partyOperations.operations()
game.partyOperations.gm()
game.partyOperations.settingsHub()
```

## Troubleshooting

- If launchers are missing, set `Launcher Placement` to `Show Both`.
- If players cannot edit expected controls, verify:
  - module lock states (Rest Watch / Marching Order)
  - `Shared GM Permissions (Module)`
  - an active GM client is connected for GM-routed actions.
