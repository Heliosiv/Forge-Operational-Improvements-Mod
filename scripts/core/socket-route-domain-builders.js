export function buildRestSocketRouteDeps({
  normalizeSocketRestRequest,
  restOps,
  sanitizeSocketIdentifier,
  clampSocketText,
  clampRestWatchRichNoteText,
  socketNoteMaxLength,
  normalizeRestNoteSaveSource,
  applyRestRequest,
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
  logUiDebug,
  applyPlayerActivityUpdateRequestFeature,
  getSocketRequester,
  normalizeSocketActivityType,
  getRestActivities
} = {}) {
  return {
    normalizeSocketRestRequest: (request) => normalizeSocketRestRequest(request, {
      restOps,
      sanitizeSocketIdentifier,
      clampSocketText,
      clampRestWatchRichNoteText,
      noteMaxLength: socketNoteMaxLength,
      normalizeRestNoteSaveSource
    }),
    applyRestRequest: (request, requesterRef) => applyRestRequest(request, requesterRef, {
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
    }),
    applyPlayerActivityUpdateRequest: (message) => applyPlayerActivityUpdateRequestFeature(message, null, {
      getSocketRequester,
      sanitizeSocketIdentifier,
      normalizeSocketActivityType,
      getRestActivities,
      setModuleSettingWithLocalRefreshSuppressed,
      settings,
      refreshOpenApps,
      refreshScopeKeys,
      emitSocketRefresh
    })
  };
}

export function buildMarchSocketRouteDeps({
  normalizeSocketMarchRequest,
  marchOps,
  marchRanks,
  sanitizeSocketIdentifier,
  clampSocketText,
  socketNoteMaxLength,
  applyMarchRequest,
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
} = {}) {
  return {
    normalizeSocketMarchRequest: (request) => normalizeSocketMarchRequest(request, {
      marchOps,
      marchRanks,
      sanitizeSocketIdentifier,
      clampSocketText,
      noteMaxLength: socketNoteMaxLength
    }),
    applyMarchRequest: (request, requesterRef) => applyMarchRequest(request, requesterRef, {
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
    })
  };
}

export function buildSettingsSocketRouteDeps({
  applyPlayerSettingWriteRequestFeature,
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
  logUiFailure,
  applyPlayerFolderOwnershipWriteRequestFeature,
  sanitizeSocketIdentifier,
  constDocOwnershipLevels,
  ui,
  refreshScopeKeys
} = {}) {
  return {
    applyPlayerSettingWriteRequest: (message, requesterRef) => applyPlayerSettingWriteRequestFeature(message, requesterRef, {
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
    }),
    applyPlayerFolderOwnershipWriteRequest: (message, requesterRef) => applyPlayerFolderOwnershipWriteRequestFeature(message, requesterRef, {
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
    })
  };
}

export function buildOperationsSocketRouteDeps({
  applyPlayerSopNoteRequestFeature,
  resolveRequester,
  canAccessAllPlayerOps,
  sopKeys,
  clampSocketText,
  socketNoteMaxLength,
  updateOperationsLedger,
  setSharedSopNoteText,
  applyPlayerOperationsLedgerWriteRequestFeature,
  buildDefaultOperationsLedger,
  foundry,
  setModuleSettingWithLocalRefreshSuppressed,
  settings,
  scheduleIntegrationSync,
  refreshOpenApps,
  refreshScopeKeys,
  emitSocketRefresh
} = {}) {
  return {
    applyPlayerSopNoteRequest: (message, requesterRef) => applyPlayerSopNoteRequestFeature(message, requesterRef, {
      resolveRequester,
      canAccessAllPlayerOps,
      sopKeys,
      clampSocketText,
      noteMaxLength: socketNoteMaxLength,
      updateOperationsLedger,
      setSharedSopNoteText
    }),
    applyPlayerOperationsLedgerWriteRequest: (message, requesterRef) => applyPlayerOperationsLedgerWriteRequestFeature(message, requesterRef, {
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
    })
  };
}

export function buildDowntimeSocketRouteDeps({
  applyPlayerDowntimeSubmitRequestFeature,
  resolveRequester,
  getOperationsLedger,
  ensureDowntimeState,
  normalizeDowntimeSubmission,
  sanitizeSocketIdentifier,
  applyDowntimeSubmissionForUser,
  applyPlayerDowntimeClearRequestFeature,
  game,
  canUserManageDowntimeActor,
  updateOperationsLedger,
  applyPlayerDowntimeCollectRequestFeature,
  applyDowntimeCollectionForUser,
  ui,
  getDowntimeCollectionSummary
} = {}) {
  return {
    applyPlayerDowntimeSubmitRequest: (message, requesterRef) => applyPlayerDowntimeSubmitRequestFeature(message, requesterRef, {
      resolveRequester,
      getOperationsLedger,
      ensureDowntimeState,
      normalizeDowntimeSubmission,
      sanitizeSocketIdentifier,
      applyDowntimeSubmissionForUser
    }),
    applyPlayerDowntimeClearRequest: (message, requesterRef) => applyPlayerDowntimeClearRequestFeature(message, requesterRef, {
      resolveRequester,
      sanitizeSocketIdentifier,
      game,
      canUserManageDowntimeActor,
      updateOperationsLedger,
      ensureDowntimeState
    }),
    applyPlayerDowntimeCollectRequest: (message, requesterRef) => applyPlayerDowntimeCollectRequestFeature(message, requesterRef, {
      resolveRequester,
      sanitizeSocketIdentifier,
      applyDowntimeCollectionForUser,
      ui,
      getDowntimeCollectionSummary
    })
  };
}

export function buildCommerceSocketRouteDeps({
  applyPlayerMerchantBarterRequest,
  applyPlayerMerchantTradeRequest,
  applyPlayerLootClaimRequest,
  applyPlayerLootCurrencyClaimRequest,
  applyPlayerLootCurrencySplitRequest,
  applyPlayerLootUndoClaimRequest
} = {}) {
  return {
    applyPlayerMerchantBarterRequest,
    applyPlayerMerchantTradeRequest,
    applyPlayerLootClaimRequest,
    applyPlayerLootCurrencyClaimRequest,
    applyPlayerLootCurrencySplitRequest,
    applyPlayerLootUndoClaimRequest
  };
}
