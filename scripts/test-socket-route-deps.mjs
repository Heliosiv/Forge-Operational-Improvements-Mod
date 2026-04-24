import assert from "node:assert/strict";

import { buildPartyOperationsSocketRouteDeps, createPartyOperationsSocketHandler } from "./core/socket-route-deps.js";

{
  const settings = { REST_STATE: "restWatchState" };
  const refreshScopeKeys = { REST: "rest" };
  const restOps = { START: "start" };
  const routeDeps = buildPartyOperationsSocketRouteDeps({
    settings,
    refreshScopeKeys,
    normalizeRefreshScopeList: "normalize-refresh",
    setLootClaimActorSelection: "set-actor",
    normalizeLootClaimActorId: "normalize-actor",
    setLootClaimRunSelection: "set-run",
    normalizeLootClaimRunId: "normalize-run",
    waitForLootClaimsPublished: "wait",
    buildLootClaimsContext: "build-claims",
    logUiDebug: "log-debug",
    openOperationsLootClaimsTabForPlayer: "open-claims",
    openRestWatchUiForCurrentUser: "open-rest",
    refreshOpenApps: "refresh-open-apps",
    schedulePendingSopNoteSync: "schedule-sop",
    syncMerchantBarterStatusForOpenDialogs: "sync-barter",
    getSocketRequester: "get-requester",
    sanitizeSocketIdentifier: "sanitize",
    normalizeSocketActivityType: "normalize-activity",
    getRestActivities: "get-activities",
    setModuleSettingWithLocalRefreshSuppressed: "set-setting",
    emitSocketRefresh: "emit-refresh",
    normalizeSocketRestRequest(request, options) {
      return { request, options };
    },
    restOps,
    clampSocketText: "clamp",
    clampRestWatchRichNoteText: "clamp-rest-rich",
    socketNoteMaxLength: 120,
    normalizeRestNoteSaveSource: "normalize-rest-note-source"
  });

  assert.equal(routeDeps.settings, settings);
  assert.equal(routeDeps.refreshScopeKeys, refreshScopeKeys);
  assert.deepEqual(routeDeps.normalizeSocketRestRequest("rest-request"), {
    request: "rest-request",
    options: {
      restOps,
      sanitizeSocketIdentifier: "sanitize",
      clampSocketText: "clamp",
      clampRestWatchRichNoteText: "clamp-rest-rich",
      noteMaxLength: 120,
      normalizeRestNoteSaveSource: "normalize-rest-note-source"
    }
  });
}

