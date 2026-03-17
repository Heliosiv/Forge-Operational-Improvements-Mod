import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

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

const context = vm.createContext({
  LOOT_WORLD_ITEMS_SOURCE_ID: "__world_items__",
  game: {
    items: {
      contents: [
        { name: "World Torch", itemValueGp: 0.01, itemWeightLb: 1, folder: null }
      ]
    },
    folders: {
      get: () => null
    }
  },
  parseLootWorldItemsFolderFilterId: () => "",
  buildLootWorldItemFolderScopeIds: () => null,
  normalizeLootKeywordTagList: (values = []) => (Array.isArray(values) ? values : []),
  filterItems: (items = []) => (Array.isArray(items) ? items : []),
  buildLootCandidateFromSourceItem: (item, meta) => ({
    name: String(item?.name ?? "Item"),
    sourceId: String(meta?.sourceId ?? ""),
    sourceLabel: String(meta?.sourceLabel ?? ""),
    sourceWeight: Number(meta?.sourceWeight ?? 0),
    fallbackUuidPrefix: String(meta?.fallbackUuidPrefix ?? ""),
    itemValueGp: Number(item?.itemValueGp ?? 0),
    itemWeightLb: Number(item?.itemWeightLb ?? 0),
    baseItemValueGp: Number(item?.itemValueGp ?? 0),
    baseItemWeightLb: Number(item?.itemWeightLb ?? 0)
  }),
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
const mixedCandidates = await buildLootItemCandidates({
  packs: [
    { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
    { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 }
  ],
  filters: {}
}, {}, warnings);

assert.equal(warnings.length, 0);
assert.equal(mixedCandidates.length, 3, "Enabled world and compendium sources should both contribute candidates.");
assert.equal(
  mixedCandidates.some((entry) => entry.sourceId === "pack.magic" && entry.name === "Pack Sword"),
  true,
  "Enabled compendium packs should provide loot candidates."
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

const manifestCandidates = await buildLootItemCandidates({
  packs: [
    { id: "__world_items__", label: "World Item Directory", enabled: true, weight: 1 },
    { id: "pack.magic", label: "Magic Pack", enabled: true, weight: 2 }
  ],
  filters: {
    manifestPackId: "pack.magic"
  }
}, {}, warnings);

assert.equal(manifestCandidates.length, 2, "Selecting a compendium manifest pack should still produce candidates.");
assert.equal(
  manifestCandidates.every((entry) => entry.sourceId === "pack.magic"),
  true,
  "A direct manifest-pack selection should stay scoped to that pack."
);

process.stdout.write("loot item candidate source validation passed\n");
