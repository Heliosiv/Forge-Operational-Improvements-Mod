import { MODULE_ID } from "../../core/constants.js";
import { SETTINGS } from "../../core/settings-keys.js";
import { registerRefactorModuleApi } from "../api/module-api.js";
import { refreshOpenApps } from "../apps/app-shell.js";
import {
  buildDefaultActivityState,
  buildDefaultAudioLibraryCatalog,
  buildDefaultAudioLibraryHiddenTrackStore,
  buildDefaultAudioMixPresetStore,
  buildDefaultInjuryRecoveryState,
  buildDefaultLootSourceConfig,
  buildDefaultMarchingOrderState,
  buildDefaultOperationsLedger,
  buildDefaultRestWatchState
} from "../state/defaults.js";
import { registerRefactorFeatureModules } from "../rebuild/feature-manifest.js";
import { registerRefactorSettings } from "../settings/refactor-settings.js";
import { asyncNoop, getNoRefreshScopes, noop } from "./common.js";

function buildRefactorDataSettingsConfig() {
  return {
    moduleId: MODULE_ID,
    settings: SETTINGS,
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

export function buildRuntimeInitConfig({ logger = console } = {}) {
  return {
    registerPartyOperationsApi: () => registerRefactorModuleApi({ moduleId: MODULE_ID }),
    registerFeatureModules: () => registerRefactorFeatureModules({ logger }),
    preloadPartyOperationsPartialTemplates: asyncNoop,
    registerPartyOpsSettings: registerRefactorSettings,
    settings: SETTINGS,
    getRefreshScopesForSettingKey: getNoRefreshScopes,
    refreshOpenApps,
    registerPartyOpsDataSettings: noop,
    dataSettingsConfig: buildRefactorDataSettingsConfig(),
    syncAudioLibraryDraftFromSettings: noop,
    registerPartyOpsFeatureSettings: noop,
    featureSettingsConfig: {
      moduleId: MODULE_ID,
      settings: SETTINGS
    },
    logger,
    moduleId: MODULE_ID
  };
}
