import { buildGmRequesterRoutes } from "./socket-gm-requester-routes.js";

export async function routePlayerFacingSocketMessage(message, context = {}) {
  const {
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
  } = context;

  if (message.type === "players:openLootClaims") {
    const targetUserId = String(message.userId ?? "").trim();
    const broadcast = !targetUserId || targetUserId === "*" || targetUserId.toLowerCase() === "all";
    if (!broadcast && targetUserId !== currentUserId) return true;
    if (currentUser?.isGM) return true;

    const actorIdByUserId = message?.actorIdByUserId && typeof message.actorIdByUserId === "object"
      ? message.actorIdByUserId
      : null;
    const preferredActorId = actorIdByUserId
      ? normalizeLootClaimActorId(actorIdByUserId[currentUserId])
      : "";
    const selectedActorId = preferredActorId || normalizeLootClaimActorId(message.actorId);
    if (selectedActorId) setLootClaimActorSelection(selectedActorId);
    const selectedRunId = normalizeLootClaimRunId(message.runId);
    if (selectedRunId) setLootClaimRunSelection(selectedRunId);
    await waitForLootClaimsPublished(message?.publishedAt);
    const lootClaims = buildLootClaimsContext(currentUser);
    logUiDebug("loot-claims", "prompting player loot claims UI", {
      currentUserId,
      targetUserId,
      broadcast,
      selectedActorId,
      selectedRunId,
      itemCount: Math.max(0, Number(message?.itemCount ?? lootClaims?.itemCount ?? 0) || 0),
      publishedAt: Math.max(0, Number(message?.publishedAt ?? 0) || 0)
    });
    const shouldOpen = await promptLootClaimsDialogForPlayer({
      itemCount: message?.itemCount,
      publishedBy: message?.publishedBy,
      publishedAt: message?.publishedAt,
      currencyRemaining: message?.currencyRemaining,
      lootClaims
    });
    if (!shouldOpen) return true;
    openOperationsLootClaimsTabForPlayer({
      force: true,
      openBoard: true,
      runId: selectedRunId
    });
    return true;
  }

  if (message.type === "players:openRest") {
    if (!currentUser?.isGM) openRestWatchUiForCurrentUser({ force: true });
    return true;
  }

  if (message.type === "refresh") {
    if (message.userId && message.userId === currentUserId) return true;
    const scopes = normalizeRefreshScopeList(message?.scopes);
    setTimeout(() => refreshOpenApps({ scopes }), 75);
    if (!currentUser?.isGM) schedulePendingSopNoteSync("socket-refresh");
    return true;
  }

  if (message.type === "ops:merchant-barter-result") {
    syncMerchantBarterStatusForOpenDialogs(message);
    return true;
  }

  return false;
}

export async function routeGmSocketMessage(message, context = {}) {
  const {
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
  } = context;

  if (!currentUser?.isGM) return false;

  const getActivePlayerRequester = () => getSocketRequester(message, { allowGM: false, requireActive: true });
  const runWithRequester = async (handler) => {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await handler(message, requester);
    return true;
  };

  if (message.type === "activity:update") {
    await applyPlayerActivityUpdateRequest(message);
    return true;
  }

  if (message.type === "rest:mutate") {
    const requester = getActivePlayerRequester();
    const request = normalizeSocketRestRequest(message.request);
    if (!requester || !request) return true;
    await applyRestRequest(request, requester);
    return true;
  }

  if (message.type === "march:mutate") {
    const requester = getActivePlayerRequester();
    const request = normalizeSocketMarchRequest(message.request);
    if (!requester || !request) return true;
    await applyMarchRequest(request, requester);
    return true;
  }

  const requesterRoutes = buildGmRequesterRoutes({
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

  const routeHandler = requesterRoutes[message.type];
  if (!routeHandler) return false;
  return runWithRequester(routeHandler);
}
