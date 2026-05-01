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
    schedulePendingSopNoteSync: () => {}
  }
);
assert.deepEqual(actionNotifications, [{ type: "warn", message: "Marching order is locked by the GM." }]);
await new Promise((resolve) => setTimeout(resolve, 100));
assert.deepEqual(actionRefreshes, [{ scopes: ["march"] }]);
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

process.stdout.write("socket routes validation passed\n");
