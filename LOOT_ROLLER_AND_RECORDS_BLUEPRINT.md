# GM Loot Roller and Records Blueprint

This document defines an implementation plan for the GM-first Loot Roller and journal-backed records layer.

## Scope
- GM tools for generating and assigning loot quickly.
- Party-readable records for selected systems, starting with injuries and loot outcomes.
- Compendium-aware source selection so each world can tune item pools.

## MVP Goals
- One UI panel for loot generation and assignment.
- One settings panel for loot source configuration.
- One journal structure created automatically for operations logs.
- Injury log writes to journals with active-to-archive movement.

## Loot Roller Workflows

### Workflow A: Horde Loot
Input:
- Loot profile (poor, standard, well-equipped).
- CR/challenge bracket.
- Quantity/scale toggle (small, medium, major).

Output:
- Currency bundle.
- Item bundle selected from configured sources.
- Optional special drop roll.

Apply targets:
- New loot actor.
- Existing selected actor.
- Journal-only (no inventory changes).

### Workflow B: Defeated Enemy Loot
Input:
- Defeated actor set (combatants with HP <= 0 or selected tokens).
- Per-actor or grouped generation mode.
- Loot profile override (optional).

Output:
- Loot packet per actor or per group.

Apply targets:
- Add directly to each defeated actor inventory.
- Aggregate into one loot actor.
- Log only.

### Workflow C: Encounter Assignment Loot
Input:
- Tokens currently placed in the active scene.
- Optional filter by disposition/type/name.
- Default or per-token loot profile.

Output:
- Assigned inventory updates on selected enemy actors before combat or exploration.

Apply behavior:
- Dry-run preview first.
- Confirm apply.
- Post summary in journal and optional chat card.

## Loot Source Registry Design

## Data model
- Module setting: `lootSourceConfig`
- Module setting: `lootProfiles`
- Module setting: `lootDefaults`

Suggested shape:
```json
{
  "packs": [
    { "pack": "world.items", "enabled": true, "weight": 1 }
  ],
  "tables": [
    { "tableUuid": "Compendium.world.rolltables.RollTableName", "type": "currency", "enabled": true }
  ],
  "filters": {
    "allowedTypes": ["weapon", "equipment", "consumable", "loot"],
    "rarityFloor": "common",
    "rarityCeiling": "rare"
  }
}
```

## Resolution pipeline
1. Read profile and challenge bracket.
2. Build candidate pools from enabled compendiums.
3. Apply type/rarity filters.
4. Roll currency/tables.
5. Roll item count and pick items by weighted source.
6. Return preview payload.
7. Apply to selected target.
8. Write to journal log.

## Journal Repository Structure
Create or reuse a top-level folder/journal namespace:
- `Party Operations`
- `Party Operations / Active Injuries`
- `Party Operations / Archived Injuries`
- `Party Operations / Loot Log`
- `Party Operations / GM Audit`

Record policy:
- Active systems write concise entries with timestamp, scene, and actor references.
- Archive movement preserves original created date and closure reason.
- GM Audit remains GM-only by default.
- Active/Archive injury sections can be player-readable if enabled.

## Permissions Model
- Setting: `journalVisibilityMode`
- Values:
  - `gm_only`
  - `party_read_injuries`
  - `party_read_injuries_and_loot`

Expected behavior:
- UI still enforces GM edit actions.
- Read permissions are applied to target journal sections based on mode.

## Injury Sync Extension
When injury state changes:
1. Upsert active journal entry keyed by actor UUID.
2. If injury clears or expires, move content to archived section.
3. Keep a backlink or reference ID in module state for idempotent updates.

## Suggested Build Order
1. Add loot data structures and settings schema.
2. Build source registry UI and validation.
3. Build loot generator service (no UI apply yet).
4. Add GM panel for preview and apply actions.
5. Add journal writer service and repository bootstrap.
6. Wire injury state to active/archive journal updates.
7. Add chat summaries and optional export hooks.

## Risks and Notes
- Compendium schemas vary across systems, so item normalization is required.
- Some worlds may lack rarity metadata; fallback sorting by item type/value is needed.
- Bulk actor inventory writes should be batched to avoid UI lag.
- DMG-inspired scaling should be configurable and not hard-coded to one ruleset.
