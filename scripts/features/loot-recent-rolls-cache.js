/**
 * Manages a session-scoped cache of recently rolled loot items to prevent
 * repetition of the same items across multiple horde rolls within a scene.
 * 
 * This cache applies a 0.5x weight malus to items that have appeared in
 * the previous 2 horde rolls, helping maintain perceived diversity even
 * when pool sizes are small and high-weight items dominate.
 */

const RECENT_ROLLS_CACHE_KEY = "po-loot-recent-rolls";
const MAX_RECENT_ROLLS = 2;
const RECENT_ROLL_DECAY_MS = 5 * 60 * 1000; // 5 minute decay per roll

function getRolledItemsCacheKey() {
  const sceneId = game?.scenes?.active?.id ?? "unknown";
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
 * Record that an item was rolled in the current horde.
 * Tracks by item identity (name + type + rarity + source).
 */
export function recordRecentlyRolledItem(entry = {}) {
  if (!entry || typeof entry !== "object") return;
  
  const identity = buildItemIdentity(entry);
  if (!identity) return;
  
  const cache = getRecentItemsCache();
  const now = Date.now();
  
  // Check if already recorded in current batch
  const exists = cache.some((record) => 
    record.identity === identity && (now - record.timestamp) < 500
  );
  
  if (!exists) {
    cache.push({
      identity,
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
  while (cache.length > 0 && (now - cache[0].timestamp) > decayMs) {
    cache.shift();
  }
  
  // Cap to max recent rolls
  while (cache.length > MAX_RECENT_ROLLS * 10) {
    cache.shift();
  }
}

/**
 * Check if an item was recently rolled. Returns malus weight (0.0-1.0).
 * Items rolled in the last 2 outputs get 0.5x penalty, older items return 1.0.
 */
export function getRecentRollMalus(entry = {}) {
  if (!entry || typeof entry !== "object") return 1.0;
  
  const identity = buildItemIdentity(entry);
  if (!identity) return 1.0;
  
  const cache = getRecentItemsCache();
  const now = Date.now();
  
  // Check how many recent entries match this item
  let matchCount = 0;
  for (const record of cache) {
    if (record.identity === identity) {
      const ageSec = (now - record.timestamp) / 1000;
      // Apply penalty for items rolled in last 2 minutes
      if (ageSec < 120) {
        matchCount += 1;
      }
    }
  }
  
  if (matchCount === 0) return 1.0;
  if (matchCount === 1) return 0.6; // First repeat: 60% weight
  if (matchCount === 2) return 0.4; // Second repeat: 40% weight
  return 0.3; // Third+ repeat: 30% weight
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

/**
 * Clear recent rolls cache for current scene (useful for manual reset or scene change).
 */
export function clearRecentRollsCache() {
  const cacheKey = getRolledItemsCacheKey();
  if (globalThis[cacheKey]) {
    globalThis[cacheKey] = [];
  }
}

/**
 * Hook to clear cache when scene changes.
 */
Hooks.on("canvasReady", () => {
  clearRecentRollsCache();
});

// Helper to build item identity
function buildItemIdentity(entry = {}) {
  const name = String(entry?.name ?? "").trim().toLowerCase();
  const itemType = String(entry?.itemType ?? "").trim().toLowerCase();
  const rarity = String(entry?.rarityBucket ?? entry?.rarity ?? "").trim().toLowerCase();
  const sourceId = String(entry?.sourceId ?? "").trim().toLowerCase();
  
  if (!name) return "";
  return `${name}|${itemType}|${rarity}|${sourceId}`;
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
      ageSeconds: ((now - rec.timestamp) / 1000).toFixed(1),
      name: rec.name
    }))
  };
}
