import assert from "node:assert/strict";

import {
  MERCHANT_DEFAULTS,
  buildMerchantDefinitionPatchFromEditorForm,
  buildStarterMerchantPatch,
  normalizeMerchantAutoRefreshConfig
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

process.stdout.write("merchant domain validation passed\n");
