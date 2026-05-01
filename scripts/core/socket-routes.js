import { routeGmSocketMessage, routePlayerFacingSocketMessage } from "./socket-route-handlers.js";

export async function routePartyOperationsSocketMessage(message, deps = {}) {
  if (!message || typeof message !== "object") return false;

  const {
    game,
    normalizeRefreshScopeList,
    setLootClaimActorSelection,
    normalizeLootClaimActorId,
    setLootClaimRunSelection,
    normalizeLootClaimRunId,
    waitForLootClaimsPublished,
    buildLootClaimsContext,
    logUiDebug,
    openOperationsLootClaimsTabForPlayer,
    openRestWatchUiForCurrentUser,
    setPlayerHubTab,
    refreshOpenApps,
    schedulePendingSopNoteSync,
    syncMerchantBarterStatusForOpenDialogs,
    getSocketRequester,
    normalizeSocketRestRequest,
    applyRestRequest,
    applyPlayerActivityUpdateRequest,
    normalizeSocketMarchRequest,
    applyMarchRequest,
    applyPlayerSettingWriteRequest,
    applyPlayerFolderOwnershipWriteRequest,
    applyPlayerSopNoteRequest,
    applyPlayerOperationsLedgerWriteRequest,
    applyPlayerDowntimeSubmitRequest,
    applyPlayerDowntimeV2SubmitRequest,
    applyPlayerDowntimeV2AckResult,
    applyPlayerDowntimeClearRequest,
    applyPlayerDowntimeQueueEditRequest,
    applyPlayerDowntimeCollectRequest,
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootCurrencySplitRequest,
    applyPlayerLootUndoClaimRequest,
    emitModuleSocket,
    socketChannel
  } = deps;

  const currentUser = game?.user ?? null;
  const currentUserId = String(currentUser?.id ?? "").trim();

  const playerHandled = await routePlayerFacingSocketMessage(message, {
    currentUser,
    currentUserId,
    normalizeRefreshScopeList,
    refreshOpenApps,
    schedulePendingSopNoteSync,
    syncMerchantBarterStatusForOpenDialogs,
    setLootClaimActorSelection,
    normalizeLootClaimActorId,
    setLootClaimRunSelection,
    normalizeLootClaimRunId,
    waitForLootClaimsPublished,
    buildLootClaimsContext,
    logUiDebug,
    openOperationsLootClaimsTabForPlayer,
    openRestWatchUiForCurrentUser,
    setPlayerHubTab
  });
  if (playerHandled) return true;

  return routeGmSocketMessage(message, {
    currentUser,
    getSocketRequester,
    applyPlayerActivityUpdateRequest,
    normalizeSocketRestRequest,
    applyRestRequest,
    normalizeSocketMarchRequest,
    applyMarchRequest,
    applyPlayerSettingWriteRequest,
    applyPlayerFolderOwnershipWriteRequest,
    applyPlayerSopNoteRequest,
    applyPlayerOperationsLedgerWriteRequest,
    applyPlayerDowntimeSubmitRequest,
    applyPlayerDowntimeV2SubmitRequest,
    applyPlayerDowntimeV2AckResult,
    applyPlayerDowntimeClearRequest,
    applyPlayerDowntimeQueueEditRequest,
    applyPlayerDowntimeCollectRequest,
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootCurrencySplitRequest,
    applyPlayerLootUndoClaimRequest,
    emitModuleSocket,
    socketChannel
  });
}
