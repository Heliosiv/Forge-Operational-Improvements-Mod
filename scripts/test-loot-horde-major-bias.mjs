import assert from "node:assert/strict";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";
import vm from "node:vm";
import { getLootPracticalHoardScore, isLootPracticalHoardCandidate } from "./features/loot-practicality.js";

const moduleSource = readLegacyRuntimeSource("loot-engine");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = [
  extractFunctionBlock(moduleSource, "normalizeLootRarity", "getLootRarityFromData"),
  extractFunctionBlock(moduleSource, "getLootRarityBucket", "getLootModeChallengeRarityWeight"),
  extractFunctionBlock(moduleSource, "isLootPremiumRarity", "buildLootPremiumLaneConfig"),
  extractFunctionBlock(moduleSource, "normalizeLootHordeUncommonPlusChanceMode", "getLootHordeUncommonPlusChanceMode"),
  extractFunctionBlock(moduleSource, "getLootHordeUncommonPlusChanceMode", "buildLootPremiumLaneConfig"),
  extractFunctionBlock(moduleSource, "buildLootPremiumLaneConfig", "buildLootPremiumLaneRarityCaps"),
  extractFunctionBlock(moduleSource, "isLootPracticalHoardFiller", "getLootGeneralLanePool"),
  extractFunctionBlock(moduleSource, "getLootGeneralLanePool", "buildPartyOperationsMetaPillsFromData"),
  extractFunctionBlock(moduleSource, "getLootValuablesBudgetRatio", "getLootTreasureKindWeightModifier")
].join("\n\n");

const context = vm.createContext({
  LOOT_HORDE_UNCOMMON_PLUS_CHANCE_MODES: {
    STANDARD: "standard",
    BOOSTED: "boosted",
    HIGH: "high",
    GUARANTEED: "guaranteed"
  },
  MODULE_ID: "party-operations",
  SETTINGS: {
    LOOT_HORDE_UNCOMMON_PLUS_CHANCE: "lootHordeUncommonPlusChance"
  },
  game: {
    settings: {
      get() {
        return "boosted";
      }
    }
  },
  buildLootValueBudgetContext(draft = {}) {
    const manualTarget = Math.max(0, Number(draft?.targetItemsValueGp ?? 0) || 0);
    if (manualTarget >= 3000) {
      return { targetItemBudgetGp: 1900, targetPerItemGp: 260 };
    }
    return { targetItemBudgetGp: 700, targetPerItemGp: 70 };
  },
  getLootPracticalHoardScore,
  isLootPracticalHoardCandidate,
  result: {}
});

vm.runInContext(
  `${functionBlock}\nresult.getLootGeneralLanePool = getLootGeneralLanePool;\nresult.buildLootPremiumLaneConfig = buildLootPremiumLaneConfig;\nresult.getLootValuablesBudgetRatio = getLootValuablesBudgetRatio;`,
  context
);

const { getLootGeneralLanePool, buildLootPremiumLaneConfig, getLootValuablesBudgetRatio } = context.result;

const cheapFiller = {
  name: "Hunting Trap",
  itemType: "consumable",
  itemValueGp: 5,
  rarity: "common",
  merchantCategories: ["consumable"],
  keywords: ["merchant.consumable"]
};

const strongUncommon = {
  name: "Wand of Secrets",
  itemType: "consumable",
  itemValueGp: 600,
  rarity: "uncommon",
  merchantCategories: ["magic"],
  keywords: ["merchant.magic"]
};

const solidCommon = {
  name: "Silver Candelabra",
  itemType: "loot",
  itemValueGp: 150,
  rarity: "common",
  merchantCategories: ["luxury", "treasure"],
  keywords: ["merchant.treasure"]
};

const practicalGear = {
  name: "Explorer's Pack",
  itemType: "equipment",
  itemValueGp: 10,
  rarity: "common",
  merchantCategories: ["outfitting", "equipment"],
  keywords: ["merchant.outfitting"]
};

const decorativeFiller = {
  name: "Decorative Trinket",
  itemType: "loot",
  itemValueGp: 4,
  rarity: "common",
  merchantCategories: ["luxury", "treasure"],
  keywords: ["merchant.treasure"]
};

const mediumLane = getLootGeneralLanePool([cheapFiller, strongUncommon, solidCommon], {
  mode: "horde",
  challenge: "mid",
  scale: "medium"
});
assert.equal(
  mediumLane.some((entry) => entry.name === "Wand of Secrets"),
  false,
  "Medium hordes should keep premium picks out of the general lane."
);

