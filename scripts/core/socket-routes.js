export async function routePartyOperationsSocketMessage(message, deps = {}) {
  if (!message || typeof message !== "object") return false;

  const {
    game,
    settings,
    refreshScopeKeys,
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
    sanitizeSocketIdentifier,
    normalizeSocketActivityType,
    getRestActivities,
    setModuleSettingWithLocalRefreshSuppressed,
    emitSocketRefresh,
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

  if (!currentUser?.isGM) return false;

  const getActivePlayerRequester = () => getSocketRequester(message, { allowGM: false, requireActive: true });

  if (message.type === "ops:setting-write") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerSettingWriteRequest(message, requester);
    return true;
  }

  if (message.type === "ops:folder-ownership-write") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerFolderOwnershipWriteRequest(message, requester);
    return true;
  }

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

  if (message.type === "ops:setSopNote") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerSopNoteRequest(message, requester);
    return true;
  }

  if (message.type === "ops:ledger-write") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerOperationsLedgerWriteRequest(message, requester);
    return true;
  }

  if (message.type === "ops:downtime-submit") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerDowntimeSubmitRequest(message, requester);
    return true;
  }

  if (message.type === "ops:downtime-clear") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerDowntimeClearRequest(message, requester);
    return true;
  }

  if (message.type === "ops:downtime-collect") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerDowntimeCollectRequest(message, requester);
    return true;
  }

  if (message.type === "ops:merchant-barter-request") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerMerchantBarterRequest(message, requester);
    return true;
  }

  if (message.type === "ops:merchant-trade") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerMerchantTradeRequest(message, requester);
    return true;
  }

  if (message.type === "ops:loot-claim") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerLootClaimRequest(message, requester);
    return true;
  }

  if (message.type === "ops:loot-claim-currency") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerLootCurrencyClaimRequest(message, requester);
    return true;
  }

  if (message.type === "ops:loot-vouch") {
    const requester = getActivePlayerRequester();
    if (!requester) return true;
    await applyPlayerLootVouchRequest(message, requester);
    return true;
  }

  return false;
}
