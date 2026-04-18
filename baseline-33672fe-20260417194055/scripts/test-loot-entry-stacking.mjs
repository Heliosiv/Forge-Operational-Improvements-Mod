import assert from "node:assert/strict";

import { aggregateLootEntriesForStacks, getLootEntryStackKey } from "./features/loot-entry-stacking.js";

const swordA = {
  uuid: "Item.sword-1",
  name: "Longsword",
  itemType: "weapon",
  rarity: "common",
  sourceLabel: "World Item Directory",
  itemValueGp: 15,
  itemWeightLb: 3,
  baseItemValueGp: 15,
  baseItemWeightLb: 3
};

const swordB = {
  ...swordA,
  itemValueGp: 15,
  itemWeightLb: 3
};

assert.equal(getLootEntryStackKey(swordA), "uuid:item.sword-1");

const aggregatedSwords = aggregateLootEntriesForStacks([swordA, swordB]);
assert.equal(aggregatedSwords.length, 1);
assert.equal(aggregatedSwords[0].quantity, 2);
assert.equal(aggregatedSwords[0].itemValueGp, 30);
assert.equal(aggregatedSwords[0].itemWeightLb, 6);

const variantNamed = aggregateLootEntriesForStacks([
  {
    name: "Ruby",
    itemType: "loot",
    rarity: "common",
    sourceLabel: "World Item Directory",
    variableTreasureKind: "gem",
    itemValueGp: 50,
    itemWeightLb: 0.1
  },
  {
    name: "Ruby",
    itemType: "loot",
    rarity: "common",
    sourceLabel: "World Item Directory",
    variableTreasureKind: "gem",
    itemValueGp: 250,
    itemWeightLb: 0.1
  }
]);

assert.equal(variantNamed.length, 1);
assert.equal(variantNamed[0].quantity, 2);
assert.equal(variantNamed[0].itemValueGp, 300);

const distinctItems = aggregateLootEntriesForStacks([
  swordA,
  {
    uuid: "Item.axe-1",
    name: "Battleaxe",
    itemType: "weapon",
    rarity: "common",
    sourceLabel: "World Item Directory",
    itemValueGp: 10,
    itemWeightLb: 4
  }
]);

assert.equal(distinctItems.length, 2);

const nonStackableTrapEntries = aggregateLootEntriesForStacks([
  {
    uuid: "Item.trap-1",
    name: "Hunting Trap",
    itemType: "consumable",
    rarity: "common",
    sourceLabel: "World Item Directory",
    itemValueGp: 5,
    itemWeightLb: 25,
    noLootStack: true
  },
  {
    uuid: "Item.trap-1",
    name: "Hunting Trap",
    itemType: "consumable",
    rarity: "common",
    sourceLabel: "World Item Directory",
    itemValueGp: 5,
    itemWeightLb: 25,
    noLootStack: true
  }
]);

assert.equal(nonStackableTrapEntries.length, 2);
assert.equal(nonStackableTrapEntries[0].quantity, 1);
assert.equal(nonStackableTrapEntries[1].quantity, 1);

process.stdout.write("loot entry stacking validation passed\n");
