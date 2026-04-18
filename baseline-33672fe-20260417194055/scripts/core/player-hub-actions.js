export function createPlayerHubActions({
  playerHubActionTypes = {},
  playerHubClaimVariants = {}
} = {}) {
  function normalizePlayerHubActionType(value) {
    const normalized = String(value ?? "").trim();
    switch (normalized) {
      case playerHubActionTypes.ASSIGN_WATCH:
        return playerHubActionTypes.ASSIGN_WATCH;
      case playerHubActionTypes.SET_MARCH_RANK:
        return playerHubActionTypes.SET_MARCH_RANK;
      case playerHubActionTypes.CLAIM_LOOT:
        return playerHubActionTypes.CLAIM_LOOT;
      case playerHubActionTypes.SUBMIT_DOWNTIME:
        return playerHubActionTypes.SUBMIT_DOWNTIME;
      case playerHubActionTypes.COLLECT_DOWNTIME:
        return playerHubActionTypes.COLLECT_DOWNTIME;
      default:
        return "";
    }
  }

  function normalizePlayerHubClaimVariant(value, fallback = playerHubClaimVariants.ITEM ?? "item") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === playerHubClaimVariants.CURRENCY) return playerHubClaimVariants.CURRENCY;
    if (normalized === playerHubClaimVariants.ITEM) return playerHubClaimVariants.ITEM;
    return fallback;
  }

  function getPlayerHubActionRequestFromUiAction(action) {
    const normalized = String(action ?? "").trim().toLowerCase();
    switch (normalized) {
      case "assign-me":
        return { type: playerHubActionTypes.ASSIGN_WATCH };
      case "set-player-rank":
        return { type: playerHubActionTypes.SET_MARCH_RANK };
      case "submit-downtime-action":
        return { type: playerHubActionTypes.SUBMIT_DOWNTIME };
      case "collect-downtime-result":
        return { type: playerHubActionTypes.COLLECT_DOWNTIME };
      case "claim-loot-item":
        return {
          type: playerHubActionTypes.CLAIM_LOOT,
          claimVariant: playerHubClaimVariants.ITEM
        };
      case "claim-loot-currency":
        return {
          type: playerHubActionTypes.CLAIM_LOOT,
          claimVariant: playerHubClaimVariants.CURRENCY
        };
      default:
        return null;
    }
  }

  return {
    normalizePlayerHubActionType,
    normalizePlayerHubClaimVariant,
    getPlayerHubActionRequestFromUiAction
  };
}
