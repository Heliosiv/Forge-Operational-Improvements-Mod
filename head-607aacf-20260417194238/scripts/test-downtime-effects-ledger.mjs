import assert from "node:assert/strict";

import {
  applyDowntimeRewardEffectsToLedger,
  consumeDowntimeRewardEffectsForCraftingCost,
  normalizeDowntimeRewardEffects,
  normalizeDowntimeRewardEffectsLedger,
  summarizeDowntimeRewardEffectsRecord
} from "./core/downtime-effects-ledger.js";

assert.deepEqual(
  normalizeDowntimeRewardEffects({
    discountPercent: 25,
    materialsCreditGp: 20,
    heatDelta: 30,
    reputationDelta: 12,
    contactTier: "major"
  }),
  {
    discountPercent: 20,
    materialsCreditGp: 10,
    heatDelta: 20,
    reputationDelta: 10,
    contactTier: "major"
  }
);

const baseline = normalizeDowntimeRewardEffectsLedger({
  byActor: {
    a1: {
      discountPercent: 5,
      materialsCreditGp: 2,
      heatDelta: 1,
      reputationDelta: 1,
      contactTiers: { minor: 1, medium: 0, major: 0 }
    }
  }
});

const applied = applyDowntimeRewardEffectsToLedger(
  baseline,
  "a1",
  {
    discountPercent: 10,
    materialsCreditGp: 4,
    heatDelta: 2,
    reputationDelta: -1,
    contactTier: "medium"
  },
  12345
);

assert.equal(applied.record.discountPercent, 15);
assert.equal(applied.record.materialsCreditGp, 6);
assert.equal(applied.record.heatDelta, 3);
assert.equal(applied.record.reputationDelta, 0);
assert.equal(applied.record.contactTiers.minor, 1);
assert.equal(applied.record.contactTiers.medium, 1);
assert.equal(applied.record.updatedAt, 12345);
assert.match(summarizeDowntimeRewardEffectsRecord(applied.record), /discount 15%/);
assert.match(summarizeDowntimeRewardEffectsRecord(applied.record), /materials credit 6 gp/);

const consumed = consumeDowntimeRewardEffectsForCraftingCost(
  applied.ledger,
  "a1",
  {
    baseGpCost: 8,
    allowDiscount: true,
    allowMaterialsCredit: true,
    now: 23456
  }
);

assert.equal(consumed.baseGpCost, 8);
assert.equal(consumed.consumed.discountPercent, 15);
assert.equal(consumed.consumed.discountGp, 1);
assert.equal(consumed.consumed.materialsCreditGp, 6);
assert.equal(consumed.effectiveGpCost, 1);
assert.equal(consumed.record.discountPercent, 0);
assert.equal(consumed.record.materialsCreditGp, 0);
assert.equal(consumed.record.updatedAt, 23456);

process.stdout.write("downtime effects ledger validation passed\n");
