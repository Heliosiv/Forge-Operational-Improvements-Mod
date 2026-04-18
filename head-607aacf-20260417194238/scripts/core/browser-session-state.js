export function getCurrentUserId(gameRef = globalThis.game) {
  return String(gameRef?.user?.id ?? "anon").trim() || "anon";
}

export function getSessionStorage(storageRef = globalThis.sessionStorage) {
  return storageRef ?? null;
}

export function readSessionValue(key, { storageRef = globalThis.sessionStorage } = {}) {
  try {
    return getSessionStorage(storageRef)?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

export function writeSessionValue(key, value, { storageRef = globalThis.sessionStorage } = {}) {
  try {
    getSessionStorage(storageRef)?.setItem?.(key, value);
  } catch {
    // Ignore transient browser storage failures for UI-only state.
  }
}

export function removeSessionValue(key, { storageRef = globalThis.sessionStorage } = {}) {
  try {
    getSessionStorage(storageRef)?.removeItem?.(key);
  } catch {
    // Ignore transient browser storage failures for UI-only state.
  }
}