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
    moduleId,
    findOperationsJournalRootFolder,
    journalFolderIsUnderRoot
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

  if (String(folder?.type ?? "") !== "JournalEntry") {
    ui.notifications?.warn("Only journal folders can be updated through Party Operations permissions.");
    return;
  }

  const rootFolder = findOperationsJournalRootFolder?.() ?? null;
  const rootFolderId = String(rootFolder?.id ?? "").trim();
  if (!rootFolderId) {
    ui.notifications?.warn("Party Operations journal root is not available.");
    return;
  }

  const folderWithinOperationsRoot = folderId === rootFolderId
    || Boolean(journalFolderIsUnderRoot?.(folderId, rootFolderId));
  if (!folderWithinOperationsRoot) {
    ui.notifications?.warn("That folder is outside Party Operations journal logs.");
    return;
  }

  const allJournalFolders = Array.from(game.folders?.contents ?? []).filter(
    (entry) => entry && String(entry.type ?? "") === "JournalEntry"
  );
  const targetFolderIds = new Set([folderId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const candidate of allJournalFolders) {
      const candidateId = String(candidate?.id ?? "").trim();
      if (!candidateId || targetFolderIds.has(candidateId)) continue;
      const parentId = String(candidate?.folder?.id ?? candidate?.folder ?? candidate?.parent?.id ?? "").trim();
      if (!parentId || !targetFolderIds.has(parentId)) continue;
      targetFolderIds.add(candidateId);
      expanded = true;
    }
  }

  const seenDocumentIds = new Set();
  const documents = [];
  const foldersToUpdate = [];
  for (const targetFolderId of targetFolderIds) {
    const targetFolder = game.folders?.get?.(targetFolderId) ?? null;
    if (targetFolder && typeof targetFolder.update === "function") {
      foldersToUpdate.push(targetFolder);
    }
    for (const document of Array.from(targetFolder?.contents ?? [])) {
      if (!document || String(document?.documentName ?? "") !== "JournalEntry" || typeof document.update !== "function") continue;
      const documentId = String(document?.id ?? "").trim();
      if (!documentId || seenDocumentIds.has(documentId)) continue;
      seenDocumentIds.add(documentId);
      documents.push(document);
    }
  }

  if (foldersToUpdate.length <= 0 && documents.length <= 0) {
    ui.notifications?.info(`No journal entries found in folder "${String(folder?.name ?? "Folder")}".`);
    return;
  }

  let updatedFolderCount = 0;
  for (const targetFolder of foldersToUpdate) {
    const currentOwnership = targetFolder?.ownership && typeof targetFolder.ownership === "object"
      ? foundry.utils.deepClone(targetFolder.ownership)
      : { default: Number(constDocOwnershipLevels?.NONE ?? 0) };
    let changed = false;
    for (const [ownershipKey, level] of Object.entries(levels)) {
      if (Number(currentOwnership[ownershipKey]) === Number(level)) continue;
      currentOwnership[ownershipKey] = level;
      changed = true;
    }
    if (!changed) continue;
    try {
      await targetFolder.update({ ownership: currentOwnership });
      updatedFolderCount += 1;
    } catch (error) {
      console.warn(`${moduleId}: failed updating ownership for journal folder`, {
        folderId: String(targetFolder?.id ?? ""),
        error
      });
    }
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

  if (updatedFolderCount > 0 || updatedCount > 0) {
    const folderSummary = updatedFolderCount > 0
      ? `${updatedFolderCount} folder${updatedFolderCount === 1 ? "" : "s"}`
      : "0 folders";
    const documentSummary = updatedCount > 0
      ? `${updatedCount} document${updatedCount === 1 ? "" : "s"}`
      : "0 documents";
    ui.notifications?.info(`Updated permissions on ${folderSummary} and ${documentSummary} in "${String(folder?.name ?? "Folder")}".`);
    refreshOpenApps({ scope: refreshScopeKeys.OPERATIONS });
    emitSocketRefresh({ scope: refreshScopeKeys.OPERATIONS });
  }
}

