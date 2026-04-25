import { readFileSync } from "node:fs";
import process from "node:process";
import vm from "node:vm";

const args = new Set(process.argv.slice(2));
const source = args.has("--source-stdin")
  ? readFileSync(0, "utf8")
  : readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunctionBlock(sourceText, functionName, nextFunctionName) {
  const start = sourceText.indexOf(`function ${functionName}(`);
  if (start < 0) throw new Error(`${functionName} should exist`);
  const nextFunctionStart = sourceText.indexOf(`function ${nextFunctionName}(`, start);
  const nextAsyncFunctionStart = sourceText.indexOf(`async function ${nextFunctionName}(`, start);
  const endCandidates = [nextFunctionStart, nextAsyncFunctionStart].filter((value) => value >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : -1;
  if (end < 0) throw new Error(`${nextFunctionName} should exist after ${functionName}`);
  return sourceText.slice(start, end).trim();
}

function createSeededRandom(seedText = "") {
  let hash = 2166136261;
  for (const char of String(seedText)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = Math.imul(state + 0x6d2b79f5, 1);
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const helperBlock = [
  extractFunctionBlock(source, "getLootSelectionTotalValueGp", "getRemainingLootBudgetGp"),
  extractFunctionBlock(source, "getRemainingLootBudgetGp", "getLootRemainingSelectionBudgetGp"),
  extractFunctionBlock(source, "getLootRemainingSelectionBudgetGp", "buildLootCurrencyBudgetContext"),
  extractFunctionBlock(source, "buildLootCurrencyBudgetContext", "buildLootValuablesLaneTargets"),
  extractFunctionBlock(source, "getLootSelectedQuantityCount", "resolveLootBudgetEnforcementTolerance"),
  extractFunctionBlock(source, "resolveLootBudgetEnforcementTolerance", "isLootCorrectiveOvershootEntry"),
  extractFunctionBlock(source, "isLootCorrectiveOvershootEntry", "getLootBudgetItemCap"),
  extractFunctionBlock(source, "getLootBudgetItemCap", "getLootBudgetPhaseCandidateWeight"),
  extractFunctionBlock(source, "getLootBudgetPhaseCandidateWeight", "chooseLootBudgetCandidate"),
  extractFunctionBlock(source, "chooseLootBudgetCandidate", "commitLootBudgetPick"),
  extractFunctionBlock(source, "commitLootBudgetPick", "buildLootPhaseSelectionPool"),
  extractFunctionBlock(source, "buildLootPhaseSelectionPool", "spendBudgetLoop"),
  extractFunctionBlock(source, "spendBudgetLoop", "fillPass"),
  extractFunctionBlock(source, "fillPass", "trimPass"),
  extractFunctionBlock(source, "trimPass", "pickLootItemsFromCandidatesLegacy"),
  extractFunctionBlock(source, "pickLootItemsFromCandidatesLegacy", "pickLootItemsFromCandidates"),
  extractFunctionBlock(source, "pickLootItemsFromCandidates", "resolveUuidDocument"),
  extractFunctionBlock(source, "pickLootItemsAcrossBudgetBuckets", "generateLootPreviewPayload")
].join("\n\n");

function getRarityBucket(rarity = "") {
  const normalized = String(rarity ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "legendary") return "legendary";
  if (normalized === "very rare" || normalized === "very-rare" || normalized === "veryrare") return "very-rare";
  if (normalized === "rare") return "rare";
  if (normalized === "uncommon") return "uncommon";
  return "common";
}

function getPriceGp(data = {}) {
  const price = data?.system?.price;
  const amount = Number(price?.value ?? price?.amount ?? 0);
  const denom = String(price?.denomination ?? price?.currency ?? "gp").toLowerCase();
  const multiplier = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 }[denom] ?? 1;
  return Number.isFinite(amount) ? Math.max(0, amount * multiplier) : 0;
}

function isValuable(entry = {}) {
  const treasureKind = String(entry?.treasureKind ?? entry?.variableTreasureKind ?? "").toLowerCase();
  return treasureKind === "art" || treasureKind === "gem";
}

function buildCandidates() {
  const packText = readFileSync(new URL("../packs/party-operations-loot-manifest.db", import.meta.url), "utf8");
  return packText
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((data) => {
      const flags = data?.flags?.["party-operations"] ?? {};
      if (flags?.lootEligible === false) return null;
      const itemValueGp = Math.max(0, Number(flags?.gpValue ?? getPriceGp(data)) || 0);
      if (itemValueGp <= 0) return null;
      const keywords = Array.isArray(flags?.keywords) ? flags.keywords : [];
      const merchantCategories = Array.isArray(flags?.merchantCategories) ? flags.merchantCategories : [];
      const variableTreasureKind = String(
        data?.variableTreasureKind ?? flags?.variableTreasureKind ?? ""
      ).toLowerCase();
      return {
        name: String(data?.name ?? "Item"),
        img: String(data?.img ?? "icons/svg/item-bag.svg"),
        itemType: String(data?.type ?? flags?.details?.itemType ?? "loot"),
        rarity: String(data?.system?.rarity ?? flags?.rarityNormalized ?? "common"),
        rarityBucket: getRarityBucket(data?.system?.rarity ?? flags?.rarityNormalized),
        uuid: `Compendium.party-operations.party-operations-loot-manifest.Item.${data?._id}`,
        sourceId: "party-operations-loot-manifest",
        sourceLabel: "Party Operations Loot Manifest",
        sourceWeight: 1,
        sourceClass: String(flags?.sourceClass ?? "generated"),
        sourcePolicy: String(flags?.sourcePolicy ?? "normal"),
        curationScore: Math.max(0, Number(flags?.curationScore ?? 0) || 0),
        isCurated: String(flags?.sourceClass ?? "").toLowerCase() === "curated",
        itemValueGp,
        itemWeightLb: Math.max(0, Number(data?.system?.weight?.value ?? 0) || 0),
        baseItemValueGp: itemValueGp,
        baseItemWeightLb: Math.max(0, Number(data?.system?.weight?.value ?? 0) || 0),
        variableTreasureKind,
        treasureKind: variableTreasureKind,
        merchantCategories,
        keywords,
        lootWeight: Math.max(0.05, Number(flags?.lootWeight ?? 1) || 1),
        profileWeight: 1,
        rarityWeight: 1,
        tier: String(flags?.tier ?? "").toLowerCase(),
        valueBand: String(flags?.valueBand ?? "").toLowerCase(),
        priceDenomination: String(flags?.priceDenomination ?? "").toLowerCase()
      };
    })
    .filter(Boolean);
}

function canSelectRarity(rarity, selected = {}, caps = {}) {
  const bucket = getRarityBucket(rarity);
  const cap = Number(caps?.[bucket] ?? Number.POSITIVE_INFINITY);
  return !Number.isFinite(cap) || Math.max(0, Number(selected?.[bucket] ?? 0) || 0) < cap;
}

const context = vm.createContext({
  Math,
  result: {},
  LOOT_SOURCE_CLASSES: { GENERATED: "generated", CURATED: "curated", MANUAL: "manual" },
  LOOT_SOURCE_POLICIES: { NORMAL: "normal", OUTSIDE_BUDGET: "outside-budget" },
  getLootRarityBucket: getRarityBucket,
  getLootRarityBucketRank(rarity = "") {
    return { common: 0, uncommon: 1, rare: 2, "very-rare": 3, legendary: 4 }[getRarityBucket(rarity)] ?? 0;
  },
  getLootRarityKeepPriority: () => 1,
  getLootRaritySelectionCaps: () => ({ common: 999, uncommon: 999, rare: 999, "very-rare": 999, legendary: 999 }),
  getLootHighestAllowedRarityRank: () => 4,
  getLootSelectionCandidateKey: (entry = {}) => String(entry?.uuid ?? entry?.name ?? ""),
  createLootJackpotState: () => ({
    armed: false,
    used: false,
    selectedKey: "",
    bleedType: "",
    unidentified: false,
    chance: 0
  }),
  isLootJackpotCandidate: () => false,
  getLootCombatantCount: () => 1,
  isLootOutsideBudgetPolicy: (entry = {}) => String(entry?.sourcePolicy ?? "").toLowerCase() === "outside-budget",
  canSelectLootRarityWithCaps: canSelectRarity,
  buildWeightedPool(items, weightFn) {
    return (Array.isArray(items) ? items : [])
      .map((item) => ({ item, weight: Math.max(0, Number(weightFn(item)) || 0) }))
      .filter((row) => row.weight > 0);
  },
  chooseWeightedEntry(entries, weightAccessor, randomFn = Math.random) {
    if (!Array.isArray(entries) || entries.length <= 0) return null;
    const random = typeof randomFn === "function" ? randomFn : Math.random;
    let total = 0;
    const weighted = entries.map((entry) => {
      const weight = Math.max(0, Number(weightAccessor(entry)) || 0);
      total += weight;
      return { entry, weight };
    });
    if (total <= 0) return entries[0] ?? null;
    let cursor = random() * total;
    for (const row of weighted) {
      cursor -= row.weight;
      if (cursor <= 0) return row.entry;
    }
    return weighted.at(-1)?.entry ?? null;
  },
  normalizeLootSourceClass: (value, fallback = "generated") => String(value || fallback).toLowerCase(),
  normalizeLootSourcePolicy: (value, fallback = "normal") => String(value || fallback).toLowerCase(),
  normalizeLootVariableTreasureKind: (value = "") => String(value ?? "").toLowerCase(),
  normalizeFoundryAssetImagePath: (value, options = {}) =>
    String(value || options?.fallback || "icons/svg/item-bag.svg"),
  roundLootWeightLb: (value) => Number(Math.max(0, Number(value) || 0).toFixed(2)),
  rollLootVariableTreasureSelection: () => null,
  buildLootVariableTreasurePools: () => ({}),
  buildLootCohesiveBundle: (picked) => [{ candidate: picked, quantity: 1 }],
  getLootCombatantRarityWeightModifier: () => 1,
  getLootBuilderItemTypeWeight: () => 1,
  getLootTreasureKindWeightModifier: () => 1,
  getLootChallengeAvailabilityWeight: () => 1,
  getLootSelectionIntelligenceWeight: () => 1,
  getLootBudgetDrivenValueWeight(value, selectedTotal, selectedCount, budgetContext = {}) {
    const target = Math.max(1, Number(budgetContext?.targetItemBudgetGp ?? 1) || 1);
    const targetCount = Math.max(1, Number(budgetContext?.targetCount ?? selectedCount + 1) || 1);
    const remainingSlots = Math.max(1, targetCount - Math.max(0, Number(selectedCount) || 0));
    const desired = Math.max(0.5, (target - Math.max(0, Number(selectedTotal) || 0)) / remainingSlots);
    const distance = Math.abs(Math.max(0, Number(value) || 0) - desired) / Math.max(1, desired);
    return 1 / (1 + distance * 1.5);
  },
  buildLootValueBudgetContext: () => ({ mode: "horde" }),
  buildLootRandomContext: (_draft = {}, budgetContext = {}) => ({
    deterministic: true,
    seed: String(budgetContext?.seed ?? "measure"),
    random: createSeededRandom(String(budgetContext?.seed ?? "measure"))
  }),
  buildLootBucketBudgetContext(base = {}, targetGp = 0, targetCount = 0, options = {}) {
    return {
      ...base,
      selectionCategory: String(options?.selectionCategory ?? base?.selectionCategory ?? "").toLowerCase(),
      targetItemBudgetGp: Math.max(0, Number(targetGp) || 0),
      targetCount: Math.max(1, Math.floor(Number(targetCount) || 1)),
      maxItems: Math.max(0, Number(options?.maxItems ?? base?.maxItems ?? 0) || 0)
    };
  },
  isLootValuableEntry: isValuable,
  isLootPremiumRarity: (entry = {}) => getRarityBucket(entry?.rarity) !== "common" && !isValuable(entry),
  buildLootPremiumLaneConfig(_draft = {}, budgetContext = {}, premiumPool = [], randomFn = Math.random) {
    const target = Math.max(0, Number(budgetContext?.targetItemBudgetGp ?? 0) || 0);
    const targetCount = target >= 3000 ? 2 : target >= 450 ? 1 : 0;
    return {
      enabled: premiumPool.length > 0 && targetCount > 0,
      targetBudgetGp: Number((target * (target >= 3000 ? 0.42 : 0.34)).toFixed(2)),
      targetCount,
      chance: 1,
      roll: randomFn()
    };
  },
  deriveLootBucketTargetCount(_pool = [], budgetGp = 0, fallback = 1) {
    return Math.max(1, Math.min(4, Math.ceil(Math.max(0, Number(budgetGp) || 0) / 350), fallback));
  },
  buildLootValuablesLaneTargets(_draft = {}, _budgetContext = {}, valuablesPool = [], countTarget = 1) {
    const artPool = valuablesPool.filter((entry) => entry.treasureKind === "art");
    const gemPool = valuablesPool.filter((entry) => entry.treasureKind === "gem");
    return {
      artPool,
      gemPool,
      artCountTarget: Math.min(artPool.length, Math.ceil(countTarget / 2)),
      gemCountTarget: Math.min(gemPool.length, Math.floor(countTarget / 2)),
      artBudgetTargetGp: 0,
      gemBudgetTargetGp: 0
    };
  },
  getLootGeneralLanePool: (pool = []) => [...pool],
  buildLootPremiumLaneRarityCaps: () => ({ uncommon: 10, rare: 10, "very-rare": 10, legendary: 10 }),
  foundry: { utils: { randomID: () => "measure-id" } },
  logLootBuilderDebug: () => {},
  logLootBuilderFailure: (scope, error) => {
    if (args.has("--debug")) process.stderr.write(`${scope}: ${error?.message ?? error}\n`);
  }
});

vm.runInContext(
  `${helperBlock}
result.pickLootItemsAcrossBudgetBuckets = pickLootItemsAcrossBudgetBuckets;`,
  context
);

const candidates = buildCandidates();
const cases = [
  {
    label: "low/small",
    challenge: "low",
    scale: "small",
    targetItemBudgetGp: 120,
    targetValuablesBudgetGp: 45,
    targetCurrencyBudgetGp: 140,
    targetCount: 3
  },
  {
    label: "mid/medium",
    challenge: "mid",
    scale: "medium",
    targetItemBudgetGp: 700,
    targetValuablesBudgetGp: 180,
    targetCurrencyBudgetGp: 420,
    targetCount: 5
  },
  {
    label: "high/major",
    challenge: "high",
    scale: "major",
    targetItemBudgetGp: 2500,
    targetValuablesBudgetGp: 750,
    targetCurrencyBudgetGp: 1750,
    targetCount: 8
  },
  {
    label: "epic/major",
    challenge: "epic",
    scale: "major",
    targetItemBudgetGp: 8000,
    targetValuablesBudgetGp: 1800,
    targetCurrencyBudgetGp: 5000,
    targetCount: 10
  }
];

const runsPerCase = 32;
const rows = cases.map((testCase) => {
  const samples = [];
  for (let index = 0; index < runsPerCase; index += 1) {
    const budgetContext = {
      mode: "horde",
      challenge: testCase.challenge,
      scale: testCase.scale,
      targetItemBudgetGp: testCase.targetItemBudgetGp,
      targetValuablesBudgetGp: testCase.targetValuablesBudgetGp,
      targetCurrencyBudgetGp: testCase.targetCurrencyBudgetGp,
      targetCount: testCase.targetCount,
      autoMaxItems: Math.ceil(testCase.targetCount * 1.6),
      maxItems: 0,
      itemToleranceGp: Math.max(10, testCase.targetItemBudgetGp * 0.12),
      toleranceGp: Math.max(10, (testCase.targetItemBudgetGp + testCase.targetCurrencyBudgetGp) * 0.12),
      overshootAllowanceRatio: 0.2,
      effectiveMaxItemValueGp: testCase.targetItemBudgetGp * 1.25,
      targetPerItemGp: testCase.targetItemBudgetGp / testCase.targetCount,
      seed: `${testCase.label}-${index}`
    };
    const draft = {
      mode: "horde",
      challenge: testCase.challenge,
      scale: testCase.scale,
      deterministic: true,
      seed: `${testCase.label}-${index}`
    };
    const randomContext = {
      deterministic: true,
      seed: draft.seed,
      random: createSeededRandom(draft.seed)
    };
    const selected = context.result.pickLootItemsAcrossBudgetBuckets(candidates, testCase.targetCount, draft, {
      budgetContext,
      randomContext
    });
    const itemTotal = selected
      .filter((entry) => !isValuable(entry))
      .reduce((sum, entry) => sum + Math.max(0, Number(entry?.itemValueGp ?? 0) || 0), 0);
    const valuablesTotal = selected
      .filter((entry) => isValuable(entry))
      .reduce((sum, entry) => sum + Math.max(0, Number(entry?.itemValueGp ?? 0) || 0), 0);
    samples.push({
      itemDrift: itemTotal - testCase.targetItemBudgetGp,
      valuablesDrift: valuablesTotal - testCase.targetValuablesBudgetGp,
      selectedCount: selected.reduce((sum, entry) => sum + Math.max(1, Number(entry?.quantity ?? 1) || 1), 0)
    });
  }
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const meanAbsItemDrift = mean(samples.map((sample) => Math.abs(sample.itemDrift)));
  const meanAbsValuablesDrift = mean(samples.map((sample) => Math.abs(sample.valuablesDrift)));
  const meanItemDrift = mean(samples.map((sample) => sample.itemDrift));
  const meanValuablesDrift = mean(samples.map((sample) => sample.valuablesDrift));
  const worstItemDrift = samples.reduce((max, sample) => Math.max(max, Math.abs(sample.itemDrift)), 0);
  return {
    tier: testCase.label,
    targetItemGp: testCase.targetItemBudgetGp,
    targetValuablesGp: testCase.targetValuablesBudgetGp,
    meanItemDriftGp: Number(meanItemDrift.toFixed(2)),
    meanAbsItemDriftGp: Number(meanAbsItemDrift.toFixed(2)),
    worstAbsItemDriftGp: Number(worstItemDrift.toFixed(2)),
    meanValuablesDriftGp: Number(meanValuablesDrift.toFixed(2)),
    meanAbsValuablesDriftGp: Number(meanAbsValuablesDrift.toFixed(2)),
    meanCount: Number(mean(samples.map((sample) => sample.selectedCount)).toFixed(2))
  };
});

console.table(rows);
