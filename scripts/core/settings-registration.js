export function buildPartyOperationsDataSettingsConfig({
  moduleId = "party-operations",
  settings = {},
  buildDefaultRestWatchState,
  buildDefaultMarchingOrderState,
  buildDefaultActivityState,
  buildDefaultOperationsLedger,
  buildDefaultInjuryRecoveryState,
  buildDefaultLootSourceConfig,
  buildDefaultAudioLibraryCatalog,
  buildDefaultAudioLibraryHiddenTrackStore,
  buildDefaultAudioMixPresetStore
} = {}) {
  return {
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
  };
}

export function buildPartyOperationsFeatureSettingsConfig({
  moduleId = "party-operations",
  settings = {},
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
} = {}) {
  return {
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
  };
}

export function buildPartyOperationsUiSettingsConfig({
  moduleId = "party-operations",
  settings = {},
  settingsHubType,
  areAdvancedSettingsEnabled = () => false,
  lootScarcityLevels = {},
  lootHordeUncommonPlusChanceModes = {},
  economyPriceLevels = {},
  playerHubModes = {},
  defaultPartyOpsConfig = {},
  validatePartyOpsConfig = (value) => value,
  notifyUiInfoThrottled = () => {},
  normalizePlayerHubMode = (value) => value,
  setModuleSettingWithLocalRefreshSuppressed = async () => {},
  isPartyOpsConfigNormalizationInProgress = () => false,
  setPartyOpsConfigNormalizationInProgress = () => {},
  onSettingsChanged = () => {}
} = {}) {
  return {
    moduleId,
    settings,
    settingsHubType,
    areAdvancedSettingsEnabled,
    lootScarcityLevels,
    lootHordeUncommonPlusChanceModes,
    economyPriceLevels,
    playerHubModes,
    defaultPartyOpsConfig,
    validatePartyOpsConfig,
    notifyUiInfoThrottled,
    normalizePlayerHubMode,
    setModuleSettingWithLocalRefreshSuppressed,
    isPartyOpsConfigNormalizationInProgress,
    setPartyOpsConfigNormalizationInProgress,
    onSettingsChanged
  };
}

export function createPartyOperationsSettingsChangeHandler({
  settings = {},
  getRefreshScopesForSettingKey = () => undefined,
  refreshOpenApps = () => {},
  onSettingsChanged = () => {},
  onRefreshOpenApps = () => {}
} = {}) {
  return function handlePartyOperationsSettingsChange(key) {
    onSettingsChanged?.(key);
    if (key === settings?.DEBUG_ENABLED) return;
    const scopes = getRefreshScopesForSettingKey?.(key);
    onRefreshOpenApps?.(key, scopes);
    refreshOpenApps?.({ scopes });
  };
}
