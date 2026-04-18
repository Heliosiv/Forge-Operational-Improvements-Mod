export function createGatherSettingsAccess({
  moduleId = "party-operations",
  settings = {},
  gatherDefaults = {},
  gatherTravelChoices = {},
  gatherEnvironmentKeys = [],
  gatherEnvironmentLabels = {},
  gatherQuickPresets = [],
  gameRef = globalThis.game ?? {}
} = {}) {
  function getGatherRollModeSetting() {
    return gameRef.settings?.get?.(moduleId, settings.GATHER_ROLL_MODE) ?? "prefer-monks";
  }

  function clampGatherInteger(value, min, max, fallback) {
    const raw = Number(value);
    if (!Number.isFinite(raw)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(raw)));
  }

  function clampGatherModifier(value, fallback = 0) {
    return clampGatherInteger(value, -20, 20, fallback);
  }

  function normalizeGatherTravelTradeoff(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    if (raw === gatherTravelChoices.FELL_BEHIND) return gatherTravelChoices.FELL_BEHIND;
    return gatherTravelChoices.PACE;
  }

  function normalizeGatherEnvironmentKey(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    return gatherEnvironmentKeys.includes(raw) ? raw : gatherEnvironmentKeys[0];
  }

  function normalizeGatherResourceType(value) {
    const raw = String(value ?? "").trim().toLowerCase();
    return raw === "water" ? "water" : "food";
  }

  function getGatherResourceConfig() {
    const getSetting = (key, fallback) => {
      try {
        const value = gameRef.settings?.get?.(moduleId, key);
        return value === undefined ? fallback : value;
      } catch {
        return fallback;
      }
    };

    return {
      enabled: Boolean(getSetting(settings.GATHER_ENABLED, gatherDefaults.enabled)),
      minimumHours: clampGatherInteger(getSetting(settings.GATHER_MIN_HOURS, gatherDefaults.minimumHours), 1, 24, gatherDefaults.minimumHours),
      disallowCombat: Boolean(getSetting(settings.GATHER_DISALLOW_COMBAT, gatherDefaults.disallowCombat)),
      baseDc: {
        lush_forest_or_river_valley: clampGatherInteger(getSetting(settings.GATHER_DC_LUSH, gatherDefaults.baseDc.lush_forest_or_river_valley), 1, 30, gatherDefaults.baseDc.lush_forest_or_river_valley),
        temperate_hills_or_light_woodland: clampGatherInteger(getSetting(settings.GATHER_DC_TEMPERATE, gatherDefaults.baseDc.temperate_hills_or_light_woodland), 1, 30, gatherDefaults.baseDc.temperate_hills_or_light_woodland),
        sparse_plains_or_rocky: clampGatherInteger(getSetting(settings.GATHER_DC_SPARSE, gatherDefaults.baseDc.sparse_plains_or_rocky), 1, 30, gatherDefaults.baseDc.sparse_plains_or_rocky),
        cold_mountains_or_swamp: clampGatherInteger(getSetting(settings.GATHER_DC_COLD, gatherDefaults.baseDc.cold_mountains_or_swamp), 1, 30, gatherDefaults.baseDc.cold_mountains_or_swamp),
        desert_blighted_wasteland: clampGatherInteger(getSetting(settings.GATHER_DC_DESERT, gatherDefaults.baseDc.desert_blighted_wasteland), 1, 30, gatherDefaults.baseDc.desert_blighted_wasteland)
      },
      seasonMod: clampGatherModifier(getSetting(settings.GATHER_DEFAULT_SEASON_MOD, gatherDefaults.seasonMod), gatherDefaults.seasonMod),
      weatherMod: clampGatherModifier(getSetting(settings.GATHER_DEFAULT_WEATHER_MOD, gatherDefaults.weatherMod), gatherDefaults.weatherMod),
      corruptionMod: clampGatherModifier(getSetting(settings.GATHER_DEFAULT_CORRUPTION_MOD, gatherDefaults.corruptionMod), gatherDefaults.corruptionMod),
      herbalismAdvantageEnabled: Boolean(getSetting(settings.GATHER_ENABLE_HERBALISM_ADVANTAGE, gatherDefaults.herbalismAdvantageEnabled)),
      hostileEncounterFlagEnabled: Boolean(getSetting(settings.GATHER_ENABLE_HOSTILE_FAIL_FLAG, gatherDefaults.hostileEncounterFlagEnabled)),
      failBy5ComplicationEnabled: Boolean(getSetting(settings.GATHER_ENABLE_FAIL_BY5_COMPLICATION, gatherDefaults.failBy5ComplicationEnabled)),
      successBy5DoubleEnabled: Boolean(getSetting(settings.GATHER_ENABLE_SUCCESS_BY5_DOUBLE, gatherDefaults.successBy5DoubleEnabled)),
      nat20BonusEnabled: Boolean(getSetting(settings.GATHER_ENABLE_NAT20_BONUS, gatherDefaults.nat20BonusEnabled)),
      nat1ComplicationEnabled: Boolean(getSetting(settings.GATHER_ENABLE_NAT1_FLAG, gatherDefaults.nat1ComplicationEnabled)),
      corruptionWaterCheckEnabled: Boolean(getSetting(settings.GATHER_ENABLE_CORRUPTION_WATER_CHECK, gatherDefaults.corruptionWaterCheckEnabled)),
      corruptionConSaveDc: clampGatherInteger(getSetting(settings.GATHER_CORRUPTION_SAVE_DC, gatherDefaults.corruptionConSaveDc), 1, 30, gatherDefaults.corruptionConSaveDc),
      waterAutoFoundEnabled: Boolean(getSetting(settings.GATHER_ENABLE_WATER_AUTO_FOUND, gatherDefaults.waterAutoFoundEnabled)),
      travelTradeoffEnabled: Boolean(getSetting(settings.GATHER_ENABLE_TRAVEL_TRADEOFF, gatherDefaults.travelTradeoffEnabled)),
      travelTradeoffDefault: normalizeGatherTravelTradeoff(getSetting(settings.GATHER_TRAVEL_TRADEOFF_DEFAULT, gatherDefaults.travelTradeoffDefault)),
      travelConSaveDc: clampGatherInteger(getSetting(settings.GATHER_TRAVEL_CON_SAVE_DC, gatherDefaults.travelConSaveDc), 1, 30, gatherDefaults.travelConSaveDc)
    };
  }

  function getGatherEnvironmentChoices(config = getGatherResourceConfig()) {
    const baseDc = config?.baseDc ?? gatherDefaults.baseDc;
    return gatherEnvironmentKeys.map((key) => ({
      value: key,
      label: `${gatherEnvironmentLabels[key] ?? key} (DC ${Math.max(1, Math.floor(Number(baseDc?.[key] ?? 10) || 10))})`
    }));
  }

  function getGatherQuickPresets(config = getGatherResourceConfig()) {
    return gatherQuickPresets.map((entry) => {
      const source = entry?.options ?? {};
      const environment = normalizeGatherEnvironmentKey(source.environment);
      const resourceType = normalizeGatherResourceType(source.resourceType);
      return {
        id: String(entry?.id ?? "").trim(),
        label: String(entry?.label ?? "Preset").trim() || "Preset",
        description: String(entry?.description ?? "").trim(),
        options: {
          environment,
          resourceType,
          gatherMode: String(source.gatherMode ?? "standard").trim().toLowerCase() === "plant" ? "plant" : "standard",
          seasonMod: clampGatherModifier(source.seasonMod, config.seasonMod),
          weatherMod: clampGatherModifier(source.weatherMod, config.weatherMod),
          corruptionMod: clampGatherModifier(source.corruptionMod, config.corruptionMod),
          hostileTerrain: Boolean(source.hostileTerrain),
          isCorruptedRegion: Boolean(source.isCorruptedRegion),
          waterAutoFound: Boolean(source.waterAutoFound),
          duringTravel: Boolean(source.duringTravel),
          travelTradeoff: normalizeGatherTravelTradeoff(source.travelTradeoff ?? config.travelTradeoffDefault)
        }
      };
    });
  }

  function getGatherQuickPresetById(presetId, config = getGatherResourceConfig()) {
    const id = String(presetId ?? "").trim();
    if (!id) return null;
    return getGatherQuickPresets(config).find((entry) => entry.id === id) ?? null;
  }

  function getGatherResourceTypeLabel(value) {
    return normalizeGatherResourceType(value) === "water" ? "Water" : "Food";
  }

  function buildGatherPresetContext(config = getGatherResourceConfig()) {
    return getGatherQuickPresets(config).map((preset) => {
      const options = preset?.options ?? {};
      const environment = normalizeGatherEnvironmentKey(options.environment);
      const resourceType = normalizeGatherResourceType(options.resourceType);
      const gatherMode = String(options.gatherMode ?? "standard").trim().toLowerCase() === "plant" ? "plant" : "standard";
      const tagParts = [];
      if (Boolean(options.duringTravel)) tagParts.push("Travel");
      if (Boolean(options.hostileTerrain)) tagParts.push("Hostile");
      if (Boolean(options.isCorruptedRegion)) tagParts.push("Corrupted");
      if (resourceType === "water" && Boolean(options.waterAutoFound)) tagParts.push("Auto-water");
      return {
        id: String(preset?.id ?? "").trim(),
        label: String(preset?.label ?? "Preset").trim() || "Preset",
        description: String(preset?.description ?? "").trim(),
        summary: `${getGatherResourceTypeLabel(resourceType)} | ${gatherEnvironmentLabels[environment] ?? environment} | ${gatherMode === "plant" ? "Plant" : "Standard"}`,
        tagsText: tagParts.join(" - "),
        hasTags: tagParts.length > 0
      };
    });
  }

  return {
    getGatherRollModeSetting,
    clampGatherInteger,
    clampGatherModifier,
    normalizeGatherTravelTradeoff,
    normalizeGatherEnvironmentKey,
    normalizeGatherResourceType,
    getGatherResourceConfig,
    getGatherEnvironmentChoices,
    getGatherQuickPresets,
    getGatherQuickPresetById,
    getGatherResourceTypeLabel,
    buildGatherPresetContext
  };
}
