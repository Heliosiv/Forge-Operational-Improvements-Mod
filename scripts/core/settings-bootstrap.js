export function createPartyOperationsSettingsBootstrap({
  moduleId = "party-operations",
  settings = {},
  settingsHubType,
  areAdvancedSettingsEnabled = () => false,
  lootScarcityLevels = {},
  playerHubModes = {},
  defaultPartyOpsConfig = {},
  validatePartyOpsConfig = (value) => value,
  notifyUiInfoThrottled = () => {},
  normalizePlayerHubMode = (value) => value,
  setModuleSettingWithLocalRefreshSuppressed = async () => {},
  isPartyOpsConfigNormalizationInProgress = () => false,
  setPartyOpsConfigNormalizationInProgress = () => {},
  registerPartyOpsUiSettings = () => {},
  registerPartyOpsDataSettings = () => {},
  registerPartyOpsFeatureSettings = () => {},
  getRefreshScopesForSettingKey = () => undefined,
  refreshOpenApps = () => {},
  buildDefaultRestWatchState = () => ({}),
  buildDefaultMarchingOrderState = () => ({}),
  buildDefaultActivityState = () => ({}),
  buildDefaultOperationsLedger = () => ({}),
  buildDefaultInjuryRecoveryState = () => ({}),
  buildDefaultLootSourceConfig = () => ({}),
  buildDefaultAudioLibraryCatalog = () => ({}),
  buildDefaultAudioLibraryHiddenTrackStore = () => ({}),
  buildDefaultAudioMixPresetStore = () => ({}),
  syncAudioLibraryDraftFromSettings = () => {},
  autoInventoryPackIndexCache = null,
  autoInventoryDefaults = {},
  gatherDefaults = {},
  gatherTravelChoices = {},
  launcherPlacements = {},
  journalVisibilityModes = {},
  sessionSummaryRangeOptions = {},
  inventoryHookModes = {},
  ensureLauncherUi = () => {},
  resetFloatingLauncherPosition = () => {},
  refreshScopeKeys = {},
  openRestWatchUiForCurrentUser = () => {},
  openMainTab = () => {},
  gameRef = globalThis.game ?? {}
} = {}) {
  function registerSettingsUi(onSettingsChanged = () => {}) {
    registerPartyOpsUiSettings({
      moduleId,
      settings,
      settingsHubType,
      areAdvancedSettingsEnabled,
      lootScarcityLevels,
      playerHubModes,
      defaultPartyOpsConfig,
      validatePartyOpsConfig,
      notifyUiInfoThrottled,
      normalizePlayerHubMode,
      setModuleSettingWithLocalRefreshSuppressed,
      isPartyOpsConfigNormalizationInProgress,
      setPartyOpsConfigNormalizationInProgress,
      onSettingsChanged
    });
  }

  function hasRegisteredSettingsNamespace(targetModuleId = moduleId) {
    const prefix = `${String(targetModuleId ?? "").trim()}.`;
    if (!prefix || !gameRef?.settings) return false;
    try {
      return Array.from(gameRef.settings.settings?.keys?.() ?? []).some((key) => String(key ?? "").startsWith(prefix));
    } catch {
      return false;
    }
  }

  function ensureSettingsRegistered() {
    if (hasRegisteredSettingsNamespace(moduleId)) return false;

    registerSettingsUi((key) => {
      if (key === settings.DEBUG_ENABLED) return;
      const scopes = getRefreshScopesForSettingKey(key);
      refreshOpenApps({ scopes });
    });

    registerPartyOpsDataSettings({
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
    });

    syncAudioLibraryDraftFromSettings();

    registerPartyOpsFeatureSettings({
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
    });

    return true;
  }

  return {
    registerPartyOpsSettings: registerSettingsUi,
    hasRegisteredPartyOpsSettingsNamespace: hasRegisteredSettingsNamespace,
    ensurePartyOpsSettingsRegistered: ensureSettingsRegistered
  };
}
