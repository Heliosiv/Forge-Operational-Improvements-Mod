export const PARTY_OPS_APP_INSTANCE_KEYS = Object.freeze({
  REST_WATCH: "restWatch",
  OPERATIONS_SHELL: "operationsShell",
  MARCHING_ORDER: "marchingOrder",
  REST_WATCH_PLAYER: "restWatchPlayer",
  GLOBAL_MODIFIER_SUMMARY: "globalModifierSummary",
  GM_FACTIONS_PAGE: "gmFactionsPage",
  GM_WEATHER_PAGE: "gmWeatherPage",
  GM_DOWNTIME_PAGE: "gmDowntimePage",
  GM_MERCHANTS_PAGE: "gmMerchantsPage",
  GM_AUDIO_PAGE: "gmAudioPage",
  GM_LOOT_PAGE: "gmLootPage",
  GM_LOOT_CLAIMS_BOARD: "gmLootClaimsBoard"
});

export const PARTY_OPS_REFRESH_INSTANCE_KEYS = Object.freeze([
  PARTY_OPS_APP_INSTANCE_KEYS.REST_WATCH,
  PARTY_OPS_APP_INSTANCE_KEYS.OPERATIONS_SHELL,
  PARTY_OPS_APP_INSTANCE_KEYS.MARCHING_ORDER,
  PARTY_OPS_APP_INSTANCE_KEYS.REST_WATCH_PLAYER,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_FACTIONS_PAGE,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_WEATHER_PAGE,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_DOWNTIME_PAGE,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_MERCHANTS_PAGE,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_LOOT_PAGE,
  PARTY_OPS_APP_INSTANCE_KEYS.GM_LOOT_CLAIMS_BOARD
]);

const appInstances = new Map(Object.values(PARTY_OPS_APP_INSTANCE_KEYS).map((key) => [key, null]));

export function getPartyOpsAppInstance(key) {
  return appInstances.get(key) ?? null;
}

export function setPartyOpsAppInstance(key, instance) {
  if (!key) return instance ?? null;
  appInstances.set(key, instance ?? null);
  return instance ?? null;
}

export function clearPartyOpsAppInstance(key, instance = null) {
  if (!key) return null;
  if (instance) {
    const current = appInstances.get(key) ?? null;
    if (current !== instance) return current;
  }
  appInstances.set(key, null);
  return null;
}

export function getPartyOpsAppInstances(keys = Object.values(PARTY_OPS_APP_INSTANCE_KEYS)) {
  return keys.map((key) => getPartyOpsAppInstance(key)).filter(Boolean);
}
