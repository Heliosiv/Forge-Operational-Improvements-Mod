# Party Operations Roadmap

Designed for survivalist, high-pressure play with strong GM tooling and party-facing transparency.

## Current Status (February 15, 2026)
- Complete: Roles assignment, SOP tracking, resource ledger, and configurable upkeep drain.
- Complete: Operational readiness output, marching doctrine presets, and communication discipline support.
- Complete: Injury and recovery core with GM controls and automation sync hooks.
- Complete: Environment hazard controls and GM-only operational inputs.
- In progress: Base of Operations depth.
- Deferred: Operational Strain Meter.

## Active Roadmap (GM + Party Focus)

### 1) Base of Operations Depth
Build out the existing base framework into an actionable play loop:
- Site maintenance tasks and upkeep consequences.
- Readiness state changes tied to player actions and neglect.
- Party-facing summaries that explain what changed and why.

### 2) GM Loot Roller
Add a dedicated GM loot workflow with three modes:
- Horde Loot: Generate treasure bundles for vaults, hoards, and major caches.
- Defeated Enemy Loot: Roll drops per defeated actor.
- Encounter Assignment Loot: Assign loot to enemy actors already placed in the scene.

Core behavior:
- Equipment profile selector (poor, standard, well-equipped).
- Challenge/CR bracket selector for scaling currency and item quality.
- Preview before apply, with reroll controls.
- Apply result directly to actor inventory, loot actor, or chat/journal output.

### 3) Loot Source Registry (Compendiums + Tables)
Create a configurable source layer so each world can tune available loot:
- Select item compendiums as roll sources.
- Select roll tables for currency, gems, art objects, and special drops.
- Optional category filters (weapon, armor, consumable, ammo, trade goods).
- Fallback behavior when a source has no matching entries.

### 4) Operations Records Repository (Journals + Compendiums)
Use journals as persistent records for module systems, not just UI state:
- Standard journal tree created/managed by the module.
- Active and archived sections for injuries.
- Loot generation and assignment logs with timestamps.
- Permission presets (GM-only vs party-readable logs).

Use compendiums as reusable data repositories:
- Loot profile presets.
- Optional exported log snapshots for campaign continuity.

### 5) Injury Log Journal Sync and Archive Flow
Extend current injury tracking with readable records for players:
- New/updated injury writes to Active Injuries journal pages.
- Recovered/cleared injury moves to Archived Injuries.
- Player-readable permissions configurable per journal section.

## Deferred

### 6) Operational Strain Meter (Deferred)
Track long-term pressure and cohesion signals:
- Fatigue
- Paranoia
- Moral fracture
- Cohesion

Status:
- Deferred pending additional playtest signal; hazard and recovery systems remain primary.

## Next Up (Immediate Priority)
1. GM Loot Roller MVP (horde, defeated-enemy, and encounter-assignment workflows).
2. Loot Source Registry MVP (compendium and roll-table selectors with validation).
3. Journal repository skeleton (Active Injuries, Archived Injuries, Loot Log, permissions).
4. Base of Operations maintenance loop pass.

This roadmap keeps focus on practical GM workflows and party-facing operations support.
