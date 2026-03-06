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

export async function applyRestRequest(request, requesterRef, deps = {}) {
  const {
    getRestWatchState,
    resolveRequester,
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

  const requesterActor = requester.character;
  if (request.op === "assignMe") {
    if (!requesterActor || requesterActor.id !== request.actorId) return;
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;
    ensureRestSlotEntries(slot);
    slot.entries.push({ actorId: request.actorId, notes: "" });
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return;
  }

  if (request.op === "clearEntry") {
    const slot = state.slots.find((entry) => entry.id === request.slotId);
    if (!slot) return;
    ensureRestSlotEntries(slot);
    const entryIndex = slot.entries.findIndex((entry) => entry.actorId === requesterActor?.id);
    if (entryIndex === -1) return;
    if (slot.entries[entryIndex].actorId !== request.actorId) return;
    slot.entries.splice(entryIndex, 1);
    stampUpdate(state, requester);
    await setModuleSettingWithLocalRefreshSuppressed(settings.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps({ scope: refreshScopeKeys.REST });
    emitSocketRefresh({ scope: refreshScopeKeys.REST });
    return;
  }

  if (request.op === "setEntryNotes") {
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
