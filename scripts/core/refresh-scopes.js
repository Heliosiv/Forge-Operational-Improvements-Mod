import { MODULE_ID } from "./constants.js";
import { SETTINGS } from "./settings-keys.js";
import {
  PARTY_OPS_REFRESHABLE_WINDOW_IDS,
  REFRESH_SCOPE_KEYS,
  REFRESH_SCOPE_TO_WINDOW_IDS
} from "./window-config.js";

export function normalizeRefreshScopeList(input) {
  const values = Array.isArray(input) ? input : [input];
  const normalized = [];
  for (const value of values) {
    const scope = String(value ?? "").trim().toLowerCase();
    if (!scope) continue;
    if (!Object.prototype.hasOwnProperty.call(REFRESH_SCOPE_TO_WINDOW_IDS, scope)) continue;
    if (normalized.includes(scope)) continue;
    normalized.push(scope);
  }
  return normalized;
}

export function getRefreshTargetWindowIds(scopes = []) {
  const normalizedScopes = normalizeRefreshScopeList(scopes);
  if (normalizedScopes.length <= 0) return new Set(PARTY_OPS_REFRESHABLE_WINDOW_IDS);
  const ids = new Set();
  for (const scope of normalizedScopes) {
    const windowIds = REFRESH_SCOPE_TO_WINDOW_IDS[scope] ?? [];
    for (const windowId of windowIds) ids.add(windowId);
  }
  return ids;
}

export function getAppWindowId(app) {
  return String(app?.id ?? app?.options?.id ?? "").trim();
}

export function getRefreshScopesForSettingKey(settingKeyInput) {
  const fullKey = String(settingKeyInput ?? "").trim();
  if (!fullKey) return [];
  const prefix = `${MODULE_ID}.`;
  const settingKey = fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  switch (settingKey) {
    case SETTINGS.REST_STATE:
    case SETTINGS.REST_COMMITTED:
    case SETTINGS.REST_ACTIVITIES:
      return [REFRESH_SCOPE_KEYS.REST];
    case SETTINGS.MARCH_STATE:
    case SETTINGS.MARCH_COMMITTED:
      return [REFRESH_SCOPE_KEYS.MARCH];
    case SETTINGS.OPS_LEDGER:
    case SETTINGS.JOURNAL_ENTRY_VISIBILITY:
    case SETTINGS.SESSION_SUMMARY_RANGE:
      return [REFRESH_SCOPE_KEYS.OPERATIONS];
    case SETTINGS.LOOT_SOURCE_CONFIG:
    case SETTINGS.LOOT_SCARCITY:
    case SETTINGS.LOOT_HORDE_UNCOMMON_PLUS_CHANCE:
    case SETTINGS.AUDIO_LIBRARY_SOURCE:
    case SETTINGS.AUDIO_LIBRARY_ROOT:
    case SETTINGS.AUDIO_LIBRARY_CATALOG:
    case SETTINGS.AUDIO_LIBRARY_HIDDEN_TRACKS:
    case SETTINGS.AUDIO_MIX_PRESETS:
      return [REFRESH_SCOPE_KEYS.LOOT];
    case SETTINGS.INJURY_RECOVERY:
    case SETTINGS.INJURY_REMINDER_DAY:
      return [REFRESH_SCOPE_KEYS.INJURY];
    case SETTINGS.ADVANCED_SETTINGS_ENABLED:
    case SETTINGS.MARCHING_ORDER_LOCK_PLAYERS:
    case SETTINGS.FORMATION_MAINTENANCE_REMINDER_VISIBILITY:
    case SETTINGS.PLAYER_AUTO_OPEN_REST:
    case SETTINGS.PLAYER_HUB_MODE:
    case SETTINGS.REST_AUTOMATION_ENABLED:
    case SETTINGS.SHARED_GM_PERMISSIONS:
    case SETTINGS.LAUNCHER_PLACEMENT:
      return [REFRESH_SCOPE_KEYS.SETTINGS];
    default:
      return [];
  }
}
