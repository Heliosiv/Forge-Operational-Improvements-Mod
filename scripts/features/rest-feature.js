export function createRestFeatureModule(deps = {}) {
  return {
    id: "rest",
    register() {
      if (typeof deps.onRegister === "function") deps.onRegister("rest");
    }
  };
}

const REST_SLOT_MAX_ENTRIES = 5;

function normalizeRestSlotEntryPosition(positionInput) {
  const position = Number.parseInt(positionInput, 10);
  if (!Number.isInteger(position) || position < 0 || position >= REST_SLOT_MAX_ENTRIES) return null;
  return position;
}

function normalizeRestSlotEntries(slot) {
  const source = Array.isArray(slot?.entries) ? slot.entries : [];
  const seenActorIds = new Set();
  const fixedRows = Array.from({ length: REST_SLOT_MAX_ENTRIES }, () => null);
  const pending = [];

  for (const sourceEntry of source) {
    const actorId = String(sourceEntry?.actorId ?? "").trim();
    if (!actorId || seenActorIds.has(actorId)) continue;
    seenActorIds.add(actorId);
    const entry = {
      actorId,
      notes: String(sourceEntry?.notes ?? "")
    };
    const position = normalizeRestSlotEntryPosition(sourceEntry?.position);
    if (position === null || fixedRows[position]) {
      pending.push(entry);
      continue;
    }
    fixedRows[position] = entry;
  }

  for (const entry of pending) {
    const nextOpenIndex = fixedRows.findIndex((row) => !row);
    if (nextOpenIndex === -1) break;
    fixedRows[nextOpenIndex] = entry;
  }

  slot.entries = fixedRows.map((entry, position) => (entry ? { ...entry, position } : null)).filter(Boolean);
}

function getNextOpenRestSlotPosition(slot) {
  normalizeRestSlotEntries(slot);
  const occupied = new Set(
    slot.entries.map((entry) => normalizeRestSlotEntryPosition(entry?.position)).filter(Number.isInteger)
  );
  for (let index = 0; index < REST_SLOT_MAX_ENTRIES; index += 1) {
    if (!occupied.has(index)) return index;
  }
  return -1;
}

export function normalizeSocketRestRequest(request, deps = {}) {
  const {
    restOps,
    sanitizeSocketIdentifier,
    clampSocketText,
    clampRestWatchRichNoteText,
    noteMaxLength,
    normalizeRestNoteSaveSource
  } = deps;

  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!restOps?.has?.(op)) return null;
  if (op === "replaceState") {
    const state =
      request.state && typeof request.state === "object" && !Array.isArray(request.state) ? request.state : null;
    return state ? { op, state } : null;
  }
  const slotId = sanitizeSocketIdentifier(request.slotId, { maxLength: 64 });
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!slotId) return null;

  if (op === "setEntryNotes") {
    if (!actorId) return null;
    const clampNoteText =
      typeof clampRestWatchRichNoteText === "function" ? clampRestWatchRichNoteText : clampSocketText;
    return {
      op,
      slotId,
      actorId,
      text: clampNoteText(request.text, noteMaxLength),
      source: normalizeRestNoteSaveSource(request.source)
    };
  }

  if (op === "moveSlot") {
    if (!actorId) return null;
    const fromSlotId = sanitizeSocketIdentifier(request.fromSlotId, { maxLength: 64 });
    if (!fromSlotId) return null;
    return { op, actorId, slotId, fromSlotId };
  }

  if (op === "setSlotEntry") {
    const entryIndexRaw = Number.parseInt(String(request.entryIndex ?? ""), 10);
    if (!Number.isInteger(entryIndexRaw) || entryIndexRaw < 0) return null;
    return { op, slotId, actorId, entryIndex: entryIndexRaw };
  }

  if (op === "setVisibleEntryCount") {
    const visibleEntryCountRaw = Number.parseInt(String(request.visibleEntryCount ?? ""), 10);
    if (!Number.isInteger(visibleEntryCountRaw) || visibleEntryCountRaw < 0) return null;
    return { op, slotId, visibleEntryCount: visibleEntryCountRaw };
  }

  if (op === "setCampfire") {
    return { op, slotId, active: Boolean(request.active) };
  }

  if (op === "setCampfireAll") {
    return { op, slotId, active: Boolean(request.active) };
  }

  if (!actorId) return null;

  return { op, slotId, actorId };
}

function ensureRestSlotEntries(slot) {
  if (!slot.entries && slot.actorId) {
    slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "", position: 0 }];
    slot.actorId = null;
    slot.notes = "";
  }
  if (!slot.entries) slot.entries = [];
  normalizeRestSlotEntries(slot);
}

