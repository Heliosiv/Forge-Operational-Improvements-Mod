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

process.stdout.write("merchant domain validation passed\n");
