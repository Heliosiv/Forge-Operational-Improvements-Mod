import assert from "node:assert/strict";

import { applyRestRequest, normalizeSocketRestRequest, setupRestWatchDragAndDrop } from "./features/rest-feature.js";

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

  closest(selector) {
    return this.closestResolver(selector);
  }

  querySelector(selector) {
    return this.queryResolver(selector);
  }

  querySelectorAll(selector) {
    return this.queryAllResolver(selector);
  }

  async dispatch(type, event = {}) {
    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      await listener(event);
    }
  }
}

{
  globalThis.foundry = {
    applications: {
      api: {
        ApplicationV2: class {
          static DEFAULT_OPTIONS = {};
        },
        HandlebarsApplicationMixin: (Base) => Base
      }
    },
    utils: {
      mergeObject: (...objects) => Object.assign({}, ...objects.filter(Boolean))
    }
  };

  const { buildSharedNoteLinkPromptContent } = await import("./apps/rest-watch-shared-note-app.js");
  const promptContent = buildSharedNoteLinkPromptContent({
    defaultUrl: 'https://example.test/?q="><script>alert(1)</script>',
    selectedText: 'Click "me" <img src=x onerror=alert(1)>'
  });

  assert.match(
    promptContent,
    /value="https:\/\/example\.test\/\?q=&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;"/
  );
  assert.match(promptContent, /value="Click &quot;me&quot; &lt;img src=x onerror=alert\(1\)&gt;"/);
  assert.doesNotMatch(promptContent, /<script>alert/);
  assert.doesNotMatch(promptContent, /<img src=x/);
}

{
  const ops = new Set([
    "assignMe",
    "clearEntry",
    "setEntryNotes",
    "moveSlot",
    "setSlotEntry",
    "setVisibleEntryCount",
    "setCampfire",
    "setCampfireAll",
    "replaceState"
  ]);
  const normalize = (request) =>
    normalizeSocketRestRequest(request, {
      restOps: ops,
      sanitizeSocketIdentifier: (value) => String(value ?? "").trim(),
      clampSocketText: (value) => String(value ?? ""),
      normalizeRestNoteSaveSource: (value) => String(value ?? "")
    });

  assert.deepEqual(normalize({ op: "setSlotEntry", slotId: "slot-a", actorId: "actor-b", entryIndex: 1 }), {
    op: "setSlotEntry",
    slotId: "slot-a",
    actorId: "actor-b",
    entryIndex: 1
  });
  assert.deepEqual(normalize({ op: "setSlotEntry", slotId: "slot-a", actorId: "", entryIndex: 1 }), {
    op: "setSlotEntry",
    slotId: "slot-a",
    actorId: "",
    entryIndex: 1
  });
  assert.deepEqual(normalize({ op: "setVisibleEntryCount", slotId: "slot-a", visibleEntryCount: 3 }), {
    op: "setVisibleEntryCount",
    slotId: "slot-a",
    visibleEntryCount: 3
  });
  assert.deepEqual(normalize({ op: "setCampfire", slotId: "slot-a", active: true }), {
    op: "setCampfire",
    slotId: "slot-a",
    active: true
  });
  assert.deepEqual(normalize({ op: "setCampfireAll", slotId: "all", active: false }), {
    op: "setCampfireAll",
    slotId: "all",
    active: false
  });
  assert.deepEqual(normalize({ op: "replaceState", state: { slots: [] } }), {
    op: "replaceState",
    state: { slots: [] }
  });
}

