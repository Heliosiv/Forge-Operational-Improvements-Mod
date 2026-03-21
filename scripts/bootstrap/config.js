import { buildPartyOpsRuntimeHookModules, createPartyOpsHookRegistrar } from "../hooks/runtime-hooks.js";
import { registerPartyOperationsUiHooks } from "../hooks/ui-hooks.js";

export function setupPartyOperationsUi({
  openMainTab,
  canAccessAllPlayerOps,
  canAccessGmPage = canAccessAllPlayerOps,
  ensureLauncherUi,
  hideManagedAudioMixPlaylistUi,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window),
  documentRef = globalThis.document,
  registerUiHooks = registerPartyOperationsUiHooks
} = {}) {
  return registerUiHooks({
    openMainTab,
    canAccessAllPlayerOps,
    canAccessGmPage,
    ensureLauncherUi,
    hideManagedAudioMixPlaylistUi,
    setTimeoutFn,
    documentRef
  });
}

export function createPartyOperationsHookRegistrar({
  buildHookModules = buildPartyOpsRuntimeHookModules,
  createHookRegistrar = createPartyOpsHookRegistrar,
  ...hookModuleDeps
} = {}) {
  return createHookRegistrar({
    getHookModules: () => buildHookModules(hookModuleDeps)
  });
}

export function installPartyOperationsAppBehaviors({
  installRememberedWindowPositionBehavior,
  appClasses = []
} = {}) {
  if (typeof installRememberedWindowPositionBehavior !== "function") return;
  for (const appClass of appClasses) {
    installRememberedWindowPositionBehavior(appClass);
  }
}

export function buildPartyOperationsInitConfig({
  registerPartyOperationsApi,
  registerFeatureModules,
  preloadPartyOperationsPartialTemplates,
  registerPartyOpsSettings,
  settings,
  getRefreshScopesForSettingKey,
  refreshOpenApps,
  registerPartyOpsDataSettings,
  moduleId,
  buildDefaultRestWatchState,
  buildDefaultMarchingOrderState,
  buildDefaultActivityState,
  buildDefaultOperationsLedger,
  buildDefaultInjuryRecoveryState,
  buildDefaultLootSourceConfig,
  buildDefaultAudioLibraryCatalog,
  buildDefaultAudioLibraryHiddenTrackStore,
  buildDefaultAudioMixPresetStore,
  syncAudioLibraryDraftFromSettings,
  registerPartyOpsFeatureSettings,
  areAdvancedSettingsEnabled,
  autoInventoryPackIndexCache,
  autoInventoryDefaults,
  gatherDefaults,
  gatherTravelChoices,
  launcherPlacements,
  journalVisibilityModes,
  sessionSummaryRangeOptions,
  inventoryHookModes,
  ensureLauncherUi,
  resetFloatingLauncherPosition,
  refreshScopeKeys,
  openRestWatchUiForCurrentUser,
  openMainTab,
  logger
} = {}) {
  return {
    registerPartyOperationsApi,
    registerFeatureModules,
    preloadPartyOperationsPartialTemplates,
    registerPartyOpsSettings,
    settings,
    getRefreshScopesForSettingKey,
    refreshOpenApps,
    registerPartyOpsDataSettings,
    dataSettingsConfig: {
      moduleId,
      settings,
      buildDefaultRestWatchState,
      buildDefaultMarchingOrderState,
      buildDefaultActivityState,
      buildDefaultOperationsLedger,
      buildDefaultInjuryRecoveryState,
      buildDefaultLootSourceConfig,
      buildDefaultAudioLibraryCatalog,
      buildDefaultAudioLibraryHiddenTrackStore,
      buildDefaultAudioMixPresetStore
    },
    syncAudioLibraryDraftFromSettings,
    registerPartyOpsFeatureSettings,
    featureSettingsConfig: {
      moduleId,
      settings,
      areAdvancedSettingsEnabled,
      autoInventoryPackIndexCache,
      autoInventoryDefaults,
      gatherDefaults,
      gatherTravelChoices,
      launcherPlacements,
      journalVisibilityModes,
      sessionSummaryRangeOptions,
      inventoryHookModes,
      ensureLauncherUi,
      resetFloatingLauncherPosition,
      refreshOpenApps,
      refreshScopeKeys,
      openRestWatchUiForCurrentUser,
      openMainTab
    },
    logger,
    moduleId
  };
}

export function buildPartyOperationsReadyConfig({
  registerPartyOperationsApi,
  ensureSettingsRegistered,
  validatePartyOperationsTemplates,
  setupPartyOperationsUI,
  ensureLauncherUi,
  forceLauncherRecovery,
  notifyDailyInjuryReminders,
  syncManagedAudioMixPlaybackForCurrentUser,
  game,
  schedulePendingSopNoteSync,
  scheduleIntegrationSync,
  handleAutomaticMerchantAutoRefreshTick,
  queueAudioLibraryMetadataWarmup,
  ensureOperationsJournalFolderTree,
  scheduleLootManifestCompendiumTypeFolderSync,
  registerModuleSocketHandler,
  socketChannel,
  socketHandler,
  registerPartyOpsHooks,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window),
  logger,
  moduleId,
  launcherWarmupDelaysMs = [250, 1000, 3000],
  launcherSelfHealDelayMs = 4200,
  managedAudioSyncDelayMs = 450,
  audioLibraryWarmupDelayMs = 900
} = {}) {
  return {
    registerPartyOperationsApi,
    ensureSettingsRegistered,
    validatePartyOperationsTemplates,
    setupPartyOperationsUI,
    ensureLauncherUi,
    launcherWarmupDelaysMs,
    launcherSelfHealDelayMs,
    forceLauncherRecovery,
    notifyDailyInjuryReminders,
    managedAudioSyncDelayMs,
    syncManagedAudioMixPlaybackForCurrentUser,
    game,
    schedulePendingSopNoteSync,
    scheduleIntegrationSync,
    handleAutomaticMerchantAutoRefreshTick,
    audioLibraryWarmupDelayMs,
    queueAudioLibraryMetadataWarmup,
    ensureOperationsJournalFolderTree,
    scheduleLootManifestCompendiumTypeFolderSync,
    registerModuleSocketHandler,
    socketChannel,
    socketHandler,
    registerPartyOpsHooks,
    setTimeoutFn,
    logger,
    moduleId
  };
}
