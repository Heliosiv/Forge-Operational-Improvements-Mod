import assert from "node:assert/strict";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";
import vm from "node:vm";

const moduleSource = readLegacyRuntimeSource("loot-engine");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = [
  extractFunctionBlock(moduleSource, "getLootCombatantCount", "getLootCombatantSpreadFactor"),
  extractFunctionBlock(moduleSource, "getLootScaleRarityCapAdjustments", "getLootRaritySelectionCaps"),
  extractFunctionBlock(moduleSource, "getLootRaritySelectionCaps", "canSelectLootRarityWithCaps")
].join("\n\n");

const context = vm.createContext({
  buildLootValueBudgetContext(draft = {}, targetCount = 0) {
    const manualTarget = Math.max(0, Number(draft?.targetItemsValueGp ?? 0) || 0);
    const count = Math.max(1, Number(targetCount) || 1);
    const itemBudgetGp = manualTarget > 0 ? manualTarget : 1000;
    return {
      targetItemBudgetGp: itemBudgetGp,
      targetPerItemGp: itemBudgetGp / count
    };
  },
  result: {}
});
vm.runInContext(`${functionBlock}\nresult.getLootRaritySelectionCaps = getLootRaritySelectionCaps;`, context);

const { getLootRaritySelectionCaps } = context.result;

const smallCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "high",
    scale: "small"
  },
  12
);

const majorCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "high",
    scale: "major"
  },
  12
);

assert.ok(
  majorCaps.uncommon >= smallCaps.uncommon,
  "Major scale should allow at least as many uncommon items as small scale."
);
assert.ok(majorCaps.rare >= smallCaps.rare, "Major scale should allow at least as many rare items as small scale.");
assert.ok(
  majorCaps["very-rare"] >= smallCaps["very-rare"],
  "Major scale should allow at least as many very-rare items as small scale."
);
assert.ok(
  majorCaps.legendary >= smallCaps.legendary,
  "Major scale should allow at least as many legendary items as small scale."
);

const lowSmallCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "low",
    scale: "small"
  },
  10
);

assert.equal(lowSmallCaps.legendary, 0, "Small low-tier hordes should not open legendary slots by scale alone.");

const majorEpicCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "epic",
    scale: "major"
  },
  24
);

assert.ok(majorEpicCaps.rare >= 1, "Major epic hordes should guarantee at least one rare slot.");
assert.ok(majorEpicCaps["very-rare"] >= 1, "Major epic hordes should guarantee at least one very-rare slot.");
assert.ok(
  majorEpicCaps.legendary >= 1,
  "Major epic hordes should be able to guarantee a legendary slot at sufficient size."
);

const budgetAwareCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "high",
    scale: "medium",
    targetItemsValueGp: 4000
  },
  10
);

const lowBudgetCaps = getLootRaritySelectionCaps(
  {
    mode: "horde",
    challenge: "high",
    scale: "medium",
    targetItemsValueGp: 600
  },
  10
);

assert.ok(
  budgetAwareCaps.rare > lowBudgetCaps.rare,
  "Higher target-value hordes should raise rare-item caps instead of letting scale alone clamp them."
);
assert.ok(
  budgetAwareCaps["very-rare"] >= lowBudgetCaps["very-rare"],
  "Higher target-value hordes should preserve or improve very-rare access."
);

process.stdout.write("loot rarity caps validation passed\n");