function restSlotHasActor(slot, actorIdInput) {
  const actorId = String(actorIdInput ?? "").trim();
  if (!actorId) return false;
  ensureRestSlotEntries(slot);
  return slot.entries.some((entry) => String(entry?.actorId ?? "").trim() === actorId);
}

function restRequestResult(ok, summary, scope) {
  return { ok, summary, scope };
}

function restRequestFailure(summary, scope) {
  return restRequestResult(false, summary, scope);
}

function restRequestSuccess(scope) {
  return restRequestResult(true, "", scope);
}

export async function applyRestRequest(request, requesterRef, deps = {}) {
  const {
    getRestWatchState,
    game,
    resolveRequester,
    canAccessAllPlayerOps,
    canUserControlActor,
    canUserOperatePartyActor = canUserControlActor,
    stampUpdate,
    setModuleSettingWithLocalRefreshSuppressed,
    settings,
    scheduleIntegrationSync,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh,
    logUiDebug
  } = deps;

  const restScope = refreshScopeKeys?.REST ?? "rest";
  if (!request || typeof request !== "object")
    return restRequestFailure("Rest watch request was not valid.", restScope);
  const state = getRestWatchState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
  if (!requester) return restRequestFailure("Rest watch request could not be matched to a player.", restScope);
  if (state.locked) return restRequestFailure("Rest watch is locked by the GM.", restScope);
  if (request.op === "clearAll") return restRequestFailure("Only the GM can clear all rest watch entries.", restScope);

  if (request.op === "replaceState") {
    if (!requester?.isGM && !canAccessAllPlayerOps?.(requester))
      return restRequestFailure("Only shared party operators can replace the rest watch.", restScope);
    const nextState =
      request.state && typeof request.state === "object" && !Array.isArray(request.state) ? request.state : null;
    if (!nextState) return restRequestFailure("Rest watch replacement was not valid.", restScope);
    stampUpdate(nextState, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, nextState);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  const requestedActor = game?.actors?.get?.(request.actorId) ?? null;
  const requesterHasSharedPageAccess = Boolean(!requester?.isGM && canAccessAllPlayerOps?.(requester));
  const requesterCanControlActor = Boolean(
    requestedActor &&
    (requester?.isGM || requesterHasSharedPageAccess || canUserOperatePartyActor?.(requestedActor, requester))
  );
  if (request.op === "assignMe") {
    if (!requesterCanControlActor)
      return restRequestFailure("You do not have permission to assign that actor to rest watch.", restScope);
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(slot);
    if (restSlotHasActor(slot, request.actorId))
      return restRequestFailure("That actor is already assigned to this rest watch slot.", restScope);
    if ((slot.entries?.length ?? 0) >= REST_SLOT_MAX_ENTRIES)
      return restRequestFailure("That rest watch slot is full.", restScope);
    const position = getNextOpenRestSlotPosition(slot);
    if (position === -1) return restRequestFailure("That rest watch slot has no open position.", restScope);
    slot.entries.push({ actorId: request.actorId, notes: "", position });
    normalizeRestSlotEntries(slot);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "setSlotEntry") {
    const requestedActor = request.actorId ? (game?.actors?.get?.(request.actorId) ?? null) : null;
    if (request.actorId && !requestedActor) return restRequestFailure("Actor not found for rest watch.", restScope);
    if (
      requestedActor &&
      !requester?.isGM &&
      !requesterHasSharedPageAccess &&
      !canUserOperatePartyActor?.(requestedActor, requester)
    )
      return restRequestFailure("You do not have permission to assign that actor to rest watch.", restScope);
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(slot);
    const entryIndex = Number.parseInt(String(request.entryIndex ?? ""), 10);
    if (!Number.isInteger(entryIndex) || entryIndex < 0 || entryIndex >= REST_SLOT_MAX_ENTRIES)
      return restRequestFailure("That rest watch position is not valid.", restScope);
    slot.entries = slot.entries.filter((entry) => String(entry?.actorId ?? "") !== request.actorId);
    const existingIndex = slot.entries.findIndex(
      (entry) => normalizeRestSlotEntryPosition(entry?.position) === entryIndex
    );
    if (existingIndex >= 0) slot.entries.splice(existingIndex, 1);
    if (request.actorId) slot.entries.push({ actorId: request.actorId, notes: "", position: entryIndex });
    normalizeRestSlotEntries(slot);
    slot.visibleEntryCount = Math.max(Number(slot.visibleEntryCount ?? 0) || 0, entryIndex + 1);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "setVisibleEntryCount") {
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    const visibleEntryCount = Math.max(0, Math.min(REST_SLOT_MAX_ENTRIES, Number(request.visibleEntryCount ?? 0) || 0));
    slot.visibleEntryCount = visibleEntryCount;
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "setCampfire") {
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    if (!state.campfireBySlot || typeof state.campfireBySlot !== "object" || Array.isArray(state.campfireBySlot)) {
      state.campfireBySlot = {};
    }
    state.campfireBySlot[request.slotId] = Boolean(request.active);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "setCampfireAll") {
    const active = Boolean(request.active);
    state.campfire = active;
    if (!state.campfireBySlot || typeof state.campfireBySlot !== "object" || Array.isArray(state.campfireBySlot)) {
      state.campfireBySlot = {};
    }
    for (const slot of Array.isArray(state.slots) ? state.slots : []) {
      const nextSlotId = String(slot?.id ?? "").trim();
      if (nextSlotId) state.campfireBySlot[nextSlotId] = active;
    }
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "clearEntry") {
    if (!requesterCanControlActor)
      return restRequestFailure("You do not have permission to clear that rest watch actor.", restScope);
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(slot);
    const entryIndex = slot.entries.findIndex((entry) => entry.actorId === request.actorId);
    if (entryIndex === -1) return restRequestFailure("That actor is not assigned to this rest watch slot.", restScope);
    slot.entries.splice(entryIndex, 1);
    normalizeRestSlotEntries(slot);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }

  if (request.op === "setEntryNotes") {
    if (!requesterCanControlActor)
      return restRequestFailure("You do not have permission to update notes for that rest watch actor.", restScope);
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return restRequestFailure("That rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(slot);
    const entry = slot.entries.find((slotEntry) => slotEntry.actorId === request.actorId);
    if (!entry) {
      logUiDebug("rest-watch-notes", "socket reject setEntryNotes (entry not found)", {
        slotId: request.slotId,
        actorId: request.actorId,
        requesterId: String(requester?.id ?? "")
      });
      return restRequestFailure("That actor is not assigned to this rest watch slot.", restScope);
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
    return restRequestSuccess(restScope);
  }

  if (request.op === "moveSlot") {
    if (!requesterCanControlActor)
      return restRequestFailure("You do not have permission to move that rest watch actor.", restScope);
    const sourceSlot = state.slots.find((s) => s.id === request.fromSlotId);
    if (!sourceSlot) return restRequestFailure("The original rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(sourceSlot);
    const entryIndex = sourceSlot.entries.findIndex((e) => e.actorId === request.actorId);
    if (entryIndex === -1)
      return restRequestFailure("That actor is not assigned to the original rest watch slot.", restScope);
    const [movedEntry] = sourceSlot.entries.splice(entryIndex, 1);
    normalizeRestSlotEntries(sourceSlot);
    const targetSlot = state.slots.find((s) => s.id === request.slotId);
    if (!targetSlot) return restRequestFailure("The target rest watch slot no longer exists.", restScope);
    ensureRestSlotEntries(targetSlot);
    if (restSlotHasActor(targetSlot, request.actorId))
      return restRequestFailure("That actor is already assigned to the target rest watch slot.", restScope);
    if ((targetSlot.entries?.length ?? 0) >= REST_SLOT_MAX_ENTRIES)
      return restRequestFailure("The target rest watch slot is full.", restScope);
    const position = getNextOpenRestSlotPosition(targetSlot);
    if (position === -1) return restRequestFailure("The target rest watch slot has no open position.", restScope);
    targetSlot.entries.push({ actorId: request.actorId, notes: movedEntry?.notes ?? "", position });
    normalizeRestSlotEntries(targetSlot);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return restRequestSuccess(restScope);
  }
  return restRequestFailure("Rest watch action is not supported.", restScope);
}

export function setupRestWatchDragAndDrop(html, deps = {}) {
  const {
    getRestWatchState,
    isActualGM = false, // Actual GM status for drag-and-drop interaction permissions
    isLockedForUser,
    updateRestWatchState,
    refreshRestWatchAppsImmediately
  } = deps;

  const state = getRestWatchState();
  if (isLockedForUser(state, isActualGM)) return;

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

      await updateRestWatchState(
        { op: "moveSlot", actorId, fromSlotId, slotId: targetSlotId },
        { skipLocalRefresh: true }
      );

      refreshRestWatchAppsImmediately();
    });
  });
}
