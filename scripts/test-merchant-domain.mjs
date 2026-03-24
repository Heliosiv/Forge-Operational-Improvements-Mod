import assert from "node:assert/strict";

import {
  MERCHANT_DEFAULTS,
  buildMerchantDefinitionPatchFromEditorForm,
  buildStarterMerchantPatch,
  normalizeMerchantAutoRefreshConfig,
  selectMerchantStockRows
} from "./features/merchant-domain.js";

assert.deepEqual(
  normalizeMerchantAutoRefreshConfig({}),
  {
    enabled: false,
    intervalDays: Number(MERCHANT_DEFAULTS.stock.autoRefresh?.intervalDays ?? 7)
  }
);

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

const starterPatch = buildStarterMerchantPatch({}, 0);
assert.deepEqual(starterPatch.stock.autoRefresh, {
  enabled: false,
  intervalDays: Number(MERCHANT_DEFAULTS.stock.autoRefresh?.intervalDays ?? 7)
});
assert.deepEqual(starterPatch.pricing, {
  buyMarkup: 0.2,
  sellRate: MERCHANT_DEFAULTS.pricing.sellRate,
  sellEnabled: MERCHANT_DEFAULTS.pricing.sellEnabled,
  cashOnHandGp: MERCHANT_DEFAULTS.pricing.cashOnHandGp,
  buybackAllowedTypes: [...MERCHANT_DEFAULTS.pricing.buybackAllowedTypes],
  taxFeePercent: Number(MERCHANT_DEFAULTS.pricing.taxFeePercent ?? 0),
  rarityPricingEnabled: Boolean(MERCHANT_DEFAULTS.pricing.rarityPricingEnabled),
  stockPressureEnabled: Boolean(MERCHANT_DEFAULTS.pricing.stockPressureEnabled),
  barterEnabled: MERCHANT_DEFAULTS.pricing.barterEnabled,
  barterDc: MERCHANT_DEFAULTS.pricing.barterDc,
  barterAbility: String(MERCHANT_DEFAULTS.pricing.barterAbility ?? "cha"),
  barterSuccessBuyModifier: Number(MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier ?? -0.05),
  barterSuccessSellModifier: Number(MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier ?? 0.05),
  barterFailureBuyModifier: Number(MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier ?? 0.05),
  barterFailureSellModifier: Number(MERCHANT_DEFAULTS.pricing.barterFailureSellModifier ?? -0.05)
});

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
    rarityBucket: "common",
    data: { name: "Arrow +1", type: "ammunition" },
    keywords: ["loot.weapon.magic"]
  }
];

const ammoWeightMerchant = {
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
};

const weightedAmmoSelection = selectMerchantStockRows(ammoWeightCandidates, ammoWeightMerchant, {
  randomFn: () => 0.6,
  shuffleRows: (rows) => rows
});

assert.equal(weightedAmmoSelection.length, 1);
assert.equal(weightedAmmoSelection[0]?.sourceKey ?? weightedAmmoSelection[0]?.key, "Item.ammo.mundane.arrow");
assert.equal(
  Math.max(1, Math.floor(Number(weightedAmmoSelection[0]?.quantity ?? 1) || 1)),
  20,
  "Expected mundane ammo rolls to create 20-unit stacks."
);

const tunedAmmoSelection = selectMerchantStockRows([ammoWeightCandidates[0]], {
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
}, {
  randomFn: () => 0.4,
  shuffleRows: (rows) => rows
});
assert.equal(Math.max(1, Math.floor(Number(tunedAmmoSelection[0]?.quantity ?? 1) || 1)), 40);

process.stdout.write("merchant domain validation passed\n");
