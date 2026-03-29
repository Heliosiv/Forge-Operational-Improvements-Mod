import { SETTINGS } from "./settings-keys.js";

function getDefaultOverrideSettingKeys() {
  return new Set([
    SETTINGS.REST_STATE,
    SETTINGS.REST_COMMITTED,
    SETTINGS.REST_ACTIVITIES,
    SETTINGS.MARCH_STATE,
    SETTINGS.MARCH_COMMITTED,
    SETTINGS.OPS_LEDGER,
    SETTINGS.INJURY_RECOVERY
  ]);
}

export function createPlayerUiOverrideTools({
  gameRef,
  moduleId,
  readSessionStorageJson,
  writeSessionStorageJson,
  deepClone,
  canAccessAllPlayerOps,
  hasActiveGmClient,
  overrideSettingKeys
} = {}) {
  const playerUiLocalSettingOverridesMemory = new Map();
  const allowedKeys = overrideSettingKeys instanceof Set
    ? new Set(overrideSettingKeys)
    : getDefaultOverrideSettingKeys();

  function getPlayerUiLocalOverrideStorageKey() {
    return `po-player-ui-setting-overrides-${gameRef?.user?.id ?? "anon"}`;
  }

  function readPlayerUiLocalSettingOverrides() {
    const key = getPlayerUiLocalOverrideStorageKey();
    const stored = readSessionStorageJson(key, null);
    if (stored && typeof stored === "object" && !Array.isArray(stored)) return stored;
    return Object.fromEntries(playerUiLocalSettingOverridesMemory.entries());
  }

  function writePlayerUiLocalSettingOverrides(overrides = {}) {
    const normalized = overrides && typeof overrides === "object" && !Array.isArray(overrides)
      ? overrides
      : {};
    playerUiLocalSettingOverridesMemory.clear();
    for (const [key, value] of Object.entries(normalized)) {
      playerUiLocalSettingOverridesMemory.set(String(key ?? "").trim(), deepClone(value));
    }
    writeSessionStorageJson(getPlayerUiLocalOverrideStorageKey(), normalized);
  }

  function getPlayerUiLocalSettingOverride(settingKey) {
    const normalizedSettingKey = String(settingKey ?? "").trim();
    if (!normalizedSettingKey) return undefined;
    const overrides = readPlayerUiLocalSettingOverrides();
    if (!Object.prototype.hasOwnProperty.call(overrides, normalizedSettingKey)) return undefined;
    return deepClone(overrides[normalizedSettingKey]);
  }

  function setPlayerUiLocalSettingOverride(settingKey, value) {
    const normalizedSettingKey = String(settingKey ?? "").trim();
    if (!normalizedSettingKey) return false;
    const overrides = readPlayerUiLocalSettingOverrides();
    overrides[normalizedSettingKey] = deepClone(value);
    writePlayerUiLocalSettingOverrides(overrides);
    return true;
  }

  function canUsePlayerUiLocalOverride(settingKey, user = gameRef?.user) {
    const normalizedSettingKey = String(settingKey ?? "").trim();
    return Boolean(
      normalizedSettingKey
      && allowedKeys.has(normalizedSettingKey)
      && user
      && !user.isGM
      && canAccessAllPlayerOps(user)
      && !hasActiveGmClient()
    );
  }

  function getModuleSettingWithPlayerUiOverride(settingKey) {
    const normalizedSettingKey = String(settingKey ?? "").trim();
    if (!normalizedSettingKey) return undefined;
    if (canUsePlayerUiLocalOverride(normalizedSettingKey)) {
      const override = getPlayerUiLocalSettingOverride(normalizedSettingKey);
      if (override !== undefined) return override;
    }
    return gameRef.settings.get(moduleId, normalizedSettingKey);
  }

  return {
    getPlayerUiLocalOverrideStorageKey,
    readPlayerUiLocalSettingOverrides,
    writePlayerUiLocalSettingOverrides,
    getPlayerUiLocalSettingOverride,
    setPlayerUiLocalSettingOverride,
    canUsePlayerUiLocalOverride,
    getModuleSettingWithPlayerUiOverride
  };
}
