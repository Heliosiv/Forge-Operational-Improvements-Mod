import assert from "node:assert/strict";

import { setupRestWatchDragAndDrop } from "./features/rest-feature.js";

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
  entry.closestResolver = (selector) => selector === ".po-card" ? sourceCard : null;

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
      getData: (type) => type === "text/plain" ? dragPayload.get(type) : ""
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
  entry.closestResolver = (selector) => selector === ".po-card" ? card : null;
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
