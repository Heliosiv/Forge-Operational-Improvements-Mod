import { MODULE_ID, SOCKET_CHANNEL } from "../../core/constants.js";
import { registerModuleSocketHandler } from "../../core/socket-registry.js";
import { registerRefactorModuleApi } from "../api/module-api.js";
import { ensureLauncherUi, forceLauncherRecovery } from "../apps/app-shell.js";
import { registerRefactorRuntimeHooks } from "./hook-registration.js";
import { ensureRefactorSettingsRegistered } from "../settings/refactor-settings.js";
import { handleRefactorSocketMessage } from "../sockets/refresh-socket.js";
import { asyncNoop, noop } from "./common.js";

export function buildRuntimeReadyConfig({ logger = console } = {}) {
  return {
    registerPartyOperationsApi: () => registerRefactorModuleApi({ moduleId: MODULE_ID }),
    ensureSettingsRegistered: ensureRefactorSettingsRegistered,
    validatePartyOperationsTemplates: asyncNoop,
    setupPartyOperationsUI: noop,
    ensureLauncherUi,
    launcherWarmupDelaysMs: [],
    launcherSelfHealDelayMs: 0,
    forceLauncherRecovery,
    notifyDailyInjuryReminders: noop,
    managedAudioSyncDelayMs: 0,
    syncManagedAudioMixPlaybackForCurrentUser: asyncNoop,
    game: globalThis.game,
    schedulePendingSopNoteSync: noop,
    scheduleIntegrationSync: noop,
    handleAutomaticMerchantAutoRefreshTick: asyncNoop,
    audioLibraryWarmupDelayMs: 0,
    queueAudioLibraryMetadataWarmup: noop,
    ensureOperationsJournalFolderTree: asyncNoop,
    scheduleLootManifestCompendiumTypeFolderSync: asyncNoop,
    registerModuleSocketHandler,
    socketChannel: SOCKET_CHANNEL,
    socketHandler: handleRefactorSocketMessage,
    registerPartyOpsHooks: () => registerRefactorRuntimeHooks({ logger }),
    logger,
    moduleId: MODULE_ID
  };
}
