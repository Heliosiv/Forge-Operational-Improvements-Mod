import assert from "node:assert/strict";

import { createAudioMixPresetManager } from "./features/audio-preset-manager.js";

function normalizeTrackIds(value) {
  const source = Array.isArray(value) ? value : [value];
  return source
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, rows) => entry && rows.indexOf(entry) === index);
}

function normalizeSearchTokens(value) {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[\s,;]+/g);
  return source
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, rows) => entry && rows.indexOf(entry) === index);
}

function normalizePresetDefinition(input = {}, { isCustom = false, allowTrackIds = false } = {}) {
  const kindFocus = String(input.kindFocus ?? "music").trim() || "music";
  const usageFocus = String(input.usageFocus ?? "general").trim() || "general";
  const playbackMode = String(input.playbackMode ?? (input.repeat ? "repeat" : "single")).trim() === "single" ? "single" : "repeat";
  return {
    id: String(input.id ?? "").trim() || "generated",
    label: String(input.label ?? "").trim() || "New Mix",
    description: String(input.description ?? "").trim() || "Custom ambient playlist.",
    preferredKinds: Array.isArray(input.preferredKinds) ? [...input.preferredKinds] : (kindFocus === "all" ? [] : [kindFocus]),
    preferredUsage: Array.isArray(input.preferredUsage) ? [...input.preferredUsage] : (usageFocus === "all" ? [] : [usageFocus]),
    kindFocus,
    usageFocus,
    searchTokens: normalizeSearchTokens(input.searchTokens ?? []),
    channel: String(input.channel ?? "music").trim() || "music",
    volume: Math.max(0, Math.min(1, Number(input.volume ?? 0.5))),
    fade: Math.max(0, Math.floor(Number(input.fade ?? 1200) || 1200)),
    repeat: playbackMode === "repeat",
    playbackMode,
    isCustom,
    trackIds: (isCustom || allowTrackIds) ? normalizeTrackIds(input.trackIds ?? []) : []
  };
}

function serializePresetForStore(preset = {}, { includeIdentity = true } = {}) {
  const normalized = normalizePresetDefinition(preset, {
    isCustom: Boolean(preset?.isCustom),
    allowTrackIds: true
  });
  const payload = {
    description: normalized.description,
    preferredKinds: normalized.preferredKinds,
    preferredUsage: normalized.preferredUsage,
    kindFocus: normalized.kindFocus,
    usageFocus: normalized.usageFocus,
    searchTokens: normalized.searchTokens,
    channel: normalized.channel,
    volume: normalized.volume,
    fade: normalized.fade,
    repeat: normalized.repeat,
    playbackMode: normalized.playbackMode,
    trackIds: normalized.trackIds
  };
  if (includeIdentity) {
    payload.id = normalized.id;
    payload.label = normalized.label;
  }
  return payload;
}

