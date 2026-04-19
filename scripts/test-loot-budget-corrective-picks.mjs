import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { getLootSelectionIntelligenceWeight } from "./features/loot-selection-intelligence.js";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = [
  extractFunctionBlock(moduleSource, "canSelectLootRarityWithCaps", "chooseWeightedEntry"),
  extractFunctionBlock(moduleSource, "getLootSelectedQuantityCount", "resolveLootBudgetEnforcementTolerance"),
  extractFunctionBlock(moduleSource, "resolveLootBudgetEnforcementTolerance", "isLootCorrectiveOvershootEntry"),
  extractFunctionBlock(moduleSource, "isLootCorrectiveOvershootEntry", "getLootBudgetItemCap"),
  extractFunctionBlock(moduleSource, "getLootBudgetPhaseCandidateWeight", "chooseLootBudgetCandidate"),
  extractFunctionBlock(moduleSource, "buildLootPhaseSelectionPool", "spendBudgetLoop")
].join("\n\n");

const context = vm.createContext({
  Math,
  result: {},
  getLootRarityBucket(rarity = "") {
    const normalized = String(rarity ?? "").trim().toLowerCase();
    if (normalized === "legendary") return "legendary";
    if (normalized === "very-rare" || normalized === "very rare" || normalized === "veryrare") return "very-rare";
    if (normalized === "rare") return "rare";
    if (normalized === "uncommon") return "uncommon";
    return "common";
  },
  isLootOutsideBudgetPolicy: (entry = {}) => String(entry?.sourcePolicy ?? "").trim().toLowerCase() === "outside-budget",
  canSelectLootRarityWithCaps: () => true,
  getLootCombatantRarityWeightModifier: () => 1,
  getLootBuilderItemTypeWeight: () => 1,
  getLootBudgetDrivenValueWeight: () => 1,
  getLootTreasureKindWeightModifier: () => 1,
  getLootChallengeAvailabilityWeight: () => 1,
  getLootSelectionIntelligenceWeight
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

const usefulnessState = {
  budgetContext: {
    targetItemBudgetGp: 120,
    targetCount: 2,
    itemToleranceGp: 15,
    toleranceGp: 15,
    overshootAllowanceRatio: 0.2,
    effectiveMaxItemValueGp: 999
  },
  selectedTotalValueGp: 0,
  selected: [],
  selectedByRarity: {},
  rarityCaps: {},
  draft: { mode: "horde", scale: "small", valueStrictness: 220 },
  pool: [
    {
      name: "Potion of Healing",
      itemType: "consumable",
      itemValueGp: 50,
      rarity: "common",
      merchantCategories: ["alchemy", "consumable"],
      keywords: ["healing"],
      sourceClass: "generated",
      curationScore: 3
    },
    {
      name: "Decorative Trinket",
      itemType: "loot",
      itemValueGp: 48,
      rarity: "common",
      merchantCategories: ["luxury", "treasure"],
      keywords: ["merchant.treasure"],
      sourceClass: "generated",
      curationScore: 3
    }
  ]
};

const usefulCandidateWeight = getLootBudgetPhaseCandidateWeight(
  usefulnessState.pool[0],
  usefulnessState,
  "spend"
);
const fillerCandidateWeight = getLootBudgetPhaseCandidateWeight(
  usefulnessState.pool[1],
  usefulnessState,
  "spend"
);

assert.ok(
  usefulCandidateWeight > fillerCandidateWeight,
  "Budget-phase weighting should inherit the practical usefulness bias instead of treating decorative filler as equivalent."
);

const jackpotState = {
  budgetContext: {
    targetItemBudgetGp: 120,
    targetCount: 1,
    itemToleranceGp: 12,
    toleranceGp: 12,
    overshootAllowanceRatio: 0.2,
    effectiveMaxItemValueGp: 60,
    targetPerItemGp: 120
  },
  selectedTotalValueGp: 0,
  selected: [],
  selectedByRarity: { common: 0, uncommon: 0, rare: 0, "very-rare": 0, legendary: 0 },
  rarityCaps: { uncommon: 1, rare: 0, "very-rare": 0, legendary: 0 },
  draft: { mode: "horde", challenge: "mid", scale: "small" },
  jackpot: { armed: true, used: false, selectedKey: "", bleedType: "", unidentified: false, chance: 0.001 },
  pool: [
    {
      name: "Standard Rope",
      itemType: "equipment",
      itemValueGp: 10,
      rarity: "common",
      merchantCategories: ["outfitting"],
      keywords: ["merchant.outfitting"],
      sourceClass: "generated",
      curationScore: 2
    },
    {
      name: "Mace +1",
      itemType: "weapon",
      itemValueGp: 75,
      rarity: "rare",
      merchantCategories: ["arms"],
      keywords: ["merchant.magic"],
      sourceClass: "curated",
      curationScore: 8
    }
  ]
};

const jackpotPool = buildLootPhaseSelectionPool(jackpotState, "spend");
assert.ok(
  jackpotPool.some((entry) => entry.name === "Mace +1" && entry.lootJackpot === true),
  "An armed jackpot state should admit a tiny out-of-band upgrade candidate into the spend pool."
);

const jackpotWeight = getLootBudgetPhaseCandidateWeight(
  jackpotPool.find((entry) => entry.name === "Mace +1"),
  jackpotState,
  "spend"
);

assert.ok(
  jackpotWeight > 0,
  "Jackpot bleed candidates should retain a small non-zero selection weight instead of being hard-rejected."
);

process.stdout.write("loot budget corrective picks validation passed\n");
