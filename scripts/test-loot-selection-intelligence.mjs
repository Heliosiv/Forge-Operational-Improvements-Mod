import assert from "node:assert/strict";

import { getLootSelectionIntelligenceWeight } from "./features/loot-selection-intelligence.js";
import { clearRecentRollsCache, recordRecentlyRolledItem } from "./features/loot-recent-rolls-cache.js";

const state = {
  draft: { mode: "encounter" },
  selected: [
    {
      uuid: "Item.sword-1",
      name: "Longsword",
      itemType: "weapon",
      merchantCategories: ["arms"],
      sourceId: "world-items"
    },
    {
      uuid: "Item.shield-1",
      name: "Shield",
      itemType: "equipment",
      merchantCategories: ["armor"],
      sourceId: "world-items"
    }
  ]
};

const exactDuplicateWeapon = getLootSelectionIntelligenceWeight({
  uuid: "Item.sword-1",
  name: "Longsword",
  itemType: "weapon",
  merchantCategories: ["arms"],
  sourceId: "world-items"
}, state, "spend");

const freshConsumable = getLootSelectionIntelligenceWeight({
  uuid: "Item.potion-1",
  name: "Potion of Healing",
  itemType: "consumable",
  merchantCategories: ["alchemy"],
  sourceId: "world-items"
}, state, "spend");

assert.ok(freshConsumable > exactDuplicateWeapon);

const repeatedWeaponType = getLootSelectionIntelligenceWeight({
  uuid: "Item.axe-1",
  name: "Battleaxe",
  itemType: "weapon",
  merchantCategories: ["arms"],
  sourceId: "world-items"
}, state, "spend");

assert.ok(freshConsumable > repeatedWeaponType);

const commodityState = {
  draft: { mode: "horde" },
  selected: [
    {
      uuid: "Item.gem-1",
      name: "Ruby",
      itemType: "loot",
      variableTreasureKind: "gem",
      merchantCategories: ["treasure", "gem"],
      sourceId: "world-items"
    }
  ]
};

const duplicateCommodity = getLootSelectionIntelligenceWeight({
  uuid: "Item.gem-1",
  name: "Ruby",
  itemType: "loot",
  variableTreasureKind: "gem",
  merchantCategories: ["treasure", "gem"],
  sourceId: "world-items"
}, commodityState, "spend");

assert.ok(duplicateCommodity > exactDuplicateWeapon);

const fillPhaseWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.scroll-1",
  name: "Spell Scroll",
  itemType: "consumable",
  merchantCategories: ["arcana"],
  sourceId: "world-items"
}, state, "fill");

assert.ok(fillPhaseWeight > 0);
assert.ok(
  fillPhaseWeight <= (freshConsumable * 1.5),
  "Fill-phase weighting should stay in the same general range as spend weighting."
);

const sourceState = {
  draft: { mode: "horde" },
  selected: [
    {
      uuid: "Item.common-1",
      name: "Traveler's Cloak",
      itemType: "equipment",
      merchantCategories: ["outfitting"],
      sourceId: "world-items",
      sourceClass: "generated",
      sourcePolicy: "normal",
      curationScore: 3
    }
  ]
};

clearRecentRollsCache();
recordRecentlyRolledItem({
  name: "Silver Ring",
  itemType: "loot",
  rarity: "common",
  sourceId: "party-operations-loot-manifest"
});

const repeatedFirstPickWeight = getLootSelectionIntelligenceWeight({
  name: "Silver Ring",
  itemType: "loot",
  rarity: "common",
  sourceId: "party-operations-loot-manifest"
}, { draft: { mode: "horde" }, selected: [] }, "spend");

const freshFirstPickWeight = getLootSelectionIntelligenceWeight({
  name: "Baroque Brooch",
  itemType: "loot",
  rarity: "common",
  sourceId: "party-operations-loot-manifest"
}, { draft: { mode: "horde" }, selected: [] }, "spend");

assert.ok(
  repeatedFirstPickWeight < 0.5,
  "Recently rolled entries should be strongly penalized even for the first pick in a new roll."
);
assert.ok(
  freshFirstPickWeight > repeatedFirstPickWeight,
  "A fresh entry should outrank a recently repeated entry during first-pick selection."
);
clearRecentRollsCache();

const curatedHighScore = getLootSelectionIntelligenceWeight({
  uuid: "Item.curated-1",
  name: "Curated Tradegood",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceId: "party-operations-manifest",
  sourceClass: "curated",
  sourcePolicy: "normal",
  curationScore: 9
}, sourceState, "spend");

const generatedLowScore = getLootSelectionIntelligenceWeight({
  uuid: "Item.generated-1",
  name: "Generated Tradegood",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceId: "world-items",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 2
}, sourceState, "spend");

assert.ok(
  curatedHighScore > generatedLowScore,
  "Curated entries with stronger curation score should gain a selection preference."
);

const usefulHealingWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.healing-kit-1",
  name: "Potion of Healing",
  itemType: "consumable",
  rarity: "common",
  itemValueGp: 50,
  merchantCategories: ["alchemy", "consumable"],
  keywords: ["healing"],
  sourceId: "world-items",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 3
}, { draft: { mode: "horde" }, selected: [] }, "spend");

const blandTrinketWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.trinket-1",
  name: "Polished Trinket",
  itemType: "loot",
  rarity: "common",
  itemValueGp: 45,
  merchantCategories: ["loot", "treasure"],
  keywords: [],
  sourceId: "world-items",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 3
}, { draft: { mode: "horde" }, selected: [] }, "spend");

assert.ok(
  usefulHealingWeight > blandTrinketWeight,
  "Healing consumables should outrank similarly priced filler loot."
);

const practicalEquipmentWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.pack-1",
  name: "Explorer's Pack",
  itemType: "equipment",
  rarity: "common",
  itemValueGp: 10,
  merchantCategories: ["outfitting", "equipment"],
  keywords: ["merchant.outfitting"],
  sourceId: "world-items",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 2
}, { draft: { mode: "encounter" }, selected: [] }, "spend");

const decorativeCurioWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.curio-1",
  name: "Carved Curio",
  itemType: "loot",
  rarity: "common",
  itemValueGp: 9,
  merchantCategories: ["loot", "treasure"],
  keywords: [],
  sourceId: "world-items",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 2
}, { draft: { mode: "encounter" }, selected: [] }, "spend");

assert.ok(
  practicalEquipmentWeight > decorativeCurioWeight,
  "Practical outfitting gear should outrank similarly cheap decorative filler."
);

const curatedUsefulWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.curated-useful-1",
  name: "Curated Healer's Satchel",
  itemType: "equipment",
  rarity: "uncommon",
  itemValueGp: 50,
  merchantCategories: ["outfitting", "equipment"],
  keywords: ["merchant.outfitting", "healing"],
  sourceClass: "curated",
  sourcePolicy: "normal",
  curationScore: 8
}, { draft: { mode: "horde" }, selected: [] }, "spend");

const generatedFillerWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.generated-filler-1",
  name: "Generated Trinket",
  itemType: "loot",
  rarity: "common",
  itemValueGp: 48,
  merchantCategories: ["loot", "treasure"],
  keywords: [],
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 2
}, { draft: { mode: "horde" }, selected: [] }, "spend");

assert.ok(
  curatedUsefulWeight > generatedFillerWeight,
  "Curated useful entries should decisively outrank generated filler at comparable value."
);

const anchorWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.anchor-1",
  name: "Anchor Relic",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceClass: "curated",
  sourcePolicy: "anchor",
  curationScore: 7
}, sourceState, "spend");

const normalWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.normal-1",
  name: "Normal Relic",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceClass: "curated",
  sourcePolicy: "normal",
  curationScore: 7
}, sourceState, "spend");

assert.ok(
  anchorWeight > normalWeight,
  "Anchor policy candidates should be preferred to establish core loot picks."
);

const outsideBudgetSpendWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.outside-1",
  name: "Outside Budget Curio",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceClass: "curated",
  sourcePolicy: "outside-budget",
  curationScore: 7
}, sourceState, "spend");

const outsideBudgetFillWeight = getLootSelectionIntelligenceWeight({
  uuid: "Item.outside-1",
  name: "Outside Budget Curio",
  itemType: "loot",
  merchantCategories: ["loot", "treasure"],
  sourceClass: "curated",
  sourcePolicy: "outside-budget",
  curationScore: 7
}, sourceState, "fill");

assert.ok(
  outsideBudgetFillWeight > outsideBudgetSpendWeight,
  "Outside-budget policy should be more attractive during fill than spend."
);

const strictHordeFirstPickState = {
  draft: {
    mode: "horde",
    scale: "major",
    valueStrictness: 280
  },
  selected: []
};

const strictFirstPickCurated = getLootSelectionIntelligenceWeight({
  uuid: "Item.strict-curated-1",
  name: "Curated Masterwork",
  itemType: "loot",
  rarity: "uncommon",
  sourceClass: "curated",
  sourcePolicy: "normal",
  curationScore: 9
}, strictHordeFirstPickState, "spend");

const strictFirstPickGeneratedLow = getLootSelectionIntelligenceWeight({
  uuid: "Item.strict-generated-1",
  name: "Generated Trinket",
  itemType: "loot",
  rarity: "common",
  sourceClass: "generated",
  sourcePolicy: "normal",
  curationScore: 1
}, strictHordeFirstPickState, "spend");

assert.ok(
  strictFirstPickCurated > strictFirstPickGeneratedLow,
  "Strict horde first-pick weighting should prefer high-curation curated entries over low-curation generated entries."
);

process.stdout.write("loot selection intelligence validation passed\n");
