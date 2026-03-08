export function createMarchFeatureModule(deps = {}) {
  return {
    id: "march",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("march");
    }
  };
}

export function normalizeSocketMarchRequest(request, deps = {}) {
  const {
    marchOps,
    marchRanks,
    sanitizeSocketIdentifier,
    clampSocketText,
    noteMaxLength
  } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!marchOps?.has?.(op)) return null;
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!actorId) return null;

  if (op === "joinRank") {
    const rankId = String(request.rankId ?? "").trim();
    if (!marchRanks?.has?.(rankId)) return null;
    return { op, actorId, rankId };
  }

  return {
    op,
    actorId,
    text: clampSocketText(request.text, noteMaxLength)
  };
}

export async function applyMarchRequest(request, requesterRef, deps = {}) {
  const {
    getMarchingOrderState,
    game,
    resolveRequester,
    canUserControlActor,
    isMarchingOrderPlayerLocked,
    stampUpdate,
    setModuleSettingWithLocalRefreshSuppressed,
    settings,
    scheduleIntegrationSync,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh,
    logUiDebug
  } = deps;

  if (!request || typeof request !== "object") return;
  const state = getMarchingOrderState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
  if (!requester) return;
  const requestedActor = game?.actors?.get?.(request.actorId) ?? null;
  const requesterCanControlActor = Boolean(
    requestedActor
    && (requester?.isGM || canUserControlActor?.(requestedActor, requester))
  );

  if (request.op === "joinRank") {
    if (!requesterCanControlActor) return;
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester)) return;
    for (const key of Object.keys(state.ranks)) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== request.actorId);
    }
    if (!state.ranks[request.rankId]) state.ranks[request.rankId] = [];
    state.ranks[request.rankId].push(request.actorId);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
    return;
  }

  if (request.op === "setNote") {
    if (!requesterCanControlActor) return;
    if (!requester?.isGM && isMarchingOrderPlayerLocked?.(requester)) return;
    const inFormation = Object.values(state.ranks ?? {}).some((actorIds) => (
      Array.isArray(actorIds) && actorIds.includes(request.actorId)
    ));
    if (!inFormation) {
      logUiDebug("march-notes", "socket reject setNote (actor not in formation)", {
        actorId: request.actorId,
        requesterId: String(requester?.id ?? ""),
        requesterName: String(requester?.name ?? "Unknown")
      });
      return;
    }
    if (!state.notes) state.notes = {};
    state.notes[request.actorId] = String(request.text ?? "");
    logUiDebug("march-notes", "socket apply setNote", {
      actorId: request.actorId,
      requesterId: String(requester?.id ?? ""),
      requesterName: String(requester?.name ?? "Unknown"),
      textLength: String(request.text ?? "").length
    });
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.MARCH });
    emitSocketRefresh({ scope: refreshScopeKeys.MARCH });
  }
}