{
  const state = {
    locked: false,
    slots: [
      { id: "slot-a", entries: [{ actorId: "actor-a", notes: "Old", position: 0 }], visibleEntryCount: 1 },
      { id: "slot-b", entries: [], visibleEntryCount: 1 }
    ]
  };
  const saves = [];
  const refreshes = [];
  const requester = { id: "player-1", isGM: false, name: "Clarence" };
  const actors = new Map([["actor-b", { id: "actor-b", type: "character" }]]);
  const deps = {
    getRestWatchState: () => state,
    game: { actors: { get: (id) => actors.get(id) ?? null } },
    resolveRequester: () => requester,
    canAccessAllPlayerOps: () => true,
    canUserControlActor: () => false,
    canUserOperatePartyActor: (actor) => actor?.type === "character",
    stampUpdate: (draft) => {
      draft.lastUpdatedBy = requester.name;
    },
    setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
      saves.push({ key, value });
      return true;
    },
    settings: { REST_STATE: "restState" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: (payload) => refreshes.push(payload),
    refreshScopeKeys: { REST: "rest" },
    emitSocketRefresh: () => {},
    logUiDebug: () => {}
  };

  const assignResult = await applyRestRequest(
    { op: "setSlotEntry", slotId: "slot-a", actorId: "actor-b", entryIndex: 1 },
    requester,
    deps
  );
  assert.deepEqual(assignResult, { ok: true, summary: "", scope: "rest" });
  assert.deepEqual(state.slots[0].entries, [
    { actorId: "actor-a", notes: "Old", position: 0 },
    { actorId: "actor-b", notes: "", position: 1 }
  ]);
  assert.equal(state.slots[0].visibleEntryCount, 2);
  assert.equal(saves.length, 1);
  assert.deepEqual(refreshes, [{ scope: "rest" }]);

  await applyRestRequest({ op: "setVisibleEntryCount", slotId: "slot-a", visibleEntryCount: 1 }, requester, deps);
  assert.equal(state.slots[0].visibleEntryCount, 1);

  await applyRestRequest({ op: "setCampfire", slotId: "slot-a", active: true }, requester, deps);
  assert.equal(state.campfireBySlot["slot-a"], true);

  await applyRestRequest({ op: "setCampfireAll", slotId: "all", active: false }, requester, deps);
  assert.equal(state.campfire, false);
  assert.deepEqual(state.campfireBySlot, { "slot-a": false, "slot-b": false });

  await applyRestRequest({ op: "replaceState", state: { slots: [], locked: false } }, requester, deps);
  assert.deepEqual(saves.at(-1).value, { slots: [], locked: false, lastUpdatedBy: "Clarence" });
}

{
  const state = {
    locked: false,
    slots: [{ id: "slot-a", entries: [], visibleEntryCount: 1 }]
  };
  const saves = [];
  const requester = { id: "player-1", isGM: false, name: "Clarence" };
  const actors = new Map([["actor-b", { id: "actor-b", type: "npc" }]]);
  const deps = {
    getRestWatchState: () => state,
    game: { actors: { get: (id) => actors.get(id) ?? null } },
    resolveRequester: () => requester,
    canAccessAllPlayerOps: () => true,
    canUserControlActor: () => false,
    stampUpdate: (draft) => {
      draft.lastUpdatedBy = requester.name;
    },
    setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
      saves.push({ key, value });
      return true;
    },
    settings: { REST_STATE: "restState" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: () => {},
    refreshScopeKeys: { REST: "rest" },
    emitSocketRefresh: () => {},
    logUiDebug: () => {}
  };

  await applyRestRequest({ op: "setSlotEntry", slotId: "slot-a", actorId: "actor-b", entryIndex: 0 }, requester, deps);
  assert.deepEqual(state.slots[0].entries, [{ actorId: "actor-b", notes: "", position: 0 }]);
  assert.equal(saves.length, 1);
}

{
  const state = {
    locked: true,
    slots: [{ id: "slot-a", entries: [], visibleEntryCount: 1 }]
  };
  const requester = { id: "player-1", isGM: false, name: "Clarence" };
  const result = await applyRestRequest(
    { op: "setSlotEntry", slotId: "slot-a", actorId: "", entryIndex: 0 },
    requester,
    {
      getRestWatchState: () => state,
      game: { actors: { get: () => null } },
      resolveRequester: () => requester,
      canAccessAllPlayerOps: () => false,
      canUserControlActor: () => false,
      stampUpdate: () => {},
      setModuleSettingWithLocalRefreshSuppressed: async () => true,
      settings: { REST_STATE: "restState" },
      scheduleIntegrationSync: () => {},
      refreshOpenApps: () => {},
      refreshScopeKeys: { REST: "rest" },
      emitSocketRefresh: () => {},
      logUiDebug: () => {}
    }
  );

  assert.deepEqual(result, { ok: false, summary: "Rest watch is locked by the GM.", scope: "rest" });
}

