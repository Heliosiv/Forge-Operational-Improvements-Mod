import { MODULE_ID } from "../../core/constants.js";
import { SETTINGS } from "../../core/settings-keys.js";
import { canAccessAllPlayerOps } from "../../core/socket-write-policy.js";
import { LAUNCHER_PLACEMENTS, PO_TEMPLATE_MAP, REFRESH_SCOPE_KEYS } from "../../core/window-config.js";
import { createLauncherUiController } from "../../features/launcher-ui.js";
import { createMainTabRegistry } from "../../features/main-tab-registry.js";
import { createRefactorNavigationApi } from "../navigation/navigation-api.js";
import { recordRuntimeRefresh } from "../state/runtime-state.js";

const mainTabRegistry = createMainTabRegistry({ templateMap: PO_TEMPLATE_MAP });
const navigationApi = createRefactorNavigationApi();
let launcherUiController = null;

export function canAccessGmPage(user = globalThis.game?.user) {
  return Boolean(user?.isGM);
}

function getNavigationActionName(tabId) {
  const normalized = mainTabRegistry.normalizeMainTabId(tabId, "rest-watch");
  if (normalized === "marching-order") return "openMarchingOrder";
  if (normalized === "operations") return "openOperations";
  if (normalized === "gm") return "openGm";
  return "openRestWatch";
}

export function openMainTab(tabId, options = { force: true }) {
  const actionName = getNavigationActionName(tabId);
  return navigationApi[actionName]?.({
    tabId: mainTabRegistry.normalizeMainTabId(tabId, "rest-watch"),
    ...options
  });
}

function getLauncherUiController() {
  launcherUiController ??= createLauncherUiController({
    moduleId: MODULE_ID,
    settings: SETTINGS,
    launcherPlacements: LAUNCHER_PLACEMENTS,
    launcherRecoveryDelaysMs: [],
    setModuleSettingWithLocalRefreshSuppressed: (settingKey, value) =>
      globalThis.game?.settings?.set?.(MODULE_ID, settingKey, value),
    getMainTabIdFromAction: mainTabRegistry.getMainTabIdFromAction,
    getTemplateForMainTab: mainTabRegistry.getTemplateForMainTab,
    openMainTab,
    canAccessAllPlayerOps,
    canAccessGmPage,
    logUiDebug: () => {},
    refreshOpenApps,
    refreshScopeKeys: REFRESH_SCOPE_KEYS,
    getAudioLibraryCatalog: () => ({ items: [] }),
    getSelectedAudioMixPreset: () => null,
    getAudioMixPlaybackState: () => ({}),
    getPlayableAudioMixCandidates: () => [],
    getAllAudioMixPresets: () => [],
    selectAudioMixPreset: () => {},
    playAudioMixPresetById: async () => {},
    toggleAudioMixPlayback: async () => {},
    playNextAudioMixTrack: async () => {},
    stopAudioMixPlayback: async () => {},
    clearAudioLibraryError: () => {},
    setAudioLibraryError: () => {},
    getGame: () => globalThis.game,
    getDocument: () => globalThis.document,
    getWindow: () => globalThis.window,
    getUi: () => globalThis.ui
  });
  return launcherUiController;
}

export function installRuntimeAppBehaviors() {
  return [];
}

export function refreshOpenApps(options = {}) {
  recordRuntimeRefresh({
    type: "local-refresh",
    ...options
  });
  return [];
}

export function ensureLauncherUi() {
  return getLauncherUiController().ensureLauncherUi();
}

export function getLauncherStatusSnapshot() {
  return getLauncherUiController().getLauncherStatusSnapshot();
}

export async function forceLauncherRecovery(reason) {
  return getLauncherUiController().forceLauncherRecovery(reason);
}

export function hideManagedAudioMixPlaylistUi() {
  return false;
}
