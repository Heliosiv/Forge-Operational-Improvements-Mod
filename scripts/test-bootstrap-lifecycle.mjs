import assert from "node:assert/strict";

import { runPartyOperationsInit, runPartyOperationsReady } from "./core/lifecycle.js";
import { createPartyOperationsSocketMessageHandler } from "./core/socket-message-handler.js";

{
  const callOrder = [];
  const refreshes = [];
  let onSettingsChanged = null;
  let dataSettingsConfig = null;
  let featureSettingsConfig = null;

  runPartyOperationsInit({
    registerPartyOperationsApi() {
      callOrder.push("api");
    },
    registerFeatureModules() {
      callOrder.push("features");
    },
    preloadPartyOperationsPartialTemplates() {
      callOrder.push("preload");
      return Promise.resolve();
    },
    registerPartyOpsSettings(callback) {
      callOrder.push("settings");
      onSettingsChanged = callback;
    },
    settings: {
      DEBUG_ENABLED: "debugEnabled"
    },
    getRefreshScopesForSettingKey(key) {
      return [`scope:${key}`];
    },
    refreshOpenApps(payload) {
      refreshes.push(payload);
    },
    registerPartyOpsDataSettings(config) {
      callOrder.push("data");
      dataSettingsConfig = config;
    },
    dataSettingsConfig: {
      moduleId: "party-operations",
      settings: {}
    },
    syncAudioLibraryDraftFromSettings() {
      callOrder.push("sync-audio");
    },
    registerPartyOpsFeatureSettings(config) {
      callOrder.push("feature-settings");
      featureSettingsConfig = config;
    },
    featureSettingsConfig: {
      moduleId: "party-operations",
      settings: {}
    }
  });

  assert.deepEqual(callOrder, [
    "api",
    "features",
    "preload",
    "settings",
    "data",
    "sync-audio",
    "feature-settings"
  ]);
  assert.equal(typeof onSettingsChanged, "function");
  assert.equal(dataSettingsConfig?.moduleId, "party-operations");
  assert.equal(featureSettingsConfig?.moduleId, "party-operations");

  onSettingsChanged("lootConfig");
  onSettingsChanged("debugEnabled");

  assert.deepEqual(refreshes, [
    { scopes: ["scope:lootConfig"] }
  ]);
}

{
  const scheduledDelays = [];
  const socketRegistrations = [];
  const calls = {
    api: 0,
    validate: 0,
    bindBackNav: 0,
    setupUi: 0,
    ensureLauncherUi: 0,
    forceLauncherRecovery: [],
    notifyDailyInjuryReminders: 0,
    syncManagedAudio: 0,
    schedulePendingSopNoteSync: [],
    scheduleIntegrationSync: [],
    autoRefreshTick: 0,
    queueAudioWarmup: [],
    ensureJournalTree: 0,
    scheduleCompendiumSync: [],
    registerHooks: 0
  };

  runPartyOperationsReady({
    registerPartyOperationsApi() {
      calls.api += 1;
    },
    validatePartyOperationsTemplates() {
      calls.validate += 1;
      return Promise.resolve();
    },
    bindPoBrowserBackNavigation() {
      calls.bindBackNav += 1;
    },
    setupPartyOperationsUI() {
      calls.setupUi += 1;
    },
    ensureLauncherUi() {
      calls.ensureLauncherUi += 1;
    },
    forceLauncherRecovery(reason) {
      calls.forceLauncherRecovery.push(reason);
      return Promise.resolve();
    },
    notifyDailyInjuryReminders() {
      calls.notifyDailyInjuryReminders += 1;
    },
    syncManagedAudioMixPlaybackForCurrentUser() {
      calls.syncManagedAudio += 1;
      return Promise.resolve();
    },
    game: {
      user: {
        isGM: false
      }
    },
    schedulePendingSopNoteSync(reason) {
      calls.schedulePendingSopNoteSync.push(reason);
    },
    scheduleIntegrationSync(reason) {
      calls.scheduleIntegrationSync.push(reason);
    },
    handleAutomaticMerchantAutoRefreshTick() {
      calls.autoRefreshTick += 1;
      return Promise.resolve();
    },
    queueAudioLibraryMetadataWarmup(options) {
      calls.queueAudioWarmup.push(options);
    },
    ensureOperationsJournalFolderTree() {
      calls.ensureJournalTree += 1;
      return Promise.resolve();
    },
    scheduleLootManifestCompendiumTypeFolderSync(reason) {
      calls.scheduleCompendiumSync.push(reason);
      return Promise.resolve();
    },
    registerModuleSocketHandler(payload) {
      socketRegistrations.push(payload);
    },
    socketChannel: "module.party-operations",
    socketHandler: "socket-handler",
    registerPartyOpsHooks() {
      calls.registerHooks += 1;
    },
    setTimeoutFn(callback, delayMs) {
      scheduledDelays.push(delayMs);
      callback();
    }
  });

  assert.equal(calls.api, 1);
  assert.equal(calls.validate, 1);
  assert.equal(calls.bindBackNav, 1);
  assert.equal(calls.setupUi, 1);
  assert.equal(calls.ensureLauncherUi, 4);
  assert.deepEqual(calls.forceLauncherRecovery, ["ready-self-heal"]);
  assert.equal(calls.notifyDailyInjuryReminders, 1);
  assert.equal(calls.syncManagedAudio, 1);
  assert.deepEqual(calls.schedulePendingSopNoteSync, ["ready"]);
  assert.deepEqual(calls.scheduleIntegrationSync, []);
  assert.equal(calls.autoRefreshTick, 0);
  assert.deepEqual(calls.queueAudioWarmup, []);
  assert.equal(calls.ensureJournalTree, 0);
  assert.deepEqual(calls.scheduleCompendiumSync, []);
  assert.deepEqual(scheduledDelays, [250, 1000, 3000, 4200, 450]);
  assert.deepEqual(socketRegistrations, [
    {
      channel: "module.party-operations",
      handler: "socket-handler"
    }
  ]);
  assert.equal(calls.registerHooks, 1);
}

