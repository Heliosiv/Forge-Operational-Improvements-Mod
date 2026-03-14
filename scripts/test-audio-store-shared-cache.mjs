import assert from "node:assert/strict";

import { createAudioStore } from "./features/audio-store.js";

function createStorageRef(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    dump(key) {
      return store.get(key) ?? null;
    }
  };
}

function createSettingsAccessor(values = {}) {
  return {
    get(moduleId, key) {
      return values[`${moduleId}.${key}`];
    }
  };
}

function createStore({
  worldValues = {},
  sharedState = null,
  audioLibraryUiState = {
    draft: { source: "data", rootPath: "" },
    selectedMixPresetId: "travel"
  }
} = {}) {
  const storageRef = createStorageRef(sharedState == null
    ? {}
    : {
      "party-operations.sharedAudioState": JSON.stringify(sharedState)
    });

  const store = createAudioStore({
    storageRef,
    gameRef: {
      settings: createSettingsAccessor(worldValues)
    },
    moduleId: "party-operations",
    settings: {
      AUDIO_LIBRARY_SOURCE: "audioLibrarySource",
      AUDIO_LIBRARY_ROOT: "audioLibraryRoot",
      AUDIO_LIBRARY_CATALOG: "audioLibraryCatalog",
      AUDIO_LIBRARY_HIDDEN_TRACKS: "audioLibraryHiddenTracks",
      AUDIO_MIX_PRESETS: "audioMixPresets"
    },
    refreshScopeKeys: {},
    audioLibraryUiState,
    audioLibraryDefaultSource: "data",
    audioLibraryVersion: 1,
    audioLibraryHiddenTrackStoreVersion: 1,
    audioLibraryExtensions: ["mp3", "ogg"],
    audioMixPresetStoreVersion: 1,
    audioMixBuiltInPresets: [
      { id: "travel", label: "Travel", description: "Travel mix.", preferredKinds: ["music"], preferredUsage: ["travel"], repeat: true },
      { id: "night", label: "Night", description: "Night mix.", preferredKinds: ["music"], preferredUsage: ["rest"], repeat: true }
    ],
    audioMixPresetDefaultId: "travel",
    normalizeAudioMixChannel(value) {
      return String(value ?? "music").trim() || "music";
    },
    normalizeAudioMixPlaybackMode(value) {
      return String(value ?? "").trim().toLowerCase() === "single" ? "single" : "repeat";
    },
    inferAudioMixChannelForKind() {
      return "music";
    },
    normalizeAudioMixPresetSearchTokens(value) {
      return Array.isArray(value)
        ? value.map((entry) => String(entry ?? "").trim()).filter(Boolean)
        : String(value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
    },
    normalizeAudioLibraryRootPath(value) {
      return String(value ?? "").trim().replace(/\\/g, "/");
    },
    normalizeAudioLibraryKind(value) {
      const normalized = String(value ?? "").trim().toLowerCase();
      return normalized || "all";
    },
    normalizeAudioLibraryUsage(value) {
      const normalized = String(value ?? "").trim().toLowerCase();
      return normalized || "all";
    },
    normalizeAudioLibraryDurationSeconds(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    },
    normalizeAudioLibraryDurationResolvedAt(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
    },
    safeDecodeAudioText(value) {
      return String(value ?? "");
    },
    async setModuleSettingWithLocalRefreshSuppressed() {},
    refreshOpenApps() {},
    emitSocketRefresh() {}
  });

  return { store, storageRef, audioLibraryUiState };
}

{
  const { store, audioLibraryUiState } = createStore({
    sharedState: {
      catalog: {
        source: "data",
        rootPath: "assets/audio/shared-pack",
        scannedAt: 123,
        scannedBy: "GM",
        items: [
          {
            id: "assets/audio/shared-pack/night.ogg",
            path: "assets/audio/shared-pack/night.ogg",
            name: "Night",
            category: "Ambient",
            kind: "music",
            usage: "rest"
          }
        ]
      },
      mixPresets: {
        presets: [
          {
            id: "campfire",
            label: "Campfire",
            description: "Saved queue.",
            kindFocus: "music",
            usageFocus: "rest",
            searchTokens: ["night"],
            trackIds: ["assets/audio/shared-pack/night.ogg"],
            isCustom: true
          }
        ]
      },
      selectedMixPresetId: "campfire"
    }
  });

  const catalog = store.getStoredAudioLibraryCatalog();
  assert.equal(catalog.items.length, 1);
  assert.equal(catalog.rootPath, "assets/audio/shared-pack");

  store.syncAudioLibraryDraftFromSettings();
  assert.equal(audioLibraryUiState.draft.rootPath, "assets/audio/shared-pack");
  assert.equal(audioLibraryUiState.selectedMixPresetId, "campfire");
  assert.equal(store.getAudioMixPresetById("campfire")?.id, "campfire");
}

{
  const { store, storageRef, audioLibraryUiState } = createStore({
    worldValues: {
      "party-operations.audioLibrarySource": "data",
      "party-operations.audioLibraryRoot": "assets/audio/world-pack",
      "party-operations.audioLibraryCatalog": {
        source: "data",
        rootPath: "assets/audio/world-pack",
        scannedAt: 456,
        scannedBy: "GM",
        items: [
          {
            id: "assets/audio/world-pack/dawn.mp3",
            path: "assets/audio/world-pack/dawn.mp3",
            name: "Dawn",
            category: "Ambient",
            kind: "music",
            usage: "travel"
          }
        ]
      },
      "party-operations.audioLibraryHiddenTracks": {
        trackIds: ["assets/audio/world-pack/dawn.mp3"]
      },
      "party-operations.audioMixPresets": {
        presets: [
          {
            id: "world-custom",
            label: "World Custom",
            description: "World queue.",
            kindFocus: "music",
            usageFocus: "travel",
            trackIds: ["assets/audio/world-pack/dawn.mp3"],
            isCustom: true
          }
        ]
      }
    },
    audioLibraryUiState: {
      draft: { source: "data", rootPath: "" },
      selectedMixPresetId: "world-custom"
    }
  });

  store.syncAudioLibraryDraftFromSettings();
  const sharedState = JSON.parse(storageRef.dump("party-operations.sharedAudioState"));
  assert.equal(sharedState.catalog.rootPath, "assets/audio/world-pack");
  assert.deepEqual(sharedState.hiddenTracks.trackIds, ["assets/audio/world-pack/dawn.mp3"]);
  assert.equal(sharedState.mixPresets.presets[0].id, "world-custom");
  assert.equal(sharedState.selectedMixPresetId, "world-custom");
  assert.equal(audioLibraryUiState.draft.rootPath, "assets/audio/world-pack");
}

process.stdout.write("audio store shared-cache validation passed\n");
