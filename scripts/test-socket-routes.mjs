import assert from "node:assert/strict";

import { routePartyOperationsSocketMessage } from "./core/socket-routes.js";

let applied = null;

await routePartyOperationsSocketMessage(
  { type: "ops:ledger-write", userId: "player-1", ledger: { updated: true } },
  {
    game: {
      user: { id: "gm-1", isGM: true }
    },
    getSocketRequester: () => ({ id: "player-1" }),
    applyPlayerOperationsLedgerWriteRequest: async (message, requester) => {
      applied = { message, requester };
    }
  }
);

assert.deepEqual(applied, {
  message: { type: "ops:ledger-write", userId: "player-1", ledger: { updated: true } },
  requester: { id: "player-1" }
});

applied = "unchanged";
await routePartyOperationsSocketMessage(
  { type: "ops:merchant-trade", userId: "player-1", gmUserId: "gm-2", merchantId: "merchant-1", actorId: "actor-1" },
  {
    game: {
      user: { id: "gm-1", isGM: true }
    },
    getSocketRequester: () => ({ id: "player-1" }),
    applyPlayerMerchantTradeRequest: async () => {
      applied = "wrong-gm";
    }
  }
);
assert.equal(applied, "unchanged");

const notifications = [];
const refreshes = [];
globalThis.ui = {
  notifications: {
    info: (message) => notifications.push({ type: "info", message }),
    warn: (message) => notifications.push({ type: "warn", message })
  }
};
await routePartyOperationsSocketMessage(
  { type: "ops:merchant-trade-result", userId: "player-1", ok: true, summary: "Trade complete." },
  {
    game: {
      user: { id: "player-1", isGM: false }
    },
    normalizeRefreshScopeList: (scopes) => scopes,
    refreshOpenApps: (payload) => refreshes.push(payload),
    schedulePendingSopNoteSync: () => {}
  }
);
assert.deepEqual(notifications, [{ type: "info", message: "Trade complete." }]);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(refreshes, [{ scopes: ["operations"] }]);
delete globalThis.ui;

const openedDowntime = [];
await routePartyOperationsSocketMessage(
  { type: "players:openDowntimeSession", userId: "player-1", sessionId: "session-1" },
  {
    game: {
      user: { id: "player-1", isGM: false }
    },
    setPlayerHubTab: (tab) => openedDowntime.push(["tab", tab]),
    openRestWatchUiForCurrentUser: (options) => openedDowntime.push(["open", options])
  }
);
assert.deepEqual(openedDowntime, [
  ["tab", "downtime"],
  ["open", { force: true, hubTab: "downtime" }]
]);

const actionNotifications = [];
const actionRefreshes = [];
const actionDowntimeOpens = [];
globalThis.ui = {
  notifications: {
    info: (message) => actionNotifications.push({ type: "info", message }),
    warn: (message) => actionNotifications.push({ type: "warn", message })
  }
};
await routePartyOperationsSocketMessage(
  {
    type: "ops:player-action-result",
    userId: "player-1",
    ok: false,
    summary: "Marching order is locked by the GM.",
    scopes: ["march"]
  },
  {
    game: {
      user: { id: "player-1", isGM: false }
    },
    normalizeRefreshScopeList: (scopes) => scopes,
    refreshOpenApps: (payload) => actionRefreshes.push(payload),
    schedulePendingSopNoteSync: () => {},
    setPlayerHubTab: (tab) => actionDowntimeOpens.push(["tab", tab]),
    openRestWatchUiForCurrentUser: (options) => actionDowntimeOpens.push(["open", options])
  }
);
assert.deepEqual(actionNotifications, [{ type: "warn", message: "Marching order is locked by the GM." }]);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(actionRefreshes, [{ scopes: ["march"] }]);
assert.deepEqual(actionDowntimeOpens, []);
delete globalThis.ui;

const downtimeResultNotifications = [];
const downtimeResultRefreshes = [];
const downtimeResultOpens = [];
globalThis.ui = {
  notifications: {
    info: (message) => downtimeResultNotifications.push({ type: "info", message }),
    warn: (message) => downtimeResultNotifications.push({ type: "warn", message })
  }
};
await routePartyOperationsSocketMessage(
  {
    type: "ops:player-action-result",
    userId: "player-1",
    ok: true,
    summary: "Downtime result ready.",
    scopes: ["operations"],
    hubTab: "downtime"
  },
  {
    game: {
      user: { id: "player-1", isGM: false }
    },
    normalizeRefreshScopeList: (scopes) => scopes,
    refreshOpenApps: (payload) => downtimeResultRefreshes.push(payload),
    schedulePendingSopNoteSync: () => {},
    setPlayerHubTab: (tab) => downtimeResultOpens.push(["tab", tab]),
    openRestWatchUiForCurrentUser: (options) => downtimeResultOpens.push(["open", options])
  }
);
assert.deepEqual(downtimeResultNotifications, [{ type: "info", message: "Downtime result ready." }]);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(downtimeResultRefreshes, [{ scopes: ["operations"] }]);
assert.deepEqual(downtimeResultOpens, [
  ["tab", "downtime"],
  ["open", { force: true, hubTab: "downtime" }]
]);
delete globalThis.ui;

const emitted = [];
await routePartyOperationsSocketMessage(
  { type: "march:mutate", userId: "player-1", request: { op: "joinRank" } },
  {
    game: {
      user: { id: "gm-1", isGM: true }
    },
    getSocketRequester: () => ({ id: "player-1" }),
    normalizeSocketMarchRequest: (request) => request,
    applyMarchRequest: async () => ({
      ok: false,
      summary: "You do not have permission to move that actor in marching order.",
      scope: "march"
    }),
    emitModuleSocket: (message, options) => emitted.push({ message, options }),
    socketChannel: "module.party-operations"
  }
);
assert.deepEqual(emitted, [
  {
    message: {
      type: "ops:player-action-result",
      userId: "player-1",
      ok: false,
      summary: "You do not have permission to move that actor in marching order.",
      scopes: ["march"]
    },
    options: { channel: "module.party-operations" }
  }
]);

const downtimeSubmitEmits = [];
await routePartyOperationsSocketMessage(
  { type: "ops:downtimeV2-submit", userId: "player-1", submission: { actorId: "actor-1" } },
  {
    game: {
      user: { id: "gm-1", isGM: true }
    },
    getSocketRequester: () => ({ id: "player-1" }),
    applyPlayerDowntimeV2SubmitRequest: async () => ({
      ok: true,
      summary: "Downtime submission received.",
      scope: "operations"
    }),
    emitModuleSocket: (message, options) => downtimeSubmitEmits.push({ message, options }),
    socketChannel: "module.party-operations"
  }
);
assert.deepEqual(downtimeSubmitEmits, [
  {
    message: {
      type: "ops:player-action-result",
      userId: "player-1",
      ok: true,
      summary: "Downtime submission received.",
      scopes: ["operations"],
      hubTab: "downtime"
    },
    options: { channel: "module.party-operations" }
  }
]);

process.stdout.write("socket routes validation passed\n");
