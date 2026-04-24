import assert from "node:assert/strict";

import {
  getMerchantArchetypeOptions,
  getMerchantRarityPriceMultiplier,
  MERCHANT_DEFAULTS,
  buildMerchantDefinitionPatchFromEditorForm,
  buildStarterMerchantPatch,
  computeMerchantPartialRestockPlan,
  normalizeFoundryAssetImagePath,
  normalizeMerchantAutoRefreshConfig,
  normalizeMerchantRarityPriceMultipliers,
  selectMerchantStockRows
} from "./features/merchant-domain.js";

assert.equal(
  normalizeFoundryAssetImagePath(
    "https://assets.forge-vtt.com/bazaar/core/icons/consumables/potions/potion-flask-corked-blue.webp"
  ),
  "icons/consumables/potions/potion-flask-corked-blue.webp"
);
assert.equal(
  normalizeFoundryAssetImagePath(
    "https://assets.forge-vtt.com/bazaar/systems/dnd5e/assets/icons/svg/items/consumable.svg"
  ),
  "systems/dnd5e/assets/icons/svg/items/consumable.svg"
);
assert.equal(
  normalizeFoundryAssetImagePath("https://assets.forge-vtt.com/private-user-id/portraits/merchant.webp", {
    fallback: "icons/svg/mystery-man.svg"
  }),
  "icons/svg/mystery-man.svg"
);

assert.deepEqual(normalizeMerchantAutoRefreshConfig({}), {
  enabled: false,
  intervalDays: Number(MERCHANT_DEFAULTS.stock.autoRefresh?.intervalDays ?? 7)
});

const enabledPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Clockwork Curios",
  autoRefreshEnabled: true,
  autoRefreshIntervalDays: 5,
  existingStock: {},
  existingPricing: {}
});
assert.equal(enabledPatch.stock.autoRefresh.enabled, true);
assert.equal(enabledPatch.stock.autoRefresh.intervalDays, 5);

const clampedPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Wide Window",
  autoRefreshEnabled: true,
  autoRefreshIntervalDays: 999,
  existingStock: {},
  existingPricing: {}
});
assert.equal(clampedPatch.stock.autoRefresh.intervalDays, 365);

const disabledPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Manual Quartermaster",
  autoRefreshEnabled: false,
  existingStock: {
    autoRefresh: {
      enabled: true,
      intervalDays: 11
    }
  },
  existingPricing: {}
});
assert.equal(disabledPatch.stock.autoRefresh.enabled, false);
assert.equal(disabledPatch.stock.autoRefresh.intervalDays, 11);

const archetypeOptions = getMerchantArchetypeOptions("weaponsmith");
assert.ok(archetypeOptions.some((entry) => entry.value === "weaponsmith" && entry.selected));

const presetPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Crossroads Outfitters",
  archetype: "outfitter",
  customMode: false,
  existingStock: {},
  existingPricing: {}
});
assert.equal(presetPatch.archetype, "outfitter");
assert.equal(presetPatch.customMode, false);
assert.equal(presetPatch.stock.sourceType, "world-items");
assert.ok(presetPatch.stock.maxItems >= 1);
assert.ok(presetPatch.stock.targetValueGp > 0);

const starterPatch = buildStarterMerchantPatch({}, 0);
assert.equal(starterPatch.archetype, "general-goods");
assert.deepEqual(starterPatch.stock.autoRefresh, {
  enabled: false,
  intervalDays: Number(MERCHANT_DEFAULTS.stock.autoRefresh?.intervalDays ?? 7)
});
assert.equal(starterPatch.pricing.buyMarkup, 0.2);
assert.ok(starterPatch.pricing.sellRate > 0);
assert.ok(starterPatch.pricing.cashOnHandGp > 0);
assert.ok(starterPatch.pricing.buybackAllowedTypes.length > 0);
assert.equal(starterPatch.pricing.sellEnabled, MERCHANT_DEFAULTS.pricing.sellEnabled);
assert.equal(starterPatch.pricing.taxFeePercent, Number(MERCHANT_DEFAULTS.pricing.taxFeePercent ?? 0));
assert.equal(starterPatch.pricing.rarityPriceMultipliers.common, 1);
assert.equal(starterPatch.pricing.rarityPriceMultipliers.rare, 1.5);

const rarityPricePatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Inflated Curios",
  rarityPriceMultipliers: {
    common: 1.15,
    uncommon: 1.35,
    rare: 2,
    "very-rare": 2.75,
    legendary: 4
  },
  existingStock: {},
  existingPricing: {}
});
assert.equal(rarityPricePatch.pricing.rarityPriceMultipliers.common, 1.15);
assert.equal(rarityPricePatch.pricing.rarityPriceMultipliers.uncommon, 1.35);
assert.equal(rarityPricePatch.pricing.rarityPriceMultipliers.rare, 2);
assert.equal(rarityPricePatch.pricing.rarityPriceMultipliers["very-rare"], 2.75);
assert.equal(rarityPricePatch.pricing.rarityPriceMultipliers.legendary, 4);
assert.equal(getMerchantRarityPriceMultiplier("rare", rarityPricePatch.pricing.rarityPriceMultipliers), 2);
assert.deepEqual(normalizeMerchantRarityPriceMultipliers({ common: -5, legendary: 25 }), {
  common: 0.1,
  uncommon: 1.2,
  rare: 1.5,
  "very-rare": 2,
  legendary: 10
});