{
  const scheduledDelays = [];
  const calls = {
    schedulePendingSopNoteSync: [],
    scheduleIntegrationSync: [],
    autoRefreshTick: 0,
    queueAudioWarmup: [],
    ensureJournalTree: 0,
    scheduleCompendiumSync: []
  };

  runPartyOperationsReady({
    registerPartyOperationsApi() {},
    validatePartyOperationsTemplates() {
      return Promise.resolve();
    },
    bindPoBrowserBackNavigation() {},
    setupPartyOperationsUI() {},
    ensureLauncherUi() {},
    forceLauncherRecovery() {
      return Promise.resolve();
    },
    notifyDailyInjuryReminders() {},
    syncManagedAudioMixPlaybackForCurrentUser() {
      return Promise.resolve();
    },
    game: {
      user: {
        isGM: true
      }
    },
    schedulePendingSopNoteSync(reason) {
      calls.schedulePendingSopNoteSync.push(reason);
    },
    scheduleIntegrationSync(reason) {
      calls.scheduleIntegrationSync.push(reason);
    },
    handleAutomaticMerchantAutoRefreshTick() {
      calls.autoRefreshTick += 1;
      return Promise.resolve();
    },
    queueAudioLibraryMetadataWarmup(options) {
      calls.queueAudioWarmup.push(options);
    },
    ensureOperationsJournalFolderTree() {
      calls.ensureJournalTree += 1;
      return Promise.resolve();
    },
    scheduleLootManifestCompendiumTypeFolderSync(reason) {
      calls.scheduleCompendiumSync.push(reason);
      return Promise.resolve();
    },
    registerModuleSocketHandler() {},
    socketChannel: "module.party-operations",
    socketHandler: "socket-handler",
    registerPartyOpsHooks() {},
    setTimeoutFn(callback, delayMs) {
      scheduledDelays.push(delayMs);
      callback();
    }
  });

  assert.deepEqual(calls.schedulePendingSopNoteSync, []);
  assert.deepEqual(calls.scheduleIntegrationSync, ["ready"]);
  assert.equal(calls.autoRefreshTick, 1);
  assert.deepEqual(calls.queueAudioWarmup, [{ delayMs: 0 }]);
  assert.equal(calls.ensureJournalTree, 1);
  assert.deepEqual(calls.scheduleCompendiumSync, ["ready"]);
  assert.deepEqual(scheduledDelays, [250, 1000, 3000, 4200, 450, 900]);
}

{
  const gmGame = {
    user: {
      isGM: true
    }
  };
  const gatherRequests = [];
  const yieldPrompts = [];
  const resolvedYieldResponses = [];
  const routedMessages = [];

  const handler = createPartyOperationsSocketMessageHandler({
    game: gmGame,
    applyPlayerGatherRequest(message) {
      gatherRequests.push(message);
      return Promise.resolve();
    },
    promptLocalGatherYieldRoll(message) {
      yieldPrompts.push(message);
      return Promise.resolve();
    },
    resolvePendingGatherYieldRequest(requestId, payload) {
      resolvedYieldResponses.push({ requestId, payload });
    },
    routeSocketDeps: {
      settings: {
        moduleId: "party-operations"
      }
    },
    routeSocketMessage(message, deps) {
      routedMessages.push({ message, deps });
      return "routed";
    }
  });

  await handler({ type: "ops:gather-request", requestId: "g-1" });
  await handler({ type: "ops:gather-yield-request", requestId: "g-2" });
  await handler({ type: "ops:gather-yield-response", requestId: "g-3" });
  const routedResult = await handler({ type: "refresh" });

  assert.deepEqual(gatherRequests, [{ type: "ops:gather-request", requestId: "g-1" }]);
  assert.deepEqual(yieldPrompts, [{ type: "ops:gather-yield-request", requestId: "g-2" }]);
  assert.deepEqual(resolvedYieldResponses, [
    {
      requestId: "g-3",
      payload: { type: "ops:gather-yield-response", requestId: "g-3" }
    }
  ]);
  assert.equal(routedResult, "routed");
  assert.deepEqual(routedMessages, [
    {
      message: { type: "refresh" },
      deps: {
        game: gmGame,
        settings: {
          moduleId: "party-operations"
        }
      }
    }
  ]);
}

{
  const nonGmHandler = createPartyOperationsSocketMessageHandler({
    game: {
      user: {
        isGM: false
      }
    },
    applyPlayerGatherRequest() {
      throw new Error("Non-GM gather requests should not be applied");
    },
    promptLocalGatherYieldRoll() {
      return Promise.resolve();
    },
    resolvePendingGatherYieldRequest() {
      throw new Error("Non-GM gather yield responses should not be resolved");
    },
    routeSocketMessage() {
      throw new Error("Gather messages should not be routed");
    }
  });

  await nonGmHandler({ type: "ops:gather-request" });
  await nonGmHandler({ type: "ops:gather-yield-response", requestId: "ignored" });
}

process.stdout.write("bootstrap lifecycle validation passed\n");
