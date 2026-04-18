import assert from "node:assert/strict";

import {
  LOOT_PREVIEW_BASE_TARGET_GP_BY_MODE,
  getLootPreviewBaseTargetGp
} from "./features/loot-budget.js";

assert.equal(getLootPreviewBaseTargetGp("defeated", "low"), 24);
assert.equal(getLootPreviewBaseTargetGp("encounter", "epic"), 2200);

assert.equal(getLootPreviewBaseTargetGp("horde", "low"), 780);
assert.equal(getLootPreviewBaseTargetGp("horde", "mid"), 1000);
assert.equal(getLootPreviewBaseTargetGp("horde", "high"), 1250);
assert.equal(getLootPreviewBaseTargetGp("horde", "epic"), 3800);

const hordeTargets = LOOT_PREVIEW_BASE_TARGET_GP_BY_MODE.horde;
assert.ok(hordeTargets.low < hordeTargets.mid);
assert.ok(hordeTargets.mid < hordeTargets.high);
assert.ok(hordeTargets.high < hordeTargets.epic);

assert.equal(getLootPreviewBaseTargetGp("invalid-mode", "mid"), hordeTargets.mid);
assert.equal(getLootPreviewBaseTargetGp("horde", "invalid-tier"), hordeTargets.mid);

process.stdout.write("loot budget validation passed\n");
