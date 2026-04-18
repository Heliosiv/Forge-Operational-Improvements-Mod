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

const quantityCountBlock = extractFunctionBlock(moduleSource, "getLootSelectedQuantityCount", "getLootBudgetItemCap");
const itemCapBlock = extractFunctionBlock(moduleSource, "getLootBudgetItemCap", "getLootBudgetPhaseCandidateWeight");
const commitBlock = extractFunctionBlock(moduleSource, "commitLootBudgetPick", "buildLootPhaseSelectionPool");

const context = vm.createContext({
  Math,
  result: {},
  LOOT_SOURCE_CLASSES: { GENERATED: "generated", CURATED: "curated" },
  LOOT_SOURCE_POLICIES: { NORMAL: "normal" },
  buildLootCohesiveBundle: (picked) => [{ candidate: picked, quantity: 6 }],
  getLootRarityBucket: () => "common",
  rollLootVariableTreasureSelection: () => null,
  roundLootWeightLb: (value) => Number(value),
  normalizeLootVariableTreasureKind: (value) => String(value ?? ""),
  normalizeLootSourceClass: (value, fallback) => String(value ?? fallback ?? ""),
  normalizeLootSourcePolicy: (value, fallback) => String(value ?? fallback ?? ""),
  logLootBuilderDebug: () => {}
});

vm.runInContext(`
${quantityCountBlock}
${itemCapBlock}
${commitBlock}
result.getLootSelectedQuantityCount = getLootSelectedQuantityCount;
result.getLootBudgetItemCap = getLootBudgetItemCap;
result.commitLootBudgetPick = commitLootBudgetPick;
`, context);

const { getLootSelectedQuantityCount, getLootBudgetItemCap, commitLootBudgetPick } = context.result;

assert.equal(getLootSelectedQuantityCount([{ quantity: 2 }, { quantity: 3 }]), 5);
assert.equal(getLootBudgetItemCap({ targetCount: 4, autoMaxItems: 6 }, 4), 6);

const state = {
  budgetContext: { targetItemBudgetGp: 200, targetCount: 4, autoMaxItems: 6 },
  targetCount: 4,
  pool: [],
  selected: [
    {
      name: "Existing Bundle",
      quantity: 3,
      itemValueGp: 30,
      rarity: "common"
    }
  ],
  selectedTotalValueGp: 30,
  variableTreasurePools: {},
  selectedByRarity: { common: 1, uncommon: 0, rare: 0, "very-rare": 0, legendary: 0 },
  random: () => 0.5
};

const committed = commitLootBudgetPick(state, {
  name: "Torch",
  img: "icons/svg/item-bag.svg",
  itemType: "loot",
  rarity: "common",
  sourceId: "world-items",
  sourceLabel: "World Items",
  uuid: "Item.torch",
  itemValueGp: 5,
  itemWeightLb: 1,
  baseItemValueGp: 5,
  baseItemWeightLb: 1,
  merchantCategories: [],
  keywords: [],
  tier: "tier.t1",
  valueBand: "value.v0",
  priceDenomination: "gp",
  tagSchema: "po-loot-v3",
  variableTreasureKind: ""
});

assert.equal(committed, true);
assert.equal(state.selected.length, 2);
assert.equal(state.selected[1].quantity, 3);
assert.equal(getLootSelectedQuantityCount(state.selected), 6);
assert.equal(state.selectedTotalValueGp, 45);

process.stdout.write("loot picker item cap validation passed\n");
