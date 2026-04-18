# Item Pricing Audit

Pricing model used for this audit:
- Mundane gear, tools, weapons, containers, and ordinary trade goods keep listed item prices.
- Spells use a standard spell-item ladder by spell level: 1st 50 gp, 2nd 250 gp, 3rd 500 gp, 4th 2,500 gp, 5th 5,000 gp, 6th 15,000 gp, 7th 25,000 gp, 8th 50,000 gp, 9th 250,000 gp.
- Healing potions use standard campaign potion prices: 50 / 150 / 450 / 1,350 gp.
- Other magic consumables use rarity anchors: common 50 gp, uncommon 250 gp, rare 2,500 gp, very rare 25,000 gp, legendary 50,000 gp.
- Permanent magic items use rarity anchors: common 100 gp, uncommon 500 gp, rare 5,000 gp, very rare 50,000 gp, legendary 100,000 gp.
- Gems snap to standard treasure tiers: 10 / 50 / 100 / 500 / 1,000 / 5,000 gp.
- Art objects snap to standard treasure tiers: 25 / 250 / 750 / 2,500 / 7,500 gp.
- Magic items with no normalized rarity fall back to the nearest anchor for their category.

Total items audited: 1456
Items with a price change under this model: 695

## Rule Counts

| Rule | Items | Total Delta (gp) |
|---|---:|---:|
| magic_permanent_rarity_anchor | 458 | 5016294.31 |
| mundane_keep_current | 357 | 0 |
| spell_level_standard | 336 | 0 |
| magic_consumable_rarity_anchor | 157 | -620078 |
| art_tier_snap | 93 | -14905 |
| gem_tier_snap | 48 | -65 |
| healing_potion_standard | 6 | 700 |
| magic_permanent_nearest_anchor | 1 | -2500 |

## Biggest Increases

| Item | Current | Adjusted | Delta | Rule |
|---|---:|---:|---:|---|
| Ioun Stone of Regeneration | 4000 | 100000 | 96000 | magic_permanent_rarity_anchor |
| Dagger of Shadows | 8000 | 100000 | 92000 | magic_permanent_rarity_anchor |
| Ring of Invisibility | 10000 | 100000 | 90000 | magic_permanent_rarity_anchor |
| Ioun Stone of Mastery | 15000 | 100000 | 85000 | magic_permanent_rarity_anchor |
| Hammer of Thunderbolts | 16000 | 100000 | 84000 | magic_permanent_rarity_anchor |
| Ring of Fire Elemental Command | 17000 | 100000 | 83000 | magic_permanent_rarity_anchor |
| Armor of Invulnerability | 18000 | 100000 | 82000 | magic_permanent_rarity_anchor |
| Belt of Cloud Giant Strength | 18000 | 100000 | 82000 | magic_permanent_rarity_anchor |
| Belt of Cloud Giant Strength | 18000 | 100000 | 82000 | magic_permanent_rarity_anchor |
| Heart of Shadows | 20000 | 100000 | 80000 | magic_permanent_rarity_anchor |
| Belt of Storm Giant Strength | 24000 | 100000 | 76000 | magic_permanent_rarity_anchor |
| Defender Greatsword | 24000 | 100000 | 76000 | magic_permanent_rarity_anchor |
| Defender Longsword | 24000 | 100000 | 76000 | magic_permanent_rarity_anchor |
| Defender Rapier | 24000 | 100000 | 76000 | magic_permanent_rarity_anchor |
| Defender Scimitar | 24000 | 100000 | 76000 | magic_permanent_rarity_anchor |

## Biggest Decreases

| Item | Current | Adjusted | Delta | Rule |
|---|---:|---:|---:|---|
| Orb of Dragonkind | 500000 | 100000 | -400000 | magic_permanent_rarity_anchor |
| Staff of the Magi | 350000 | 100000 | -250000 | magic_permanent_rarity_anchor |
| Well of Many Worlds | 250000 | 50000 | -200000 | magic_consumable_rarity_anchor |
| Decanter of Endless Water | 135000 | 250 | -134750 | magic_consumable_rarity_anchor |
| Amulet of the Planes | 160000 | 50000 | -110000 | magic_permanent_rarity_anchor |
| Luck Blade Greatsword | 210000 | 100000 | -110000 | magic_permanent_rarity_anchor |
| Luck Blade Longsword | 210000 | 100000 | -110000 | magic_permanent_rarity_anchor |
| Luck Blade Rapier | 210000 | 100000 | -110000 | magic_permanent_rarity_anchor |
| Luck Blade Scimitar | 210000 | 100000 | -110000 | magic_permanent_rarity_anchor |
| Luck Blade Shortsword | 210000 | 100000 | -110000 | magic_permanent_rarity_anchor |
| Figurine of Wondrous Power (Obsidian Steed) | 128000 | 25000 | -103000 | magic_consumable_rarity_anchor |
| Manual of Bodily Health | 100000 | 25000 | -75000 | magic_consumable_rarity_anchor |
| Manual of Gainful Exercise | 100000 | 25000 | -75000 | magic_consumable_rarity_anchor |
| Manual of Quickness of Action | 100000 | 25000 | -75000 | magic_consumable_rarity_anchor |
| Tome of Clear Thought | 100000 | 25000 | -75000 | magic_consumable_rarity_anchor |

Full item-by-item output is in `reports/item-pricing-audit.csv`.
