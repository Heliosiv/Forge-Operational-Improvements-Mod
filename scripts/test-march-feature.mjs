import assert from "node:assert/strict";

import { setupMarchingDragAndDrop } from "./features/march-feature.js";

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
  const state = {
    locked: false,
    ranks: {
      front: ["actor-b"],
      rear: ["actor-a"]
    }
  };
  const app = { id: "march-app" };
  const refreshes = [];

  const handle = new FakeElement({ classes: ["po-entry-handle"] });
  const draggedEntry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-entry"] });
  const targetEntry = new FakeElement({ dataset: { actorId: "actor-b" }, classes: ["po-entry"] });
  draggedEntry.queryResolver = (selector) => selector === ".po-entry-handle" ? handle : null;
  targetEntry.queryResolver = () => null;

  const frontColumn = new FakeElement({ dataset: { rankId: "front" }, classes: ["po-rank-col"] });
  frontColumn.queryAllResolver = (selector) => selector === ".po-entry" ? [targetEntry] : [];

  const html = {
    querySelectorAll(selector) {
      if (selector === ".po-entry") return [draggedEntry, targetEntry];
      if (selector === ".po-rank-col") return [frontColumn];
      return [];
    }
  };

  async function updateMarchingOrderState(mutator) {
    await mutator(state);
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
      getData: (type) => type === "text/plain" ? "actor-a" : ""
    },
    target: {
      closest: (selector) => selector === ".po-entry" ? targetEntry : null
    }
  });

  assert.deepEqual(state.ranks.front, ["actor-a", "actor-b"]);
  assert.deepEqual(state.ranks.rear, []);
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
  const state = { locked: true, ranks: { front: ["actor-a"] } };
  const entry = new FakeElement({ dataset: { actorId: "actor-a" }, classes: ["po-entry"] });
  const column = new FakeElement({ dataset: { rankId: "front" }, classes: ["po-rank-col"] });
  column.queryAllResolver = (selector) => selector === ".po-entry" ? [entry] : [];
  const warnings = [];

  setupMarchingDragAndDrop({
    querySelectorAll(selector) {
      if (selector === ".po-entry") return [entry];
      if (selector === ".po-rank-col") return [column];
      return [];
    }
  }, {
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
  });

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
