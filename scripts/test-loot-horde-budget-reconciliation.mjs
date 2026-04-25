import assert from "node:assert/strict";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";
import vm from "node:vm";

const moduleSource = readLegacyRuntimeSource("loot-engine");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const nextFunctionStart = source.indexOf(`function ${nextFunctionName}(`, start);
  const nextAsyncFunctionStart = source.indexOf(`async function ${nextFunctionName}(`, start);
  const endCandidates = [nextFunctionStart, nextAsyncFunctionStart].filter((value) => value >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : -1;
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const helperBlock = [
  extractFunctionBlock(moduleSource, "getLootSelectionTotalValueGp", "getRemainingLootBudgetGp"),
  extractFunctionBlock(moduleSource, "getRemainingLootBudgetGp", "getLootRemainingSelectionBudgetGp"),
  extractFunctionBlock(moduleSource, "getLootRemainingSelectionBudgetGp", "buildLootCurrencyBudgetContext"),
  extractFunctionBlock(moduleSource, "buildLootCurrencyBudgetContext", "buildLootValuablesLaneTargets"),
  extractFunctionBlock(moduleSource, "pickLootItemsAcrossBudgetBuckets", "generateLootPreviewPayload")
].join("\n\n");

function makeArrayWithMeta(entries = [], diagnostics = []) {
  const output = [...entries];
  Object.defineProperty(output, "__meta", {
    value: { diagnostics },
    enumerable: false,
    configurable: true,
    writable: false
  });
  return output;
}

const context = vm.createContext({
  Math,
  result: {},
  getLootBudgetItemCap: (_budgetContext = {}, fallbackTargetCount = 1) => Math.max(1, Number(fallbackTargetCount) || 1),
  buildLootValueBudgetContext: () => ({ mode: "horde" }),
  buildLootRandomContext: () => ({ deterministic: false, seed: "", random: () => 0.5 }),
  isLootValuableEntry: (entry = {}) => String(entry?.kind ?? "") === "valuable",
  isLootPremiumRarity: (entry = {}) => String(entry?.kind ?? "") === "premium",
  buildLootPremiumLaneConfig: () => ({ enabled: true, targetBudgetGp: 300, targetCount: 1, chance: 0.5, roll: 0.1 }),
  deriveLootBucketTargetCount: () => 2,
  buildLootValuablesLaneTargets: (_draft = {}, _budgetContext = {}, valuablesPool = []) => ({
    artPool: valuablesPool.filter((entry) => entry?.treasureKind === "art"),
    gemPool: valuablesPool.filter((entry) => entry?.treasureKind === "gem"),
    artCountTarget: 1,
    gemCountTarget: 1,
    artBudgetTargetGp: 140,
    gemBudgetTargetGp: 60
  }),
  buildLootBucketBudgetContext(base = {}, targetGp = 0, targetCount = 0, options = {}) {
    return {
      ...base,
      selectionCategory: String(options?.selectionCategory ?? base?.selectionCategory ?? "")
        .trim()
        .toLowerCase(),
      targetItemBudgetGp: Math.max(0, Number(targetGp) || 0),
      targetCount: Math.max(1, Math.floor(Number(targetCount) || 1)),
      maxItems: Math.max(0, Number(options?.maxItems ?? base?.maxItems ?? 0) || 0)
    };
  },
  pickLootItemsFromCandidates(pool = [], _count = 0, _draft = {}, options = {}) {
    const names = new Set(pool.map((entry) => String(entry?.name ?? "").trim()));
    const targetBudgetGp = Math.max(0, Number(options?.budgetContext?.targetItemBudgetGp ?? 0) || 0);
    const selectionCategory = String(options?.selectionCategory ?? options?.budgetContext?.selectionCategory ?? "")
      .trim()
      .toLowerCase();
    if (selectionCategory === "premium") {
      context.__captured.generalBudgetInputs.push({ selectionCategory, targetBudgetGp });
      return makeArrayWithMeta([{ name: "Premium Pick", uuid: "premium-pick", itemValueGp: 120, kind: "premium" }]);
    }
    if (selectionCategory === "general") {
      context.__captured.generalBudgetInputs.push({ selectionCategory, targetBudgetGp });
      return makeArrayWithMeta([{ name: "General Pick", uuid: "general-pick", itemValueGp: 200, kind: "general" }]);
    }
    if (names.has("Gallery Vase")) {
      context.__captured.valuablesBudgetInputs.push(targetBudgetGp);
      return makeArrayWithMeta([
        { name: "Gallery Vase", uuid: "art-pick", itemValueGp: 60, kind: "valuable", treasureKind: "art" }
      ]);
    }
    if (names.has("Blue Quartz")) {
      context.__captured.valuablesBudgetInputs.push(targetBudgetGp);
      return makeArrayWithMeta([
        { name: "Blue Quartz", uuid: "gem-pick", itemValueGp: 20, kind: "valuable", treasureKind: "gem" }
      ]);
    }
    if (names.has("Amber Idol")) {
      context.__captured.valuablesBudgetInputs.push(targetBudgetGp);
      return makeArrayWithMeta([
        { name: "Amber Idol", uuid: "mixed-pick", itemValueGp: 40, kind: "valuable", treasureKind: "art" }
      ]);
    }
    return makeArrayWithMeta([]);
  },
  getLootGeneralLanePool: (pool = []) => [...pool],
  buildLootPremiumLaneRarityCaps: () => ({}),
  getLootRarityKeepPriority: () => 0,
  __captured: {
    generalBudgetInputs: [],
    valuablesBudgetInputs: []
  }
});

vm.runInContext(
  `${helperBlock}
result.getRemainingLootBudgetGp = getRemainingLootBudgetGp;
result.getLootRemainingSelectionBudgetGp = getLootRemainingSelectionBudgetGp;
result.buildLootCurrencyBudgetContext = buildLootCurrencyBudgetContext;
result.pickLootItemsAcrossBudgetBuckets = pickLootItemsAcrossBudgetBuckets;`,
  context
);

const {
  getRemainingLootBudgetGp,
  getLootRemainingSelectionBudgetGp,
  buildLootCurrencyBudgetContext,
  pickLootItemsAcrossBudgetBuckets
} = context.result;

assert.equal(getRemainingLootBudgetGp(300, 120), 180);
assert.equal(getLootRemainingSelectionBudgetGp(200, [{ itemValueGp: 60 }, { itemValueGp: 20 }]), 120);
const currencyBudgetContext = buildLootCurrencyBudgetContext(
  { targetCurrencyBudgetGp: 180, targetCoinBudgetGp: 90 },
  55
);
assert.equal(currencyBudgetContext.targetCurrencyBudgetGp, 180);
assert.equal(currencyBudgetContext.targetCoinBudgetGp, 125);

context.__captured.generalBudgetInputs = [];
context.__captured.valuablesBudgetInputs = [];

const candidates = [
  { name: "Gallery Vase", uuid: "art-source", itemValueGp: 80, kind: "valuable", treasureKind: "art" },
  { name: "Blue Quartz", uuid: "gem-source", itemValueGp: 30, kind: "valuable", treasureKind: "gem" },
  { name: "Amber Idol", uuid: "mixed-source", itemValueGp: 40, kind: "valuable", treasureKind: "art" },
  { name: "Premium Source", uuid: "premium-source", itemValueGp: 300, kind: "premium" },
  { name: "General Source", uuid: "general-source", itemValueGp: 200, kind: "general" }
];

const budgetContext = {
  mode: "horde",
  targetValuablesBudgetGp: 200,
  targetCurrencyBudgetGp: 400,
  targetItemBudgetGp: 1000,
  targetCount: 4,
  maxItems: 0,
  toleranceGp: 80,
  tolerancePercent: 20,
  strictnessBandLabel: "Normal",
  strictnessBandKey: "normal"
};

const selected = pickLootItemsAcrossBudgetBuckets(candidates, 4, { mode: "horde", scale: "medium" }, { budgetContext });

assert.equal(selected.length, 4, "Expected valuables, premium, and general lanes to contribute picks.");
assert.equal(
  context.__captured.generalBudgetInputs.find((entry) => entry.selectionCategory === "general")?.targetBudgetGp,
  880,
  "General lane should inherit the item budget left after actual premium spend, not the premium reservation."
);
assert.deepEqual(
  context.__captured.valuablesBudgetInputs,
  [140, 140],
  "Valuables lanes should carry forward the actual remaining valuables budget after each pick."
);

process.stdout.write("loot horde budget reconciliation validation passed\n");
