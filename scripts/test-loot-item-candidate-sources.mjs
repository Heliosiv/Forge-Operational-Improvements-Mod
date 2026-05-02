import assert from "node:assert/strict";

import { resolveLootCandidateSources } from "./features/loot-candidate-sources.js";

const baseSourceConfig = {
  packs: [
    { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
    { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 },
    { id: "pack.disabled", label: "Disabled Pack", enabled: false, weight: 3 },
    { id: "pack.table", label: "Roll Table", enabled: true, sourceKind: "roll-table", weight: 1 }
  ],
  filters: {}
};

const mixedWarnings = [];
const mixed = resolveLootCandidateSources(baseSourceConfig, {
  worldItemsSourceId: "__world_items__",
  warnings: mixedWarnings
});

assert.deepEqual(mixedWarnings, [], "mixed source resolution should not warn when a compendium source is enabled");
assert.deepEqual(
  mixed.enabledSources.map((entry) => entry.id),
  ["pack.magic"],
  "candidate source resolution should keep enabled compendium packs only"
);
assert.equal(mixed.enabledSources[0].weight, 2, "candidate source resolution should preserve source weights");

const manifestWarnings = [];
const manifest = resolveLootCandidateSources(
  {
    ...baseSourceConfig,
    filters: { manifestPackId: "pack.magic" }
  },
  {
    worldItemsSourceId: "__world_items__",
    warnings: manifestWarnings
  }
);

assert.deepEqual(manifestWarnings, [], "enabled manifest-pack selection should not warn");
assert.equal(manifest.manifestPackId, "pack.magic", "manifest pack id should be normalized and returned");
assert.equal(manifest.manifestFolderId, "", "plain manifest pack selections should not resolve as folder selections");
assert.deepEqual(
  manifest.enabledSources.map((entry) => entry.id),
  ["pack.magic"],
  "manifest-pack selection should scope candidate loading to that pack"
);

const folderSelectionWarnings = [];
const folderSelection = resolveLootCandidateSources(
  {
    ...baseSourceConfig,
    filters: { manifestPackId: "world-folder:abc" }
  },
  {
    parseManifestFolderId: (value) => (value === "world-folder:abc" ? "abc" : ""),
    getManifestCompendiumPackId: () => "pack.magic",
    worldItemsSourceId: "__world_items__",
    warnings: folderSelectionWarnings
  }
);

assert.deepEqual(
  folderSelectionWarnings,
  [],
  "legacy world-folder selections should repair to the manifest compendium"
);
assert.equal(
  folderSelection.manifestFolderId,
  "abc",
  "legacy world-folder selection should expose the parsed folder id"
);
assert.equal(
  folderSelection.selectedSourceId,
  "pack.magic",
  "legacy world-folder selections should use the manifest compendium source"
);
assert.deepEqual(
  folderSelection.enabledSources.map((entry) => entry.id),
  ["pack.magic"],
  "legacy world-folder selections should still load from the manifest compendium"
);

const disabledManifestWarnings = [];
const disabledManifest = resolveLootCandidateSources(
  {
    ...baseSourceConfig,
    filters: { manifestPackId: "pack.disabled" }
  },
  {
    worldItemsSourceId: "__world_items__",
    warnings: disabledManifestWarnings
  }
);

assert.deepEqual(disabledManifest.enabledSources, [], "disabled manifest-selected sources should not contribute");
assert.equal(
  disabledManifestWarnings.some((entry) =>
    String(entry).includes("Selected source is currently disabled: pack.disabled")
  ),
  true,
  "disabled manifest-selected sources should explain why no candidates were loaded"
);

process.stdout.write("loot item candidate source validation passed\n");
