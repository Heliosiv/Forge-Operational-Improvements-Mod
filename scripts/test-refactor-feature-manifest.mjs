import assert from "node:assert/strict";

import {
  getDisabledRefactorFeatureIds,
  getRefactorFeatureManifest,
  getRefactorFeatureStatusCounts,
  getRefactorFeatureStatuses
} from "./runtime/rebuild/feature-manifest.js";

const manifest = getRefactorFeatureManifest();
const statuses = new Set(getRefactorFeatureStatuses());
const ids = manifest.map((feature) => feature.id);

assert.equal(new Set(ids).size, ids.length, "refactor feature ids should be unique");
assert.ok(manifest.length >= 10, "refactor manifest should describe the major runtime domains");

for (const feature of manifest) {
  assert.ok(statuses.has(feature.status), `${feature.id} should use a known status`);
  assert.ok(String(feature.owner ?? "").trim(), `${feature.id} should name a primary owner`);
  assert.ok(Array.isArray(feature.runtimeOwners), `${feature.id} should expose runtime owners`);
  assert.ok(feature.runtimeOwners.length > 0, `${feature.id} should list active runtime owner paths`);
  assert.ok(Array.isArray(feature.focusedChecks), `${feature.id} should expose focused checks`);
  assert.ok(feature.focusedChecks.length > 0, `${feature.id} should list focused checks`);
  assert.ok(Array.isArray(feature.legacySource), `${feature.id} should expose legacy source slices`);
  assert.ok(String(feature.monolithRole ?? "").trim(), `${feature.id} should describe the monolith role`);
}

for (const id of ["runtime-shell", "settings", "navigation", "sockets", "hooks"]) {
  const feature = manifest.find((entry) => entry.id === id);
  assert.equal(feature?.status, "active", `${id} should be marked active now that runtime owners and checks exist`);
}

const loot = manifest.find((entry) => entry.id === "loot");
assert.equal(loot?.status, "partial", "loot should stay partial while the core engine remains in the monolith");
assert.ok(
  loot?.runtimeOwners?.includes("scripts/features/loot-item-override-editor.js"),
  "loot manifest should expose the extracted item override editor module"
);
assert.ok(
  loot?.runtimeOwners?.includes("scripts/features/loot-candidate-sources.js"),
  "loot manifest should expose the extracted source-selection module"
);
assert.ok(loot?.extractedSlices?.includes("item-overrides"), "loot should record item overrides as extracted");
assert.ok(loot?.extractedSlices?.includes("source-selection"), "loot should record source selection as extracted");

const counts = getRefactorFeatureStatusCounts();
assert.equal(counts.active, 5, "infrastructure surfaces should be the active set");
assert.ok(counts.partial >= 1, "domain surfaces should be tracked as partial while compatibility code remains");
assert.deepEqual(getDisabledRefactorFeatureIds(), [], "no manifest entries should be falsely labeled disabled");

process.stdout.write("refactor feature manifest validation passed\n");
