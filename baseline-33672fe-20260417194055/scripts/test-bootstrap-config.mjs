import assert from "node:assert/strict";

import {
  buildPartyOperationsInitConfig,
  buildPartyOperationsReadyConfig,
  createPartyOperationsHookRegistrar,
  installPartyOperationsAppBehaviors,
  setupPartyOperationsUi
} from "./bootstrap/config.js";

{
  const calls = [];

  installPartyOperationsAppBehaviors({
    installRememberedWindowPositionBehavior(appClass) {
      calls.push(appClass);
    },
    appClasses: ["A", "B", "C"]
  });

  assert.deepEqual(calls, ["A", "B", "C"]);
}

{
  let payload = null;

  setupPartyOperationsUi({
    openMainTab: "open",
    canAccessAllPlayerOps: "access",
    canAccessGmPage: "gm-access",
    ensureLauncherUi: "launcher",
    hideManagedAudioMixPlaylistUi: "hide",
    setTimeoutFn: "timeout",
    documentRef: "document",
    registerUiHooks(options) {
      payload = options;
      return "ui-registered";
    }
  });

  assert.deepEqual(payload, {
    openMainTab: "open",
    canAccessAllPlayerOps: "access",
    canAccessGmPage: "gm-access",
    ensureLauncherUi: "launcher",
    hideManagedAudioMixPlaylistUi: "hide",
    setTimeoutFn: "timeout",
    documentRef: "document"
  });
}

{
  let buildHookModulesPayload = null;
  let createHookRegistrarPayload = null;
  const registerPartyOpsHooks = createPartyOperationsHookRegistrar({
    moduleId: "party-operations",
    settings: { REST_STATE: "restWatchState" },
    buildHookModules(payload) {
      buildHookModulesPayload = payload;
      return ["hook-module"];
    },
    createHookRegistrar(payload) {
      createHookRegistrarPayload = payload;
      return () => payload.getHookModules();
    }
  });

  assert.equal(typeof registerPartyOpsHooks, "function");
  assert.deepEqual(buildHookModulesPayload, null);
  assert.deepEqual(registerPartyOpsHooks(), ["hook-module"]);
  assert.deepEqual(buildHookModulesPayload, {
    moduleId: "party-operations",
    settings: { REST_STATE: "restWatchState" }
  });
  assert.equal(typeof createHookRegistrarPayload.getHookModules, "function");
  assert.deepEqual(createHookRegistrarPayload.getHookModules(), ["hook-module"]);
}

{
  const config = buildPartyOperationsInitConfig({
    registerPartyOperationsApi: "api",
    registerFeatureModules: "features",
    preloadPartyOperationsPartialTemplates: "preload",
    registerPartyOpsSettings: "settings",
    settings: { DEBUG_ENABLED: "debugEnabled" },
    getRefreshScopesForSettingKey: "refresh-scopes",
    refreshOpenApps: "refresh-open-apps",
    registerPartyOpsDataSettings: "data-settings",
    moduleId: "party-operations",
    buildDefaultRestWatchState: "rest-default",
    buildDefaultMarchingOrderState: "march-default",
    buildDefaultActivityState: "activity-default",
    buildDefaultOperationsLedger: "ledger-default",
    buildDefaultInjuryRecoveryState: "injury-default",
    buildDefaultLootSourceConfig: "loot-default",
    buildDefaultAudioLibraryCatalog: "audio-catalog-default",
    buildDefaultAudioLibraryHiddenTrackStore: "audio-hidden-default",
    buildDefaultAudioMixPresetStore: "audio-preset-default",
    syncAudioLibraryDraftFromSettings: "sync-audio",
    registerPartyOpsFeatureSettings: "feature-settings",
    areAdvancedSettingsEnabled: "advanced",
    autoInventoryPackIndexCache: "inventory-cache",
    autoInventoryDefaults: { itemChanceScalar: 1 },
    gatherDefaults: { enabled: true },
    gatherTravelChoices: ["travel"],
    launcherPlacements: ["sidebar"],
    journalVisibilityModes: ["gm"],
    sessionSummaryRangeOptions: ["day"],
    inventoryHookModes: ["auto"],
    ensureLauncherUi: "ensure-launcher",
    resetFloatingLauncherPosition: "reset-launcher",
    refreshScopeKeys: ["loot"],
    openRestWatchUiForCurrentUser: "open-rest",
    openMainTab: "open-tab",
    logger: "logger"
  });

  assert.equal(config.moduleId, "party-operations");
  assert.equal(config.dataSettingsConfig.moduleId, "party-operations");
  assert.equal(config.featureSettingsConfig.moduleId, "party-operations");
  assert.equal(config.featureSettingsConfig.resetFloatingLauncherPosition, "reset-launcher");
}

{
  const config = buildPartyOperationsReadyConfig({
    registerPartyOperationsApi: "api",
    ensureSettingsRegistered: "ensure-settings",
    validatePartyOperationsTemplates: "validate",
    bindPoBrowserBackNavigation: "bind-back-nav",
    setupPartyOperationsUI: "setup-ui",
    ensureLauncherUi: "ensure-launcher",
    forceLauncherRecovery: "force-recovery",
    notifyDailyInjuryReminders: "notify-injuries",
    syncManagedAudioMixPlaybackForCurrentUser: "sync-audio",
    game: "game",
    schedulePendingSopNoteSync: "schedule-notes",
    scheduleIntegrationSync: "schedule-integration",
    handleAutomaticMerchantAutoRefreshTick: "merchant-refresh",
    queueAudioLibraryMetadataWarmup: "audio-warmup",
    ensureOperationsJournalFolderTree: "journal-tree",
    scheduleLootManifestCompendiumTypeFolderSync: "loot-sync",
    registerModuleSocketHandler: "register-socket",
    socketChannel: "module.party-operations",
    socketHandler: "socket-handler",
    registerPartyOpsHooks: "register-hooks",
    setTimeoutFn: "timeout",
    logger: "logger",
    moduleId: "party-operations"
  });

  assert.deepEqual(config.launcherWarmupDelaysMs, [250, 1000, 3000]);
  assert.equal(config.audioLibraryWarmupDelayMs, 900);
  assert.equal(config.registerPartyOpsHooks, "register-hooks");
}
