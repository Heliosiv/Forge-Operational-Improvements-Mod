export function readSessionStorageJson(key, fallback) {
  try {
    const raw = globalThis.sessionStorage?.getItem?.(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeSessionStorageJson(key, value) {
  try {
    globalThis.sessionStorage?.setItem?.(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
