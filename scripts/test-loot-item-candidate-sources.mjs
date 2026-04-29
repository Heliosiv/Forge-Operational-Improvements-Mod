import assert from "node:assert/strict";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";
import vm from "node:vm";

const moduleSource = readLegacyRuntimeSource("loot-engine");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`async function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = extractFunctionBlock(moduleSource, "buildLootItemCandidates", "getLootRarityKeepPriority");

const packDocs = [
  { name: "Pack Sword", itemValueGp: 1000, itemWeightLb: 3, folder: null },
  { name: "Pack Shield", itemValueGp: 600, itemWeightLb: 6, folder: null }
];
const capturedIncludeModes = [];

const context = vm.createContext({
  LOOT_WORLD_ITEMS_SOURCE_ID: "__world_items__",
  getLootManifestCompendiumPackId: () => "pack.magic",
  game: {
    items: {
      contents: [{ name: "World Torch", itemValueGp: 0.01, itemWeightLb: 1, folder: null }]
    },
    folders: {
      get: () => null
    }
  },
  parseLootWorldItemsFolderFilterId: () => "",
  buildLootWorldItemFolderScopeIds: () => null,
  normalizeLootKeywordTagList: (values = []) => (Array.isArray(values) ? values : []),
  filterItems: (items = []) => (Array.isArray(items) ? items : []),
  buildLootCandidateFromSourceItem: (item, meta, draft, filters) => {
    capturedIncludeModes.push(String(filters?.includeMode ?? ""));
    return {
      name: String(item?.name ?? "Item"),
      sourceId: String(meta?.sourceId ?? ""),
      sourceLabel: String(meta?.sourceLabel ?? ""),
      sourceWeight: Number(meta?.sourceWeight ?? 0),
      fallbackUuidPrefix: String(meta?.fallbackUuidPrefix ?? ""),
      itemValueGp: Number(item?.itemValueGp ?? 0),
      itemWeightLb: Number(item?.itemWeightLb ?? 0),
      baseItemValueGp: Number(item?.itemValueGp ?? 0),
      baseItemWeightLb: Number(item?.itemWeightLb ?? 0)
    };
  },
  buildLootVariableTreasurePools: () => ({}),
  estimateLootVariableTreasureBudgetOutcome: () => null,
  roundLootWeightLb: (value) => Number(value),
  loadItemsFromPack: async (packId) => (packId === "pack.magic" ? packDocs : []),
  logLootBuilderFailure: () => {},
  result: {}
});

vm.runInContext(`${functionBlock}\nresult.buildLootItemCandidates = buildLootItemCandidates;`, context);

const { buildLootItemCandidates } = context.result;

const warnings = [];
const mixedCandidates = await buildLootItemCandidates(
  {
    packs: [
      { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
      { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 }
    ],
    filters: {}
  },
  {},
  warnings
);

assert.equal(warnings.length, 0);
assert.equal(mixedCandidates.length, 2, "World item sources should be ignored once loot uses the compendium source.");
assert.equal(
  mixedCandidates.every((entry) => entry.sourceId === "pack.magic"),
  true,
  "Enabled compendium packs should provide all loot candidates."
);
assert.equal(
  mixedCandidates.find((entry) => entry.sourceId === "pack.magic")?.sourceWeight,
  2,
  "Compendium source weights should flow into generated candidates."
);
assert.equal(
  mixedCandidates.find((entry) => entry.sourceId === "pack.magic")?.fallbackUuidPrefix,
  "Compendium.pack.magic.Item",
  "Compendium candidates should receive a compendium fallback UUID prefix."
);

const manifestCandidates = await buildLootItemCandidates(
  {
    packs: [
      { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
      { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 }
    ],
    filters: {
      manifestPackId: "pack.magic"
    }
  },
  {},
  warnings
);

assert.equal(manifestCandidates.length, 2, "Selecting a compendium manifest pack should still produce candidates.");
assert.equal(
  manifestCandidates.every((entry) => entry.sourceId === "pack.magic"),
  true,
  "A direct manifest-pack selection should stay scoped to that pack."
);

const anyModeCandidates = await buildLootItemCandidates(
  {
    packs: [
      { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
      { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 }
    ],
    filters: {
      keywordIncludeMode: "any"
    }
  },
  {},
  warnings
);

assert.ok(anyModeCandidates.length > 0, "Any-mode filtering should still permit candidate generation.");
assert.equal(
  capturedIncludeModes.includes("any"),
  true,
  "Keyword include mode should flow into candidate filtering as 'any' when configured."
);

const disabledManifestWarnings = [];
const disabledManifestCandidates = await buildLootItemCandidates(
  {
    packs: [
      { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
      { id: "pack.magic", label: "Magic Pack", enabled: false, weight: 2 }
    ],
    filters: {
      manifestPackId: "pack.magic"
    }
  },
  {},
  disabledManifestWarnings
);

assert.equal(
  disabledManifestCandidates.length,
  0,
  "A disabled manifest-selected source should not contribute candidates."
);
assert.equal(
  disabledManifestWarnings.some((entry) => String(entry).includes("Selected source is currently disabled: pack.magic")),
  true,
  "A disabled manifest-selected source should emit a warning to explain missing candidates."
);

process.stdout.write("loot item candidate source validation passed\n");
