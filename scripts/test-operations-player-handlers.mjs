import assert from "node:assert/strict";

import {
  applyPlayerFolderOwnershipWriteRequest,
  applyPlayerOperationsLedgerWriteRequest,
  applyPlayerSopNoteRequest
} from "./features/operations-player-handlers.js";

{
  let wrote = false;
  await applyPlayerSopNoteRequest({ userId: "player-1", sopKey: "watch", note: "Test" }, null, {
    resolveRequester: () => ({ id: "player-1" }),
    canAccessAllPlayerOps: () => false,
    sopKeys: ["watch"],
    clampSocketText: (value) => String(value ?? "").trim(),
    noteMaxLength: 200,
    updateOperationsLedger: async () => {
      wrote = true;
    },
    setSharedSopNoteText: () => true
  });

  assert.equal(wrote, false);
}

{
  let wrote = false;
  await applyPlayerSopNoteRequest({ userId: "player-1", sopKey: "watch", note: "Test" }, null, {
    resolveRequester: () => ({ id: "player-1" }),
    canAccessAllPlayerOps: () => true,
    sopKeys: ["watch"],
    clampSocketText: (value) => String(value ?? "").trim(),
    noteMaxLength: 200,
    updateOperationsLedger: async (mutator) => {
      const ledger = {};
      mutator(ledger);
      wrote = ledger.watchNote === "Test";
    },
    setSharedSopNoteText: (ledger, _sopKey, note) => {
      ledger.watchNote = note;
      return true;
    }
  });

  assert.equal(wrote, true);
}

{
  let savedKey = "";
  await applyPlayerOperationsLedgerWriteRequest({ userId: "player-1", ledger: { resources: { food: 5 } } }, null, {
    resolveRequester: () => ({ id: "player-1" }),
    canAccessAllPlayerOps: () => false,
    buildDefaultOperationsLedger: () => ({ resources: { food: 0 } }),
    foundry: {
      utils: {
        mergeObject: (defaults, incoming) => ({ ...defaults, ...incoming })
      }
    },
    setModuleSettingWithLocalRefreshSuppressed: async (settingKey) => {
      savedKey = settingKey;
    },
    settings: { OPS_LEDGER: "opsLedger" },
    scheduleIntegrationSync: () => {},
    refreshOpenApps: () => {},
    refreshScopeKeys: { OPERATIONS: "operations" },
    emitSocketRefresh: () => {}
  });

  assert.equal(savedKey, "");
}

{
  const calls = [];
  await applyPlayerOperationsLedgerWriteRequest({ userId: "player-1", ledger: { resources: { food: 5 } } }, null, {
    resolveRequester: () => ({ id: "player-1" }),
    canAccessAllPlayerOps: () => true,
    buildDefaultOperationsLedger: () => ({ resources: { food: 0 }, downtime: [] }),
    foundry: {
      utils: {
        mergeObject: (defaults, incoming) => ({
          ...defaults,
          ...incoming,
          resources: {
            ...(defaults.resources ?? {}),
            ...(incoming.resources ?? {})
          }
        })
      }
    },
    setModuleSettingWithLocalRefreshSuppressed: async (settingKey, value) => {
      calls.push(["set", settingKey, value]);
    },
    settings: { OPS_LEDGER: "opsLedger" },
    scheduleIntegrationSync: (key) => calls.push(["sync", key]),
    refreshOpenApps: (payload) => calls.push(["refresh", payload]),
    refreshScopeKeys: { OPERATIONS: "operations" },
    emitSocketRefresh: (payload) => calls.push(["socket", payload])
  });

  assert.deepEqual(calls, [
    ["set", "opsLedger", { resources: { food: 5 }, downtime: [] }],
    ["sync", "operations-ledger"],
    ["refresh", { scope: "operations" }],
    ["socket", { scope: "operations" }]
  ]);
}

{
  const notifications = [];
  const refreshCalls = [];
  const socketCalls = [];
  const folderUpdates = [];
  const entryUpdates = [];
  const rootFolder = {
    id: "root",
    type: "JournalEntry",
    name: "Operations Root",
    ownership: { default: 0 },
    contents: [],
    update: async (payload) => {
      folderUpdates.push(["root", payload]);
      rootFolder.ownership = payload.ownership;
    }
  };
  const childEntry = {
    id: "entry-1",
    documentName: "JournalEntry",
    ownership: { default: 0 },
    update: async (payload) => {
      entryUpdates.push(["entry-1", payload]);
      childEntry.ownership = payload.ownership;
    }
  };
  const childFolder = {
    id: "child",
    type: "JournalEntry",
    name: "Child Folder",
    folder: "root",
    ownership: { default: 0 },
    contents: [childEntry],
    update: async (payload) => {
      folderUpdates.push(["child", payload]);
      childFolder.ownership = payload.ownership;
    }
  };
  rootFolder.contents = [];
  const folders = new Map([
    ["root", rootFolder],
    ["child", childFolder]
  ]);

  await applyPlayerFolderOwnershipWriteRequest({
    userId: "player-1",
    folderId: "root",
    levels: { default: 2, "user-1": 3 }
  }, null, {
    resolveRequester: () => ({ id: "player-1" }),
    canAccessAllPlayerOps: () => true,
    sanitizeSocketIdentifier: (value) => String(value ?? "").trim(),
    constDocOwnershipLevels: { NONE: 0, OBSERVER: 2, OWNER: 3 },
    game: {
      folders: {
        get: (id) => folders.get(id) ?? null,
        contents: [rootFolder, childFolder]
      }
    },
    foundry: {
      utils: {
        deepClone: (value) => structuredClone(value)
      }
    },
    ui: {
      notifications: {
        warn: (message) => notifications.push(["warn", message]),
        info: (message) => notifications.push(["info", message])
      }
    },
    refreshOpenApps: (payload) => refreshCalls.push(payload),
    refreshScopeKeys: { OPERATIONS: "operations" },
    emitSocketRefresh: (payload) => socketCalls.push(payload),
    moduleId: "party-operations",
    findOperationsJournalRootFolder: () => rootFolder,
    journalFolderIsUnderRoot: (folderId, rootFolderId) => folderId === "child" && rootFolderId === "root"
  });

  assert.deepEqual(folderUpdates, [
    ["root", { ownership: { default: 2, "user-1": 3 } }],
    ["child", { ownership: { default: 2, "user-1": 3 } }]
  ]);
  assert.deepEqual(entryUpdates, [
    ["entry-1", { ownership: { default: 2, "user-1": 3 } }]
  ]);
  assert.deepEqual(refreshCalls, [{ scope: "operations" }]);
  assert.deepEqual(socketCalls, [{ scope: "operations" }]);
  assert.match(String(notifications.at(-1)?.[1] ?? ""), /Updated permissions on 2 folders and 1 document/);
}

process.stdout.write("operations player handlers validation passed\n");