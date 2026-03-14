export function createRestFeatureModule(deps = {}) {
  return {
    id: "rest",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("rest");
    }
  };
}

export function normalizeSocketRestRequest(request, deps = {}) {
  const {
    restOps,
    sanitizeSocketIdentifier,
    clampSocketText,
    noteMaxLength,
    normalizeRestNoteSaveSource
  } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!restOps?.has?.(op)) return null;
  const slotId = sanitizeSocketIdentifier(request.slotId, { maxLength: 64 });
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!slotId || !actorId) return null;

  if (op === "setEntryNotes") {
    return {
      op,
      slotId,
      actorId,
      text: clampSocketText(request.text, noteMaxLength),
      source: normalizeRestNoteSaveSource(request.source)
    };
  }

  return { op, slotId, actorId };
}

function ensureRestSlotEntries(slot) {
  if (!slot.entries && slot.actorId) {
    slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
    slot.actorId = null;
    slot.notes = "";
  }
  if (!slot.entries) slot.entries = [];
}

function restSlotHasActor(slot, actorIdInput) {
  const actorId = String(actorIdInput ?? "").trim();
  if (!actorId) return false;
  ensureRestSlotEntries(slot);
  return slot.entries.some((entry) => String(entry?.actorId ?? "").trim() === actorId);
}

export async function applyRestRequest(request, requesterRef, deps = {}) {
  const {
    getRestWatchState,
    game,
    resolveRequester,
    canUserControlActor,
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
  const state = getRestWatchState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
  if (!requester) return;
  if (state.locked) return;
  if (request.op === "clearAll") return;

  const requestedActor = game?.actors?.get?.(request.actorId) ?? null;
  const requesterCanControlActor = Boolean(
    requestedActor
    && (requester?.isGM || canUserControlActor?.(requestedActor, requester))
  );
  if (request.op === "assignMe") {
    if (!requesterCanControlActor) return;
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;
    ensureRestSlotEntries(slot);
    if (restSlotHasActor(slot, request.actorId)) return;
    slot.entries.push({ actorId: request.actorId, notes: "" });
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return;
  }

  if (request.op === "clearEntry") {
    if (!requesterCanControlActor) return;
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;
    ensureRestSlotEntries(slot);
    const entryIndex = slot.entries.findIndex((entry) => entry.actorId === request.actorId);
    if (entryIndex === -1) return;
    slot.entries.splice(entryIndex, 1);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return;
  }

  if (request.op === "setEntryNotes") {
    if (!requesterCanControlActor) return;
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;
    ensureRestSlotEntries(slot);
    const entry = slot.entries.find((slotEntry) => slotEntry.actorId === request.actorId);
    if (!entry) {
      logUiDebug("rest-watch-notes", "socket reject setEntryNotes (entry not found)", {
        slotId: request.slotId,
        actorId: request.actorId,
        requesterId: String(requester?.id ?? "")
      });
      return;
    }
    entry.notes = String(request.text ?? "");
    logUiDebug("rest-watch-notes", "socket apply setEntryNotes", {
      slotId: request.slotId,
      actorId: request.actorId,
      requesterId: String(requester?.id ?? ""),
      requesterName: String(requester?.name ?? "Unknown"),
      textLength: String(request.text ?? "").length
    });
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
  }
}

export function setupRestWatchDragAndDrop(html, deps = {}) {
  const {
    getRestWatchState,
    canAccessAllPlayerOps,
    isLockedForUser,
    updateRestWatchState,
    ensureRestSlotEntriesList,
    addActorToRestSlot,
    refreshRestWatchAppsImmediately
  } = deps;

  const state = getRestWatchState();
  const isGM = canAccessAllPlayerOps();
  if (!isGM || isLockedForUser(state, isGM)) return;

  html.querySelectorAll(".po-watch-entry").forEach((entry) => {
    const actorId = entry.dataset.actorId;
    if (!actorId) return;
    entry.setAttribute("draggable", "true");
    entry.classList.add("is-draggable");
    if (entry.dataset.poRestDndBound === "1") return;
    entry.dataset.poRestDndBound = "1";
    entry.addEventListener("dragstart", (event) => {
      const slotId = entry.closest(".po-card")?.dataset?.slotId;
      if (!slotId) return;
      const payload = JSON.stringify({ actorId, fromSlotId: slotId });
      event.dataTransfer?.setData("text/plain", payload);
      event.dataTransfer?.setDragImage?.(entry, 20, 20);
    });
  });

  html.querySelectorAll(".po-card").forEach((card) => {
    if (card.dataset.poRestDropBound === "1") return;
    card.dataset.poRestDropBound = "1";

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("is-drop-target");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drop-target");
    });

    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      card.classList.remove("is-drop-target");

      const raw = event.dataTransfer?.getData("text/plain") ?? "";
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      const actorId = data?.actorId;
      const fromSlotId = data?.fromSlotId;
      const targetSlotId = card.dataset.slotId;
      if (!actorId || !fromSlotId || !targetSlotId) return;
      if (fromSlotId === targetSlotId) return;

      await updateRestWatchState((state) => {
        const slots = state.slots ?? [];
        const source = slots.find((slot) => slot.id === fromSlotId);
        if (source) {
          ensureRestSlotEntriesList(source);
          source.entries = source.entries.filter((entry) => entry.actorId !== actorId);
        }

        const target = slots.find((slot) => slot.id === targetSlotId);
        if (!target) return;
        addActorToRestSlot(target, actorId);
      }, { skipLocalRefresh: true });

      refreshRestWatchAppsImmediately();
    });
  });
}
