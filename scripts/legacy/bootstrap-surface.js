import { buildPartyOpsRuntimeHookModules, createPartyOpsHookRegistrar } from "../hooks/runtime-hooks.js";
import { registerPartyOperationsUiHooks } from "../hooks/ui-hooks.js";

export function setupLegacyPartyOperationsUi({
  openMainTab,
  canAccessAllPlayerOps,
  ensureLauncherUi,
  hideManagedAudioMixPlaylistUi,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window),
  documentRef = globalThis.document,
  registerUiHooks = registerPartyOperationsUiHooks
} = {}) {
  return registerUiHooks({
    openMainTab,
    canAccessAllPlayerOps,
    ensureLauncherUi,
    hideManagedAudioMixPlaylistUi,
    setTimeoutFn,
    documentRef
  });
}

export function createLegacyPartyOpsHookRegistrar({
  buildHookModules = buildPartyOpsRuntimeHookModules,
  createHookRegistrar = createPartyOpsHookRegistrar,
  ...hookModuleDeps
} = {}) {
  return createHookRegistrar({
    getHookModules: () => buildHookModules(hookModuleDeps)
  });
}

export function installLegacyAppBehaviors({
  installRememberedWindowPositionBehavior,
  appClasses = []
} = {}) {
  if (typeof installRememberedWindowPositionBehavior !== "function") return;
  for (const appClass of appClasses) {
    installRememberedWindowPositionBehavior(appClass);
  }
}

export function buildLegacyPartyOperationsInitConfig({
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

export function buildLegacyPartyOperationsReadyConfig({
  registerPartyOperationsApi,
  ensureSettingsRegistered,
  validatePartyOperationsTemplates,
  bindPoBrowserBackNavigation,
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
    bindPoBrowserBackNavigation,
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
