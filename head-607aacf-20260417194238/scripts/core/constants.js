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