const realisticRestockPlan = computeMerchantPartialRestockPlan(
  [
    {
      key: "stock.featured-potion",
      itemType: "consumable",
      rarityBucket: "rare",
      stockRole: "featured",
      sectionKey: "featured",
      quantity: 1
    },
    {
      key: "stock.core-longsword",
      itemType: "weapon",
      rarityBucket: "common",
      stockRole: "core",
      sectionKey: "weapons",
      quantity: 1
    }
  ],
  0.6,
  {
    randomFn: () => 0.2
  }
);
assert.equal(realisticRestockPlan.retainCount, 1);
assert.equal(realisticRestockPlan.rerollCount, 1);
assert.ok(realisticRestockPlan.retainedKeys.has("stock.core-longsword"));
assert.ok(!realisticRestockPlan.retainedKeys.has("stock.featured-potion"));

const singleItemRestockPlan = computeMerchantPartialRestockPlan(
  [
    {
      key: "stock.only-curio",
      itemType: "trinket",
      rarityBucket: "rare",
      stockRole: "featured"
    }
  ],
  0.6,
  {
    randomFn: () => 0
  }
);
assert.equal(singleItemRestockPlan.retainCount, 0);
assert.equal(singleItemRestockPlan.rerollCount, 1);

const barterPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Silver Tongue Supplies",
  barterSuccessBuyModifierPercent: -15,
  barterSuccessSellModifierPercent: 20,
  barterFailureBuyModifierPercent: 15,
  barterFailureSellModifierPercent: -30,
  existingStock: {},
  existingPricing: {}
});
assert.equal(barterPatch.pricing.barterSuccessBuyModifier, -0.15);
assert.equal(barterPatch.pricing.barterSuccessSellModifier, 0.2);
assert.equal(barterPatch.pricing.barterFailureBuyModifier, 0.15);
assert.equal(barterPatch.pricing.barterFailureSellModifier, -0.3);

const ammoSettingsPatch = buildMerchantDefinitionPatchFromEditorForm({
  name: "Ammo Tuner",
  mundaneAmmoWeightBoost: 4.5,
  mundaneAmmoStackSize: 40,
  existingStock: {},
  existingPricing: {}
});
assert.equal(ammoSettingsPatch.stock.mundaneAmmoWeightBoost, 4.5);
assert.equal(ammoSettingsPatch.stock.mundaneAmmoStackSize, 40);

const ammoCandidates = [
  {
    key: "Item.ammo.arrow",
    name: "Arrow",
    gpValue: 0.05,
    rarityBucket: "common",
    data: { name: "Arrow", type: "ammunition" }
  }
];

const ammoMerchant = {
  stock: {
    maxItems: 20,
    targetValueGp: 200,
    valueStrictness: 180,
    duplicateChance: 100,
    maxStackSize: 20,
    rarityWeights: {
      common: 100,
      uncommon: 45,
      rare: 16,
      "very-rare": 5,
      legendary: 1
    }
  }
};

const ammoSelection = selectMerchantStockRows(ammoCandidates, ammoMerchant, {
  randomFn: () => 0.5,
  shuffleRows: (rows) => rows
});

const ammoTotalQuantity = ammoSelection.reduce(
  (sum, entry) => sum + Math.max(1, Math.floor(Number(entry?.quantity ?? 1) || 1)),
  0
);
assert.ok(ammoTotalQuantity > 20, "Expected budgeted ammo merchants to exceed old 20-unit cap.");
assert.ok(
  ammoSelection.some((entry) => String(entry?.key ?? "").includes("::stack-")),
  "Expected additional ammo stacks once a stack reaches max size."
);

const ammoWeightCandidates = [
  {
    key: "Item.ammo.mundane.arrow",
    name: "Arrow",
    gpValue: 1,
    rarityBucket: "common",
    data: { name: "Arrow", type: "ammunition" },
    keywords: []
  },
  {
    key: "Item.ammo.magic.arrow-plus-1",
    name: "Arrow +1",
    gpValue: 1,
    rarityBucket: "uncommon",
    data: { name: "Arrow +1", type: "ammunition" },
    keywords: ["loot.weapon.magic"]
  }
];

const ammoWeightMerchant = {
  archetype: "weaponsmith",
  stock: {
    maxItems: 2,
    targetValueGp: 0,
    duplicateChance: 0,
    maxStackSize: 20,
    rarityWeights: {
      common: 1,
      uncommon: 1,
      rare: 1,
      "very-rare": 1,
      legendary: 1
    }
  }
};

const weightedAmmoSelection = selectMerchantStockRows(ammoWeightCandidates, ammoWeightMerchant, {
  randomFn: () => 0.6,
  shuffleRows: (rows) => rows
});

