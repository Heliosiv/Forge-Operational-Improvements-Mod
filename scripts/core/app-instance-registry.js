export const PARTY_OPS_APP_INSTANCE_KEYS = Object.freeze({
  REST_WATCH: "restWatch",
  MARCHING_ORDER: "marchingOrder",
  REST_WATCH_PLAYER: "restWatchPlayer",
  GLOBAL_MODIFIER_SUMMARY: "globalModifierSummary",
  GM_ENVIRONMENT_PAGE: "gmEnvironmentPage",
  GM_DOWNTIME_PAGE: "gmDowntimePage",
  GM_MERCHANTS_PAGE: "gmMerchantsPage",
  GM_AUDIO_PAGE: "gmAudioPage",
  GM_LOOT_PAGE: "gmLootPage",
  GM_LOOT_CLAIMS_BOARD: "gmLootClaimsBoard"
});

const appInstances = new Map(
  Object.values(PARTY_OPS_APP_INSTANCE_KEYS).map((key) => [key, null])
);

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
  return keys
    .map((key) => getPartyOpsAppInstance(key))
    .filter(Boolean);
}
