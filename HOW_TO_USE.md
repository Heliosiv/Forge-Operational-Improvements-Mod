# Party Operations - How to Use

## Build / Release Best Practices

For a focused Foundry + Forge packaging, compatibility, and deployment checklist, see `BEST_PRACTICES_FORGE.md`.

## Opening the Module

After enabling the module in Foundry, open the apps using the console:

```javascript
// Open Rest Watch
game.partyOperations.restWatch()

// Open Marching Order
game.partyOperations.marchingOrder()
```

## DAE / Automation Integration (New)

Open **World Settings → Configure Settings → Party Operations** and set **Integration Mode**:

- **Auto**: uses `DAE + Flags` if DAE is active; otherwise `Flags Only`
- **DAE + Flags**: writes actor flags and applies a per-actor `Party Operations Sync` Active Effect
- **Flags Only**: writes actor flags without creating Active Effects
- **Off**: disables integration and clears Party Operations sync payload/effects

Synced actor payload is stored on each tracked actor at `flags.party-operations.sync`.
Tracked actors are pulled from Rest Watch assignments, Marching Order ranks, Operations role assignments, and Injury entries.

## Phase 1 Operations (New)

Open `Rest Watch` as GM and use the right-side panel tabs:

- **Core**: player visibility, lock state, autofill, snapshots, activity reset, export, clear-all
- **Operations**: roles, SOPs, resources, readiness, communication, reputation, supply lines, injury/recovery
- **Operations**: roles, SOPs, resources, readiness, communication, reputation, supply lines, base operations, injury/recovery

Your selected GM panel tab persists, and refreshes keep your UI position/expanded state.

In **Operations**, use the right-side panel sections:

1. **Operations Roles**
    - Assign: Quartermaster, Cartographer, Marshal, Chronicler, Steward
    - Each role shows a bonus and neglect consequence

2. **SOP Status**
    - Toggle readiness for:
      - Camp setup
      - Watch rotation
      - Dungeon breach protocol
      - Urban entry protocol
      - Prisoner handling
      - Retreat protocol

3. **Resources**
    - Track Food (days), Water (days), Torches, Ammunition, Field Supplies
    - Set Encumbrance tier: Light / Moderate / Heavy / Overloaded
    - Configure upkeep values (party size, per-member drain, environmental multipliers)
    - Use **Apply Long Rest Upkeep** to consume supplies and post an operations update

4. **Operational Readiness**
    - Shows role coverage, SOP coverage, preparation edge, and disorder risk
    - Includes risk tier and **Show Operational Brief** for active bonuses/penalties

All values persist in world settings and sync to all clients.

## What Was Fixed (Latest Version)

## Phase 2 Marching Doctrine (New)

In `Marching Order` (GM panel → Formations), doctrine presets now map to tactical posture:

- **Default formation**: balanced readiness and vulnerability
- **Combat-ready formation**: improved first-contact readiness, reduced frontal ambush vulnerability
- **Tight corridor formation**: reduced flank exposure in confined spaces
- **Low-visibility formation**: improved stealth approach with higher compression risk if detected

The panel displays live `Surprise` and `Ambush` impact text for the active doctrine.

Additional GM tools in the same panel:
- **Post doctrine check prompt** sends a transparent adjudication prompt to chat

## Phase 2 Injury & Recovery Scaffold (New)

In `Rest Watch` (GM panel → Injury & Recovery):

- Track **Field Stabilization Kits** and consume them with `Use kit to stabilize`
- Set **Rest Tier** (`Short`, `Protected`, `Fortified`)
- Set **Environment** (`Hostile`, `Harsh`, `Neutral`, `Sheltered`)
- Track injuries per actor with severity %, stabilization state, and recovery days
- Use **Apply Recovery Cycle** to process one recovery step for all tracked injuries
- Use **Show Recovery Brief** for a compact status summary

When **Simple Calendar** is active, saving/updating injuries now attempts to create or update a calendar entry for that actor's recovery timeline. Clearing or fully recovering an injury removes its calendar entry.

Recovery is intentionally transparent and GM-adjustable; it supports adjudication rather than replacing it.

## Phase 2 Communication Discipline Scaffold (New)

In `Rest Watch` (GM panel → Communication Discipline):

- Define a **Silent Signals** protocol
- Define a **Code Phrase** for escalation
- Toggle **Signal flare plan**, **Bell/alarm plan**, and **Pre-combat plan briefed**
- Use **Show Communication Brief** for a compact readiness check before engagements

Communication readiness now feeds operational bonuses/risks through the existing Operational Brief.

## Phase 3 Reputation & Faction Ledger Scaffold (New)

In `Rest Watch` (GM panel → Reputation & Factions):

- Track standing for **Religious Authority**, **Nobility**, **Criminal Factions**, and **Common Populace**
- Set standing on a bounded scale (`-5` to `+5`)
- Add notes for access shifts, favors, and pressure points
- Use **Show Reputation Brief** for a compact access-risk snapshot

Standing now contributes to operational bonuses/risks and supports faction-pressure adjudication.

## Phase 3 Supply Line Mechanics Scaffold (New)

