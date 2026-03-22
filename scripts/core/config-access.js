export function createPartyOperationsConfigAccess({
  moduleId = "party-operations",
  settings = {},
  configSchema = 1,
  defaultPartyOpsConfig = {},
  lootScarcityLevels = {},
  partyOpsLootRarities = [],
  inventoryHookModes = {},
  gameRef = globalThis.game ?? {},
  setModuleSettingWithLocalRefreshSuppressed = async () => {},
  isPartyOpsConfigNormalizationInProgress = () => false,
  setPartyOpsConfigNormalizationInProgress = () => {},
  getPlayerHubModeSetting = () => "simple",
  getLauncherPlacement = () => "floating",
  isFloatingLauncherLocked = () => false,
  getIntegrationModeSetting = () => "auto",
  resolveIntegrationMode = () => "auto",
  isDaeAvailable = () => false,
  getJournalVisibilityMode = () => "redacted",
  getJournalFilterDebounceMs = () => 180,
  getSessionSummaryRangeSetting = () => "last-24h",
  getGatherRollModeSetting = () => "prefer-monks",
  getGatherResourceConfig = () => ({}),
  foundryRef = globalThis.foundry ?? {},
  logWarn = (...args) => console.warn(...args)
} = {}) {
  function validatePartyOpsConfig(input) {
    const source = (input && typeof input === "object" && !Array.isArray(input)) ? input : {};
    const rarityRaw = (source.rarityWeights && typeof source.rarityWeights === "object" && !Array.isArray(source.rarityWeights))
      ? source.rarityWeights
      : {};

    const lootScarcityRaw = String(source.lootScarcity ?? defaultPartyOpsConfig.lootScarcity).trim().toLowerCase();
    const lootScarcity = lootScarcityRaw === lootScarcityLevels.ABUNDANT || lootScarcityRaw === lootScarcityLevels.SCARCE
      ? lootScarcityRaw
      : lootScarcityLevels.NORMAL;

    const rarityWeights = {};
    for (const rarity of partyOpsLootRarities) {
      const rawWeight = Number(rarityRaw[rarity]);
      rarityWeights[rarity] = Number.isFinite(rawWeight)
        ? Math.max(0, rawWeight)
        : defaultPartyOpsConfig.rarityWeights[rarity];
    }

    const multiplierRaw = Number(source.crGoldMultiplier);
    const crGoldMultiplier = Number.isFinite(multiplierRaw) && multiplierRaw > 0
      ? multiplierRaw
      : defaultPartyOpsConfig.crGoldMultiplier;

    return {
      debugEnabled: Boolean(source.debugEnabled),
      lootScarcity,
      rarityWeights,
      crGoldMultiplier
    };
  }

  function getPartyOpsConfigSetting() {
    const raw = gameRef.settings?.get?.(moduleId, settings.PARTY_OPS_CONFIG);
    const normalized = validatePartyOpsConfig(raw);
    const rawSerialized = JSON.stringify(raw ?? null);
    const normalizedSerialized = JSON.stringify(normalized);
    if (!isPartyOpsConfigNormalizationInProgress() && rawSerialized !== normalizedSerialized) {
      setPartyOpsConfigNormalizationInProgress(true);
      void setModuleSettingWithLocalRefreshSuppressed(settings.PARTY_OPS_CONFIG, normalized)
        .catch((error) => {
          logWarn(`${moduleId}: failed to normalize partyOpsConfig on load`, error);
        })
        .finally(() => {
          setPartyOpsConfigNormalizationInProgress(false);
        });
    }
    return normalized;
  }

  async function savePartyOpsConfigSetting(input) {
    const normalized = validatePartyOpsConfig(input);
    await setModuleSettingWithLocalRefreshSuppressed(settings.PARTY_OPS_CONFIG, normalized);
    return normalized;
  }

  function normalizeInventoryHookMode(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === inventoryHookModes.OFF) return inventoryHookModes.OFF;
    if (raw === inventoryHookModes.REFRESH) return inventoryHookModes.REFRESH;
    return inventoryHookModes.SYNC;
  }

  function getInventoryHookModeSetting() {
    const configured = gameRef.settings?.get?.(moduleId, settings.INVENTORY_HOOK_MODE);
    return normalizeInventoryHookMode(configured);
  }

  async function setInventoryHookMode(mode) {
    const normalized = normalizeInventoryHookMode(mode);
    await setModuleSettingWithLocalRefreshSuppressed(settings.INVENTORY_HOOK_MODE, normalized);
    return normalized;
  }

  function getModuleConfigSnapshot() {
    return {
      schema: configSchema,
      ui: {
        playerHubMode: getPlayerHubModeSetting()
      },
      launcher: {
        placement: getLauncherPlacement(),
        floatingLocked: isFloatingLauncherLocked()
      },
      integration: {
        configuredMode: getIntegrationModeSetting(),
        resolvedMode: resolveIntegrationMode(),
        daeAvailable: isDaeAvailable()
      },
      journal: {
        visibility: getJournalVisibilityMode(),
        filterDebounceMs: getJournalFilterDebounceMs(),
        sessionSummaryRange: getSessionSummaryRangeSetting()
      },
      inventory: {
        hookMode: getInventoryHookModeSetting()
      },
      gather: {
        rollMode: getGatherRollModeSetting(),
        rules: foundryRef.utils?.deepClone ? foundryRef.utils.deepClone(getGatherResourceConfig()) : getGatherResourceConfig()
      },
      typedConfig: {
        value: getPartyOpsConfigSetting()
      }
    };
  }

  return {
    validatePartyOpsConfig,
    getPartyOpsConfigSetting,
    savePartyOpsConfigSetting,
    normalizeInventoryHookMode,
    getInventoryHookModeSetting,
    setInventoryHookMode,
    getModuleConfigSnapshot
  };
}
