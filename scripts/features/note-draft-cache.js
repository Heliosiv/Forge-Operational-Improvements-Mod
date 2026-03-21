export function createNoteDraftCache({
  moduleId,
  gameRef = globalThis.game,
  storage = globalThis.localStorage,
  nowFn = Date.now,
  sopKeys = [],
  clampText = (value) => String(value ?? ""),
  sopNoteMaxLength = 0,
  maxEntries = 300
} = {}) {
  const getNow = () => {
    const value = Number(nowFn?.() ?? Date.now());
    return Number.isFinite(value) ? value : Date.now();
  };

  const trimToKey = (value) => String(value ?? "").trim();
  const normalizeSopText = (value) => clampText(value ?? "", sopNoteMaxLength);

  const getNoteDraftCacheStorageKey = () => {
    const worldId = trimToKey(gameRef?.world?.id ?? "world") || "world";
    const userId = trimToKey(gameRef?.user?.id ?? "user") || "user";
    return `${moduleId}.noteDraftCache.${worldId}.${userId}`;
  };

  const readNoteDraftCacheStore = () => {
    try {
      const raw = storage?.getItem?.(getNoteDraftCacheStorageKey());
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeNoteDraftCacheStore = (storeData = {}) => {
    try {
      storage?.setItem?.(getNoteDraftCacheStorageKey(), JSON.stringify(storeData));
    } catch {
      // Ignore storage errors silently.
    }
  };

  const pruneStore = (storeData = {}) => {
    const entries = Object.entries(storeData);
    const limit = Math.max(1, Number(maxEntries) || 300);
    if (entries.length <= limit) return storeData;
    entries
      .sort((left, right) => Number(left?.[1]?.updatedAt ?? 0) - Number(right?.[1]?.updatedAt ?? 0))
      .slice(0, entries.length - limit)
      .forEach(([key]) => delete storeData[key]);
    return storeData;
  };

  const getNoteDraftCacheValue = (cacheKeyInput) => {
    const cacheKey = trimToKey(cacheKeyInput);
    if (!cacheKey) return "";
    const storeData = readNoteDraftCacheStore();
    const entry = storeData[cacheKey];
    if (entry && typeof entry === "object" && typeof entry.text === "string") return entry.text;
    return "";
  };

  const setNoteDraftCacheValue = (cacheKeyInput, textInput) => {
    const cacheKey = trimToKey(cacheKeyInput);
    if (!cacheKey) return;
    const text = String(textInput ?? "");
    const storeData = readNoteDraftCacheStore();
    if (!text.trim()) {
      delete storeData[cacheKey];
      writeNoteDraftCacheStore(storeData);
      return;
    }
    storeData[cacheKey] = {
      text,
      updatedAt: getNow()
    };
    writeNoteDraftCacheStore(pruneStore(storeData));
  };

  const clearNoteDraftCacheValue = (cacheKeyInput) => {
    const cacheKey = trimToKey(cacheKeyInput);
    if (!cacheKey) return;
    const storeData = readNoteDraftCacheStore();
    if (!Object.prototype.hasOwnProperty.call(storeData, cacheKey)) return;
    delete storeData[cacheKey];
    writeNoteDraftCacheStore(storeData);
  };

  const getRestWatchNoteCacheKey = (slotIdInput, actorIdInput) => {
    const slotId = trimToKey(slotIdInput);
    const actorId = trimToKey(actorIdInput);
    if (!slotId || !actorId) return "";
    return `rest:${slotId}:${actorId}`;
  };

  const getMarchingNoteCacheKey = (actorIdInput) => {
    const actorId = trimToKey(actorIdInput);
    if (!actorId) return "";
    return `march:${actorId}`;
  };

  const getSopNoteCacheKey = (sopKeyInput) => {
    const sopKey = trimToKey(sopKeyInput);
    if (!sopKey || !sopKeys.includes(sopKey)) return "";
    return `sop:${sopKey}`;
  };

  const readSopCachedNoteEntry = (sopKeyInput) => {
    const cacheKey = getSopNoteCacheKey(sopKeyInput);
    if (!cacheKey) return null;
    const storeData = readNoteDraftCacheStore();
    const entry = storeData[cacheKey];
    if (!entry || typeof entry !== "object") return null;
    const text = normalizeSopText(entry.text ?? "");
    const pendingSync = Boolean(entry.pendingSync);
    if (!trimToKey(text) && !pendingSync) return null;
    return {
      sopKey: trimToKey(sopKeyInput),
      text,
      pendingSync,
      updatedAt: Math.max(0, Number(entry.updatedAt ?? 0) || 0)
    };
  };

  const writeSopCachedNoteEntry = (sopKeyInput, textInput, options = {}) => {
    const cacheKey = getSopNoteCacheKey(sopKeyInput);
    if (!cacheKey) return;
    const text = normalizeSopText(textInput ?? "");
    const pendingSync = options?.pendingSync !== false;
    if (!trimToKey(text) && !pendingSync) {
      clearNoteDraftCacheValue(cacheKey);
      return;
    }
    const storeData = readNoteDraftCacheStore();
    storeData[cacheKey] = {
      text,
      pendingSync,
      updatedAt: getNow()
    };
    writeNoteDraftCacheStore(pruneStore(storeData));
  };

  const clearSopCachedNoteEntry = (sopKeyInput) => {
    const cacheKey = getSopNoteCacheKey(sopKeyInput);
    if (!cacheKey) return;
    clearNoteDraftCacheValue(cacheKey);
  };

  const resolveSopDraftForView = (sopKeyInput, worldNoteInput = "") => {
    const sopKey = trimToKey(sopKeyInput);
    const worldNote = normalizeSopText(worldNoteInput ?? "");
    const cached = readSopCachedNoteEntry(sopKey);
    if (!cached) return { note: worldNote, pendingSync: false };
    if (cached.text === worldNote) {
      clearSopCachedNoteEntry(sopKey);
      return { note: worldNote, pendingSync: false };
    }
    return {
      note: String(cached.text ?? ""),
      pendingSync: Boolean(cached.pendingSync)
    };
  };

  const resolveSopNoteForView = (sopKeyInput, worldNoteInput) => resolveSopDraftForView(sopKeyInput, worldNoteInput);

  const getPendingSopCachedNotes = () => sopKeys
    .map((sopKey) => readSopCachedNoteEntry(sopKey))
    .filter((entry) => Boolean(entry?.pendingSync));

  return Object.freeze({
    clearNoteDraftCacheValue,
    clearSopCachedNoteEntry,
    getMarchingNoteCacheKey,
    getNoteDraftCacheStorageKey,
    getNoteDraftCacheValue,
    getPendingSopCachedNotes,
    getRestWatchNoteCacheKey,
    getSopNoteCacheKey,
    readNoteDraftCacheStore,
    readSopCachedNoteEntry,
    resolveSopDraftForView,
    resolveSopNoteForView,
    setNoteDraftCacheValue,
    writeNoteDraftCacheStore,
    writeSopCachedNoteEntry
  });
}