import assert from "node:assert/strict";

import {
  buildPartyOperationsApi,
  registerPartyOperationsApi
} from "./core/module-api.js";

{
  const calls = {
    openTabs: [],
    launcher: 0,
    playedMixes: [],
    picks: []
  };
  const api = buildPartyOperationsApi({
    foundryRef: {
      utils: {
        deepClone: (value) => structuredClone(value)
      }
    },
    gameRef: {
      modules: new Map([["party-operations", { active: true, api: {} }]]),
      partyOperations: {}
    },
    globalRef: {
      partyOperations: {}
    },
    moduleId: "party-operations",
    ensureLauncherUi: () => {
      calls.launcher += 1;
      return { ok: true };
    },
    openMainTab: (tabId, options) => calls.openTabs.push({ tabId, options }),
    openGmMerchantsPage: () => "gm-merchants",
    openGmAudioPage: () => "gm-audio",
    refreshOpenApps: () => "refresh",
    getOperationsLedger: () => ({ entries: [1] }),
    runGatherResourcesAction: (options) => options,
    applyOperationalUpkeep: () => "upkeep",
    getInjuryRecoveryState: () => ({ injuries: 1 }),
    applyRecoveryCycle: () => "recover",
    runSessionAutopilot: () => "autopilot",
    undoLastSessionAutopilot: () => "undo",
    syncAllInjuriesToSimpleCalendar: () => "sync-calendar",
    scheduleIntegrationSync: (reason) => reason,
    openPartyOperationsSettingsHub: () => "settings",
    getModuleConfigSnapshot: () => ({ schema: 1 }),
    getPartyOpsConfigSetting: () => ({ mode: "typed" }),
    savePartyOpsConfigSetting: (input) => input,
    getInventoryHookModeSetting: () => "sync",
    setInventoryHookMode: (mode) => mode,
    getLauncherPlacement: () => "floating",
    setLauncherPlacement: (placement) => placement,
    getLootSourceConfig: () => ({ source: "loot" }),
    getCrBracket: (cr) => `cr-${cr}`,
    convertCurrencyToGpEquivalent: (currency) => currency.gp ?? 0,
    rollIndividualTreasure: () => ({ kind: "individual" }),
    rollHoardTreasure: () => ({ kind: "hoard" }),
    applyLootTweakers: (result) => result,
    summarizeLoot: () => "summary",
    generateLootPreviewPayload: (draft) => ({ draft }),
    generateLootFromPackIds: (packIds) => packIds,
    getLootPreviewResult: () => ({ preview: true }),
    diagnoseWorldData: (options) => options ?? { repair: false },
    resetFloatingLauncherPosition: () => "reset-launcher",
    forceLauncherRecovery: (reason) => ({ reason }),
    getLauncherStatusSnapshot: () => ({ placement: "floating" }),
    getAudioLibraryCatalog: ({ includeHidden } = {}) => ({
      items: [
        {
          id: includeHidden ? "hidden-track" : "track-1",
          name: "Campfire",
          category: "Ambient",
          subcategory: "Night",
          tags: ["camp"],
          kind: "music",
          usage: "travel"
        }
      ]
    }),
    scanAudioLibraryCatalog: (options) => options,
    clearAudioLibraryCatalog: () => "clear-audio",
    hideAudioLibraryTrack: (trackId) => trackId,
    restoreHiddenAudioLibraryTrack: (trackId) => trackId,
    restoreAllHiddenAudioLibraryTracks: () => "restore-all",
    getAllAudioMixPresets: () => [{ id: "preset-1" }],
    createAudioMixPresetFromSelection: () => "create-preset",
    deleteSelectedAudioMixPreset: () => "delete-preset",
    addTrackToSelectedAudioMixPreset: (trackId) => trackId,
    queueSelectedTrackNext: (element) => element.dataset.trackId,
    moveTrackToIndexInSelectedAudioMixPreset: (trackId, targetIndex) => ({ trackId, targetIndex }),
    moveTrackToTopInSelectedAudioMixPreset: (trackId) => trackId,
    moveTrackWithinSelectedAudioMixPreset: (trackId, direction) => ({ trackId, direction }),
    removeTrackFromSelectedAudioMixPreset: (trackId) => trackId,
    playAudioMixPresetById: (presetId) => calls.playedMixes.push(presetId),
    getSelectedAudioMixPreset: () => ({ id: "preset-selected" }),
    playNextAudioMixTrack: () => "next-track",
    restartCurrentAudioMixTrack: () => "restart-track",
    stopAudioMixPlayback: () => "stop-track",
    normalizeAudioLibraryKind: (value) => value,
    normalizeAudioLibraryUsage: (value) => value,
    normalizeAudioLibrarySearch: (value) => String(value ?? "").trim().toLowerCase()
  });

  api.restWatch();
  assert.deepEqual(calls.openTabs.at(-1), { tabId: "rest-watch", options: { force: true } });
  assert.deepEqual(api.getOperations(), { entries: [1] });
  assert.deepEqual(api.getTypedConfig(), { mode: "typed" });
  assert.equal(api.audio.queueTrackNext("track-9"), "track-9");
  api.audio.playMix();
  assert.deepEqual(calls.playedMixes, ["preset-selected"]);
  assert.deepEqual(api.audio.pick({ kind: "music", usage: "travel", search: "camp" }), {
    id: "track-1",
    name: "Campfire",
    category: "Ambient",
    subcategory: "Night",
    tags: ["camp"],
    kind: "music",
    usage: "travel"
  });
  assert.equal(api.openRestWatch, api.restWatch);
  assert.equal(api.launcher, api.ensureLauncher);
  assert.deepEqual(api.apiStatus(), {
    moduleActive: true,
    hasGameApi: true,
    hasModuleApi: true,
    hasGlobalApi: true,
    launcher: { ok: true }
  });
}

{
  let payload = null;
  registerPartyOperationsApi({
    attachModuleApi: (input) => {
      payload = input;
      return "attached";
    },
    moduleId: "party-operations",
    api: { ok: true },
    logger: {
      warn: () => {}
    }
  });

  assert.equal(payload.moduleId, "party-operations");
  assert.deepEqual(payload.api, { ok: true });
  assert.equal(typeof payload.onModuleApiAttachFailure, "function");
}

process.stdout.write("module api validation passed\n");
