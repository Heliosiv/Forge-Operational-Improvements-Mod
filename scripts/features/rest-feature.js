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

  slot.entries = fixedRows
    .map((entry, position) => (entry ? { ...entry, position } : null))
    .filter(Boolean);
}

function getNextOpenRestSlotPosition(slot) {
  normalizeRestSlotEntries(slot);
  const occupied = new Set(slot.entries.map((entry) => normalizeRestSlotEntryPosition(entry?.position)).filter(Number.isInteger));
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

  if (op === "moveSlot") {
    const fromSlotId = sanitizeSocketIdentifier(request.fromSlotId, { maxLength: 64 });
    if (!fromSlotId) return null;
    return { op, actorId, slotId, fromSlotId };
  }

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
    if ((slot.entries?.length ?? 0) >= REST_SLOT_MAX_ENTRIES) return;
    const position = getNextOpenRestSlotPosition(slot);
    if (position === -1) return;
    slot.entries.push({ actorId: request.actorId, notes: "", position });
    normalizeRestSlotEntries(slot);
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
    normalizeRestSlotEntries(slot);
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
    return;
  }

  if (request.op === "moveSlot") {
    if (!requesterCanControlActor) return;
    const sourceSlot = state.slots.find((s) => s.id === request.fromSlotId);
    if (!sourceSlot) return;
    ensureRestSlotEntries(sourceSlot);
    const entryIndex = sourceSlot.entries.findIndex((e) => e.actorId === request.actorId);
    if (entryIndex === -1) return;
    const [movedEntry] = sourceSlot.entries.splice(entryIndex, 1);
    normalizeRestSlotEntries(sourceSlot);
    const targetSlot = state.slots.find((s) => s.id === request.slotId);
    if (!targetSlot) return;
    ensureRestSlotEntries(targetSlot);
    if (restSlotHasActor(targetSlot, request.actorId)) return;
    if ((targetSlot.entries?.length ?? 0) >= REST_SLOT_MAX_ENTRIES) return;
    const position = getNextOpenRestSlotPosition(targetSlot);
    if (position === -1) return;
    targetSlot.entries.push({ actorId: request.actorId, notes: movedEntry?.notes ?? "", position });
    normalizeRestSlotEntries(targetSlot);
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
    isActualGM = false,  // Actual GM status for drag-and-drop interaction permissions
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

      await updateRestWatchState({ op: "moveSlot", actorId, fromSlotId, slotId: targetSlotId }, { skipLocalRefresh: true });

      refreshRestWatchAppsImmediately();
    });
  });
}