const budgetAwareMediumLane = getLootGeneralLanePool([cheapFiller, strongUncommon, solidCommon], {
  mode: "horde",
  challenge: "mid",
  scale: "medium",
  targetItemsValueGp: 3800
});
assert.equal(
  budgetAwareMediumLane.some((entry) => entry.name === "Wand of Secrets"),
  true,
  "High target-value medium hordes should not let scale hide higher-priced options."
);

const majorLane = getLootGeneralLanePool([cheapFiller, strongUncommon, solidCommon], {
  mode: "horde",
  challenge: "mid",
  scale: "major"
});
assert.equal(
  majorLane.length,
  3,
  "Major hordes should keep the broader general pool instead of collapsing to filler-only picks."
);

const practicalLane = getLootGeneralLanePool([practicalGear, decorativeFiller, strongUncommon], {
  mode: "horde",
  challenge: "low",
  scale: "small"
});

assert.equal(
  practicalLane.some((entry) => entry.name === "Explorer's Pack"),
  true,
  "Low-tier horde general lanes should keep practical gear available."
);
assert.equal(
  practicalLane.some((entry) => entry.name === "Decorative Trinket"),
  false,
  "Low-tier horde general lanes should drop decorative filler when practical options exist."
);

const premiumLane = buildLootPremiumLaneConfig(
  { mode: "horde", challenge: "mid", scale: "major", profile: "standard", hordeUncommonPlusChance: "boosted" },
  { targetItemBudgetGp: 1260 },
  [strongUncommon, { ...strongUncommon, name: "Mace +1" }, { ...strongUncommon, name: "Cloak of Protection" }],
  () => 0
);

assert.equal(premiumLane.enabled, true);
assert.ok(
  premiumLane.budgetRatio >= 0.4,
  "Major mid-tier hordes should reserve a meaningful share of the item budget for premium loot."
);
assert.ok(premiumLane.targetCount >= 3, "Major mid-tier hordes should plan for several premium picks.");

const standardPremiumLane = buildLootPremiumLaneConfig(
  { mode: "horde", challenge: "mid", scale: "medium", profile: "standard", hordeUncommonPlusChance: "standard" },
  { targetItemBudgetGp: 1000 },
  [strongUncommon],
  () => 0.4
);

const highPremiumLane = buildLootPremiumLaneConfig(
  { mode: "horde", challenge: "mid", scale: "medium", profile: "standard", hordeUncommonPlusChance: "high" },
  { targetItemBudgetGp: 1000 },
  [strongUncommon],
  () => 0.4
);

assert.equal(standardPremiumLane.enabled, false, "Standard horde uncommon+ odds should still allow misses.");
assert.equal(
  highPremiumLane.enabled,
  true,
  "High horde uncommon+ odds should convert the same roll into a premium lane hit."
);
assert.ok(
  highPremiumLane.budgetRatio > standardPremiumLane.budgetRatio,
  "Higher uncommon+ settings should reserve more budget for premium picks."
);

const budgetAwarePremiumLane = buildLootPremiumLaneConfig(
  { mode: "horde", challenge: "mid", scale: "medium", profile: "standard", hordeUncommonPlusChance: "standard" },
  { targetItemBudgetGp: 2400, targetCount: 6, targetPerItemGp: 400 },
  [strongUncommon],
  () => 0.4
);

assert.equal(
  budgetAwarePremiumLane.enabled,
  true,
  "Higher target-value medium hordes should open the premium lane even without relying only on scale."
);
assert.ok(
  budgetAwarePremiumLane.budgetRatio > standardPremiumLane.budgetRatio,
  "Premium lane budget share should grow when the item target value is much higher."
);

const guaranteedPremiumLane = buildLootPremiumLaneConfig(
  { mode: "horde", challenge: "low", scale: "small", profile: "poor", hordeUncommonPlusChance: "guaranteed" },
  { targetItemBudgetGp: 250 },
  [strongUncommon],
  () => 0.999
);

assert.equal(
  guaranteedPremiumLane.enabled,
  true,
  "Guaranteed horde uncommon+ odds should always open the premium lane."
);
assert.equal(guaranteedPremiumLane.chance, 1, "Guaranteed horde uncommon+ odds should normalize to a full hit chance.");

assert.ok(
  getLootValuablesBudgetRatio({ mode: "horde", challenge: "mid", scale: "major", profile: "standard" }) >
    getLootValuablesBudgetRatio({ mode: "horde", challenge: "mid", scale: "medium", profile: "standard" }),
  "Major hordes should allocate more of the currency budget into gems and art."
);

process.stdout.write("loot major horde bias validation passed\n");
