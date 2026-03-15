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
    const insertIndexRaw = Number.parseInt(String(request.insertIndex ?? ""), 10);
    const insertIndex = Number.isInteger(insertIndexRaw) && insertIndexRaw >= 0 ? insertIndexRaw : null;
    return insertIndex === null ? { op, actorId, rankId } : { op, actorId, rankId, insertIndex };
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
    logUiDebug,
    markDoctrineTriggerPending,
    doctrineTriggers,
    normalizeMarchingFormation
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
    const target = state.ranks[request.rankId];
    const requestedInsertIndex = Number.parseInt(String(request.insertIndex ?? ""), 10);
    const safeIndex = Number.isInteger(requestedInsertIndex) && requestedInsertIndex >= 0
      ? Math.max(0, Math.min(requestedInsertIndex, target.length))
      : target.length;
    target.splice(safeIndex, 0, request.actorId);
    if (normalizeMarchingFormation?.(state.formation ?? "loose") !== "free") {
      markDoctrineTriggerPending?.(state, doctrineTriggers?.MAJOR_REPOSITION ?? "major-reposition");
    }
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

export function setupMarchingDragAndDrop(html, deps = {}) {
  const {
    getMarchingOrderState,
    canAccessAllPlayerOps,
    canDragEntry,
    isLockedForUser,
    notifyUiWarnThrottled,
    updateMarchingOrderState,
    refreshSingleAppPreservingView,
    getAppInstance,
    markDoctrineTriggerPending,
    doctrineTriggers,
    normalizeMarchingFormation,
    appInstanceKeys
  } = deps;

  const state = getMarchingOrderState();
  const isGM = canAccessAllPlayerOps();
  const locked = state.locked;

  const draggableEntries = [
    ...Array.from(html.querySelectorAll(".po-entry")),
    ...Array.from(html.querySelectorAll(".po-march-board-card[data-actor-id]")),
    ...Array.from(html.querySelectorAll(".po-march-board-staging-chip[data-actor-id]"))
  ];

  draggableEntries.forEach((entry) => {
    const actorId = entry.dataset.actorId;
    if (!actorId) return;
    const draggable = canDragEntry(actorId, isGM, locked);
    entry.setAttribute("draggable", draggable ? "true" : "false");
    entry.classList.toggle("is-draggable", draggable);
    if (!draggable) return;
    if (entry.dataset.poDndEntryBound === "1") return;
    entry.dataset.poDndEntryBound = "1";
    entry.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", actorId);
      event.dataTransfer?.setDragImage?.(entry, 20, 20);
    });

    const handle = entry.querySelector(".po-entry-handle");
    if (handle) {
      handle.setAttribute("draggable", "true");
      if (handle.dataset.poDndHandleBound !== "1") {
        handle.dataset.poDndHandleBound = "1";
        handle.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", actorId);
          event.dataTransfer?.setDragImage?.(entry, 20, 20);
          event.stopPropagation();
        });
      }
    }
  });

  const dropTargets = [
    ...Array.from(html.querySelectorAll(".po-rank-col")),
    ...Array.from(html.querySelectorAll(".po-march-board-cell[data-rank-id]"))
  ];

  dropTargets.forEach((column) => {
    if (column.dataset.poDndColBound === "1") return;
    column.dataset.poDndColBound = "1";
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      if (!isGM) return;
      const liveState = getMarchingOrderState();
      if (isLockedForUser(liveState, isGM)) {
        notifyUiWarnThrottled("Marching order is locked by the GM.", {
          key: "marching-order-locked",
          ttlMs: 1500
        });
        return;
      }
      const actorId = event.dataTransfer?.getData("text/plain");
      if (!actorId) return;
      const rankId = column.dataset.rankId || column.closest?.("[data-rank-id]")?.dataset?.rankId;
      if (!rankId) return;

      let insertIndex = Number.parseInt(String(column.dataset.insertIndex ?? ""), 10);
      if (!Number.isInteger(insertIndex) || insertIndex < 0) {
        const targetEntry = event.target?.closest?.(".po-entry") ?? event.target?.closest?.(".po-march-board-card");
        const entryList = [
          ...Array.from(column.querySelectorAll(".po-entry")),
          ...Array.from(column.querySelectorAll(".po-march-board-card"))
        ];
        insertIndex = targetEntry ? entryList.indexOf(targetEntry) : entryList.length;
      }

      await updateMarchingOrderState((state) => {
        for (const key of Object.keys(state.ranks)) {
          state.ranks[key] = (state.ranks[key] ?? []).filter((id) => id !== actorId);
        }
        if (!state.ranks[rankId]) state.ranks[rankId] = [];
        const target = state.ranks[rankId];
        const safeIndex = Math.max(0, Math.min(insertIndex, target.length));
        target.splice(safeIndex, 0, actorId);
        if (normalizeMarchingFormation?.(state.formation ?? "loose") !== "free") {
          markDoctrineTriggerPending?.(state, doctrineTriggers?.MAJOR_REPOSITION ?? "major-reposition");
        }
      }, { skipLocalRefresh: true });

      refreshSingleAppPreservingView(getAppInstance(appInstanceKeys.MARCHING_ORDER));
    });
  });
}
