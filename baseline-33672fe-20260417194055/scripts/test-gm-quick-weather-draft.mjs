import assert from "node:assert/strict";

import { createGmQuickWeatherDraftStorage } from "./features/gm-quick-weather-draft.js";

{
  const storageMap = new Map();
  const storage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    },
    removeItem(key) {
      storageMap.delete(key);
    }
  };

  const draftStorage = createGmQuickWeatherDraftStorage({
    storage,
    gameRef: {
      user: { id: "gm-123" }
    }
  });

  assert.equal(draftStorage.getGmQuickWeatherDraftStorageKey(), "po-gm-quick-weather-draft-gm-123");
  assert.equal(draftStorage.getGmQuickWeatherDraft(), null);

  draftStorage.setGmQuickWeatherDraft({
    selectedKey: "stormfront ",
    darkness: "0.5",
    visibilityModifier: "-2",
    note: "Heavy rain incoming",
    presetName: "Storm Front",
    daeChanges: [{ key: "macro.CE", value: "Blinded" }]
  });

  assert.deepEqual(draftStorage.getGmQuickWeatherDraft(), {
    selectedKey: "stormfront",
    darkness: 0.5,
    visibilityModifier: -2,
    note: "Heavy rain incoming",
    presetName: "Storm Front",
    daeChanges: [{ key: "macro.CE", value: "Blinded" }]
  });

  draftStorage.setGmQuickWeatherDraft(null);
  assert.equal(draftStorage.getGmQuickWeatherDraft(), null);
  assert.equal(storage.getItem(draftStorage.getGmQuickWeatherDraftStorageKey()), null);
}

process.stdout.write("gm quick weather draft validation passed\n");