import assert from "node:assert/strict";

import { createOperationsJournalService } from "./features/operations-journal-service.js";

const folderStore = new Map();
const journalStore = new Map();
const settingsState = {
  journalFolderCache: {}
};
const warningMessages = [];
const createdEntries = [];

function syncFolders() {
  gameRef.folders.contents = [...folderStore.values()];
}

function makeFolder(data) {
  return {
    ...data,
    async update(patch) {
      Object.assign(this, patch);
      folderStore.set(this.id, this);
      syncFolders();
      return this;
    }
  };
}

const gameRef = {
  settings: {
    get(moduleId, key) {
      assert.equal(moduleId, "party-operations");
      return settingsState[key];
    }
  },
  folders: {
    contents: [],
    get(id) {
      return folderStore.get(id) ?? null;
    }
  },
  users: {
    contents: [
      { id: "gm-1", isGM: true },
      { id: "player-1", isGM: false }
    ]
  },
  journal: {
    get(id) {
      return journalStore.get(id) ?? null;
    }
  }
};

const foundryRef = {
  utils: {
    mergeObject(target, source) {
      const next = structuredClone(target ?? {});
      for (const [key, value] of Object.entries(source ?? {})) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          next[key] = foundryRef.utils.mergeObject(next[key] ?? {}, value);
        } else {
          next[key] = value;
        }
      }
      return next;
    },
    escapeHTML(value) {
      return String(value ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }
};

const constRef = {
  DOCUMENT_OWNERSHIP_LEVELS: {
    NONE: 0,
    OBSERVER: 2,
    OWNER: 3
  },
  JOURNAL_ENTRY_PAGE_FORMATS: {
    HTML: 1
  }
};

const FolderClass = {
  async create(data) {
    const id = `folder-${folderStore.size + 1}`;
    const folder = makeFolder({ id, ...data });
    folderStore.set(id, folder);
    syncFolders();
    return folder;
  }
};

const JournalEntryClass = {
  async create(data) {
    const entry = {
      id: `journal-${createdEntries.length + 1}`,
      ...data
    };
    createdEntries.push(entry);
    journalStore.set(entry.id, {
      ...entry,
      sheet: {
        render(force) {
          entry.renderedWith = force;
        }
      }
    });
    return entry;
  }
};

const uiRef = {
  notifications: {
    warn(message) {
      warningMessages.push(message);
    }
  }
};

let journalVisibility = "public";
let canAccess = true;

const service = createOperationsJournalService({
  moduleId: "party-operations",
  journalFolderCacheSettingKey: "journalFolderCache",
  journalRootName: "Party Operations Logs",
  journalRootLegacyNames: ["GM Folder"],
  journalCategories: {
    downtime: "Downtime",
    session: "Session"
  },
  journalVisibilityModes: {
    PUBLIC: "public",
    REDACTED: "redacted",
    GM_PRIVATE: "gm-private"
  },
  canAccessAllPlayerOps: () => canAccess,
  getJournalVisibilityMode: () => journalVisibility,
  setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
    settingsState[key] = value;
  },
  gameRef,
  foundryRef,
  uiRef,
  constRef,
  FolderClass,
  JournalEntryClass
});

assert.equal(service.findOperationsJournalRootFolder(), null);

const folderTree = await service.ensureOperationsJournalFolderTree();
assert.equal(folderTree.root.name, "Party Operations Logs");
assert.deepEqual(folderTree.categories.map((entry) => entry.categoryKey), ["downtime", "session"]);
assert.ok(settingsState.journalFolderCache.folders["::party operations logs"]);

const rootFolder = service.findOperationsJournalRootFolder();
assert.ok(rootFolder);
assert.equal(service.journalFolderIsUnderRoot(folderTree.categories[0].categoryFolder.id, rootFolder.id), true);
assert.equal(service.journalFolderIsUnderRoot("missing", rootFolder.id), false);

const childFolder = makeFolder({
  id: "folder-child",
  name: "Nested",
  type: "JournalEntry",
  folder: folderTree.categories[0].categoryFolder.id
});
folderStore.set(childFolder.id, childFolder);
syncFolders();
assert.equal(service.getJournalFolderParentId(childFolder), folderTree.categories[0].categoryFolder.id);
assert.equal(service.journalFolderIsUnderRoot(childFolder.id, rootFolder.id), true);

journalVisibility = "gm-private";
const gmOnlyEntry = await service.createOperationsJournalEntry({
  category: "downtime",
  title: "Secret Note",
  summary: "Visible summary",
  body: "<p>Body</p>",
  sensitivity: "gm"
});
assert.ok(gmOnlyEntry);
assert.equal(gmOnlyEntry.folder, folderTree.categories[0].categoryFolder.id);
assert.deepEqual(gmOnlyEntry.ownership, {
  default: 0,
  "gm-1": 3
});

journalVisibility = "redacted";
const redactedEntry = await service.createOperationsJournalEntry({
  category: "session",
  title: "Redacted Note",
  summary: "GM summary",
  redactedSummary: "Player summary",
  body: "<p>GM body</p>",
  redactedBody: "<p>Player body</p>",
  sensitivity: "gm"
});
assert.ok(redactedEntry.pages[0].text.content.includes("Player summary"));
assert.ok(redactedEntry.pages[0].text.content.includes("<p>Player body</p>"));

await service.openJournalEntryFromElement({ dataset: { journalId: redactedEntry.id } });
assert.equal(createdEntries.at(-1).renderedWith, true);

await service.openJournalEntryFromElement({ dataset: { journalId: "missing" } });
assert.deepEqual(warningMessages, ["Journal entry not found."]);

canAccess = false;
assert.equal(await service.ensureOperationsJournalFolderTree(), null);
assert.equal(await service.createOperationsJournalEntry({ title: "Blocked" }), null);

process.stdout.write("operations journal service validation passed\n");
