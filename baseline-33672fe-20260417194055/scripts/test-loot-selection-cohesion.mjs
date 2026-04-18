import assert from "node:assert/strict";

import { buildLootCohesiveBundle } from "./features/loot-selection-cohesion.js";

const arrow = {
  uuid: "Item.arrow",
  name: "Arrow",
  itemType: "ammunition",
  itemValueGp: 0.05,
  merchantCategories: ["arms"],
  keywords: []
};

const quiver = {
  uuid: "Item.quiver",
  name: "Quiver",
  itemType: "container",
  itemValueGp: 1,
  merchantCategories: ["equipment", "outfitting"],
  keywords: []
};

const bundle = buildLootCohesiveBundle(arrow, {
  budgetRemainingGp: 10,
  draft: { mode: "horde", challenge: "mid", scale: "medium" },
  pool: [quiver],
  selected: [],
  random: () => 0
});

assert.equal(bundle.length, 2);
assert.equal(bundle[0].candidate.uuid, "Item.arrow");
assert.ok(bundle[0].quantity >= 5);
assert.equal(bundle[1].candidate.uuid, "Item.quiver");
assert.equal(bundle[1].quantity, 1);

const longbow = {
  uuid: "Item.longbow",
  name: "Longbow",
  itemType: "weapon",
  itemValueGp: 50,
  merchantCategories: ["arms", "weapon"],
  keywords: ["prop.amm"]
};

const arrows = {
  uuid: "Item.arrows",
  name: "Arrows",
  itemType: "ammunition",
  itemValueGp: 0.05,
  merchantCategories: ["arms"],
  keywords: []
};

const rangedBundle = buildLootCohesiveBundle(longbow, {
  budgetRemainingGp: 60,
  draft: { mode: "horde", challenge: "mid", scale: "medium" },
  pool: [arrows, quiver],
  selected: [],
  random: () => 0
});

assert.equal(rangedBundle.length, 2);
assert.equal(rangedBundle[1].candidate.uuid, "Item.arrows");
assert.ok(rangedBundle[1].quantity >= 5);

const gem = {
  uuid: "Item.ruby",
  name: "Ruby",
  itemType: "loot",
  itemValueGp: 50,
  variableTreasureKind: "gem",
  merchantCategories: ["treasure", "gem"],
  keywords: []
};

const gemBundle = buildLootCohesiveBundle(gem, {
  budgetRemainingGp: 250,
  draft: { mode: "horde", challenge: "mid", scale: "medium" },
  pool: [],
  selected: [],
  random: () => 0
});

assert.equal(gemBundle.length, 1);
assert.ok(gemBundle[0].quantity >= 2);

const boltCase = {
  uuid: "Item.bolt-case",
  name: "Crossbow Bolt Case",
  itemType: "container",
  itemValueGp: 1,
  merchantCategories: ["container", "storage"],
  keywords: ["loot.container", "merchant.container"]
};

const boltCaseBundle = buildLootCohesiveBundle(boltCase, {
  budgetRemainingGp: 20,
  draft: { mode: "horde", challenge: "mid", scale: "medium" },
  pool: [],
  selected: [],
  random: () => 0
});

assert.equal(boltCaseBundle.length, 1);
assert.equal(boltCaseBundle[0].candidate.uuid, "Item.bolt-case");
assert.equal(boltCaseBundle[0].quantity, 1);

const majorArrowBundle = buildLootCohesiveBundle(arrow, {
  budgetRemainingGp: 10,
  draft: { mode: "horde", challenge: "mid", scale: "major" },
  pool: [quiver],
  selected: [],
  random: () => 0
});

assert.equal(majorArrowBundle[0].candidate.uuid, "Item.arrow");
assert.ok(
  majorArrowBundle[0].quantity <= 4,
  "Major hordes should keep ammo batching to a few pieces instead of flooding the output."
);

const majorGemBundle = buildLootCohesiveBundle(gem, {
  budgetRemainingGp: 250,
  draft: { mode: "horde", challenge: "mid", scale: "major" },
  pool: [],
  selected: [],
  random: () => 0
});

assert.ok(
  majorGemBundle[0].quantity <= 2,
  "Major hordes should keep valuables grouped into a small number of picks."
);

process.stdout.write("loot selection cohesion validation passed\n");
