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
    presetName: "Storm Front"
  });

  assert.deepEqual(draftStorage.getGmQuickWeatherDraft(), {
    selectedKey: "stormfront",
    darkness: 0.5,
    visibilityModifier: -2,
    note: "Heavy rain incoming",
    presetName: "Storm Front"
  });

  draftStorage.setGmQuickWeatherDraft(null);
  assert.equal(draftStorage.getGmQuickWeatherDraft(), null);
  assert.equal(storage.getItem(draftStorage.getGmQuickWeatherDraftStorageKey()), null);
}

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
      user: { id: "gm-legacy" }
    }
  });

  storage.setItem(draftStorage.getGmQuickWeatherDraftStorageKey(), JSON.stringify({
    selectedKey: " dust-storm ",
    darkness: "1.8",
    visibilityModifier: "-9.2",
    note: "Legacy session draft",
    presetName: "Dust Storm",
    daeChanges: [{ key: "system.speed", value: "-10" }]
  }));

  assert.deepEqual(draftStorage.getGmQuickWeatherDraft(), {
    selectedKey: "dust-storm",
    darkness: 1,
    visibilityModifier: -5,
    note: "Legacy session draft",
    presetName: "Dust Storm"
  });

  draftStorage.setGmQuickWeatherDraft({
    selectedKey: "fog-bank",
    darkness: "oops",
    visibilityModifier: "2.9",
    note: "Rounded visibility",
    presetName: "Fog Bank",
    daeChanges: [{ key: "ignored", value: "1" }]
  });

  assert.deepEqual(JSON.parse(storage.getItem(draftStorage.getGmQuickWeatherDraftStorageKey())), {
    selectedKey: "fog-bank",
    darkness: 0,
    visibilityModifier: 2,
    note: "Rounded visibility",
    presetName: "Fog Bank"
  });
}

process.stdout.write("gm quick weather draft validation passed\n");
