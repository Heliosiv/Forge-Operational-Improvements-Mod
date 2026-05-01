export function buildGmRequesterRoutes({
  applyPlayerSettingWriteRequest,
  applyPlayerFolderOwnershipWriteRequest,
  applyPlayerSopNoteRequest,
  applyPlayerOperationsLedgerWriteRequest,
  applyPlayerDowntimeSubmitRequest,
  applyPlayerDowntimeV2SubmitRequest,
  applyPlayerDowntimeV2AckResult,
  applyPlayerDowntimeClearRequest,
  applyPlayerDowntimeQueueEditRequest,
  applyPlayerDowntimeCollectRequest,
  applyPlayerMerchantBarterRequest,
  applyPlayerMerchantTradeRequest,
  applyPlayerLootClaimRequest,
  applyPlayerLootCurrencyClaimRequest,
  applyPlayerLootCurrencySplitRequest,
  applyPlayerLootUndoClaimRequest
} = {}) {
  return {
    "ops:setting-write": applyPlayerSettingWriteRequest,
    "ops:folder-ownership-write": applyPlayerFolderOwnershipWriteRequest,
    "ops:setSopNote": applyPlayerSopNoteRequest,
    "ops:ledger-write": applyPlayerOperationsLedgerWriteRequest,
    "ops:downtime-submit": applyPlayerDowntimeSubmitRequest,
    "ops:downtimeV2-submit": applyPlayerDowntimeV2SubmitRequest,
    "ops:downtimeV2-ack-result": applyPlayerDowntimeV2AckResult,
    "ops:downtime-clear": applyPlayerDowntimeClearRequest,
    "ops:downtime-queue-edit": applyPlayerDowntimeQueueEditRequest,
    "ops:downtime-collect": applyPlayerDowntimeCollectRequest,
    "ops:merchant-barter-request": applyPlayerMerchantBarterRequest,
    "ops:merchant-trade": applyPlayerMerchantTradeRequest,
    "ops:loot-claim": applyPlayerLootClaimRequest,
    "ops:loot-claim-currency": applyPlayerLootCurrencyClaimRequest,
    "ops:loot-split-currency": applyPlayerLootCurrencySplitRequest,
    "ops:loot-undo-claim": applyPlayerLootUndoClaimRequest
  };
}
