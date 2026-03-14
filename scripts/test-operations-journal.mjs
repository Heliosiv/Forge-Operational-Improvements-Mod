import assert from "node:assert/strict";

import { createOperationsJournalFeature } from "./features/operations-journal.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

class TimerHarness {
  constructor() {
    this.nextId = 1;
    this.pending = new Map();
    this.cleared = [];
  }

  setTimeout(callback, delayMs) {
    const id = this.nextId;
    this.nextId += 1;
    this.pending.set(id, { callback, delayMs });
    return id;
  }

  clearTimeout(id) {
    this.cleared.push(id);
    this.pending.delete(id);
  }

  flush(id) {
    const entry = this.pending.get(id);
    assert.ok(entry, `Missing timer ${id}`);
    this.pending.delete(id);
    entry.callback();
  }
}

globalThis.sessionStorage = new MemoryStorage();
globalThis.game = {
  user: { id: "user-1" },
  folders: new Map(),
  journal: { contents: [] }
};

const timerHarness = new TimerHarness();
const openedEntries = [];

const journalFeature = createOperationsJournalFeature({
  journalSortOptions: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "title", label: "Title" },
    { value: "folder", label: "Folder" }
  ],
  journalCategories: {
    downtime: "Downtime",
    reputation: "Reputation",
    session: "Session"
  },
  operationsJournalRootName: "Party Operations Logs",
  getJournalFilterDebounceMs: () => 125,
  getJournalFolderParentId(folder) {
    return String(folder?.folder?.id ?? folder?.folder ?? "").trim();
  },
  findOperationsJournalRootFolder() {
    return globalThis.game.folders.get("root") ?? null;
  },
  journalFolderIsUnderRoot(folderId, rootId) {
    let currentId = String(folderId ?? "").trim();
    const targetId = String(rootId ?? "").trim();
    let guard = 0;
    while (currentId && guard < 20) {
      if (currentId === targetId) return true;
      const current = globalThis.game.folders.get(currentId) ?? null;
      currentId = String(current?.folder?.id ?? current?.folder ?? "").trim();
      guard += 1;
    }
    return false;
  },
  async openJournalEntryFromElement(element) {
    openedEntries.push(String(element?.dataset?.entryId ?? ""));
  },
  setTimeoutFn: timerHarness.setTimeout.bind(timerHarness),
  clearTimeoutFn: timerHarness.clearTimeout.bind(timerHarness)
});

assert.deepEqual(journalFeature.getOperationsJournalViewState(), {
  filter: "",
  sort: "newest",
  category: "all"
});

assert.deepEqual(
  journalFeature.setOperationsJournalViewState({
    filter: "  travel   notes ",
    sort: "TITLE",
    category: "downtime"
  }),
  {
    filter: "travel   notes",
    sort: "title",
    category: "downtime"
  }
);

assert.deepEqual(journalFeature.getOperationsJournalViewState(), {
  filter: "travel   notes",
  sort: "title",
  category: "downtime"
});

assert.deepEqual(
  journalFeature.setOperationsJournalViewState({
    sort: "not-valid",
    category: "invalid"
  }),
  {
    filter: "travel   notes",
    sort: "newest",
    category: "all"
  }
);

assert.deepEqual(
  journalFeature.buildJournalSortOptions("oldest").map((entry) => entry.selected),
  [false, true, false, false]
);
assert.deepEqual(
  journalFeature.buildJournalCategoryOptions("reputation").map((entry) => entry.selected),
  [false, false, true, false]
);

const appRef = {};
let rerenderCount = 0;
journalFeature.scheduleOperationsJournalFilterUpdate(appRef, "first", () => {
  rerenderCount += 1;
});
journalFeature.scheduleOperationsJournalFilterUpdate(appRef, "second", () => {
  rerenderCount += 1;
});
assert.deepEqual(timerHarness.cleared, [1]);
timerHarness.flush(2);
assert.equal(rerenderCount, 1);
assert.equal(journalFeature.getOperationsJournalViewState().filter, "second");

await journalFeature.handleOperationsJournalAction("set-journal-sort", { value: "folder" }, () => {
  rerenderCount += 1;
});
assert.equal(journalFeature.getOperationsJournalViewState().sort, "folder");

await journalFeature.handleOperationsJournalAction("set-journal-category", { value: "reputation" }, () => {
  rerenderCount += 1;
});
assert.equal(journalFeature.getOperationsJournalViewState().category, "reputation");

await journalFeature.handleOperationsJournalAction("open-journal-entry", { dataset: { entryId: "entry-2" } });
assert.deepEqual(openedEntries, ["entry-2"]);

const folders = [
  { id: "root", name: "Party Operations Logs", folder: null },
  { id: "downtime-folder", name: "Downtime", folder: "root" },
  { id: "reputation-folder", name: "Reputation", folder: "root" },
  { id: "nested-folder", name: "Travel Watch", folder: "downtime-folder" },
  { id: "other-root", name: "Other", folder: null }
];
globalThis.game.folders = new Map(folders.map((folder) => [folder.id, folder]));
globalThis.game.journal = {
  contents: [
    {
      id: "entry-1",
      name: "Camp Setup",
      folder: "nested-folder",
      _stats: { modifiedTime: 100, createdTime: 10 }
    },
    {
      id: "entry-2",
      name: "Rumor Board",
      folder: "reputation-folder",
      _stats: { modifiedTime: 250, createdTime: 20 }
    },
    {
      id: "entry-3",
      name: "Outside Root",
      folder: "other-root",
      _stats: { modifiedTime: 500, createdTime: 30 }
    }
  ]
};

journalFeature.setOperationsJournalViewState({
  filter: "rumor",
  sort: "folder",
  category: "reputation"
});

const reputationContext = journalFeature.buildOperationsJournalContext();
assert.equal(reputationContext.rootFolderName, "Party Operations Logs");
assert.equal(reputationContext.hasRootFolder, true);
assert.equal(reputationContext.visibleCount, 1);
assert.equal(reputationContext.totalCount, 1);
assert.deepEqual(reputationContext.rows.map((row) => row.id), ["entry-2"]);
assert.equal(reputationContext.hasFilter, true);

journalFeature.setOperationsJournalViewState({
  filter: "",
  sort: "folder",
  category: "all"
});

const allContext = journalFeature.buildOperationsJournalContext();
assert.deepEqual(allContext.rows.map((row) => row.id), ["entry-2", "entry-1"]);
assert.equal(allContext.visibleCount, 2);
assert.equal(allContext.totalCount, 2);
assert.equal(allContext.hasRows, true);

process.stdout.write("operations journal validation passed\n");
