import assert from "node:assert/strict";

import { createPartyOperationsSettingsBootstrap } from "./core/settings-bootstrap.js";

{
  const calls = {
    ui: [],
    data: [],
    feature: [],
    refresh: [],
    syncAudio: 0
  };

  const bootstrap = createPartyOperationsSettingsBootstrap({
    moduleId: "party-operations",
    settings: {
      DEBUG_ENABLED: "debugEnabled"
    },
    settingsHubType: class MockSettingsHub {},
    areAdvancedSettingsEnabled: () => true,
    lootScarcityLevels: { NORMAL: "normal" },
    playerHubModes: { SIMPLE: "simple" },
    defaultPartyOpsConfig: { debugEnabled: false },
    validatePartyOpsConfig: (value) => value,
    notifyUiInfoThrottled: () => {},
    normalizePlayerHubMode: (value) => value,
    setModuleSettingWithLocalRefreshSuppressed: async () => {},
    isPartyOpsConfigNormalizationInProgress: () => false,
    setPartyOpsConfigNormalizationInProgress: () => {},
    registerPartyOpsUiSettings: (config) => calls.ui.push(config),
    registerPartyOpsDataSettings: (config) => calls.data.push(config),
    registerPartyOpsFeatureSettings: (config) => calls.feature.push(config),
    getRefreshScopesForSettingKey: (key) => [key],
    refreshOpenApps: (payload) => calls.refresh.push(payload),
    buildDefaultRestWatchState: () => ({ rest: true }),
    buildDefaultMarchingOrderState: () => ({ march: true }),
    buildDefaultActivityState: () => ({ activity: true }),
    buildDefaultOperationsLedger: () => ({ ledger: true }),
    buildDefaultInjuryRecoveryState: () => ({ injury: true }),
    buildDefaultLootSourceConfig: () => ({ loot: true }),
    buildDefaultAudioLibraryCatalog: () => ({ catalog: true }),
    buildDefaultAudioLibraryHiddenTrackStore: () => ({ hidden: true }),
    buildDefaultAudioMixPresetStore: () => ({ presets: true }),
    syncAudioLibraryDraftFromSettings: () => {
      calls.syncAudio += 1;
    },
    autoInventoryPackIndexCache: {},
    autoInventoryDefaults: { itemChanceScalar: 1 },
    gatherDefaults: { days: 1 },
    gatherTravelChoices: { pace: "pace" },
    launcherPlacements: { FLOATING: "floating" },
    journalVisibilityModes: { PUBLIC: "public" },
    sessionSummaryRangeOptions: { "last-24h": "Last 24 Hours" },
    inventoryHookModes: { SYNC: "sync" },
    ensureLauncherUi: () => {},
    resetFloatingLauncherPosition: () => {},
    refreshScopeKeys: { SETTINGS: "settings" },
    openRestWatchUiForCurrentUser: () => {},
    openMainTab: () => {},
    gameRef: {
      settings: {
        settings: new Map()
      }
    }
  });

  bootstrap.registerPartyOpsSettings((key) => calls.refresh.push({ manual: key }));
  assert.equal(calls.ui.length, 1);
  calls.ui[0].onSettingsChanged("someSetting");
  assert.deepEqual(calls.refresh.at(-1), { manual: "someSetting" });

  const didRegister = bootstrap.ensurePartyOpsSettingsRegistered();
  assert.equal(didRegister, true);
  assert.equal(calls.ui.length, 2);
  assert.equal(calls.data.length, 1);
  assert.equal(calls.feature.length, 1);
  assert.equal(calls.syncAudio, 1);

  calls.ui[1].onSettingsChanged("debugEnabled");
  assert.notDeepEqual(calls.refresh.at(-1), { scopes: ["debugEnabled"] });

  calls.ui[1].onSettingsChanged("otherSetting");
  assert.deepEqual(calls.refresh.at(-1), { scopes: ["otherSetting"] });
}

{
  const bootstrap = createPartyOperationsSettingsBootstrap({
    moduleId: "party-operations",
    registerPartyOpsUiSettings: () => {
      throw new Error("should not register twice");
    },
    gameRef: {
      settings: {
        settings: new Map([["party-operations.someSetting", {}]])
      }
    }
  });

  assert.equal(bootstrap.hasRegisteredPartyOpsSettingsNamespace(), true);
  assert.equal(bootstrap.ensurePartyOpsSettingsRegistered(), false);
}

process.stdout.write("settings bootstrap validation passed\n");
