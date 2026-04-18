import assert from "node:assert/strict";

import {
  buildPartyOperationsDataSettingsConfig,
  buildPartyOperationsFeatureSettingsConfig,
  buildPartyOperationsUiSettingsConfig,
  createPartyOperationsSettingsChangeHandler
} from "./core/settings-registration.js";

{
  const config = buildPartyOperationsDataSettingsConfig({
    moduleId: "party-operations",
    settings: { REST_STATE: "restWatchState" },
    buildDefaultRestWatchState: "rest-default",
    buildDefaultMarchingOrderState: "march-default",
    buildDefaultActivityState: "activity-default",
    buildDefaultOperationsLedger: "ledger-default",
    buildDefaultInjuryRecoveryState: "injury-default",
    buildDefaultLootSourceConfig: "loot-default",
    buildDefaultAudioLibraryCatalog: "audio-catalog-default",
    buildDefaultAudioLibraryHiddenTrackStore: "audio-hidden-default",
    buildDefaultAudioMixPresetStore: "audio-preset-default"
  });

  assert.equal(config.moduleId, "party-operations");
  assert.equal(config.settings.REST_STATE, "restWatchState");
  assert.equal(config.buildDefaultAudioMixPresetStore, "audio-preset-default");
}

{
  const config = buildPartyOperationsFeatureSettingsConfig({
    moduleId: "party-operations",
    settings: { JOURNAL_ENTRY_VISIBILITY: "journalVisibility" },
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
    refreshOpenApps: "refresh-open-apps",
    refreshScopeKeys: ["loot"],
    openRestWatchUiForCurrentUser: "open-rest",
    openMainTab: "open-tab"
  });

  assert.equal(config.moduleId, "party-operations");
  assert.deepEqual(config.autoInventoryDefaults, { itemChanceScalar: 1 });
  assert.equal(config.resetFloatingLauncherPosition, "reset-launcher");
}

{
  const onSettingsChanged = () => "changed";
  const config = buildPartyOperationsUiSettingsConfig({
    moduleId: "party-operations",
    settings: { DEBUG_ENABLED: "debugEnabled" },
    settingsHubType: "settings-hub",
    areAdvancedSettingsEnabled: "advanced",
    lootScarcityLevels: { NORMAL: "normal" },
    lootHordeUncommonPlusChanceModes: { STANDARD: "standard" },
    playerHubModes: { SIMPLE: "simple" },
    defaultPartyOpsConfig: { debugEnabled: false },
    validatePartyOpsConfig: "validate-config",
    notifyUiInfoThrottled: "notify-ui",
    normalizePlayerHubMode: "normalize-mode",
    setModuleSettingWithLocalRefreshSuppressed: "set-setting",
    isPartyOpsConfigNormalizationInProgress: "is-normalizing",
    setPartyOpsConfigNormalizationInProgress: "set-normalizing",
    onSettingsChanged
  });

  assert.equal(config.moduleId, "party-operations");
  assert.equal(config.settingsHubType, "settings-hub");
  assert.equal(config.validatePartyOpsConfig, "validate-config");
  assert.equal(config.onSettingsChanged, onSettingsChanged);
}

{
  const changedKeys = [];
  const refreshMeta = [];
  const refreshes = [];

  const handleSettingsChange = createPartyOperationsSettingsChangeHandler({
    settings: {
      DEBUG_ENABLED: "debugEnabled"
    },
    getRefreshScopesForSettingKey(key) {
      return [`scope:${key}`];
    },
    refreshOpenApps(payload) {
      refreshes.push(payload);
    },
    onSettingsChanged(key) {
      changedKeys.push(key);
    },
    onRefreshOpenApps(key, scopes) {
      refreshMeta.push({ key, scopes });
    }
  });

  handleSettingsChange("debugEnabled");
  handleSettingsChange("lootSourceConfig");

  assert.deepEqual(changedKeys, ["debugEnabled", "lootSourceConfig"]);
  assert.deepEqual(refreshMeta, [
    {
      key: "lootSourceConfig",
      scopes: ["scope:lootSourceConfig"]
    }
  ]);
  assert.deepEqual(refreshes, [
    {
      scopes: ["scope:lootSourceConfig"]
    }
  ]);
}

process.stdout.write("settings registration validation passed\n");
