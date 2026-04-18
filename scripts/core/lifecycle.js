import { createModulePerfTracker } from "./perf.js";
import { createPartyOperationsSettingsChangeHandler } from "./settings-registration.js";

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

function invokeSafely(logger, moduleId, message, callback) {
  try {
    return callback?.();
  } catch (error) {
    warn(logger, moduleId, message, error);
    return undefined;
  }
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
  perfTracker = createModulePerfTracker("lifecycle-init"),
  logger = console,
  moduleId = "party-operations"
} = {}) {
  return perfTracker.time("run-init", () => {
    const onSettingsChanged = createPartyOperationsSettingsChangeHandler({
      settings,
      getRefreshScopesForSettingKey,
      refreshOpenApps,
      onSettingsChanged: (key) => {
        perfTracker.increment("settings.changed", 1, { key: String(key ?? "") });
      },
      onRefreshOpenApps: (key) => {
        perfTracker.increment("settings.refresh-open-apps", 1, { key: String(key ?? "") });
      }
    });

    invokeSafely(logger, moduleId, "failed to register module API", registerPartyOperationsApi);
    invokeSafely(logger, moduleId, "failed to register feature modules", registerFeatureModules);

    try {
      const preloadPromise = preloadPartyOperationsPartialTemplates?.();
      preloadPromise?.catch?.((error) => warn(logger, moduleId, "failed to preload partial templates", error));
    } catch (error) {
      warn(logger, moduleId, "failed to preload partial templates", error);
    }

    invokeSafely(logger, moduleId, "failed to register UI settings", () => {
      registerPartyOpsSettings?.(onSettingsChanged);
    });

    invokeSafely(logger, moduleId, "failed to register data settings", () => {
      registerPartyOpsDataSettings?.(dataSettingsConfig);
    });
    invokeSafely(logger, moduleId, "failed to sync audio library draft from settings", syncAudioLibraryDraftFromSettings);
    invokeSafely(logger, moduleId, "failed to register feature settings", () => {
      registerPartyOpsFeatureSettings?.(featureSettingsConfig);
    });
  });
}

export function runPartyOperationsReady({
  registerPartyOperationsApi,
  ensureSettingsRegistered,
  validatePartyOperationsTemplates,
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
  perfTracker = createModulePerfTracker("lifecycle-ready"),
  logger = console,
  moduleId = "party-operations"
} = {}) {
  return perfTracker.time("run-ready", () => {
    registerPartyOperationsApi?.();
    invokeSafely(logger, moduleId, "failed to ensure settings are registered", ensureSettingsRegistered);
    void validatePartyOperationsTemplates?.();
    setupPartyOperationsUI?.();
    perfTracker.increment("launcher.ensure", 1, { reason: "ready-initial" });
    ensureLauncherUi?.();

    for (const delay of launcherWarmupDelaysMs) {
      perfTracker.record("launcher.warmup-delay-ms", delay, { reason: "ready-warmup" });
      schedule(setTimeoutFn, delay, () => {
        perfTracker.increment("launcher.ensure", 1, { reason: "ready-warmup", delayMs: delay });
        ensureLauncherUi?.();
      });
    }

    schedule(setTimeoutFn, launcherSelfHealDelayMs, () => {
      perfTracker.increment("launcher.self-heal", 1, { delayMs: launcherSelfHealDelayMs });
      forceLauncherRecovery?.("ready-self-heal")?.catch?.((error) => {
        warn(logger, moduleId, "launcher self-heal failed", error);
      });
    });

    notifyDailyInjuryReminders?.();

    schedule(setTimeoutFn, managedAudioSyncDelayMs, () => {
      perfTracker.increment("audio.managed-sync", 1, { delayMs: managedAudioSyncDelayMs });
      void syncManagedAudioMixPlaybackForCurrentUser?.({ reason: "ready", allowAutostart: true });
    });

    if (!game?.user?.isGM) {
      perfTracker.increment("sop.pending-sync", 1, { reason: "ready" });
      schedulePendingSopNoteSync?.("ready");
    } else {
      perfTracker.increment("integration.sync", 1, { reason: "ready" });
      scheduleIntegrationSync?.("ready");
      perfTracker.increment("merchants.auto-refresh", 1, { reason: "ready" });
      void handleAutomaticMerchantAutoRefreshTick?.();
      schedule(setTimeoutFn, audioLibraryWarmupDelayMs, () => {
        perfTracker.increment("audio.metadata-warmup", 1, { delayMs: audioLibraryWarmupDelayMs });
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
  });
}
