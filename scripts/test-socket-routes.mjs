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

process.stdout.write("socket routes validation passed\n");