function createHarness({
  builtInPresets = [normalizePresetDefinition({
    id: "travel",
    label: "Travel",
    description: "Road, wilderness, and marching momentum.",
    kindFocus: "music",
    usageFocus: "travel",
    preferredKinds: ["music"],
    preferredUsage: ["travel"],
    channel: "music",
    volume: 0.5,
    fade: 1200,
    playbackMode: "repeat",
    trackIds: ["road-1"]
  }, { allowTrackIds: true })],
  store: storeSeed = {
    presets: [],
    overrides: {}
  },
  audioLibraryUiState = {
    selectedMixPresetId: "travel",
    selectedTrackId: "",
    selectedMixTrackIds: []
  },
  playbackState = {
    presetId: "travel",
    activeTrackId: "",
    currentIndex: 0
  },
  dialogResult = true
} = {}) {
  let store = {
    presets: Array.isArray(storeSeed?.presets) ? storeSeed.presets.map((preset) => ({ ...preset })) : [],
    overrides: storeSeed?.overrides && typeof storeSeed.overrides === "object" ? { ...storeSeed.overrides } : {}
  };
  const statuses = [];
  const warnings = [];
  const queueSyncs = [];
  const liveVolumeSyncs = [];
  const dialogCalls = [];

  function resolveAllPresets() {
    const builtIn = builtInPresets.map((preset) => normalizePresetDefinition({
      ...preset,
      ...(store.overrides?.[preset.id] ?? {}),
      id: preset.id,
      label: preset.label
    }, { allowTrackIds: true }));
    const custom = (store.presets ?? []).map((preset) => normalizePresetDefinition(preset, {
      isCustom: true,
      allowTrackIds: true
    }));
    return [...builtIn, ...custom];
  }

  const manager = createAudioMixPresetManager({
    foundryRef: {
      utils: {
        randomID() {
          return "seed123";
        },
        deepClone(value) {
          return structuredClone(value);
        }
      }
    },
    windowRef: {
      prompt(message, value) {
        return value;
      }
    },
    uiRef: {
      notifications: {
        warn(message) {
          warnings.push(message);
        }
      }
    },
    dialogClass: {
      async confirm(payload) {
        dialogCalls.push(payload);
        return dialogResult;
      }
    },
    audioLibraryUiState,
    builtInPresets,
    defaultPresetId: builtInPresets[0]?.id ?? "travel",
    canAccessAllPlayerOps() {
      return true;
    },
    getSelectedAudioMixPreset() {
      return resolveAllPresets().find((preset) => preset.id === audioLibraryUiState.selectedMixPresetId) ?? resolveAllPresets()[0];
    },
    getAudioMixPresetById(presetId) {
      return resolveAllPresets().find((preset) => preset.id === presetId) ?? resolveAllPresets()[0];
    },
    async updateStoredAudioMixPresets(mutator) {
      const current = structuredClone(store);
      const next = typeof mutator === "function" ? (mutator(current) ?? current) : current;
      store = {
        presets: Array.isArray(next?.presets) ? next.presets.map((preset) => ({ ...preset })) : [],
        overrides: next?.overrides && typeof next.overrides === "object" ? { ...next.overrides } : {}
      };
      return store;
    },
    serializeAudioMixPresetForStore: serializePresetForStore,
    normalizeAudioMixPresetDefinition: normalizePresetDefinition,
    normalizeAudioMixPresetTrackIds: normalizeTrackIds,
    normalizeAudioLibraryRootPath(value) {
      return String(value ?? "").trim();
    },
    normalizeAudioLibraryKind(value) {
      return String(value ?? "").trim() || "all";
    },
    normalizeAudioLibraryUsage(value) {
      return String(value ?? "").trim() || "all";
    },
    normalizeAudioMixPlaybackMode(value) {
      return String(value ?? "").trim() === "single" ? "single" : "repeat";
    },
    normalizeAudioMixVolume(value, fallback = 0.5) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100));
    },
    normalizeAudioMixPresetSearchTokens: normalizeSearchTokens,
    formatAudioMixPresetSearchTokens(value) {
      return Array.isArray(value) ? value.join(", ") : "";
    },
    inferAudioMixChannelForKind(kindFocus) {
      return String(kindFocus ?? "").trim() === "ambience" ? "environment" : "music";
    },
    setAudioMixStatus(message) {
      statuses.push(message);
    },
    async syncLiveAudioMixPresetVolume(preset) {
      liveVolumeSyncs.push(preset);
    },
    poEscapeHtml(value) {
      return String(value ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    async clearManagedAudioMixQueueForPreset(preset, options) {
      queueSyncs.push({ cleared: true, presetId: preset?.id ?? "", options });
      return true;
    },
    async syncSelectedAudioMixPresetTrackIdsToLiveQueue(trackIds, preset) {
      queueSyncs.push({ trackIds: [...trackIds], presetId: preset?.id ?? "" });
      return true;
    },
    getSelectedAudioMixTrackSelectionIds() {
      return normalizeTrackIds(audioLibraryUiState.selectedMixTrackIds ?? []);
    },
    setSelectedAudioMixTrackSelectionIds(values) {
      audioLibraryUiState.selectedMixTrackIds = normalizeTrackIds(values);
      return audioLibraryUiState.selectedMixTrackIds;
    },
    getAudioMixPlaybackState() {
      return playbackState;
    },
    getAudioLibraryCatalog() {
      return { items: [] };
    }
  });

  return {
    manager,
    audioLibraryUiState,
    statuses,
    warnings,
    queueSyncs,
    liveVolumeSyncs,
    dialogCalls,
    getStore() {
      return structuredClone(store);
    }
  };
}

