import assert from "node:assert/strict";

import { getLootSelectionIntelligenceWeight } from "./features/loot-selection-intelligence.js";

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
assert.ok(fillPhaseWeight < freshConsumable);

process.stdout.write("loot selection intelligence validation passed\n");
