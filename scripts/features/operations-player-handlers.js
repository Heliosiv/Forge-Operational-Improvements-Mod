export async function applyPlayerActivityUpdateRequest(message, requesterRef = null, deps = {}) {
  const {
    getSocketRequester,
    sanitizeSocketIdentifier,
    normalizeSocketActivityType,
    getRestActivities,
    setModuleSettingWithLocalRefreshSuppressed,
    settings,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh
  } = deps;

  const requester = getSocketRequester(
    { ...(message ?? {}), userId: requesterRef ?? message?.userId },
    { allowGM: false, requireActive: true }
  );
  const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
  const activityType = normalizeSocketActivityType(message?.activity);
  if (!requester || !actorId || !activityType) return;

  const requesterActor = requester.character;
  if (!requesterActor || requesterActor.id !== actorId) return;

  const activities = getRestActivities();
  if (!activities.activities[actorId]) activities.activities[actorId] = {};
  activities.activities[actorId].activity = activityType;
  await setModuleSettingWithLocalRefreshSuppressed(settings.REST_ACTIVITIES, activities);
  refreshOpenApps({ scope: refreshScopeKeys.REST });
  emitSocketRefresh({ scope: refreshScopeKeys.REST });
}

export async function applyPlayerSettingWriteRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    canAccessAllPlayerOps,
    isWritableModuleSettingKey,
    game,
    foundry,
    moduleId,
    suppressNextSettingRefresh,
    refreshOpenApps,
    getRefreshScopesForSettingKey,
    emitSocketRefresh,
    logUiFailure
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  if (!canAccessAllPlayerOps(requester)) return;

  const settingKey = String(message?.settingKey ?? "").trim();
  if (!isWritableModuleSettingKey(settingKey)) return;
  const settingRecord = game.settings?.settings?.get?.(`${moduleId}.${settingKey}`) ?? null;
  if (String(settingRecord?.scope ?? "").trim().toLowerCase() === "client") return;

  try {
    const fullSettingKey = `${moduleId}.${settingKey}`;
    suppressNextSettingRefresh(fullSettingKey);
    await game.settings.set(moduleId, settingKey, foundry.utils.deepClone(message?.value));
    const scopes = getRefreshScopesForSettingKey(settingKey);
    refreshOpenApps({ scopes });
    emitSocketRefresh({ scopes });
  } catch (error) {
    logUiFailure("settings-proxy", "failed player-proxy setting write", error, {
      requesterId: String(requester?.id ?? ""),
      requesterName: String(requester?.name ?? "Player"),
      settingKey
    });
  }
}

export async function applyPlayerFolderOwnershipWriteRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    canAccessAllPlayerOps,
    sanitizeSocketIdentifier,
    constDocOwnershipLevels,
    game,
    foundry,
    ui,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh,
    moduleId
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  if (!canAccessAllPlayerOps(requester)) return;

  const folderId = sanitizeSocketIdentifier(message?.folderId, { maxLength: 64 });
  if (!folderId) return;

  const levelsSource = message?.levels && typeof message.levels === "object" ? message.levels : {};
  const levels = {};
  for (const [key, rawValue] of Object.entries(levelsSource)) {
    const ownershipKey = String(key ?? "").trim();
    if (!ownershipKey) continue;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) continue;
    const level = Math.max(
      Number(constDocOwnershipLevels?.NONE ?? 0),
      Math.min(Number(constDocOwnershipLevels?.OWNER ?? 3), Math.trunc(parsed))
    );
    levels[ownershipKey] = level;
  }
  if (Object.keys(levels).length <= 0) return;

  const folder = game.folders?.get?.(folderId) ?? null;
  if (!folder) return;

  const documents = Array.from(folder.contents ?? []).filter((document) => document && typeof document.update === "function");
  if (documents.length <= 0) {
    ui.notifications?.info(`No documents found in folder "${String(folder?.name ?? "Folder")}".`);
    return;
  }

  let updatedCount = 0;
  for (const document of documents) {
    const currentOwnership = document?.ownership && typeof document.ownership === "object"
      ? foundry.utils.deepClone(document.ownership)
      : { default: Number(constDocOwnershipLevels?.NONE ?? 0) };
    let changed = false;
    for (const [ownershipKey, level] of Object.entries(levels)) {
      if (Number(currentOwnership[ownershipKey]) === Number(level)) continue;
      currentOwnership[ownershipKey] = level;
      changed = true;
    }
    if (!changed) continue;
    try {
      await document.update({ ownership: currentOwnership });
      updatedCount += 1;
    } catch (error) {
      console.warn(`${moduleId}: failed updating ownership for folder document`, {
        folderId,
        documentId: String(document?.id ?? ""),
        error
      });
    }
  }

  if (updatedCount > 0) {
    ui.notifications?.info(`Updated permissions on ${updatedCount} document${updatedCount === 1 ? "" : "s"} in "${String(folder?.name ?? "Folder")}".`);
    refreshOpenApps({ scope: refreshScopeKeys.OPERATIONS });
    emitSocketRefresh({ scope: refreshScopeKeys.OPERATIONS });
  }
}

