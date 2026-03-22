import assert from "node:assert/strict";

import {
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

process.stdout.write("operations player handlers validation passed\n");