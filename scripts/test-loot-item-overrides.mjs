import assert from "node:assert/strict";
import fs from "node:fs";

import {
  applyLootItemOverridesToDocuments,
  normalizeLootItemOverrideFilter,
  normalizeLootItemOverridePrice,
  normalizeLootItemOverrides,
  resolveLootItemOverrideKey
} from "./features/loot-item-overrides.js";
import {
  buildLootItemOverrideRowsForEditor,
  createLootItemOverrideEditorActions,
  normalizeLootItemOverrideKeyList,
  pruneLootItemOverrideRecord
} from "./features/loot-item-override-editor.js";

const packId = "party-operations.party-operations-loot-manifest";
const plateUuid = `Compendium.${packId}.Item.plate`;
const ropeUuid = `Compendium.${packId}.Item.rope`;

const sourceDocs = [
  {
    _id: "plate",
    uuid: plateUuid,
    name: "Plate Armor",
    type: "equipment",
    system: { price: { value: 1500, denomination: "gp" } },
    flags: { "party-operations": { keywords: ["armor.heavy"], rarity: "common" } }
  },
  {
    _id: "rope",
    uuid: ropeUuid,
    name: "Hempen Rope",
    type: "equipment",
    system: { price: { value: 1, denomination: "gp" } },
    flags: { "party-operations": { keywords: ["gear"], rarity: "common" } }
  }
];

const overrides = normalizeLootItemOverrides({
  [plateUuid]: { priceGp: 2000, disabled: false, updatedAt: 100, updatedBy: "GM" },
  [ropeUuid]: { priceGp: "", disabled: true, updatedAt: 110, updatedBy: "GM" },
  "not-a-compendium-uuid": { priceGp: 1, disabled: true }
});

assert.deepEqual(Object.keys(overrides).sort(), [plateUuid, ropeUuid].sort(), "normalization keeps UUID keyed rows");
assert.equal(overrides[plateUuid].priceGp, 2000, "normalization stores numeric price overrides");
assert.equal(overrides[ropeUuid].priceGp, null, "empty price means use compendium price");
assert.equal(overrides[ropeUuid].disabled, true, "disabled state is retained");
assert.equal(normalizeLootItemOverridePrice(""), null, "blank price normalizes to source price");
assert.equal(normalizeLootItemOverridePrice("-10"), null, "negative price is rejected");
assert.equal(normalizeLootItemOverrideFilter("disabled"), "disabled", "disabled quick filter is supported");
assert.equal(normalizeLootItemOverrideFilter("enabled"), "enabled", "enabled quick filter is supported");

const overriddenDocs = applyLootItemOverridesToDocuments(sourceDocs, overrides, { sourceId: packId });
assert.equal(overriddenDocs.length, 1, "disabled items are removed before candidate construction");
assert.equal(overriddenDocs[0].uuid, plateUuid, "override application keeps the compendium UUID");
assert.equal(overriddenDocs[0].system.price.value, 2000, "price override changes cloned system price");
assert.equal(overriddenDocs[0].system.price.denomination, "gp", "price override writes GP denomination");
assert.equal(overriddenDocs[0].flags["party-operations"].gpValue, 2000, "price override flows into party-ops flags");
assert.equal(sourceDocs[0].system.price.value, 1500, "source compendium-like data is not mutated");
assert.equal(sourceDocs[0].flags["party-operations"].gpValue, undefined, "source flags are not mutated");

const resetDocs = applyLootItemOverridesToDocuments(sourceDocs, { [plateUuid]: null }, { sourceId: packId });
assert.equal(resetDocs.length, 2, "reset restores disabled items when no override remains");
assert.equal(resetDocs[0].system.price.value, 1500, "reset restores source price behavior");

const indexRowWithoutUuid = {
  _id: "plate",
  name: "Plate Armor",
  type: "equipment",
  system: { price: { value: 1500, denomination: "gp" } }
};
assert.equal(
  resolveLootItemOverrideKey(indexRowWithoutUuid, { sourceId: packId }),
  plateUuid,
  "index rows resolve override keys from pack and document id"
);

const merchantCandidates = applyLootItemOverridesToDocuments(sourceDocs, overrides, { sourceId: packId });
assert.equal(
  merchantCandidates[0].system.price.value,
  2000,
  "same cloned override data is suitable for merchant candidate pricing"
);

assert.deepEqual(
  normalizeLootItemOverrideKeyList([plateUuid, "", plateUuid, "not-a-compendium-uuid", ropeUuid]),
  [plateUuid, ropeUuid],
  "bulk key normalization should dedupe valid compendium item override keys"
);
assert.deepEqual(
  pruneLootItemOverrideRecord({ priceGp: "12.5", disabled: false }, { nowMs: 500, userName: "GM Alice" }),
  { priceGp: 12.5, disabled: false, updatedAt: 500, updatedBy: "GM Alice" },
  "override pruning should add audit metadata for retained price overrides"
);
assert.equal(
  pruneLootItemOverrideRecord({ priceGp: "", disabled: false }, { nowMs: 500, userName: "GM Alice" }),
  null,
  "override pruning should remove rows with no price override and no disabled state"
);

const overrideRows = buildLootItemOverrideRowsForEditor({
  documents: sourceDocs,
  overrides,
  uiState: { search: "plate", filter: "modified" },
  sourceId: packId,
  getLootItemGpValueFromData: (data) => data?.system?.price?.value,
  getLootRarityFromData: (data) => data?.flags?.["party-operations"]?.rarity,
  getLootKeywordsFromData: (data) => data?.flags?.["party-operations"]?.keywords ?? [],
  itemTypeLabels: { equipment: "Equipment" },
  getLootRarityLabel: (rarity) => String(rarity).toUpperCase()
});