In `Rest Watch` (GM panel → Supply Lines):

- Set global **Resupply Risk** (`Low`, `Moderate`, `High`)
- Track whether a **Caravan escort** is planned
- Add/remove **Caches** with region, stock, and interception risk
- Add/remove **Safehouses** with status and discovery risk
- Use **Show Supply Line Brief** for active nodes, pressure score, and readiness

Supply-line pressure now contributes to operational risk while stable logistics can grant a mitigation edge.

## Phase 3 Base of Operations Scaffold (New)

In `Rest Watch` (GM panel → Base of Operations):

- Set global **Maintenance Risk** (`Low`, `Moderate`, `High`)
- Add/remove base nodes as **Safehouse**, **Chapel**, **Watchtower**, or **Underground Cell**
- Track each site’s status, maintenance load, discovery risk, and notes
- Use **Show Base Operations Brief** for active sites, contested pressure, and readiness snapshot

Base network pressure now contributes to operational risk while stable multi-site coverage can grant mitigation support.

### Critical Fixes
1. ✅ **ApplicationV2 Import**: Module now correctly imports `ApplicationV2` from Foundry API
2. ✅ **Event Delegation**: Proper event delegation pattern in `_onRender` hook (v12 compatible)
3. ✅ **Event Handlers**: All handlers use `event.target.closest()` for delegation
4. ✅ **Window Sizing**: RestWatch (800×600px), MarchingOrder (900×650px)
5. ✅ **CSS Fitting**: Added `.party-operations` class with proper window-content overrides
6. ✅ **Scroll Fix**: Added `min-height: 0` to grid containers for proper overflow

### Event System
- Uses `_onRender(context, options)` hook (ApplicationV2 v12 pattern)
- Event delegation on `this.element` for all click/change events
- Handlers extract elements using `event.target?.closest("[data-action]")`
- Notes changes use `event.target` directly (not `currentTarget`)

### File Structure
```
party-operations/
├── module.json
├── scripts/
│   └── party-operations.js    [Main module code with event delegation]
├── styles/
│   └── party-operations.css   [Includes window-content overrides]
└── templates/
    ├── rest-watch.hbs
    └── marching-order.hbs
```

## Packaging for Forge

### Install/Update via Manifest URL (No Manual ZIP Upload)

Use this manifest URL in Forge's module installer:

`https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/latest/download/module.json`

Release flow:

1. Bump `version` in `module.json`
2. Push commit to GitHub
3. Create and push a matching tag: `vX.Y.Z` (example: `v2.0.2`)
4. GitHub Actions builds and publishes `module.zip` + `module.json` to Releases
5. Forge detects the new version via manifest and offers update

1. Create a ZIP (not 7z) with this structure:
   ```
   party-operations.zip
   ├── module.json
   ├── scripts/
   ├── styles/
   └── templates/
   ```

2. Upload to Forge using the Import wizard

3. Enable "Party Operations" in Module Management

4. Open using console commands above

## GitHub Release Automation (Numbered)

The workflow at `.github/workflows/release.yml` runs this numbered sequence:

1. Checkout repository
2. Setup Node.js
3. Validate tag version (`vX.Y.Z`) equals `module.json` version
4. Prepare Forge package contents (`module.json`, `scripts/`, `styles/`, `templates/`)
5. Build `module.zip` (with `module.json` at ZIP root)
6. Upload workflow artifact
7. Create GitHub Release and attach `module.zip` + `module.json`

To run automatically, push a tag like `v2.0.1`.

## Troubleshooting

**Module doesn't load:**
- Check console for `"party-operations: script loaded"`
- Verify `game.modules.get("party-operations").active` is `true`

**Buttons don't work:**
- Check console for `"_onRender called"` and `"event delegation attached"`
- Verify `this.element` is logged (should show the HTMLElement)
- Make sure you're running the latest code with event delegation pattern

**Window too small or cut off:**
- Ensure `.party-operations` class is in DEFAULT_OPTIONS
- Check CSS has `.party-operations .window-content` override
- Verify grid containers have `min-height: 0`

## Console Debugging

```javascript
// Check module status
game.modules.get("party-operations")

// Check API availability
game.partyOperations

// Force refresh all open windows
game.partyOperations.refreshAll()

// Read operations ledger state
game.partyOperations.getOperations()

// Apply configured long-rest upkeep
game.partyOperations.applyUpkeep()

// Read injury/recovery state
game.partyOperations.getInjuryRecovery()

// Apply one recovery cycle to tracked injuries
game.partyOperations.applyRecoveryCycle()

// Force re-sync all active injuries to Simple Calendar
await game.partyOperations.syncInjuryCalendar()

// Force integration sync now
game.partyOperations.syncIntegrations()

// Scan world docs for invalid formulas / macro script syntax
await game.partyOperations.diagnoseWorldData()

// Apply safe repairs for actor HP formula, item duration, and activity custom formulas
// (macro script syntax issues are reported, not auto-edited)
await game.partyOperations.repairWorldData()

// Check if ApplicationV2 is available
foundry.applications.api.ApplicationV2
```
