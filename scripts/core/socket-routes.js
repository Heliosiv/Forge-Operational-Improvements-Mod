import {
  routeGmSocketMessage,
  routePlayerFacingSocketMessage
} from "./socket-route-handlers.js";

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
    promptLootClaimsDialogForPlayer,
    openOperationsLootClaimsTabForPlayer,
    openRestWatchUiForCurrentUser,
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
    applyPlayerDowntimeClearRequest,
    applyPlayerDowntimeCollectRequest,
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootVouchRequest
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
    promptLootClaimsDialogForPlayer,
    openOperationsLootClaimsTabForPlayer,
    openRestWatchUiForCurrentUser
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
    applyPlayerDowntimeClearRequest,
    applyPlayerDowntimeCollectRequest,
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootVouchRequest
  });
}
