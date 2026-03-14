import assert from "node:assert/strict";

import { createPlayerHubActions } from "./core/player-hub-actions.js";

const actions = createPlayerHubActions({
  playerHubActionTypes: {
    ASSIGN_WATCH: "assign-watch",
    SET_MARCH_RANK: "set-march-rank",
    CLAIM_LOOT: "claim-loot",
    SUBMIT_DOWNTIME: "submit-downtime"
  },
  playerHubClaimVariants: {
    ITEM: "item",
    CURRENCY: "currency"
  }
});

assert.equal(actions.normalizePlayerHubActionType("assign-watch"), "assign-watch");
assert.equal(actions.normalizePlayerHubActionType(" submit-downtime "), "submit-downtime");
assert.equal(actions.normalizePlayerHubActionType("invalid"), "");

assert.equal(actions.normalizePlayerHubClaimVariant("currency"), "currency");
assert.equal(actions.normalizePlayerHubClaimVariant("ITEM"), "item");
assert.equal(actions.normalizePlayerHubClaimVariant("invalid", "currency"), "currency");

assert.deepEqual(actions.getPlayerHubActionRequestFromUiAction("assign-me"), {
  type: "assign-watch"
});
assert.deepEqual(actions.getPlayerHubActionRequestFromUiAction("set-player-rank"), {
  type: "set-march-rank"
});
assert.deepEqual(actions.getPlayerHubActionRequestFromUiAction("submit-downtime-action"), {
  type: "submit-downtime"
});
assert.deepEqual(actions.getPlayerHubActionRequestFromUiAction("claim-loot-item"), {
  type: "claim-loot",
  claimVariant: "item"
});
assert.deepEqual(actions.getPlayerHubActionRequestFromUiAction("claim-loot-currency"), {
  type: "claim-loot",
  claimVariant: "currency"
});
assert.equal(actions.getPlayerHubActionRequestFromUiAction("unknown"), null);

process.stdout.write("player hub actions validation passed\n");
