export const PARTY_OPS_MODULE_ID = "party-operations";
export const PARTY_OPS_PREMIUM_MODULE_ID = "party-operations-premium";

export function resolvePartyOpsModuleId(gameRef = globalThis.game) {
  try {
    const candidates = [PARTY_OPS_MODULE_ID, PARTY_OPS_PREMIUM_MODULE_ID];
    for (const id of candidates) {
      if (gameRef?.modules?.get?.(id)?.active) return id;
    }
    for (const id of candidates) {
      if (gameRef?.modules?.has?.(id) || gameRef?.modules?.get?.(id)) return id;
    }
  } catch {
    // Ignore lookup failures and fall back to the public module id.
  }
  return PARTY_OPS_MODULE_ID;
}

export const MODULE_ID = resolvePartyOpsModuleId();

export function getModuleSocketChannel(moduleId = MODULE_ID) {
  return `module.${String(moduleId ?? PARTY_OPS_MODULE_ID).trim() || PARTY_OPS_MODULE_ID}`;
}

export const SOCKET_CHANNEL = getModuleSocketChannel();

export const INTEGRATION_MODES = Object.freeze({
  AUTO: "auto",
  OFF: "off",
  FLAGS: "flags",
  DAE: "dae"
});

export const LOOT_SCARCITY_LEVELS = Object.freeze({
  ABUNDANT: "abundant",
  NORMAL: "normal",
  SCARCE: "scarce"
});

export const INVENTORY_HOOK_MODES = Object.freeze({
  OFF: "off",
  REFRESH: "refresh",
  SYNC: "sync"
});

export const LOOT_HORDE_UNCOMMON_PLUS_CHANCE_MODES = Object.freeze({
  STANDARD: "standard",
  BOOSTED: "boosted",
  HIGH: "high",
  GUARANTEED: "guaranteed"
});

export const PARTY_OPS_LOOT_RARITIES = Object.freeze(["common", "uncommon", "rare", "veryRare", "legendary"]);

export const DEFAULT_PARTY_OPS_CONFIG = Object.freeze({
  debugEnabled: false,
  lootScarcity: LOOT_SCARCITY_LEVELS.NORMAL,
  rarityWeights: {
    common: 50,
    uncommon: 30,
    rare: 12,
    veryRare: 6,
    legendary: 2
  },
  crGoldMultiplier: 1
});
