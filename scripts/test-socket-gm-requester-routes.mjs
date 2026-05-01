import assert from "node:assert/strict";

import { buildGmRequesterRoutes } from "./core/socket-gm-requester-routes.js";

const handlers = {
  applyPlayerSettingWriteRequest: () => "setting",
  applyPlayerFolderOwnershipWriteRequest: () => "folder",
  applyPlayerSopNoteRequest: () => "sop",
  applyPlayerOperationsLedgerWriteRequest: () => "ledger",
  applyPlayerDowntimeSubmitRequest: () => "submit",
  applyPlayerDowntimeV2SubmitRequest: () => "submit-v2",
  applyPlayerDowntimeV2AckResult: () => "ack-v2",
  applyPlayerDowntimeClearRequest: () => "clear",
  applyPlayerDowntimeCollectRequest: () => "collect",
  applyPlayerMerchantBarterRequest: () => "barter",
  applyPlayerMerchantTradeRequest: () => "trade",
  applyPlayerLootClaimRequest: () => "claim",
  applyPlayerLootCurrencyClaimRequest: () => "claim-currency",
  applyPlayerLootCurrencySplitRequest: () => "split-currency",
  applyPlayerLootUndoClaimRequest: () => "undo-claim"
};

const routes = buildGmRequesterRoutes(handlers);

assert.equal(routes["ops:setting-write"], handlers.applyPlayerSettingWriteRequest);
assert.equal(routes["ops:folder-ownership-write"], handlers.applyPlayerFolderOwnershipWriteRequest);
assert.equal(routes["ops:setSopNote"], handlers.applyPlayerSopNoteRequest);
assert.equal(routes["ops:ledger-write"], handlers.applyPlayerOperationsLedgerWriteRequest);
assert.equal(routes["ops:downtime-submit"], handlers.applyPlayerDowntimeSubmitRequest);
assert.equal(routes["ops:downtimeV2-submit"], handlers.applyPlayerDowntimeV2SubmitRequest);
assert.equal(routes["ops:downtimeV2-ack-result"], handlers.applyPlayerDowntimeV2AckResult);
assert.equal(routes["ops:downtime-clear"], handlers.applyPlayerDowntimeClearRequest);
assert.equal(routes["ops:downtime-collect"], handlers.applyPlayerDowntimeCollectRequest);
assert.equal(routes["ops:merchant-barter-request"], handlers.applyPlayerMerchantBarterRequest);
assert.equal(routes["ops:merchant-trade"], handlers.applyPlayerMerchantTradeRequest);
assert.equal(routes["ops:loot-claim"], handlers.applyPlayerLootClaimRequest);
assert.equal(routes["ops:loot-claim-currency"], handlers.applyPlayerLootCurrencyClaimRequest);
assert.equal(routes["ops:loot-split-currency"], handlers.applyPlayerLootCurrencySplitRequest);
assert.equal(routes["ops:loot-undo-claim"], handlers.applyPlayerLootUndoClaimRequest);
assert.equal(routes["ops:unknown"], undefined);

process.stdout.write("socket gm requester routes validation passed\n");