{
  const harness = createHarness();

  const preset = await harness.manager.createAudioMixPresetFromSelection();
  const store = harness.getStore();

  assert.equal(preset.id, "custom-seed123");
  assert.equal(store.presets.length, 1);
  assert.equal(store.presets[0].id, "custom-seed123");
  assert.equal(harness.audioLibraryUiState.selectedMixPresetId, "custom-seed123");
  assert.equal(harness.statuses.at(-1), "Created and saved custom preset: New Travel Mix");
}

{
  const harness = createHarness();

  await harness.manager.setSelectedAudioMixPresetOption({
    dataset: { field: "volume" },
    value: "75"
  });
  const store = harness.getStore();

  assert.equal(store.overrides.travel.volume, 0.75);
  assert.equal(harness.liveVolumeSyncs.length, 1);
  assert.equal(harness.liveVolumeSyncs[0].id, "travel");
}

{
  const harness = createHarness({
    store: {
      presets: [{
        id: "custom-1",
        label: "Camp",
        description: "Night watch and embers.",
        kindFocus: "music",
        usageFocus: "rest",
        preferredKinds: ["music"],
        preferredUsage: ["rest"],
        searchTokens: ["camp"],
        channel: "music",
        volume: 0.4,
        fade: 900,
        playbackMode: "repeat",
        trackIds: ["track-a", "track-b", "track-c"],
        isCustom: true
      }],
      overrides: {}
    },
    audioLibraryUiState: {
      selectedMixPresetId: "custom-1",
      selectedTrackId: "",
      selectedMixTrackIds: []
    },
    playbackState: {
      presetId: "custom-1",
      activeTrackId: "track-b",
      currentIndex: 1
    }
  });

  const moved = await harness.manager.moveTrackToIndexInSelectedAudioMixPreset("track-c", 0);
  const store = harness.getStore();

  assert.equal(moved, true);
  assert.deepEqual(store.presets[0].trackIds, ["track-c", "track-a", "track-b"]);
  assert.deepEqual(harness.queueSyncs.at(-1), {
    trackIds: ["track-c", "track-a", "track-b"],
    presetId: "custom-1"
  });
}

{
  const harness = createHarness({
    store: {
      presets: [{
        id: "custom-1",
        label: "Camp",
        description: "Night watch and embers.",
        kindFocus: "music",
        usageFocus: "rest",
        preferredKinds: ["music"],
        preferredUsage: ["rest"],
        searchTokens: ["camp"],
        channel: "music",
        volume: 0.4,
        fade: 900,
        playbackMode: "repeat",
        trackIds: ["track-a", "track-b"],
        isCustom: true
      }],
      overrides: {}
    },
    audioLibraryUiState: {
      selectedMixPresetId: "custom-1",
      selectedTrackId: "",
      selectedMixTrackIds: []
    }
  });

  const removed = await harness.manager.deleteSelectedAudioMixPreset();
  const store = harness.getStore();

  assert.equal(removed, true);
  assert.equal(store.presets.length, 0);
  assert.equal(harness.audioLibraryUiState.selectedMixPresetId, "travel");
  assert.equal(harness.statuses.at(-1), "Deleted custom preset and cleared its queue: Camp");
  assert.equal(harness.dialogCalls.length, 1);
}

process.stdout.write("audio preset manager validation passed\n");
