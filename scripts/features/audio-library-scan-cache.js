export function createAudioLibraryScanCacheStore({
  normalizeSource,
  normalizeRootPath,
  normalizePath,
  ttlMs = 45000,
  maxEntries = 8,
  nowFn = Date.now
} = {}) {
  const cacheByKey = new Map();

  const getNow = () => {
    const value = Number(nowFn?.() ?? Date.now());
    return Number.isFinite(value) ? value : Date.now();
  };

  const normalizeTtlMs = () => Math.max(0, Number(ttlMs) || 45000);
  const normalizeMaxEntries = () => Math.max(1, Number(maxEntries) || 8);

  const buildKey = (source, rootPath) => {
    const nextSource = typeof normalizeSource === "function"
      ? normalizeSource(source)
      : String(source ?? "").trim();
    const nextRootPath = typeof normalizeRootPath === "function"
      ? normalizeRootPath(rootPath)
      : String(rootPath ?? "").trim();
    return `${nextSource}|${nextRootPath}`;
  };

  const prune = () => {
    const limit = normalizeMaxEntries();
    if (cacheByKey.size <= limit) return;
    const entries = [...cacheByKey.entries()]
      .sort((left, right) => Number(left?.[1]?.cachedAt ?? 0) - Number(right?.[1]?.cachedAt ?? 0));
    const overflow = Math.max(0, entries.length - limit);
    for (let index = 0; index < overflow; index += 1) {
      cacheByKey.delete(entries[index][0]);
    }
  };

  const get = (cacheKey) => {
    const key = String(cacheKey ?? "").trim();
    if (!key) return null;
    const entry = cacheByKey.get(key);
    if (!entry || !Array.isArray(entry.files)) return null;
    const ageMs = getNow() - Number(entry.cachedAt ?? 0);
    const maxAgeMs = normalizeTtlMs();
    if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > maxAgeMs) {
      cacheByKey.delete(key);
      return null;
    }
    return [...entry.files];
  };

  const set = (cacheKey, files = []) => {
    const key = String(cacheKey ?? "").trim();
    const normalizedFiles = Array.isArray(files)
      ? files
        .map((entry) => typeof normalizePath === "function" ? normalizePath(entry) : String(entry ?? "").trim())
        .filter(Boolean)
      : [];
    if (!key || normalizedFiles.length <= 0) {
      if (key) cacheByKey.delete(key);
      return;
    }
    cacheByKey.set(key, {
      cachedAt: getNow(),
      files: normalizedFiles
    });
    prune();
  };

  return Object.freeze({
    buildKey,
    get,
    set,
    prune
  });
}
