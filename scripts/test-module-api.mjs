import assert from "node:assert/strict";

import {
  buildPartyOperationsApi,
  registerPartyOperationsApi
} from "./core/module-api.js";
import { attachModuleApi } from "./core/api-registry.js";

{
  const calls = {
    openTabs: [],
    launcherShow: 0,
    playedMixes: [],
    queueInputs: [],
    gatherOptions: []
  };
  const operationsLedgerState = { entries: [1] };
  const moduleConfigState = { schema: 1, nested: { value: true } };
  const typedConfigState = { mode: "typed", nested: { enabled: true } };
  const injuryState = { injuries: 1 };
  const lootSourceConfigState = { source: "loot", nested: { use: true } };
  const lootPreviewState = { preview: true };
  const launcherStatusState = { placement: "floating" };
  const audioCatalogState = {
    items: [
      {
        id: "track-1",
        name: "Campfire",
        category: "Ambient",
        subcategory: "Night",
        tags: ["camp"],
        kind: "music",
        usage: "travel"
      }
    ]
  };
  const perfState = { scopes: { raw: { counters: { foo: { count: 1 } } } } };
  const perfSummary = { scopes: { summary: { counters: { foo: { avg: 1 } } } } };

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
      calls.launcherShow += 1;
      return { ok: true };
    },
    openMainTab: (tabId, options) => calls.openTabs.push({ tabId, options }),
    openGmMerchantsPage: () => "gm-merchants",
    openGmAudioPage: () => "gm-audio",
    refreshOpenApps: () => "refresh",
    getOperationsLedger: () => operationsLedgerState,
    runGatherResourcesAction: (options) => {
      calls.gatherOptions.push(options);
      return options;
    },
    applyOperationalUpkeep: () => "upkeep",
    getInjuryRecoveryState: () => injuryState,
    applyRecoveryCycle: () => "recover",
    runSessionAutopilot: () => "autopilot",
    undoLastSessionAutopilot: () => "undo",
    syncAllInjuriesToSimpleCalendar: () => "sync-calendar",
    scheduleIntegrationSync: (reason) => reason,
    openPartyOperationsSettingsHub: () => "settings",
    getModuleConfigSnapshot: () => moduleConfigState,
    getPartyOpsConfigSetting: () => typedConfigState,
    savePartyOpsConfigSetting: (input) => input,
    getInventoryHookModeSetting: () => "sync",
    setInventoryHookMode: (mode) => mode,
    getLauncherPlacement: () => launcherStatusState.placement,
    setLauncherPlacement: (placement) => placement,
    getLootSourceConfig: () => lootSourceConfigState,
    getCrBracket: (cr) => `cr-${cr}`,
    convertCurrencyToGpEquivalent: (currency) => currency.gp ?? 0,
    rollIndividualTreasure: () => ({ kind: "individual" }),
    rollHoardTreasure: () => ({ kind: "hoard" }),
    applyLootTweakers: (result) => result,
    summarizeLoot: () => "summary",
    generateBoardReadyLootBundle: (draft, options = {}) => ({ draft, options, boardReady: true }),
    generateLootPreviewPayload: (draft) => ({ draft }),
    generateLootFromPackIds: (packIds) => packIds,
    getLootPreviewResult: () => lootPreviewState,
    diagnoseWorldData: (options) => options ?? { repair: false },
    resetFloatingLauncherPosition: () => "reset-launcher",
    forceLauncherRecovery: (reason) => ({ reason }),
    getLauncherStatusSnapshot: () => launcherStatusState,
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
    queueSelectedTrackNext: (input) => {
      calls.queueInputs.push(input);
      return String(input?.dataset?.trackId ?? "");
    },
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
    normalizeAudioLibrarySearch: (value) => String(value ?? "").trim().toLowerCase(),
    getPerfState: () => perfState,
    getPerfSummary: () => perfSummary
  });

  assert.deepEqual(Object.keys(api).sort(), [
    "audio",
    "config",
    "diagnostics",
    "launcher",
    "loot",
    "meta",
    "navigation",
    "operations"
  ]);

  assert.equal(typeof api.restWatch, "undefined");
  assert.equal(typeof api.openRestWatch, "undefined");
  assert.equal(typeof api.gather, "undefined");
  assert.equal(typeof api.perf, "undefined");
  assert.equal(typeof api.apiStatus, "undefined");

  api.navigation.openRestWatch();
  assert.deepEqual(calls.openTabs.at(-1), { tabId: "rest-watch", options: { force: true } });
  api.navigation.openMarchingOrder();
  assert.deepEqual(calls.openTabs.at(-1), { tabId: "marching-order", options: { force: true } });
  api.navigation.openOperations();
  assert.deepEqual(calls.openTabs.at(-1), { tabId: "operations", options: { force: true } });
  api.navigation.openGm();
  assert.deepEqual(calls.openTabs.at(-1), { tabId: "gm", options: { force: true } });

  const ledgerRead = api.operations.getLedger();
  ledgerRead.entries.push(99);
  assert.deepEqual(api.operations.getLedger(), { entries: [1] });
  assert.deepEqual(api.operations.gatherResources({ mode: "quick" }), { mode: "quick" });
  assert.deepEqual(calls.gatherOptions.at(-1), { mode: "quick" });
  assert.equal(api.operations.applyUpkeep(), "upkeep");
  assert.equal(api.operations.runSessionAutopilot(), "autopilot");
  assert.equal(api.operations.undoSessionAutopilot(), "undo");
  assert.deepEqual(api.operations.getInjuryRecovery(), { injuries: 1 });
  assert.equal(api.operations.applyRecoveryCycle(), "recover");
  assert.equal(api.operations.syncInjuryCalendar(), "sync-calendar");

  const configSnapshot = api.config.getSnapshot();
  configSnapshot.nested.value = false;
  assert.deepEqual(api.config.getSnapshot(), { schema: 1, nested: { value: true } });
  assert.deepEqual(api.config.getTyped(), { mode: "typed", nested: { enabled: true } });
  assert.deepEqual(api.config.saveTyped({ enabled: false }), { enabled: false });
  assert.equal(api.config.getInventoryHookMode(), "sync");
  assert.equal(api.config.setInventoryHookMode("off"), "off");

  assert.deepEqual(api.launcher.show(), { ok: true });
  assert.equal(calls.launcherShow, 1);
  assert.equal(api.launcher.getPlacement(), "floating");
  assert.equal(api.launcher.setPlacement("docked"), "docked");
  assert.equal(api.launcher.resetPosition(), "reset-launcher");
  assert.deepEqual(api.launcher.forceRecovery("stuck"), { reason: "stuck" });
  assert.deepEqual(api.launcher.getStatus(), { placement: "floating" });

  const lootSource = api.loot.getSourceConfig();
  lootSource.nested.use = false;
  assert.deepEqual(api.loot.getSourceConfig(), { source: "loot", nested: { use: true } });
  assert.equal(api.loot.getCrBracket(5), "cr-5");
  assert.equal(api.loot.convertCurrencyToGpEquivalent({ gp: 22 }), 22);
  assert.deepEqual(api.loot.rollIndividual(3, 2), { kind: "individual" });
  assert.deepEqual(api.loot.rollHoard(5), { kind: "hoard" });
  assert.deepEqual(api.loot.applyTweakers({ gold: 10 }, []), { gold: 10 });
  assert.equal(api.loot.summarize({}), "summary");
  assert.deepEqual(api.loot.generateBundle({ seed: "abc" }, { runId: "run-1" }), {
    draft: { seed: "abc" },
    options: { runId: "run-1" },
    boardReady: true
  });
  assert.deepEqual(api.loot.preview({ seed: "preview" }), { draft: { seed: "preview" } });
  assert.deepEqual(api.loot.generateFromPackIds(["pack.a"], { cr: 4 }, { label: "x" }), ["pack.a"]);
  assert.deepEqual(api.loot.getPreviewResult(), { preview: true });

  assert.equal(api.audio.queueTrackNext("track-9"), "track-9");
  assert.deepEqual(calls.queueInputs.at(-1), { dataset: { trackId: "track-9" } });
  assert.deepEqual(api.audio.moveTrackToIndex("track-2", 4), { trackId: "track-2", targetIndex: 4 });
  assert.equal(api.audio.moveTrackToTop("track-2"), "track-2");
  assert.deepEqual(api.audio.moveTrack("track-2", "down"), { trackId: "track-2", direction: "down" });
  assert.equal(api.audio.removeTrack("track-2"), "track-2");
  assert.equal(api.audio.clearCatalog(), "clear-audio");
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

  assert.deepEqual(api.diagnostics.diagnoseWorldData({ dryRun: true }), { dryRun: true });
  assert.deepEqual(api.diagnostics.repairWorldData(), { repair: true });
  assert.deepEqual(api.diagnostics.getPerfState(), perfState);
  assert.deepEqual(api.diagnostics.getPerfSummary(), perfSummary);

  assert.deepEqual(api.meta.getStatus(), {
    moduleActive: true,
    hasGameApi: true,
    hasModuleApi: true,
    hasGlobalApi: true
  });
}

{
  const api = { ok: true };
  const moduleRef = { active: true };
  const gameRef = {
    modules: new Map([["party-operations", moduleRef]])
  };
  const globalRoot = { game: gameRef };
  attachModuleApi({
    moduleId: "party-operations",
    api,
    gameRef,
    globalRoot
  });

  assert.equal(gameRef.partyOperations, api);
  assert.equal(gameRef.partyops, api);
  assert.equal(moduleRef.api, api);
  assert.equal(globalRoot.partyOperations, api);
  assert.equal(globalRoot.partyops, api);
  assert.equal(globalRoot.PartyOperations, api);

  const replacementApi = { replaced: true };
  globalRoot.partyOperations = replacementApi;
  assert.equal(gameRef.partyOperations, replacementApi);
  assert.equal(gameRef.partyops, replacementApi);
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