export async function applyPlayerSopNoteRequest(message, requesterRef = null, deps = {}) {
  const {
    resolveRequester,
    canAccessAllPlayerOps,
    sopKeys,
    clampSocketText,
    noteMaxLength,
    updateOperationsLedger,
    setSharedSopNoteText
  } = deps;

  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  if (!canAccessAllPlayerOps?.(requester)) return;

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
    canAccessAllPlayerOps,
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
  if (!canAccessAllPlayerOps?.(requester)) return;
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
    const current = downtime.entries[actorId];
    if (!current) return;
    const queue = Array.isArray(current.queue) ? current.queue : [];
    if (queue.length > 0) {
      const nextActive = queue.shift();
      downtime.entries[actorId] = {
        ...nextActive,
        queue,
        hoursInvested: Math.max(0, Number(current.hoursInvested ?? 0) || 0),
        currentMilestone: Math.max(0, Number(current.currentMilestone ?? 0) || 0)
      };
    } else {
      delete downtime.entries[actorId];
    }
  });
}

export async function applyPlayerDowntimeQueueEditRequest(message, requesterRef = null, deps = {}) {
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

  const operation = String(message?.operation ?? "").trim().toLowerCase();
  const queueIndexRaw = Number(message?.queueIndex);
  const queueIndex = Number.isFinite(queueIndexRaw) ? Math.max(0, Math.floor(queueIndexRaw)) : -1;
  const targetQueueIndexRaw = Number(message?.targetQueueIndex);
  const targetQueueIndex = Number.isFinite(targetQueueIndexRaw) ? Math.max(0, Math.floor(targetQueueIndexRaw)) : -1;
  if (!["remove", "promote", "move-up", "move-down", "move-to", "clear-all"].includes(operation)) return;
  if (operation !== "clear-all" && queueIndex < 0) return;

  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    if (!downtime.entries) return;
    const current = downtime.entries[actorId];
    if (!current) return;
    const queue = Array.isArray(current.queue) ? [...current.queue] : [];
    if (operation === "clear-all") {
      downtime.entries[actorId] = {
        ...current,
        queue: []
      };
      return;
    }
    if (queueIndex >= queue.length) return;

    if (operation === "remove") {
      queue.splice(queueIndex, 1);
      downtime.entries[actorId] = {
        ...current,
        queue
      };
      return;
    }

    if (operation === "move-up") {
      if (queueIndex <= 0) return;
      const temp = queue[queueIndex - 1];
      queue[queueIndex - 1] = queue[queueIndex];
      queue[queueIndex] = temp;
      downtime.entries[actorId] = {
        ...current,
        queue
      };
      return;
    }

    if (operation === "move-down") {
      if (queueIndex >= queue.length - 1) return;
      const temp = queue[queueIndex + 1];
      queue[queueIndex + 1] = queue[queueIndex];
      queue[queueIndex] = temp;
      downtime.entries[actorId] = {
        ...current,
        queue
      };
      return;
    }

    if (operation === "move-to") {
      if (targetQueueIndex < 0 || targetQueueIndex >= queue.length) return;
      if (queueIndex === targetQueueIndex) return;
      const [moved] = queue.splice(queueIndex, 1);
      if (!moved) return;
      const insertIndex = queueIndex < targetQueueIndex ? targetQueueIndex - 1 : targetQueueIndex;
      queue.splice(insertIndex, 0, moved);
      downtime.entries[actorId] = {
        ...current,
        queue
      };
      return;
    }

    if (operation === "promote") {
      const [nextActive] = queue.splice(queueIndex, 1);
      if (!nextActive) return;
      const previousActive = {
        ...current,
        queue: undefined
      };
      downtime.entries[actorId] = {
        ...nextActive,
        queue: [previousActive, ...queue],
        hoursInvested: Math.max(0, Number(current.hoursInvested ?? 0) || 0),
        currentMilestone: Math.max(0, Number(current.currentMilestone ?? 0) || 0),
        updatedAt: Date.now(),
        updatedBy: String(requester.name ?? "Player"),
        updatedByUserId: String(requester.id ?? "")
      };
    }
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