assert.equal(weightedAmmoSelection.length, 2);
assert.ok(
  weightedAmmoSelection.some((entry) => (entry.sourceKey ?? entry.key) === "Item.ammo.mundane.arrow"),
  "Expected practical merchants to retain mundane ammo support alongside rarer ammunition."
);
assert.equal(
  Math.max(
    1,
    Math.floor(
      Number(
        weightedAmmoSelection.find((entry) => (entry.sourceKey ?? entry.key) === "Item.ammo.mundane.arrow")?.quantity ??
          1
      ) || 1
    )
  ),
  20,
  "Expected common mundane ammo rolls to create 20-unit stacks."
);

const uncommonAmmoSelection = selectMerchantStockRows(
  [ammoWeightCandidates[1]],
  {
    stock: {
      maxItems: 1,
      targetValueGp: 0,
      duplicateChance: 0,
      maxStackSize: 20,
      rarityWeights: {
        common: 1,
        uncommon: 1,
        rare: 1,
        "very-rare": 1,
        legendary: 1
      }
    }
  },
  {
    randomFn: () => 0.4,
    shuffleRows: (rows) => rows
  }
);

assert.equal(uncommonAmmoSelection.length, 1);
assert.equal(
  Math.max(1, Math.floor(Number(uncommonAmmoSelection[0]?.quantity ?? 1) || 1)),
  1,
  "Expected non-common ammunition to remain single-count when rolled."
);

const tunedAmmoSelection = selectMerchantStockRows(
  [ammoWeightCandidates[0]],
  {
    stock: {
      maxItems: 1,
      targetValueGp: 0,
      duplicateChance: 0,
      maxStackSize: 40,
      mundaneAmmoWeightBoost: 5,
      mundaneAmmoStackSize: 40,
      rarityWeights: {
        common: 1,
        uncommon: 1,
        rare: 1,
        "very-rare": 1,
        legendary: 1
      }
    }
  },
  {
    randomFn: () => 0.4,
    shuffleRows: (rows) => rows
  }
);
assert.equal(Math.max(1, Math.floor(Number(tunedAmmoSelection[0]?.quantity ?? 1) || 1)), 40);

const archetypeCandidates = [
  {
    key: "Item.weapon.longsword",
    name: "Longsword",
    gpValue: 15,
    rarityBucket: "common",
    data: { name: "Longsword", type: "weapon" },
    keywords: ["blade", "sword"]
  },
  {
    key: "Item.ammunition.arrow",
    name: "Arrow",
    gpValue: 0.05,
    rarityBucket: "common",
    data: { name: "Arrow", type: "ammunition" },
    keywords: ["arrow", "ammo"]
  },
  {
    key: "Item.trinket.polished-stone",
    name: "Polished Stone",
    gpValue: 1,
    rarityBucket: "common",
    data: { name: "Polished Stone", type: "trinket" },
    keywords: ["curio"]
  }
];

const archetypeSelection = selectMerchantStockRows(
  archetypeCandidates,
  {
    archetype: "weaponsmith",
    stock: {
      maxItems: 2,
      targetValueGp: 0,
      duplicateChance: 0,
      maxStackSize: 20,
      rarityWeights: {
        common: 1,
        uncommon: 1,
        rare: 1,
        "very-rare": 1,
        legendary: 1
      }
    }
  },
  {
    randomFn: () => 0.25,
    shuffleRows: (rows) => rows
  }
);
assert.ok(archetypeSelection.some((entry) => (entry.sourceKey ?? entry.key) === "Item.weapon.longsword"));
assert.ok(archetypeSelection.some((entry) => String(entry?.merchantSectionLabel ?? "").length > 0));
assert.ok(archetypeSelection.some((entry) => entry?.merchantStockRole === "core"));

const presetModeIgnoresManualCuratedSelection = selectMerchantStockRows(
  [
    {
      key: "Item.trinket.feywild-circus-amulet",
      name: "Feywild Circus Amulet",
      gpValue: 2500,
      rarityBucket: "rare",
      isCurated: true,
      data: { name: "Feywild Circus Amulet", type: "trinket" },
      keywords: ["curio"]
    },
    {
      key: "Item.armor.chain-shirt",
      name: "Chain Shirt",
      gpValue: 50,
      rarityBucket: "common",
      data: { name: "Chain Shirt", type: "armor" },
      keywords: ["armor", "chain"]
    }
  ],
  {
    archetype: "armorer",
    customMode: false,
    stock: {
      curatedItemUuids: ["Item.trinket.feywild-circus-amulet"],
      maxItems: 1,
      targetValueGp: 0,
      duplicateChance: 0,
      maxStackSize: 20,
      rarityWeights: {
        common: 1,
        uncommon: 1,
        rare: 1,
        "very-rare": 1,
        legendary: 1
      }
    }
  },
  {
    randomFn: () => 0.25,
    shuffleRows: (rows) => rows
  }
);

assert.equal(presetModeIgnoresManualCuratedSelection.length, 1);
assert.equal(
  presetModeIgnoresManualCuratedSelection[0]?.sourceKey ?? presetModeIgnoresManualCuratedSelection[0]?.key,
  "Item.armor.chain-shirt"
);

process.stdout.write("merchant domain validation passed\n");
