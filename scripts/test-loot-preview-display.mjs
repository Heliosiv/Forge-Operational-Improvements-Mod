import assert from "node:assert/strict";

import {
  LOOT_PREVIEW_SORT_OPTIONS,
  normalizeLootPreviewSort,
  sortLootPreviewItems
} from "./features/loot-preview-display.js";

assert.equal(normalizeLootPreviewSort("value-desc"), "value-desc");
assert.equal(normalizeLootPreviewSort(" VALUE-ASC "), "value-asc");
assert.equal(normalizeLootPreviewSort("unknown"), "generated");
assert.ok(LOOT_PREVIEW_SORT_OPTIONS.some((entry) => entry.value === "generated"));

const rows = [
  { id: "c", name: "Arrows", itemType: "consumable", itemValueGp: 1, quantity: 20 },
  { id: "a", name: "Bow", itemType: "weapon", itemValueGp: 25, quantity: 1 },
  { id: "b", name: "Amethyst", itemType: "treasure", itemValueGp: 10, quantity: 2 }
];

assert.deepEqual(sortLootPreviewItems(rows, "generated").map((entry) => entry.id), ["c", "a", "b"]);
assert.deepEqual(sortLootPreviewItems(rows, "name-asc").map((entry) => entry.id), ["b", "c", "a"]);
assert.deepEqual(sortLootPreviewItems(rows, "type-asc").map((entry) => entry.id), ["c", "b", "a"]);
assert.deepEqual(sortLootPreviewItems(rows, "value-desc").map((entry) => entry.id), ["a", "b", "c"]);
assert.deepEqual(sortLootPreviewItems(rows, "value-asc").map((entry) => entry.id), ["b", "c", "a"]);

process.stdout.write("loot preview display validation passed\n");
