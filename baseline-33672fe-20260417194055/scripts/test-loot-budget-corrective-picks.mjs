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
  extractFunctionBlock(moduleSource, "getLootSelectedQuantityCount", "resolveLootBudgetEnforcementTolerance"),
  extractFunctionBlock(moduleSource, "resolveLootBudgetEnforcementTolerance", "isLootCorrectiveOvershootEntry"),
  extractFunctionBlock(moduleSource, "isLootCorrectiveOvershootEntry", "getLootBudgetItemCap"),
  extractFunctionBlock(moduleSource, "getLootBudgetPhaseCandidateWeight", "chooseLootBudgetCandidate"),
  extractFunctionBlock(moduleSource, "buildLootPhaseSelectionPool", "spendBudgetLoop")
].join("\n\n");

const context = vm.createContext({
  Math,
  result: {},
  isLootOutsideBudgetPolicy: (entry = {}) => String(entry?.sourcePolicy ?? "").trim().toLowerCase() === "outside-budget",
  canSelectLootRarityWithCaps: () => true,
  getLootCombatantRarityWeightModifier: () => 1,
  getLootBuilderItemTypeWeight: () => 1,
  getLootBudgetDrivenValueWeight: () => 1,
  getLootTreasureKindWeightModifier: () => 1,
  getLootChallengeAvailabilityWeight: () => 1,
  getLootSelectionIntelligenceWeight: () => 1
});

vm.runInContext(`${functionBlock}
result.resolveLootBudgetEnforcementTolerance = resolveLootBudgetEnforcementTolerance;
result.isLootCorrectiveOvershootEntry = isLootCorrectiveOvershootEntry;
result.getLootBudgetPhaseCandidateWeight = getLootBudgetPhaseCandidateWeight;
result.buildLootPhaseSelectionPool = buildLootPhaseSelectionPool;`, context);

const {
  resolveLootBudgetEnforcementTolerance,
  isLootCorrectiveOvershootEntry,
  getLootBudgetPhaseCandidateWeight,
  buildLootPhaseSelectionPool
} = context.result;

assert.equal(
  resolveLootBudgetEnforcementTolerance(100, 20),
  20,
  "Configured strictness tolerance should not be silently tightened during selection."
);

const spendState = {
  budgetContext: {
    targetItemBudgetGp: 100,
    targetCount: 1,
    itemToleranceGp: 20,
    toleranceGp: 20,
    overshootAllowanceRatio: 0.2,
    effectiveMaxItemValueGp: 999
  },
  selectedTotalValueGp: 60,
  selected: [],
  selectedByRarity: {},
  rarityCaps: {},
  draft: { mode: "horde" },
  pool: [
    { name: "Careful Undershoot", itemValueGp: 25, rarity: "common" },
    { name: "Corrective Overshoot", itemValueGp: 55, rarity: "common" },
    { name: "Too Far", itemValueGp: 90, rarity: "common" }
  ]
};

assert.equal(
  isLootCorrectiveOvershootEntry({ name: "Corrective Overshoot", itemValueGp: 55 }, spendState, "spend"),
  true,
  "A slight overshoot that materially reduces delta should be treated as corrective."
);
assert.equal(
  isLootCorrectiveOvershootEntry({ name: "Too Far", itemValueGp: 90 }, spendState, "spend"),
  false,
  "A large overshoot outside the configured tolerance should still be rejected."
);

const spendPool = buildLootPhaseSelectionPool(spendState, "spend");
assert.ok(
  spendPool.some((entry) => entry.name === "Corrective Overshoot"),
  "Spend-phase pool should keep a corrective overshoot candidate available on sparse price ladders."
);
assert.ok(
  spendPool.every((entry) => entry.name !== "Too Far"),
  "Spend-phase pool should still reject extreme overshoots."
);

const overshootSpendWeight = getLootBudgetPhaseCandidateWeight(
  { name: "Corrective Overshoot", itemValueGp: 55, rarity: "common" },
  spendState,
  "spend"
);
const undershootSpendWeight = getLootBudgetPhaseCandidateWeight(
  { name: "Careful Undershoot", itemValueGp: 25, rarity: "common" },
  spendState,
  "spend"
);
assert.ok(
  overshootSpendWeight > undershootSpendWeight,
  "Spend weighting should prefer the corrective pick when it closes more of the budget delta."
);

const fillState = {
  budgetContext: {
    targetItemBudgetGp: 100,
    targetCount: 2,
    itemToleranceGp: 20,
    toleranceGp: 20,
    overshootAllowanceRatio: 0.2,
    effectiveMaxItemValueGp: 999
  },
  selectedTotalValueGp: 82,
  selected: [{ quantity: 1 }],
  selectedByRarity: {},
  rarityCaps: {},
  draft: { mode: "horde" },
  pool: [
    { name: "Tiny Filler", itemValueGp: 8, rarity: "common" },
    { name: "Corrective Fill Overshoot", itemValueGp: 22, rarity: "common" }
  ]
};

const fillPool = buildLootPhaseSelectionPool(fillState, "fill");
assert.ok(
  fillPool.some((entry) => entry.name === "Corrective Fill Overshoot"),
  "Fill-phase pool should include a slight overshoot when it yields the better final delta."
);

const overshootFillWeight = getLootBudgetPhaseCandidateWeight(
  { name: "Corrective Fill Overshoot", itemValueGp: 22, rarity: "common" },
  fillState,
  "fill"
);
const undershootFillWeight = getLootBudgetPhaseCandidateWeight(
  { name: "Tiny Filler", itemValueGp: 8, rarity: "common" },
  fillState,
  "fill"
);
assert.ok(
  overshootFillWeight > undershootFillWeight,
  "Fill weighting should favor the better-closing corrective pick instead of defaulting to a pessimistic undershoot."
);

process.stdout.write("loot budget corrective picks validation passed\n");