export function createPlayerPermissionDebugTools({
  gameRef,
  moduleId,
  readSessionStorageJson,
  writeSessionStorageJson,
  deepClone,
  globalObject,
  customEventCtor,
  warnLogger
} = {}) {
  const playerPermissionDebugMemory = [];
  const PLAYER_PERMISSION_DEBUG_LIMIT = 50;

  function getPlayerPermissionDebugStorageKey() {
    return `po-permission-debug-${gameRef?.user?.id ?? "anon"}`;
  }

  function logPlayerPermissionDebug(code, message, details = {}) {
    const entry = {
      at: new Date().toISOString(),
      userId: String(gameRef?.user?.id ?? "").trim(),
      userName: String(gameRef?.user?.name ?? "Unknown").trim() || "Unknown",
      code: String(code ?? "").trim() || "unknown",
      message: String(message ?? "").trim() || "Permission barrier encountered.",
      details: details && typeof details === "object" && !Array.isArray(details)
        ? deepClone(details)
        : {}
    };
    playerPermissionDebugMemory.unshift(entry);
    if (playerPermissionDebugMemory.length > PLAYER_PERMISSION_DEBUG_LIMIT) {
      playerPermissionDebugMemory.length = PLAYER_PERMISSION_DEBUG_LIMIT;
    }
    const stored = readSessionStorageJson(getPlayerPermissionDebugStorageKey(), []);
    const next = [entry, ...(Array.isArray(stored) ? stored : [])].slice(0, PLAYER_PERMISSION_DEBUG_LIMIT);
    writeSessionStorageJson(getPlayerPermissionDebugStorageKey(), next);
    warnLogger(`[${moduleId}][permission-debug] ${entry.message}`, entry);
    try {
      globalObject?.dispatchEvent?.(new customEventCtor(`${moduleId}:permission-debug`, { detail: entry }));
    } catch {
      // Ignore event dispatch failures in older browser contexts.
    }
    return entry;
  }

  function getPlayerPermissionDebugEntries() {
    const stored = readSessionStorageJson(getPlayerPermissionDebugStorageKey(), []);
    const entries = Array.isArray(stored) ? stored : playerPermissionDebugMemory;
    return deepClone(entries);
  }

  function clearPlayerPermissionDebugEntries() {
    playerPermissionDebugMemory.length = 0;
    try {
      globalObject?.sessionStorage?.removeItem?.(getPlayerPermissionDebugStorageKey());
    } catch {
      // Ignore storage cleanup failures.
    }
  }

  return {
    getPlayerPermissionDebugStorageKey,
    logPlayerPermissionDebug,
    getPlayerPermissionDebugEntries,
    clearPlayerPermissionDebugEntries
  };
}