assert.equal(overrideRows.totalCount, 2, "row builder should count every editable source document");
assert.equal(overrideRows.filteredCount, 1, "row builder should apply explicit search text");
assert.equal(overrideRows.rows[0].name, "Plate Armor", "row builder should expose item names");
assert.equal(overrideRows.rows[0].uuid, plateUuid, "row builder should expose item UUIDs for opening sheets");
assert.equal(overrideRows.rows[0].basePriceLabel, "1,500 gp", "row builder should format base GP values");
assert.equal(overrideRows.rows[0].effectivePriceLabel, "2,000 gp", "row builder should format override GP values");
assert.equal(overrideRows.rows[0].itemTypeLabel, "Equipment", "row builder should use provided item type labels");
assert.equal(overrideRows.rows[0].rarityLabel, "COMMON", "row builder should use provided rarity labels");
assert.equal(overrideRows.enabledCount, 1, "row builder should count enabled items for the filter badge");

const enabledOverrideRows = buildLootItemOverrideRowsForEditor({
  documents: sourceDocs,
  overrides,
  uiState: { filter: "enabled" },
  sourceId: packId,
  getLootItemGpValueFromData: (data) => data?.system?.price?.value,
  getLootRarityFromData: (data) => data?.flags?.["party-operations"]?.rarity,
  getLootKeywordsFromData: (data) => data?.flags?.["party-operations"]?.keywords ?? []
});

assert.equal(enabledOverrideRows.filterEnabled, true, "row builder should mark the enabled quick filter active");
assert.equal(enabledOverrideRows.filteredCount, 1, "enabled quick filter should hide disabled items");
assert.equal(enabledOverrideRows.rows[0].name, "Plate Armor", "enabled quick filter should keep enabled items");

const actionWarnings = [];
const statePatches = [];
const updateCalls = [];
const actions = createLootItemOverrideEditorActions({
  canConfigure: () => true,
  notifyWarn: (message) => actionWarnings.push(message),
  setLootItemOverridesUiState: (patch) => statePatches.push(patch),
  updateLootSourceConfig: async (mutator, options) => {
    const config = { itemOverrides: { [plateUuid]: { priceGp: 2000, disabled: false } } };
    mutator(config);
    updateCalls.push({ config, options });
  },
  refreshScope: "operations",
  now: () => 700,
  getUserName: () => "GM Bob"
});

actions.setLootItemOverrideSearch({ value: "rope" });
actions.setLootItemOverrideFilter({ dataset: { filter: "disabled" } });
assert.deepEqual(
  statePatches,
  [{ search: "rope" }, { filter: "disabled" }],
  "search and filter actions update UI state"
);

await actions.setLootItemOverridePrice({ value: "2500", dataset: { overrideKey: plateUuid } });
assert.equal(updateCalls.at(-1).config.itemOverrides[plateUuid].priceGp, 2500, "price action should update overrides");
assert.equal(updateCalls.at(-1).config.itemOverrides[plateUuid].updatedBy, "GM Bob", "price action records GM name");
assert.deepEqual(
  updateCalls.at(-1).options,
  { refreshScope: "operations", skipLocalRefresh: true },
  "override actions should use the operations refresh scope without a local double refresh"
);

await actions.toggleLootItemOverrideEnabled({ checked: false, dataset: { overrideKey: plateUuid } });
assert.equal(
  updateCalls.at(-1).config.itemOverrides[plateUuid].disabled,
  true,
  "unchecked enabled toggle disables item"
);

await actions.resetLootItemOverride({ dataset: { overrideKey: plateUuid } });
assert.equal(
  Object.hasOwn(updateCalls.at(-1).config.itemOverrides, plateUuid),
  false,
  "single reset action should remove the override"
);

await actions.setLootItemOverridesEnabledByKeys([plateUuid, ropeUuid], false);
assert.equal(
  updateCalls.at(-1).config.itemOverrides[plateUuid].disabled,
  true,
  "bulk disable should update selected keys"
);
assert.equal(
  updateCalls.at(-1).config.itemOverrides[ropeUuid].disabled,
  true,
  "bulk disable should create selected keys"
);

await actions.resetLootItemOverridesByKeys([plateUuid]);
assert.equal(
  Object.hasOwn(updateCalls.at(-1).config.itemOverrides, plateUuid),
  false,
  "bulk reset should delete selected keys"
);
assert.deepEqual(actionWarnings, [], "valid override actions should not warn");

const blockedWarnings = [];
const blockedActions = createLootItemOverrideEditorActions({
  canConfigure: () => false,
  notifyWarn: (message) => blockedWarnings.push(message)
});
await blockedActions.setLootItemOverridePrice({ value: "1", dataset: { overrideKey: plateUuid } });
assert.deepEqual(
  blockedWarnings,
  ["Only the GM can configure item overrides."],
  "blocked override writes should use the existing GM-only warning"
);

const template = fs.readFileSync("templates/gm-loot.hbs", "utf8");
for (const marker of [
  "Item Overrides",
  "apply-loot-item-override-search",
  "data-po-loot-override-search-input",
  "set-loot-item-override-filter",
  "set-loot-item-override-price",
  "toggle-loot-item-override-enabled",
  "reset-loot-item-override",
  'data-po-scroll-preserve="loot-item-overrides"',
  "data-po-loot-override-select",
  "enable-selected-loot-item-overrides",
  "disable-selected-loot-item-overrides",
  "reset-selected-loot-item-overrides",
  'data-action="open-loot-item"',
  'data-uuid="{{uuid}}"',
  'data-filter="enabled"',
  "filterEnabled",
  "modifiedCount",
  "disabledCount",
  "enabledCount"
]) {
  assert.ok(template.includes(marker), `template includes ${marker}`);
}

process.stdout.write("loot item override checks passed\n");