{
  const state = {
    locked: false,
    slots: [
      { id: "slot-a", actorId: "actor-a", notes: "Keep watch." },
      { id: "slot-b", entries: [] }
    ]
  };
  let refreshCalls = 0;
  let updateCalls = 0;

  const sourceCard = new FakeElement({ dataset: { slotId: "slot-a" }, classes: ["po-card"] });
  const targetCard = new FakeElement({ dataset: { slotId: "slot-b" }, classes: ["po-card"] });
  const entry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-watch-entry"] });
  entry.closestResolver = (selector) => (selector === ".po-card" ? sourceCard : null);

  const html = {
    querySelectorAll(selector) {
      if (selector === ".po-watch-entry") return [entry];
      if (selector === ".po-card") return [sourceCard, targetCard];
      return [];
    }
  };

  function ensureRestSlotEntriesList(slot) {
    if (!slot.entries && slot.actorId) {
      slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
      slot.actorId = null;
      slot.notes = "";
    }
    if (!Array.isArray(slot.entries)) slot.entries = [];
    return slot.entries;
  }

  function addActorToRestSlot(slot, actorId) {
    const entries = ensureRestSlotEntriesList(slot);
    entries.push({ actorId, notes: "" });
  }

  async function updateRestWatchState(mutatorOrRequest) {
    updateCalls += 1;
    if (typeof mutatorOrRequest === "function") {
      await mutatorOrRequest(state);
    } else if (mutatorOrRequest?.op === "moveSlot") {
      const { actorId, fromSlotId, slotId: toSlotId } = mutatorOrRequest;
      const source = state.slots.find((s) => s.id === fromSlotId);
      if (source) {
        if (!source.entries) {
          source.entries = source.actorId ? [{ actorId: source.actorId, notes: source.notes ?? "" }] : [];
          source.actorId = null;
          source.notes = "";
        }
        source.entries = source.entries.filter((e) => e.actorId !== actorId);
      }
      const target = state.slots.find((s) => s.id === toSlotId);
      if (target) {
        if (!target.entries) target.entries = [];
        target.entries.push({ actorId, notes: "" });
      }
    }
  }

  setupRestWatchDragAndDrop(html, {
    getRestWatchState: () => state,
    canAccessAllPlayerOps: () => true,
    isLockedForUser: () => false,
    updateRestWatchState,
    ensureRestSlotEntriesList,
    addActorToRestSlot,
    refreshRestWatchAppsImmediately: () => {
      refreshCalls += 1;
    }
  });

  assert.equal(entry.attributes.get("draggable"), "true");
  assert.equal(entry.classList.contains("is-draggable"), true);
  assert.equal(entry.listeners.get("dragstart")?.length, 1);
  assert.equal(targetCard.listeners.get("drop")?.length, 1);

  const dragPayload = new Map();
  await entry.dispatch("dragstart", {
    dataTransfer: {
      setData: (type, value) => dragPayload.set(type, value),
      setDragImage: () => {}
    }
  });

  const prevented = [];
  await targetCard.dispatch("drop", {
    preventDefault: () => prevented.push(true),
    dataTransfer: {
      getData: (type) => (type === "text/plain" ? dragPayload.get(type) : "")
    }
  });

  assert.equal(prevented.length, 1);
  assert.equal(updateCalls, 1);
  assert.equal(refreshCalls, 1);
  assert.deepEqual(state.slots[0], { id: "slot-a", actorId: null, notes: "", entries: [] });
  assert.deepEqual(state.slots[1].entries, [{ actorId: "actor-a", notes: "" }]);

  setupRestWatchDragAndDrop(html, {
    getRestWatchState: () => state,
    canAccessAllPlayerOps: () => true,
    isLockedForUser: () => false,
    updateRestWatchState,
    ensureRestSlotEntriesList,
    addActorToRestSlot,
    refreshRestWatchAppsImmediately: () => {}
  });

  assert.equal(entry.listeners.get("dragstart")?.length, 1);
  assert.equal(targetCard.listeners.get("drop")?.length, 1);
}

{
  const entry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-watch-entry"] });
  const card = new FakeElement({ dataset: { slotId: "slot-a" }, classes: ["po-card"] });
  entry.closestResolver = (selector) => (selector === ".po-card" ? card : null);
  const html = {
    querySelectorAll(selector) {
      if (selector === ".po-watch-entry") return [entry];
      if (selector === ".po-card") return [card];
      return [];
    }
  };

  setupRestWatchDragAndDrop(html, {
    getRestWatchState: () => ({ locked: true, slots: [] }),
    canAccessAllPlayerOps: () => true,
    isLockedForUser: () => true,
    updateRestWatchState: async () => {},
    ensureRestSlotEntriesList: () => [],
    addActorToRestSlot: () => {},
    refreshRestWatchAppsImmediately: () => {}
  });

  assert.equal(entry.listeners.size, 0);
  assert.equal(card.listeners.size, 0);
}

process.stdout.write("rest feature validation passed\n");