{
  const settings = { MARCH_STATE: "marchState" };
  const refreshScopeKeys = { MARCH: "march" };
  const game = { user: { isGM: true } };
  const foundry = { utils: {} };
  const ui = { notifications: {} };
  const routeDeps = buildPartyOperationsSocketRouteDeps({
    settings,
    refreshScopeKeys,
    sanitizeSocketIdentifier: "sanitize",
    clampSocketText: "clamp",
    socketNoteMaxLength: 80,
    normalizeSocketMarchRequest(request, options) {
      return { request, options };
    },
    marchOps: { MOVE: "move" },
    marchRanks: ["front", "rear"],
    applyMarchRequest(request, requesterRef, options) {
      return { request, requesterRef, options };
    },
    getMarchingOrderState: "get-march-state",
    game,
    resolveRequester: "resolve-requester",
    canUserControlActor: "can-control-actor",
    isMarchingOrderPlayerLocked: "is-player-locked",
    stampUpdate: "stamp-update",
    setModuleSettingWithLocalRefreshSuppressed: "set-setting",
    scheduleIntegrationSync: "schedule-sync",
    refreshOpenApps: "refresh-open-apps",
    emitSocketRefresh: "emit-refresh",
    logUiDebug: "log-debug",
    applyPlayerSettingWriteRequestFeature(message, requesterRef, options) {
      return { message, requesterRef, options };
    },
    canAccessAllPlayerOps: "can-access-player-ops",
    applyPlayerSopNoteRequestFeature(message, requesterRef, options) {
      return { message, requesterRef, options };
    },
    sopKeys: ["watch"],
    updateOperationsLedger: "update-operations-ledger",
    setSharedSopNoteText: "set-shared-sop-note-text",
    applyPlayerOperationsLedgerWriteRequestFeature(message, requesterRef, options) {
      return { message, requesterRef, options };
    },
    buildDefaultOperationsLedger: "build-default-operations-ledger",
    isWritableModuleSettingKey: "is-writable-setting",
    foundry,
    moduleId: "party-operations",
    suppressNextSettingRefresh: "suppress-next-refresh",
    getRefreshScopesForSettingKey: "get-refresh-scopes",
    logUiFailure: "log-ui-failure",
    applyPlayerFolderOwnershipWriteRequestFeature(message, requesterRef, options) {
      return { message, requesterRef, options };
    },
    constDocOwnershipLevels: { OWNER: 3 },
    ui,
    findOperationsJournalRootFolder: "find-journal-root",
    journalFolderIsUnderRoot: "journal-folder-is-under-root"
  });

  assert.deepEqual(routeDeps.normalizeSocketMarchRequest("march-request"), {
    request: "march-request",
    options: {
      marchOps: { MOVE: "move" },
      marchRanks: ["front", "rear"],
      sanitizeSocketIdentifier: "sanitize",
      clampSocketText: "clamp",
      noteMaxLength: 80
    }
  });
  assert.deepEqual(routeDeps.applyMarchRequest("march-request", "player-1"), {
    request: "march-request",
    requesterRef: "player-1",
    options: {
      getMarchingOrderState: "get-march-state",
      game,
      resolveRequester: "resolve-requester",
      canAccessAllPlayerOps: "can-access-player-ops",
      canUserControlActor: "can-control-actor",
      isMarchingOrderPlayerLocked: "is-player-locked",
      stampUpdate: "stamp-update",
      setModuleSettingWithLocalRefreshSuppressed: "set-setting",
      settings,
      scheduleIntegrationSync: "schedule-sync",
      refreshOpenApps: "refresh-open-apps",
      refreshScopeKeys,
      emitSocketRefresh: "emit-refresh",
      logUiDebug: "log-debug"
    }
  });
  assert.deepEqual(routeDeps.applyPlayerSettingWriteRequest("message", "player-1"), {
    message: "message",
    requesterRef: "player-1",
    options: {
      resolveRequester: "resolve-requester",
      canAccessAllPlayerOps: "can-access-player-ops",
      isWritableModuleSettingKey: "is-writable-setting",
      game,
      foundry,
      moduleId: "party-operations",
      suppressNextSettingRefresh: "suppress-next-refresh",
      refreshOpenApps: "refresh-open-apps",
      getRefreshScopesForSettingKey: "get-refresh-scopes",
      emitSocketRefresh: "emit-refresh",
      logUiFailure: "log-ui-failure"
    }
  });
  assert.deepEqual(routeDeps.applyPlayerFolderOwnershipWriteRequest("message", "player-1"), {
    message: "message",
    requesterRef: "player-1",
    options: {
      resolveRequester: "resolve-requester",
      canAccessAllPlayerOps: "can-access-player-ops",
      sanitizeSocketIdentifier: "sanitize",
      constDocOwnershipLevels: { OWNER: 3 },
      game,
      foundry,
      ui,
      refreshOpenApps: "refresh-open-apps",
      refreshScopeKeys,
      emitSocketRefresh: "emit-refresh",
      moduleId: "party-operations"
    }
  });
  assert.deepEqual(routeDeps.applyPlayerSopNoteRequest("message", "player-1"), {
    message: "message",
    requesterRef: "player-1",
    options: {
      resolveRequester: "resolve-requester",
      canAccessAllPlayerOps: "can-access-player-ops",
      sopKeys: ["watch"],
      clampSocketText: "clamp",
      noteMaxLength: 80,
      updateOperationsLedger: "update-operations-ledger",
      setSharedSopNoteText: "set-shared-sop-note-text"
    }
  });
  assert.deepEqual(routeDeps.applyPlayerOperationsLedgerWriteRequest("message", "player-1"), {
    message: "message",
    requesterRef: "player-1",
    options: {
      resolveRequester: "resolve-requester",
      canAccessAllPlayerOps: "can-access-player-ops",
      buildDefaultOperationsLedger: "build-default-operations-ledger",
      foundry,
      setModuleSettingWithLocalRefreshSuppressed: "set-setting",
      settings,
      scheduleIntegrationSync: "schedule-sync",
      refreshOpenApps: "refresh-open-apps",
      refreshScopeKeys,
      emitSocketRefresh: "emit-refresh"
    }
  });
}

{
  let payload = null;
  const handler = createPartyOperationsSocketHandler({
    game: { user: { id: "gm-1", isGM: true } },
    applyPlayerGatherRequest: "apply-gather",
    promptLocalGatherCheckRoll: "prompt-check",
    promptLocalGatherYieldRoll: "prompt-yield",
    resolvePendingGatherCheckRequest: "resolve-check",
    resolvePendingGatherYieldRequest: "resolve-yield",
    settings: { REST_STATE: "rest" },
    refreshScopeKeys: { REST: "rest" },
    createSocketMessageHandler(options) {
      payload = options;
      return "socket-handler";
    }
  });

  assert.equal(handler, "socket-handler");
  assert.equal(payload.applyPlayerGatherRequest, "apply-gather");
  assert.equal(payload.promptLocalGatherCheckRoll, "prompt-check");
  assert.equal(payload.resolvePendingGatherYieldRequest, "resolve-yield");
  assert.equal(payload.routeSocketDeps.settings.REST_STATE, "rest");
  assert.equal(payload.routeSocketDeps.refreshScopeKeys.REST, "rest");
}
