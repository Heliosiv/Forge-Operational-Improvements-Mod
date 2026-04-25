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
    openOperationsLootClaimsTabForPlayer,
    openRestWatchUiForCurrentUser
  } = context;

  if (message.type === "ops:player-action-result") {
    const targetUserId = String(message.userId ?? "").trim();
    if (!targetUserId || targetUserId !== currentUserId) return true;
    if (currentUser?.isGM) return true;
    const summary = String(message.summary ?? "").trim();
    if (message.ok === false) globalThis.ui?.notifications?.warn?.(summary || "Player action failed.");
    else globalThis.ui?.notifications?.info?.(summary || "Player action complete.");
    const scopes = normalizeRefreshScopeList?.(message?.scopes ?? message?.scope) ?? [];
    if (scopes.length) setTimeout(() => refreshOpenApps({ scopes }), 75);
    return true;
  }

  if (message.type === "players:openLootClaims") {
    const targetUserId = String(message.userId ?? "").trim();
    const broadcast = !targetUserId || targetUserId === "*" || targetUserId.toLowerCase() === "all";
    if (!broadcast && targetUserId !== currentUserId) return true;
    if (currentUser?.isGM) return true;

    const actorIdByUserId =
      message?.actorIdByUserId && typeof message.actorIdByUserId === "object" ? message.actorIdByUserId : null;
    const preferredActorId = actorIdByUserId ? normalizeLootClaimActorId(actorIdByUserId[currentUserId]) : "";
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

  if (message.type === "ops:merchant-trade-result") {
    const targetUserId = String(message.userId ?? "").trim();
    if (targetUserId && targetUserId !== currentUserId) return true;
    if (currentUser?.isGM) return true;
    const summary = String(message.summary ?? "").trim();
    if (message.ok === false) globalThis.ui?.notifications?.warn?.(summary || "Merchant trade failed.");
    else globalThis.ui?.notifications?.info?.(summary || "Merchant trade complete.");
    setTimeout(() => refreshOpenApps({ scopes: ["operations"] }), 75);
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
  } = context;

  if (!currentUser?.isGM) return false;
  const targetGmUserId = String(message?.gmUserId ?? "").trim();
  if (targetGmUserId && targetGmUserId !== String(currentUser?.id ?? "").trim()) return true;

  const getActivePlayerRequester = () => getSocketRequester(message, { allowGM: false, requireActive: true });
  const notifyPlayerActionResult = (result, fallbackSummary, fallbackScopes = []) => {
    const targetUserId = String(message?.userId ?? "").trim();
    if (!targetUserId || !emitModuleSocket) return;
    const scopes = Array.isArray(result?.scopes)
      ? result.scopes
      : result?.scope
        ? [result.scope]
        : Array.isArray(fallbackScopes)
          ? fallbackScopes
          : fallbackScopes
            ? [fallbackScopes]
            : [];
    emitModuleSocket(
      {
        type: "ops:player-action-result",
        userId: targetUserId,
        ok: result?.ok !== false,
        summary: String(result?.summary ?? fallbackSummary ?? "").trim(),
        scopes
      },
      { channel: socketChannel }
    );
  };
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
    const request = normalizeSocketRestRequest(message.request);
    if (!request) {
      notifyPlayerActionResult({ ok: false, scope: "rest" }, "Rest watch request was not valid.");
      return true;
    }
    // Allow request to proceed; applyRestRequest will check per-actor permissions
    // Requester may be null if userId not in message (after SBP-001 fix)
    const requester = getActivePlayerRequester();
    if (!requester) {
      notifyPlayerActionResult(
        { ok: false, scope: "rest" },
        "Rest watch request could not be matched to your active player session."
      );
      return true;
    }
    const result = await applyRestRequest(request, requester);
    if (result?.ok === false) notifyPlayerActionResult(result, "Rest watch request was not applied.", "rest");
    return true;
  }

  if (message.type === "march:mutate") {
    const request = normalizeSocketMarchRequest(message.request);
    if (!request) {
      notifyPlayerActionResult({ ok: false, scope: "march" }, "Marching order request was not valid.");
      return true;
    }
    // Allow request to proceed; applyMarchRequest will check per-actor permissions
    // Requester may be null if userId not in message (after SBP-001 fix)
    const requester = getActivePlayerRequester();
    if (!requester) {
      notifyPlayerActionResult(
        { ok: false, scope: "march" },
        "Marching order request could not be matched to your active player session."
      );
      return true;
    }
    const result = await applyMarchRequest(request, requester);
    if (result?.ok === false) notifyPlayerActionResult(result, "Marching order request was not applied.", "march");
    return true;
  }

  const requesterRoutes = buildGmRequesterRoutes({
    applyPlayerSettingWriteRequest,
    applyPlayerFolderOwnershipWriteRequest,
    applyPlayerSopNoteRequest,
    applyPlayerOperationsLedgerWriteRequest,
    applyPlayerDowntimeSubmitRequest,
    applyPlayerDowntimeClearRequest,
    applyPlayerDowntimeQueueEditRequest,
    applyPlayerDowntimeCollectRequest,
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootCurrencySplitRequest,
    applyPlayerLootUndoClaimRequest
  });

  const routeHandler = requesterRoutes[message.type];
  if (!routeHandler) return false;
  return runWithRequester(routeHandler);
}
