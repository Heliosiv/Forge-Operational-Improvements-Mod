import assert from "node:assert/strict";

import { createLootPreviewDraftStorage } from "./features/loot-preview-draft-storage.js";

{
  const storageMap = new Map();
  const storage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    }
  };

  const normalizeLootPreviewDraft = (draft = {}) => ({
    mode: String(draft?.mode ?? "horde").trim().toLowerCase() || "horde",
    creatures: Math.max(1, Number(draft?.creatures ?? 1) || 1),
    seed: String(draft?.seed ?? "").trim()
  });

  const draftStorage = createLootPreviewDraftStorage({
    storage,
    gameRef: {
      user: { id: "gm-preview" }
    },
    normalizeLootPreviewDraft
  });

  assert.equal(draftStorage.getLootPreviewDraftStorageKey(), "po-loot-preview-draft-gm-preview");
  assert.deepEqual(draftStorage.getLootPreviewDraft(), {
    mode: "horde",
    creatures: 1,
    seed: ""
  });

  draftStorage.setLootPreviewDraft({
    mode: " encounter ",
    creatures: "4",
    seed: " abc123 "
  });

  assert.deepEqual(draftStorage.getLootPreviewDraft(), {
    mode: "encounter",
    creatures: 4,
    seed: "abc123"
  });

  storage.setItem(draftStorage.getLootPreviewDraftStorageKey(), "not-json");
  assert.deepEqual(draftStorage.getLootPreviewDraft(), {
    mode: "horde",
    creatures: 1,
    seed: ""
  });
}

process.stdout.write("loot preview draft storage validation passed\n");