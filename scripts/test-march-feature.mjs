import assert from "node:assert/strict";

import {
  buildMarchFormationSummaryContext,
  buildMarchOverviewContext,
  MARCH_BOARD_RANKS,
  normalizeSocketMarchRequest,
  applyMarchRequest,
  setupMarchingDragAndDrop
} from "./features/march-feature.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...tokens) {
    for (const token of tokens) this.values.add(token);
  }

  remove(...tokens) {
    for (const token of tokens) this.values.delete(token);
  }

  toggle(token, force) {
    if (force) this.values.add(token);
    else this.values.delete(token);
  }

  contains(token) {
    return this.values.has(token);
  }
}

class FakeElement {
  constructor({ dataset = {}, classes = [] } = {}) {
    this.dataset = { ...dataset };
    this.classList = new FakeClassList();
    classes.forEach((name) => this.classList.add(name));
    this.listeners = new Map();
    this.attributes = new Map();
    this.closestResolver = () => null;
    this.queryResolver = () => null;
    this.queryAllResolver = () => [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  querySelector(selector) {
    return this.queryResolver(selector);
  }

  querySelectorAll(selector) {
    return this.queryAllResolver(selector);
  }

  closest(selector) {
    return this.closestResolver(selector);
  }

  async dispatch(type, event = {}) {
    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      await listener(event);
    }
  }
}

{
  const summary = buildMarchFormationSummaryContext({
    formationSnapshot: {
      formation: {
        label: "Shield Wedge",
        category: "tight",
        categoryLabel: "Tight Formation",
        summary: "Front pressure is absorbed by the vanguard."
      },
      validity: {
        isValid: false,
        stateLabel: "Needs Attention",
        reasons: [
          { code: "missing-token-positions", message: "Token positions unavailable." },
          { code: "rank-gap", message: "Rear line is undermanned." }
        ]
      },
      doctrine: {
        state: "strained",
        stateLabel: "Strained",
        checksActive: true,
        cohesionChecksActive: true,
        cohesionCheckRequired: true,
        pendingTrigger: "major-reposition",
        pendingTriggerLabel: "Major Reposition",
        lastCheckTriggerLabel: "Ambush"
      },
      formationState: {
        stateLabel: "Holding"
      },
      effectEntries: [],
      effectSummaries: ["Front line gains cover"],
      bandTargets: {}
    },
    tracker: {
      failureStreakCount: 2,
      consecutiveSuccessCount: 3,
      lastCheckAt: "Now",
      lastCheckSummary: "Mixed result",
      lastCheckWasSuccess: true,
      leadersCommandCombatId: "combat-1"
    },
    activeCombatId: "combat-1",
    doctrineStates: {
      STRAINED: "strained",
      BROKEN: "broken"
    }
  });

  assert.equal(summary.statusHeadline, "Leadership Check Due");
  assert.equal(summary.tokenCoverageFallbackActive, true);
  assert.equal(summary.invalidReasons.length, 1);
  assert.equal(summary.recoveryRecommendedActionLabel, "Joint Leadership");
  assert.equal(summary.canUseLeadersCommand, false);
  assert.equal(summary.metaBlocks.length, 8);
  assert.equal(summary.momentumRows.length, 2);
}

{
  const overview = buildMarchOverviewContext({
    totalAssigned: 5,
    allActorCount: 6,
    laneCounts: {
      vanguard: 0,
      front: 2,
      middle: 2,
      rear: 1,
      reserve: 0
    },
    formationLabel: "Column",
    formationStateLabel: "Holding",
    lightSources: 0,
    lockState: "Locked by GM",
    unassignedCount: 1,
    warningCount: 2,
    leadershipCheckDue: false
  });

  assert.equal(overview.cards.length, 4);
  assert.equal(overview.cards[0].label, "All Actors");
  assert.equal(overview.cards[0].value, "6");
  assert.equal(overview.cards[0].detail, "1 not deployed");
  assert.equal(overview.cards[2].isMiniBoard, true);
  assert.equal(overview.cards[2].miniRows.find((row) => row.id === "front").count, 2);
  assert.equal(overview.cards[3].toneClass, "is-muted");
}

{
  assert.deepEqual(
    MARCH_BOARD_RANKS.map((rank) => rank.id),
    ["vanguard", "front", "middle", "rear", "reserve"]
  );
}

{
  const ops = new Set(["joinRank", "leaveRank", "setNote", "setLight", "setLightRange", "replaceState"]);
  const ranks = new Set(["front"]);
  const normalize = (request) =>
    normalizeSocketMarchRequest(request, {
      marchOps: ops,
      marchRanks: ranks,
      sanitizeSocketIdentifier: (value) => String(value ?? "").trim(),
      clampSocketText: (value) => String(value ?? "")
    });

  assert.deepEqual(normalize({ op: "setLight", actorId: "actor-a", enabled: true }), {
    op: "setLight",
    actorId: "actor-a",
    enabled: true
  });
  assert.deepEqual(normalize({ op: "setLightRange", actorId: "actor-a", range: "bright", value: 25 }), {
    op: "setLightRange",
    actorId: "actor-a",
    range: "bright",
    value: 25
  });
  assert.deepEqual(normalize({ op: "replaceState", state: { ranks: {} } }), {
    op: "replaceState",
    state: { ranks: {} }
  });
}

{
  const state = {
    ranks: { front: ["actor-a"] },
    light: {},
    lightRanges: {}
  };
  const saves = [];
  const refreshes = [];
  const requester = { id: "user-1", isGM: false, name: "Player" };
  const actor = { id: "actor-a" };
  const deps = {
    getMarchingOrderState: () => state,
    game: { actors: { get: () => actor } },
    resolveRequester: () => requester,
    canUserControlActor: () => true,
    isMarchingOrderPlayerLocked: () => false,
    stampUpdate: (draft) => {
      draft.lastUpdatedBy = requester.name;
    },
    setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
      saves.push({ key, value });
      return true;
    },
    settings: { MARCH_STATE: "marchState" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: (payload) => refreshes.push(payload),
    refreshScopeKeys: { MARCH: "march" },
    emitSocketRefresh: () => {},
    logUiDebug: () => {}
  };

  const setLightResult = await applyMarchRequest(
    { op: "setLight", actorId: "actor-a", enabled: true },
    requester,
    deps
  );
  assert.deepEqual(setLightResult, { ok: true, summary: "", scope: "march" });
  assert.equal(state.light["actor-a"], true);
  assert.deepEqual(state.lightRanges["actor-a"], { bright: 20, dim: 40 });

  await applyMarchRequest({ op: "setLightRange", actorId: "actor-a", range: "bright", value: 35 }, requester, deps);
  assert.deepEqual(state.lightRanges["actor-a"], { bright: 35, dim: 40 });
  assert.equal(saves.length, 2);
  assert.deepEqual(refreshes, [{ scope: "march" }, { scope: "march" }]);
}

{
  const state = {
    ranks: { front: [] },
    rankPlacements: { front: {} }
  };
  const requester = { id: "user-1", isGM: false, name: "Player" };
  const actor = { id: "actor-a" };
  const result = await applyMarchRequest(
    { op: "joinRank", actorId: "actor-a", rankId: "front", cellIndex: 1 },
    requester,
    {
      getMarchingOrderState: () => state,
      game: { actors: { get: () => actor } },
      resolveRequester: () => requester,
      canUserControlActor: () => true,
      isMarchingOrderPlayerLocked: () => true,
      stampUpdate: () => {},
      setModuleSettingWithLocalRefreshSuppressed: async () => true,
      settings: { MARCH_STATE: "marchState" },
      scheduleIntegrationSync: () => {},
      refreshOpenApps: () => {},
      refreshScopeKeys: { MARCH: "march" },
      emitSocketRefresh: () => {},
      logUiDebug: () => {}
    }
  );

  assert.deepEqual(result, { ok: false, summary: "Marching order is locked by the GM.", scope: "march" });
}

{
  const state = {
    ranks: { front: [], middle: ["actor-a"], rear: [] },
    rankPlacements: { front: {}, middle: { "actor-a": 0 }, rear: {} }
  };
  const saves = [];
  const requester = { id: "user-1", isGM: false, name: "Player" };
  const actor = { id: "actor-a", type: "character" };
  const deps = {
    getMarchingOrderState: () => state,
    game: { actors: { get: () => actor } },
    resolveRequester: () => requester,
    canAccessAllPlayerOps: () => true,
    canUserControlActor: () => false,
    canUserOperatePartyActor: (candidate) => candidate?.type === "character",
    isMarchingOrderPlayerLocked: () => false,
    stampUpdate: (draft) => {
      draft.lastUpdatedBy = requester.name;
    },
    setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
      saves.push({ key, value });
      return true;
    },
    settings: { MARCH_STATE: "marchState" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: () => {},
    refreshScopeKeys: { MARCH: "march" },
    emitSocketRefresh: () => {},
    logUiDebug: () => {}
  };

  await applyMarchRequest({ op: "joinRank", actorId: "actor-a", rankId: "front", cellIndex: 1 }, requester, deps);
  assert.deepEqual(state.ranks, { front: ["actor-a"], middle: [], rear: [] });
  assert.deepEqual(state.rankPlacements.front, { "actor-a": 1 });
  assert.equal(saves.length, 1);

  await applyMarchRequest({ op: "replaceState", state: { ranks: { front: [] } } }, requester, deps);
  assert.deepEqual(saves.at(-1).value, { ranks: { front: [] }, lastUpdatedBy: "Player" });
}

{
  const state = {
    ranks: { front: [], middle: ["actor-a"], rear: [] },
    rankPlacements: { front: {}, middle: { "actor-a": 0 }, rear: {} }
  };
  const saves = [];
  const requester = { id: "user-1", isGM: false, name: "Player" };
  const actor = { id: "actor-a", type: "npc" };
  const deps = {
    getMarchingOrderState: () => state,
    game: { actors: { get: () => actor } },
    resolveRequester: () => requester,
    canAccessAllPlayerOps: () => true,
    canUserControlActor: () => false,
    isMarchingOrderPlayerLocked: () => false,
    stampUpdate: (draft) => {
      draft.lastUpdatedBy = requester.name;
    },
    setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
      saves.push({ key, value });
      return true;
    },
    settings: { MARCH_STATE: "marchState" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: () => {},
    refreshScopeKeys: { MARCH: "march" },
    emitSocketRefresh: () => {},
    logUiDebug: () => {}
  };

  await applyMarchRequest({ op: "joinRank", actorId: "actor-a", rankId: "front", cellIndex: 1 }, requester, deps);
  assert.deepEqual(state.ranks, { front: ["actor-a"], middle: [], rear: [] });
  assert.deepEqual(state.rankPlacements.front, { "actor-a": 1 });
  assert.equal(saves.length, 1);
}

{
  const state = {
    locked: false,
    ranks: {
      vanguard: [],
      front: ["actor-b"],
      middle: [],
      rear: ["actor-a"],
      reserve: []
    },
    rankPlacements: {
      vanguard: {},
      front: { "actor-b": 1 },
      middle: {},
      rear: { "actor-a": 1 },
      reserve: {}
    }
  };
  const app = { id: "march-app" };
  const refreshes = [];

  const handle = new FakeElement({ classes: ["po-entry-handle"] });
  const draggedEntry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-entry"] });
  const targetEntry = new FakeElement({ dataset: { actorId: "actor-b" }, classes: ["po-entry"] });
  draggedEntry.queryResolver = (selector) => (selector === ".po-entry-handle" ? handle : null);
  targetEntry.queryResolver = () => null;

  const frontColumn = new FakeElement({ dataset: { rankId: "front" }, classes: ["po-rank-col"] });
  frontColumn.queryAllResolver = (selector) => (selector === ".po-entry" ? [targetEntry] : []);

  const html = {
    querySelectorAll(selector) {
      if (selector === ".po-entry") return [draggedEntry, targetEntry];
      if (selector === ".po-rank-col") return [frontColumn];
      return [];
    }
  };

  async function updateMarchingOrderState(mutatorOrRequest) {
    if (typeof mutatorOrRequest === "function") {
      await mutatorOrRequest(state);
    } else if (mutatorOrRequest?.op === "joinRank") {
      const { actorId, rankId, insertIndex: rawInsert, cellIndex: rawCell } = mutatorOrRequest;
      for (const key of Object.keys(state.ranks)) {
        state.ranks[key] = (state.ranks[key] ?? []).filter((id) => id !== actorId);
      }
      for (const key of Object.keys(state.rankPlacements)) {
        if (state.rankPlacements[key]) delete state.rankPlacements[key][actorId];
      }
      if (!state.ranks[rankId]) state.ranks[rankId] = [];
      const target = state.ranks[rankId];
      const safeIndex =
        Number.isInteger(rawInsert) && rawInsert >= 0 ? Math.max(0, Math.min(rawInsert, target.length)) : target.length;
      target.splice(safeIndex, 0, actorId);
      if (Number.isInteger(rawCell) && rawCell >= 0) {
        for (const key of Object.keys(state.rankPlacements)) {
          if (state.rankPlacements[key]) delete state.rankPlacements[key][actorId];
        }
        if (!state.rankPlacements[rankId]) state.rankPlacements[rankId] = {};
        state.rankPlacements[rankId][actorId] = rawCell;
      }
    }
  }

  setupMarchingDragAndDrop(html, {
    getMarchingOrderState: () => state,
    canAccessAllPlayerOps: () => true,
    canDragEntry: () => true,
    isLockedForUser: (liveState) => Boolean(liveState.locked),
    notifyUiWarnThrottled: () => {},
    updateMarchingOrderState,
    refreshSingleAppPreservingView: (value) => refreshes.push(value),
    getAppInstance: () => app,
    appInstanceKeys: { MARCHING_ORDER: "march" }
  });

  assert.equal(draggedEntry.attributes.get("draggable"), "true");
  assert.equal(draggedEntry.classList.contains("is-draggable"), true);
  assert.equal(draggedEntry.listeners.get("dragstart")?.length, 1);
  assert.equal(handle.listeners.get("dragstart")?.length, 1);

  const transfer = new Map();
  await draggedEntry.dispatch("dragstart", {
    dataTransfer: {
      setData: (type, value) => transfer.set(type, value),
      setDragImage: () => {}
    }
  });
  assert.equal(transfer.get("text/plain"), "actor-a");

  let stopped = 0;
  await handle.dispatch("dragstart", {
    dataTransfer: {
      setData: (type, value) => transfer.set(type, value),
      setDragImage: () => {}
    },
    stopPropagation: () => {
      stopped += 1;
    }
  });
  assert.equal(stopped, 1);

  await frontColumn.dispatch("drop", {
    preventDefault: () => {},
    dataTransfer: {
      getData: (type) => (type === "text/plain" ? "actor-a" : "")
    },
    target: {
      closest: (selector) => (selector === ".po-entry" ? targetEntry : null)
    }
  });

  assert.deepEqual(state.ranks.front, ["actor-a", "actor-b"]);
  assert.deepEqual(state.ranks.rear, []);
  assert.deepEqual(state.rankPlacements.front, { "actor-b": 1 });
  assert.deepEqual(state.rankPlacements.rear, {});
  assert.deepEqual(refreshes, [app]);

  setupMarchingDragAndDrop(html, {
    getMarchingOrderState: () => state,
    canAccessAllPlayerOps: () => true,
    canDragEntry: () => true,
    isLockedForUser: (liveState) => Boolean(liveState.locked),
    notifyUiWarnThrottled: () => {},
    updateMarchingOrderState,
    refreshSingleAppPreservingView: () => {},
    getAppInstance: () => app,
    appInstanceKeys: { MARCHING_ORDER: "march" }
  });

  assert.equal(draggedEntry.listeners.get("dragstart")?.length, 1);
  assert.equal(frontColumn.listeners.get("drop")?.length, 1);
}

{
  const state = {
    locked: false,
    ranks: {
      vanguard: [],
      front: ["actor-b"],
      middle: [],
      rear: [],
      reserve: []
    },
    rankPlacements: {
      vanguard: {},
      front: { "actor-b": 1 },
      middle: {},
      rear: {},
      reserve: {}
    }
  };
  const refreshes = [];

  const stagingChip = new FakeElement({
    dataset: { actorId: "actor-a" },
    classes: ["po-march-board-staging-chip"]
  });
  const boardCard = new FakeElement({
    dataset: { actorId: "actor-b" },
    classes: ["po-march-board-card"]
  });
  const boardCell = new FakeElement({
    dataset: { rankId: "front", cellIndex: "0", insertIndex: "0" },
    classes: ["po-march-board-cell"]
  });
  boardCell.queryAllResolver = (selector) => (selector === ".po-march-board-card" ? [boardCard] : []);

  setupMarchingDragAndDrop(
    {
      querySelectorAll(selector) {
        if (selector === ".po-entry") return [];
        if (selector === ".po-march-board-card[data-actor-id]") return [boardCard];
        if (selector === ".po-march-board-staging-chip[data-actor-id]") return [stagingChip];
        if (selector === ".po-rank-col") return [];
        if (selector === ".po-march-board-cell[data-rank-id]") return [boardCell];
        return [];
      }
    },
    {
      getMarchingOrderState: () => state,
      canAccessAllPlayerOps: () => true,
      canDragEntry: () => true,
      isLockedForUser: () => false,
      notifyUiWarnThrottled: () => {},
      updateMarchingOrderState: async (mutatorOrRequest) => {
        if (typeof mutatorOrRequest === "function") {
          await mutatorOrRequest(state);
        } else if (mutatorOrRequest?.op === "joinRank") {
          const { actorId, rankId, insertIndex: rawInsert, cellIndex: rawCell } = mutatorOrRequest;
          for (const key of Object.keys(state.ranks)) {
            state.ranks[key] = (state.ranks[key] ?? []).filter((id) => id !== actorId);
          }
          for (const key of Object.keys(state.rankPlacements)) {
            if (state.rankPlacements[key]) delete state.rankPlacements[key][actorId];
          }
          if (!state.ranks[rankId]) state.ranks[rankId] = [];
          const target = state.ranks[rankId];
          const safeIndex =
            Number.isInteger(rawInsert) && rawInsert >= 0
              ? Math.max(0, Math.min(rawInsert, target.length))
              : target.length;
          target.splice(safeIndex, 0, actorId);
          if (Number.isInteger(rawCell) && rawCell >= 0) {
            for (const key of Object.keys(state.rankPlacements)) {
              if (state.rankPlacements[key]) delete state.rankPlacements[key][actorId];
            }
            if (!state.rankPlacements[rankId]) state.rankPlacements[rankId] = {};
            state.rankPlacements[rankId][actorId] = rawCell;
          }
        }
      },
      refreshSingleAppPreservingView: (value) => refreshes.push(value),
      getAppInstance: () => "march-app",
      appInstanceKeys: { MARCHING_ORDER: "march" }
    }
  );

  assert.equal(stagingChip.attributes.get("draggable"), "true");
  assert.equal(boardCard.attributes.get("draggable"), "true");

  await boardCell.dispatch("drop", {
    preventDefault: () => {},
    dataTransfer: {
      getData: () => "actor-a"
    },
    target: {
      closest: (selector) => (selector === ".po-march-board-card" ? boardCard : null)
    }
  });

  assert.deepEqual(state.ranks.front, ["actor-a", "actor-b"]);
  assert.deepEqual(state.rankPlacements.front, { "actor-a": 0, "actor-b": 1 });
  assert.deepEqual(refreshes, ["march-app"]);
}

{
  const state = {
    locked: false,
    ranks: {
      vanguard: [],
      front: [],
      middle: ["actor-a"],
      rear: [],
      reserve: []
    },
    rankPlacements: {
      vanguard: {},
      front: {},
      middle: { "actor-a": 1 },
      rear: {},
      reserve: {}
    }
  };
  const refreshes = [];
  const spacingToken = new FakeElement({
    dataset: { actorId: "actor-a" },
    classes: ["po-march-spacing-token"]
  });
  const spacingCell = new FakeElement({
    dataset: { rankId: "front", cellIndex: "2", insertIndex: "0" },
    classes: ["po-march-spacing-cell"]
  });
  spacingCell.queryAllResolver = (selector) => (selector === ".po-march-spacing-token" ? [spacingToken] : []);

  setupMarchingDragAndDrop(
    {
      querySelectorAll(selector) {
        if (selector === ".po-entry") return [];
        if (selector === ".po-march-board-card[data-actor-id]") return [];
        if (selector === ".po-march-board-staging-chip[data-actor-id]") return [];
        if (selector === ".po-march-spacing-token[data-actor-id]") return [spacingToken];
        if (selector === ".po-rank-col") return [];
        if (selector === ".po-march-board-cell[data-rank-id]") return [];
        if (selector === ".po-march-spacing-cell[data-rank-id]") return [spacingCell];
        return [];
      }
    },
    {
      getMarchingOrderState: () => state,
      canAccessAllPlayerOps: () => true,
      canDragEntry: () => true,
      isLockedForUser: () => false,
      notifyUiWarnThrottled: () => {},
      updateMarchingOrderState: async (mutatorOrRequest) => {
        if (mutatorOrRequest?.op !== "joinRank") return;
        const { actorId, rankId, insertIndex: rawInsert, cellIndex: rawCell } = mutatorOrRequest;
        for (const key of Object.keys(state.ranks)) {
          state.ranks[key] = (state.ranks[key] ?? []).filter((id) => id !== actorId);
        }
        for (const key of Object.keys(state.rankPlacements)) {
          if (state.rankPlacements[key]) delete state.rankPlacements[key][actorId];
        }
        if (!state.ranks[rankId]) state.ranks[rankId] = [];
        const target = state.ranks[rankId];
        const safeIndex =
          Number.isInteger(rawInsert) && rawInsert >= 0
            ? Math.max(0, Math.min(rawInsert, target.length))
            : target.length;
        target.splice(safeIndex, 0, actorId);
        if (Number.isInteger(rawCell) && rawCell >= 0) {
          if (!state.rankPlacements[rankId]) state.rankPlacements[rankId] = {};
          state.rankPlacements[rankId][actorId] = rawCell;
        }
      },
      refreshSingleAppPreservingView: (value) => refreshes.push(value),
      getAppInstance: () => "march-app",
      appInstanceKeys: { MARCHING_ORDER: "march" }
    }
  );

  assert.equal(spacingToken.attributes.get("draggable"), "true");
  assert.equal(spacingToken.classList.contains("is-draggable"), true);

  await spacingCell.dispatch("drop", {
    preventDefault: () => {},
    dataTransfer: {
      getData: () => "actor-a"
    },
    target: {
      closest: (selector) => (selector === ".po-march-spacing-token" ? spacingToken : null)
    }
  });

  assert.deepEqual(state.ranks.front, ["actor-a"]);
  assert.deepEqual(state.ranks.middle, []);
  assert.deepEqual(state.rankPlacements.front, { "actor-a": 2 });
  assert.deepEqual(refreshes, ["march-app"]);
}

{
  const state = { locked: true, ranks: { front: ["actor-a"] } };
  const entry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-entry"] });
  const column = new FakeElement({ dataset: { rankId: "front" }, classes: ["po-rank-col"] });
  column.queryAllResolver = (selector) => (selector === ".po-entry" ? [entry] : []);
  const warnings = [];

  setupMarchingDragAndDrop(
    {
      querySelectorAll(selector) {
        if (selector === ".po-entry") return [entry];
        if (selector === ".po-rank-col") return [column];
        return [];
      }
    },
    {
      getMarchingOrderState: () => state,
      canAccessAllPlayerOps: () => true,
      canDragEntry: () => true,
      isLockedForUser: (liveState) => Boolean(liveState.locked),
      notifyUiWarnThrottled: (message) => warnings.push(message),
      updateMarchingOrderState: async () => {
        throw new Error("should not update while locked");
      },
      refreshSingleAppPreservingView: () => {},
      getAppInstance: () => null,
      appInstanceKeys: { MARCHING_ORDER: "march" }
    }
  );

  await column.dispatch("drop", {
    preventDefault: () => {},
    dataTransfer: {
      getData: () => "actor-a"
    },
    target: {
      closest: () => null
    }
  });

  assert.deepEqual(warnings, ["Marching order is locked by the GM."]);
}

process.stdout.write("march feature validation passed\n");
