function warn(logger, moduleId, message, error) {
  if (typeof logger?.warn === "function") {
    logger.warn(message, error);
    return;
  }

  console.warn(`${moduleId}: ${message}`, error);
}

function schedule(setTimeoutFn, delayMs, callback) {
  if (typeof setTimeoutFn === "function") {
    setTimeoutFn(callback, delayMs);
    return;
  }

  callback();
}

export function runPartyOperationsInit({
  registerPartyOperationsApi,
  registerFeatureModules,
  preloadPartyOperationsPartialTemplates,
  registerPartyOpsSettings,
  settings,
  getRefreshScopesForSettingKey,
  refreshOpenApps,
  registerPartyOpsDataSettings,
  dataSettingsConfig,
  syncAudioLibraryDraftFromSettings,
  registerPartyOpsFeatureSettings,
  featureSettingsConfig,
  logger = console,
  moduleId = "party-operations"
} = {}) {
  registerPartyOperationsApi?.();
  registerFeatureModules?.();

  try {
    const preloadPromise = preloadPartyOperationsPartialTemplates?.();
    preloadPromise?.catch?.((error) => warn(logger, moduleId, "failed to preload partial templates", error));
  } catch (error) {
    warn(logger, moduleId, "failed to preload partial templates", error);
  }

  registerPartyOpsSettings?.((key) => {
    if (key === settings?.DEBUG_ENABLED) return;
    const scopes = getRefreshScopesForSettingKey?.(key);
    refreshOpenApps?.({ scopes });
  });

  registerPartyOpsDataSettings?.(dataSettingsConfig);
  syncAudioLibraryDraftFromSettings?.();
  registerPartyOpsFeatureSettings?.(featureSettingsConfig);
}

export function runPartyOperationsReady({
  registerPartyOperationsApi,
  validatePartyOperationsTemplates,
  bindPoBrowserBackNavigation,
  setupPartyOperationsUI,
  ensureLauncherUi,
  launcherWarmupDelaysMs = [250, 1000, 3000],
  launcherSelfHealDelayMs = 4200,
  forceLauncherRecovery,
  notifyDailyInjuryReminders,
  managedAudioSyncDelayMs = 450,
  syncManagedAudioMixPlaybackForCurrentUser,
  game = globalThis.game,
  schedulePendingSopNoteSync,
  scheduleIntegrationSync,
  handleAutomaticMerchantAutoRefreshTick,
  audioLibraryWarmupDelayMs = 900,
  queueAudioLibraryMetadataWarmup,
  ensureOperationsJournalFolderTree,
  scheduleLootManifestCompendiumTypeFolderSync,
  registerModuleSocketHandler,
  socketChannel,
  socketHandler,
  registerPartyOpsHooks,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window) ?? globalThis.setTimeout,
  logger = console,
  moduleId = "party-operations"
} = {}) {
  registerPartyOperationsApi?.();
  void validatePartyOperationsTemplates?.();
  bindPoBrowserBackNavigation?.();
  setupPartyOperationsUI?.();
  ensureLauncherUi?.();

  for (const delay of launcherWarmupDelaysMs) {
    schedule(setTimeoutFn, delay, () => ensureLauncherUi?.());
  }

  schedule(setTimeoutFn, launcherSelfHealDelayMs, () => {
    forceLauncherRecovery?.("ready-self-heal")?.catch?.((error) => {
      warn(logger, moduleId, "launcher self-heal failed", error);
    });
  });

  notifyDailyInjuryReminders?.();

  schedule(setTimeoutFn, managedAudioSyncDelayMs, () => {
    void syncManagedAudioMixPlaybackForCurrentUser?.();
  });

  if (!game?.user?.isGM) {
    schedulePendingSopNoteSync?.("ready");
  } else {
    scheduleIntegrationSync?.("ready");
    void handleAutomaticMerchantAutoRefreshTick?.();
    schedule(setTimeoutFn, audioLibraryWarmupDelayMs, () => {
      queueAudioLibraryMetadataWarmup?.({ delayMs: 0 });
    });
    ensureOperationsJournalFolderTree?.()?.catch?.((error) => {
      warn(logger, moduleId, "failed to initialize operations journal folder tree", error);
    });
    scheduleLootManifestCompendiumTypeFolderSync?.("ready")?.catch?.((error) => {
      warn(logger, moduleId, "failed to sync loot manifest compendium folders", error);
    });
  }

  registerModuleSocketHandler?.({ channel: socketChannel, handler: socketHandler });
  registerPartyOpsHooks?.();
}
