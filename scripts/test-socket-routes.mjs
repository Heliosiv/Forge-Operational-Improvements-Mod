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

process.stdout.write("socket routes validation passed\n");
