import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = [
  extractFunctionBlock(moduleSource, "normalizeLootVariableTreasureKind", "getLootVariableTreasureKindFromData"),
  extractFunctionBlock(moduleSource, "getLootValuablesArtAllocationRatio", "getLootTreasureKindWeightModifier"),
  extractFunctionBlock(moduleSource, "buildLootValuablesLaneTargets", "getLootTreasureKindWeightModifier")
].join("\n\n");

const context = vm.createContext({
  deriveLootBucketTargetCount(pool = [], targetGp = 0, fallbackCount = 1, minimum = 0) {
    if (!Array.isArray(pool) || !pool.length || targetGp <= 0) return Math.max(0, Math.floor(Number(minimum) || 0));
    return Math.max(Math.floor(Number(minimum) || 0), Math.min(Math.max(1, Math.floor(Number(fallbackCount) || 1)), pool.length));
  },
  result: {}
});

vm.runInContext(`${functionBlock}
result.getLootValuablesArtAllocationRatio = getLootValuablesArtAllocationRatio;
result.buildLootValuablesLaneTargets = buildLootValuablesLaneTargets;`, context);

const {
  getLootValuablesArtAllocationRatio,
  buildLootValuablesLaneTargets
} = context.result;

assert.ok(
  getLootValuablesArtAllocationRatio({ mode: "horde", challenge: "mid", scale: "major", profile: "standard" })
  > getLootValuablesArtAllocationRatio({ mode: "horde", challenge: "mid", scale: "small", profile: "poor" }),
  "Larger, richer hordes should reserve more valuables budget for art objects."
);

const valuablesTargets = buildLootValuablesLaneTargets(
  { mode: "horde", challenge: "low", scale: "medium", profile: "standard" },
  { targetValuablesBudgetGp: 140 },
  [
    { name: "Miniature Court Portrait", variableTreasureKind: "art", itemValueGp: 25 },
    { name: "Etched Ceremonial Chalice", variableTreasureKind: "art", itemValueGp: 100 },
    { name: "Amber", variableTreasureKind: "gem", itemValueGp: 5 },
    { name: "Azurite", variableTreasureKind: "gem", itemValueGp: 50 }
  ],
  1
);

assert.equal(valuablesTargets.artCountTarget, 1, "Mixed horde valuables should reserve at least one art pick when art is available.");
assert.equal(valuablesTargets.gemCountTarget, 0, "A single valuables pick should not also reserve a gem slot.");
assert.ok(valuablesTargets.artBudgetTargetGp >= 25, "Art reservation should meet the cheapest available art object.");

const gemOnlyTargets = buildLootValuablesLaneTargets(
  { mode: "horde", challenge: "low", scale: "medium", profile: "standard" },
  { targetValuablesBudgetGp: 140 },
  [
    { name: "Amber", variableTreasureKind: "gem", itemValueGp: 5 },
    { name: "Azurite", variableTreasureKind: "gem", itemValueGp: 50 }
  ],
  2
);

assert.equal(gemOnlyTargets.artCountTarget, 0);
assert.equal(gemOnlyTargets.gemCountTarget, 2);

process.stdout.write("loot valuables allocation validation passed\n");
