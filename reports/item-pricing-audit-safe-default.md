# Item Pricing Audit (Safe Default)
Pricing model used for this audit:
- Mundane gear, tools, weapons, containers, and ordinary trade goods keep listed item prices.
- Spells use a standard spell-item ladder by spell level: 1st 50 gp, 2nd 250 gp, 3rd 500 gp, 4th 2,500 gp, 5th 5,000 gp, 6th 15,000 gp, 7th 25,000 gp, 8th 50,000 gp, 9th 250,000 gp.
- Healing potions use standard campaign potion prices: 50 / 150 / 450 / 1,350 gp.
- Other magic consumables use safe defaults: common 50 gp, uncommon 400 gp, rare 3,000 gp, very rare 20,000 gp, legendary 50,000 gp.
- Permanent magic items use safe defaults: common 100 gp, uncommon 400 gp, rare 3,000 gp, very rare 20,000 gp, legendary 75,000 gp.
- Gems snap to standard treasure tiers: 10 / 50 / 100 / 500 / 1,000 / 5,000 gp.
- Art objects snap to standard treasure tiers: 25 / 250 / 750 / 2,500 / 7,500 gp.
- Magic items with no normalized rarity fall back to the nearest safe anchor for their category.
Total items audited: 1456
Items with a price change under this model: 701
Decanter of Endless Water: 135000 gp -> 400 gp
## Rule Counts
| Rule | Items | Total Delta (gp) |
|---|---:|---:|
| magic_permanent_safe_default | 458 | 150694.31 |
| mundane_keep_current | 357 | 0 |
| spell_level_standard | 336 | 0 |
| magic_consumable_safe_default | 157 | -750578 |
| art_tier_snap | 93 | -14905 |
| gem_tier_snap | 48 | -65 |
| healing_potion_standard | 6 | 700 |
| magic_permanent_nearest_anchor | 1 | -4500 |
## Biggest Increases
| Item | Current | Adjusted | Delta | Rule |
|---|---:|---:|---:|---|
| Ioun Stone of Regeneration | 4000 | 75000 | 71000 | magic_permanent_safe_default |
| Dagger of Shadows | 8000 | 75000 | 67000 | magic_permanent_safe_default |
| Ring of Invisibility | 10000 | 75000 | 65000 | magic_permanent_safe_default |
| Ioun Stone of Mastery | 15000 | 75000 | 60000 | magic_permanent_safe_default |
| Hammer of Thunderbolts | 16000 | 75000 | 59000 | magic_permanent_safe_default |
| Ring of Fire Elemental Command | 17000 | 75000 | 58000 | magic_permanent_safe_default |
| Armor of Invulnerability | 18000 | 75000 | 57000 | magic_permanent_safe_default |
| Belt of Cloud Giant Strength | 18000 | 75000 | 57000 | magic_permanent_safe_default |
| Belt of Cloud Giant Strength | 18000 | 75000 | 57000 | magic_permanent_safe_default |
| Heart of Shadows | 20000 | 75000 | 55000 | magic_permanent_safe_default |
| Belt of Storm Giant Strength | 24000 | 75000 | 51000 | magic_permanent_safe_default |
| Defender Greatsword | 24000 | 75000 | 51000 | magic_permanent_safe_default |
| Defender Longsword | 24000 | 75000 | 51000 | magic_permanent_safe_default |
| Defender Rapier | 24000 | 75000 | 51000 | magic_permanent_safe_default |
| Defender Scimitar | 24000 | 75000 | 51000 | magic_permanent_safe_default |
## Biggest Decreases
| Item | Current | Adjusted | Delta | Rule |
|---|---:|---:|---:|---|
| Orb of Dragonkind | 500000 | 75000 | -425000 | magic_permanent_safe_default |
| Staff of the Magi | 350000 | 75000 | -275000 | magic_permanent_safe_default |
| Well of Many Worlds | 250000 | 50000 | -200000 | magic_consumable_safe_default |
| Amulet of the Planes | 160000 | 20000 | -140000 | magic_permanent_safe_default |
| Luck Blade Greatsword | 210000 | 75000 | -135000 | magic_permanent_safe_default |
| Luck Blade Longsword | 210000 | 75000 | -135000 | magic_permanent_safe_default |
| Luck Blade Rapier | 210000 | 75000 | -135000 | magic_permanent_safe_default |
| Luck Blade Scimitar | 210000 | 75000 | -135000 | magic_permanent_safe_default |
| Luck Blade Shortsword | 210000 | 75000 | -135000 | magic_permanent_safe_default |
| Decanter of Endless Water | 135000 | 400 | -134600 | magic_consumable_safe_default |
| Figurine of Wondrous Power (Obsidian Steed) | 128000 | 20000 | -108000 | magic_consumable_safe_default |
| Holy Avenger Greatsword | 165000 | 75000 | -90000 | magic_permanent_safe_default |
| Holy Avenger Longsword | 165000 | 75000 | -90000 | magic_permanent_safe_default |
| Holy Avenger Rapier | 165000 | 75000 | -90000 | magic_permanent_safe_default |
| Holy Avenger Scimitar | 165000 | 75000 | -90000 | magic_permanent_safe_default |
Full item-by-item output is in `reports/item-pricing-audit-safe-default.csv`.
