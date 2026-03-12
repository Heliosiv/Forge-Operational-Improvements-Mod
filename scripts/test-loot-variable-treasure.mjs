import assert from "node:assert/strict";

import {
  buildVariableTreasureRollPools,
  estimateVariableTreasureOutcome,
  rollVariableTreasureOutcome
} from "./features/loot-variable-treasure.js";

const exactPools = buildVariableTreasureRollPools([
  { variableTreasureKind: "gem", itemValueGp: 50, itemWeightLb: 0.1 },
  { variableTreasureKind: "gem", itemValueGp: 250, itemWeightLb: 0.1 },
  { variableTreasureKind: "art", itemValueGp: 250, itemWeightLb: 1 }
]);

assert.equal(exactPools.gem.length, 2);
assert.equal(exactPools.art.length, 1);

const estimate = estimateVariableTreasureOutcome({
  variableTreasureKind: "gem",
  itemValueGp: 50,
  itemWeightLb: 0.1
}, exactPools);
assert.deepEqual(estimate, {
  variableTreasureKind: "gem",
  itemValueGp: 150,
  itemWeightLb: 0.1,
  baseItemValueGp: 150,
  baseItemWeightLb: 0.1
});

const lowRoll = rollVariableTreasureOutcome({
  variableTreasureKind: "gem",
  itemValueGp: 50,
  itemWeightLb: 0.1
}, exactPools, () => 0);
assert.deepEqual(lowRoll, {
  variableTreasureKind: "gem",
  itemValueGp: 50,
  itemWeightLb: 0.1,
  baseItemValueGp: 50,
  baseItemWeightLb: 0.1
});

const highRoll = rollVariableTreasureOutcome({
  variableTreasureKind: "gem",
  itemValueGp: 50,
  itemWeightLb: 0.1
}, exactPools, () => 0.999999);
assert.deepEqual(highRoll, {
  variableTreasureKind: "gem",
  itemValueGp: 250,
  itemWeightLb: 0.1,
  baseItemValueGp: 250,
  baseItemWeightLb: 0.1
});

const weightedPools = buildVariableTreasureRollPools([
  { variableTreasureKind: "gem", itemValueGp: 50, itemWeightLb: 0.1 },
  { variableTreasureKind: "gem", itemValueGp: 250, itemWeightLb: 0.1 },
  { variableTreasureKind: "gem", itemValueGp: 500, itemWeightLb: 0.5 },
  { variableTreasureKind: "gem", itemValueGp: 10, itemWeightLb: 0.01 },
]);

const weightedEstimate = estimateVariableTreasureOutcome({
  variableTreasureKind: "gem",
  itemValueGp: 500,
  itemWeightLb: 0.5
}, weightedPools);
assert.equal(weightedEstimate?.variableTreasureKind, "gem");
assert.ok(Number(weightedEstimate?.itemValueGp ?? 0) > 400);
assert.ok(Number(weightedEstimate?.itemValueGp ?? 0) < 500);
assert.ok(Number(weightedEstimate?.itemWeightLb ?? 0) >= 0.45);
assert.ok(Number(weightedEstimate?.itemWeightLb ?? 0) <= 0.5);

const artPools = buildVariableTreasureRollPools([
  { variableTreasureKind: "art", itemValueGp: 25, itemWeightLb: 0.5 },
  { variableTreasureKind: "art", itemValueGp: 100, itemWeightLb: 1 },
  { variableTreasureKind: "art", itemValueGp: 250, itemWeightLb: 6 }
]);

const artHighRoll = rollVariableTreasureOutcome({
  variableTreasureKind: "art",
  itemValueGp: 100,
  itemWeightLb: 1
}, artPools, () => 0.999999);
assert.deepEqual(artHighRoll, {
  variableTreasureKind: "art",
  itemValueGp: 250,
  itemWeightLb: 6,
  baseItemValueGp: 250,
  baseItemWeightLb: 6
});

assert.equal(estimateVariableTreasureOutcome({
  variableTreasureKind: "",
  itemValueGp: 50,
  itemWeightLb: 0.1
}, weightedPools), null);

process.stdout.write("loot variable treasure validation passed\n");