export async function applyPlayerSopNoteRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    sopKeys,
    clampSocketText,
    noteMaxLength,
    updateOperationsLedger,
    setSharedSopNoteText
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;

  const sopKey = String(message?.sopKey ?? "").trim();
  if (!sopKeys.includes(sopKey)) return;
  const note = clampSocketText(message?.note, noteMaxLength);

  await updateOperationsLedger((ledger) => {
    setSharedSopNoteText(ledger, sopKey, note);
  });
}

export async function applyPlayerOperationsLedgerWriteRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    buildDefaultOperationsLedger,
    foundry,
    setModuleSettingWithLocalRefreshSuppressed,
    settings,
    scheduleIntegrationSync,
    refreshOpenApps,
    refreshScopeKeys,
    emitSocketRefresh
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const incomingLedger = message?.ledger;
  if (!incomingLedger || typeof incomingLedger !== "object" || Array.isArray(incomingLedger)) return;

  const defaults = buildDefaultOperationsLedger();
  const mergedLedger = foundry.utils.mergeObject(defaults, incomingLedger, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });

  await setModuleSettingWithLocalRefreshSuppressed(settings.OPS_LEDGER, mergedLedger);
  scheduleIntegrationSync("operations-ledger");
  refreshOpenApps({ scope: refreshScopeKeys.OPERATIONS });
  emitSocketRefresh({ scope: refreshScopeKeys.OPERATIONS });
}

export async function applyPlayerDowntimeSubmitRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    getOperationsLedger,
    ensureDowntimeState,
    normalizeDowntimeSubmission,
    sanitizeSocketIdentifier,
    applyDowntimeSubmissionForUser
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const entry = message?.entry && typeof message.entry === "object" ? message.entry : null;
  if (!entry) return;
  const previewLedger = getOperationsLedger();
  const previewDowntime = ensureDowntimeState(previewLedger);
  const normalizedEntry = normalizeDowntimeSubmission(entry, previewDowntime);
  if (!sanitizeSocketIdentifier(normalizedEntry.actorId, { maxLength: 64 })) return;
  await applyDowntimeSubmissionForUser(requester, normalizedEntry);
}

export async function applyPlayerDowntimeClearRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    sanitizeSocketIdentifier,
    game,
    canUserManageDowntimeActor,
    updateOperationsLedger,
    ensureDowntimeState
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor || !canUserManageDowntimeActor(requester, actor)) return;
  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    if (!downtime.entries) return;
    delete downtime.entries[actorId];
  });
}

export async function applyPlayerDowntimeCollectRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    sanitizeSocketIdentifier,
    applyDowntimeCollectionForUser,
    ui,
    getDowntimeCollectionSummary
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
  if (!actorId) return;
  const outcome = await applyDowntimeCollectionForUser(requester, actorId);
  if (!outcome.ok) {
    ui.notifications?.warn(`Downtime collect failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
    return;
  }
  ui.notifications?.info(`${requester.name} collected downtime rewards for ${outcome.actorName}. ${getDowntimeCollectionSummary(outcome)}`);
}
