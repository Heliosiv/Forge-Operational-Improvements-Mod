/**
 * Manages a session-scoped cache of recently rolled loot items to reduce
 * repetition of the same items across multiple loot rolls within a scene.
 *
 * This cache applies a 0.5x weight malus to items that have appeared in
 * the previous 2 horde rolls, helping maintain perceived diversity even
 * when pool sizes are small and high-weight items dominate.
 */

const RECENT_ROLLS_CACHE_KEY = "po-loot-recent-rolls";
const MAX_RECENT_ROLLS = 2;
const RECENT_ROLL_DECAY_MS = 5 * 60 * 1000; // 5 minute decay per roll

function getRolledItemsCacheKey() {
  const sceneId = globalThis?.game?.scenes?.active?.id ?? "unknown";
  return `${RECENT_ROLLS_CACHE_KEY}:${sceneId}`;
}

function getRecentItemsCache() {
  const cacheKey = getRolledItemsCacheKey();
  let cache = globalThis[cacheKey];
  if (!cache || !Array.isArray(cache)) {
    cache = [];
    globalThis[cacheKey] = cache;
  }
  return cache;
}

/**
 * Record that an item was rolled in the current loot run.
 * Tracks by item identity (name + type + rarity + source).
 */
export function recordRecentlyRolledItem(entry = {}) {
  if (!entry || typeof entry !== "object") return;

  const identity = buildItemIdentity(entry);
  if (!identity) return;
  const nameIdentity = buildItemNameIdentity(entry);

  const cache = getRecentItemsCache();
  const now = Date.now();

  // Check if already recorded in current batch
  const exists = cache.some(
    (record) =>
      (record.identity === identity || (nameIdentity && record.nameIdentity === nameIdentity)) &&
      now - record.timestamp < 500
  );

  if (!exists) {
    cache.push({
      identity,
      nameIdentity,
      timestamp: now,
      name: entry.name,
      sourceId: entry.sourceId
    });
  }
}

/**
 * Flush the oldest roll from the cache if it has aged past decay time.
 * Called before building a new horde roll.
 */
export function flushExpiredRecentRolls() {
  const cache = getRecentItemsCache();
  const now = Date.now();
  const decayMs = RECENT_ROLL_DECAY_MS;

  // Keep only recent rolls within decay window
  while (cache.length > 0 && now - cache[0].timestamp > decayMs) {
    cache.shift();
  }

  // Cap to max recent rolls
  while (cache.length > MAX_RECENT_ROLLS * 10) {
    cache.shift();
  }
}

/**
 * Check if an item was recently rolled. Returns malus weight (0.0-1.0).
 * Repeats that occurred very recently receive a strong malus to prevent
 * the same item from anchoring consecutive rolls.
 */
export function getRecentRollMalus(entry = {}) {
  if (!entry || typeof entry !== "object") return 1.0;

  const identity = buildItemIdentity(entry);
  if (!identity) return 1.0;

  const cache = getRecentItemsCache();
  const now = Date.now();

  // Accumulate recency pressure for matching entries.
  // Fresh repeats are penalized strongly; older repeats decay quickly.
  let repeatPressure = 0;
  const nameIdentity = buildItemNameIdentity(entry);
  for (const record of cache) {
    const exactMatch = record.identity === identity;
    const nameMatch = Boolean(nameIdentity && record.nameIdentity === nameIdentity);
    if (exactMatch || nameMatch) {
      const ageMs = Math.max(0, now - Number(record.timestamp ?? now));
      const matchFactor = exactMatch ? 1 : 0.72;
      if (ageMs <= 30_000) {
        repeatPressure += 1.25 * matchFactor;
      } else if (ageMs <= 120_000) {
        repeatPressure += 0.9 * matchFactor;
      } else if (ageMs <= RECENT_ROLL_DECAY_MS) {
        repeatPressure += 0.4 * matchFactor;
      }
    }
  }

  if (repeatPressure <= 0) return 1.0;
  return Math.max(0.04, Number((1 / (1 + repeatPressure * 2.25)).toFixed(6)));
}

/**
 * Batch record items from a completed horde roll.
 * Called after selection is finalized.
 */
export function recordHordeRollItems(items = []) {
  if (!Array.isArray(items)) return;

  for (const item of items) {
    recordRecentlyRolledItem(item);
  }
}

export function recordLootRollItems(items = []) {
  recordHordeRollItems(items);
}

/**
 * Clear recent rolls cache for current scene (useful for manual reset or scene change).
 */
export function clearRecentRollsCache() {
  const cacheKey = getRolledItemsCacheKey();
  if (globalThis[cacheKey]) {
    globalThis[cacheKey] = [];
  }
}

export function buildLootRecentRollsCacheHookModule() {
  return {
    id: "loot-recent-rolls-cache",
    registrations: [["canvasReady", () => clearRecentRollsCache()]]
  };
}

// Helper to build item identity
function buildItemIdentity(entry = {}) {
  const name = String(entry?.name ?? "")
    .trim()
    .toLowerCase();
  const itemType = String(entry?.itemType ?? "")
    .trim()
    .toLowerCase();
  const rarity = String(entry?.rarityBucket ?? entry?.rarity ?? "")
    .trim()
    .toLowerCase();
  const sourceId = String(entry?.sourceId ?? "")
    .trim()
    .toLowerCase();

  if (!name) return "";
  return `${name}|${itemType}|${rarity}|${sourceId}`;
}

function buildItemNameIdentity(entry = {}) {
  const name = String(entry?.name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  const itemType = String(entry?.itemType ?? "")
    .trim()
    .toLowerCase();
  const rarity = String(entry?.rarityBucket ?? entry?.rarity ?? "")
    .trim()
    .toLowerCase();

  if (!name) return "";
  return `${name}|${itemType}|${rarity}`;
}

/**
 * Get readable cache state for debugging.
 */
export function debugGetRecentRollsCache() {
  const cache = getRecentItemsCache();
  const now = Date.now();

  return {
    count: cache.length,
    items: cache.map((rec) => ({
      identity: rec.identity,
      nameIdentity: rec.nameIdentity,
      ageSeconds: ((now - rec.timestamp) / 1000).toFixed(1),
      name: rec.name
    }))
  };
}
