import { createModulePerfTracker } from "../core/perf.js";
import { buildAudioPlaybackHookModule } from "./runtime-modules/audio-playback.js";
import { buildChatHookModule } from "./runtime-modules/chat.js";
import { buildCombatHookModule } from "./runtime-modules/combat.js";
import { buildIntegrationHookModule } from "./runtime-modules/integration.js";
import { buildInventoryHookModule } from "./runtime-modules/inventory.js";
import { buildSettingHookModule } from "./runtime-modules/settings.js";
import { buildTimeHookModule } from "./runtime-modules/time.js";
import { buildTokenHookModule } from "./runtime-modules/tokens.js";
import { buildUserPresenceHookModule } from "./runtime-modules/user-presence.js";
import { buildLootRecentRollsCacheHookModule } from "../features/loot-recent-rolls-cache.js";

export function registerHookModule({
  HooksRef = globalThis.Hooks,
  module,
  perfTracker = createModulePerfTracker("runtime-hooks")
} = {}) {
  if (typeof HooksRef?.on !== "function") return;

  const registrations = Array.isArray(module?.registrations) ? module.registrations : [];
  for (const registration of registrations) {
    if (!Array.isArray(registration) || registration.length < 2) continue;
    const eventName = String(registration[0] ?? "").trim();
    const handler = registration[1];
    if (!eventName || typeof handler !== "function") continue;
    perfTracker.increment("hook.registered", 1, { moduleId: String(module?.id ?? ""), eventName });
    HooksRef.on(eventName, handler);
  }
}

export function createPartyOpsHookRegistrar({
  HooksRef = globalThis.Hooks,
  getHookModules,
  perfTracker = createModulePerfTracker("runtime-hooks")
} = {}) {
  let hooksRegistered = false;

  return function registerPartyOpsHooks() {
    if (hooksRegistered) return;
    hooksRegistered = true;

    const hookModules = typeof getHookModules === "function" ? getHookModules() : [];
    perfTracker.record("hook-module-count", hookModules.length, { reason: "register" });
    for (const hookModule of hookModules) {
      registerHookModule({ HooksRef, module: hookModule, perfTracker });
    }
  };
}

export function buildPartyOpsRuntimeHookModules({
  moduleId,
  settings,
  autoUpkeepPromptStates,
  notifyDailyInjuryReminders,
  handleAutomaticOperationalUpkeepTick,
  handleAutomaticMerchantAutoRefreshTick,
  handleAutomaticCalendarWeatherTick,
  handleAutomaticUpkeepChatAction,
  schedulePendingSopNoteSync,
  applyAutoInventoryToUnlinkedToken,
  onMarchTokenMoved,
  onMarchSceneEntry,
  onMarchCombatRound,
  onMarchCombatEnded,
  hasInventoryDelta,
  queueInventoryRefresh,
  consumeSuppressedSettingRefresh,
  refreshOpenApps,
  getRefreshScopesForSettingKey,
  scheduleIntegrationSync,
  bindFolderOwnershipProxySubmit,
  isManagedAudioMixPlaylist,
  queueManagedAudioMixPlaybackResync,
  autoInventoryPackIndexCache,
  gameRef = globalThis.game,
  foundryRef = globalThis.foundry,
  perfTracker = createModulePerfTracker("runtime-hooks")
} = {}) {
  return [
    buildTimeHookModule({
      notifyDailyInjuryReminders,
      handleAutomaticOperationalUpkeepTick,
      handleAutomaticMerchantAutoRefreshTick,
      handleAutomaticCalendarWeatherTick,
      gameRef
    }),
    buildChatHookModule({
      moduleId,
      autoUpkeepPromptStates,
      handleAutomaticUpkeepChatAction
    }),
    buildUserPresenceHookModule({
      schedulePendingSopNoteSync,
      gameRef
    }),
    buildTokenHookModule({
      applyAutoInventoryToUnlinkedToken,
      onMarchTokenMoved
    }),
    buildCombatHookModule({
      onMarchCombatRound,
      onMarchCombatEnded,
      gameRef
    }),
    buildInventoryHookModule({
      hasInventoryDelta,
      queueInventoryRefresh,
      foundryRef
    }),
    buildSettingHookModule({
      moduleId,
      settings,
      consumeSuppressedSettingRefresh,
      refreshOpenApps,
      getRefreshScopesForSettingKey,
      scheduleIntegrationSync,
      gameRef,
      perfTracker
    }),
    buildIntegrationHookModule({
      scheduleIntegrationSync,
      onMarchSceneEntry,
      bindFolderOwnershipProxySubmit,
      gameRef,
      perfTracker
    }),
    buildAudioPlaybackHookModule({
      isManagedAudioMixPlaylist,
      queueManagedAudioMixPlaybackResync,
      gameRef,
      perfTracker
    }),
    buildLootRecentRollsCacheHookModule(),
    autoInventoryPackIndexCache instanceof Map
      ? {
          id: "auto-inventory-pack-index-cache",
          registrations: [["updateCompendium", () => autoInventoryPackIndexCache.clear()]]
        }
      : null
  ].filter(Boolean);
}
