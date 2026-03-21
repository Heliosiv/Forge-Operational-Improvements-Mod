export function buildGmRequesterRoutes({
  applyPlayerSettingWriteRequest,
  applyPlayerFolderOwnershipWriteRequest,
  applyPlayerSopNoteRequest,
  applyPlayerOperationsLedgerWriteRequest,
  applyPlayerDowntimeSubmitRequest,
  applyPlayerDowntimeClearRequest,
  applyPlayerDowntimeCollectRequest,
  applyPlayerMerchantBarterRequest,
  applyPlayerMerchantTradeRequest,
  applyPlayerLootClaimRequest,
  applyPlayerLootCurrencyClaimRequest,
  applyPlayerLootVouchRequest
} = {}) {
  return {
    "ops:setting-write": applyPlayerSettingWriteRequest,
    "ops:folder-ownership-write": applyPlayerFolderOwnershipWriteRequest,
    "ops:setSopNote": applyPlayerSopNoteRequest,
    "ops:ledger-write": applyPlayerOperationsLedgerWriteRequest,
    "ops:downtime-submit": applyPlayerDowntimeSubmitRequest,
    "ops:downtime-clear": applyPlayerDowntimeClearRequest,
    "ops:downtime-collect": applyPlayerDowntimeCollectRequest,
    "ops:merchant-barter-request": applyPlayerMerchantBarterRequest,
    "ops:merchant-trade": applyPlayerMerchantTradeRequest,
    "ops:loot-claim": applyPlayerLootClaimRequest,
    "ops:loot-claim-currency": applyPlayerLootCurrencyClaimRequest,
    "ops:loot-vouch": applyPlayerLootVouchRequest
  };
}
