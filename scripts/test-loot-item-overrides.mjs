import assert from "node:assert/strict";
import fs from "node:fs";

import {
  applyLootItemOverridesToDocuments,
  normalizeLootItemOverrideFilter,
  normalizeLootItemOverridePrice,
  normalizeLootItemOverrides,
  resolveLootItemOverrideKey
} from "./features/loot-item-overrides.js";

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

const template = fs.readFileSync("templates/gm-loot.hbs", "utf8");
for (const marker of [
  "Item Overrides",
  "set-loot-item-override-search",
  "set-loot-item-override-filter",
  "set-loot-item-override-price",
  "toggle-loot-item-override-enabled",
  "reset-loot-item-override",
  "modifiedCount",
  "disabledCount"
]) {
  assert.ok(template.includes(marker), `template includes ${marker}`);
}

process.stdout.write("loot item override checks passed\n");
