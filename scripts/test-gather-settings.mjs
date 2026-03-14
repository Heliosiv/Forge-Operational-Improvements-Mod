import assert from "node:assert/strict";

import { createGatherSettingsAccess } from "./core/gather-settings.js";

const settingValues = {
  gatherRollMode: "manual",
  gatherEnabled: 1,
  gatherMinHours: 30,
  gatherDisallowCombat: 0,
  gatherDcLush: 12,
  gatherDcTemperate: 14,
  gatherDcSparse: 50,
  gatherDcCold: "bad",
  gatherDcDesert: 8,
  gatherSeasonMod: 25,
  gatherWeatherMod: -30,
  gatherCorruptionMod: 2,
  gatherHerbalismAdvantage: true,
  gatherHostileFailFlag: false,
  gatherFailBy5Complication: true,
  gatherSuccessBy5Double: true,
  gatherNat20Bonus: true,
  gatherNat1Flag: false,
  gatherCorruptionWaterCheck: true,
  gatherCorruptionSaveDc: 99,
  gatherWaterAutoFound: true,
  gatherTravelTradeoffEnabled: true,
  gatherTravelTradeoffDefault: "fell-behind",
  gatherTravelConSaveDc: 0
};

const gather = createGatherSettingsAccess({
  moduleId: "party-operations",
  settings: {
    GATHER_ROLL_MODE: "gatherRollMode",
    GATHER_ENABLED: "gatherEnabled",
    GATHER_MIN_HOURS: "gatherMinHours",
    GATHER_DISALLOW_COMBAT: "gatherDisallowCombat",
    GATHER_DC_LUSH: "gatherDcLush",
    GATHER_DC_TEMPERATE: "gatherDcTemperate",
    GATHER_DC_SPARSE: "gatherDcSparse",
    GATHER_DC_COLD: "gatherDcCold",
    GATHER_DC_DESERT: "gatherDcDesert",
    GATHER_DEFAULT_SEASON_MOD: "gatherSeasonMod",
    GATHER_DEFAULT_WEATHER_MOD: "gatherWeatherMod",
    GATHER_DEFAULT_CORRUPTION_MOD: "gatherCorruptionMod",
    GATHER_ENABLE_HERBALISM_ADVANTAGE: "gatherHerbalismAdvantage",
    GATHER_ENABLE_HOSTILE_FAIL_FLAG: "gatherHostileFailFlag",
    GATHER_ENABLE_FAIL_BY5_COMPLICATION: "gatherFailBy5Complication",
    GATHER_ENABLE_SUCCESS_BY5_DOUBLE: "gatherSuccessBy5Double",
    GATHER_ENABLE_NAT20_BONUS: "gatherNat20Bonus",
    GATHER_ENABLE_NAT1_FLAG: "gatherNat1Flag",
    GATHER_ENABLE_CORRUPTION_WATER_CHECK: "gatherCorruptionWaterCheck",
    GATHER_CORRUPTION_SAVE_DC: "gatherCorruptionSaveDc",
    GATHER_ENABLE_WATER_AUTO_FOUND: "gatherWaterAutoFound",
    GATHER_ENABLE_TRAVEL_TRADEOFF: "gatherTravelTradeoffEnabled",
    GATHER_TRAVEL_TRADEOFF_DEFAULT: "gatherTravelTradeoffDefault",
    GATHER_TRAVEL_CON_SAVE_DC: "gatherTravelConSaveDc"
  },
  gatherDefaults: {
    enabled: false,
    minimumHours: 4,
    disallowCombat: true,
    baseDc: {
      lush_forest_or_river_valley: 10,
      temperate_hills_or_light_woodland: 12,
      sparse_plains_or_rocky: 14,
      cold_mountains_or_swamp: 16,
      desert_blighted_wasteland: 18
    },
    seasonMod: 0,
    weatherMod: 0,
    corruptionMod: 0,
    herbalismAdvantageEnabled: false,
    hostileEncounterFlagEnabled: true,
    failBy5ComplicationEnabled: false,
    successBy5DoubleEnabled: false,
    nat20BonusEnabled: false,
    nat1ComplicationEnabled: true,
    corruptionWaterCheckEnabled: false,
    corruptionConSaveDc: 12,
    waterAutoFoundEnabled: false,
    travelTradeoffEnabled: false,
    travelTradeoffDefault: "pace",
    travelConSaveDc: 13
  },
  gatherTravelChoices: {
    PACE: "pace",
    FELL_BEHIND: "fell-behind"
  },
  gatherEnvironmentKeys: [
    "lush_forest_or_river_valley",
    "temperate_hills_or_light_woodland",
    "sparse_plains_or_rocky",
    "cold_mountains_or_swamp",
    "desert_blighted_wasteland"
  ],
  gatherEnvironmentLabels: {
    lush_forest_or_river_valley: "Lush Forest",
    temperate_hills_or_light_woodland: "Temperate Hills",
    sparse_plains_or_rocky: "Sparse Plains",
    cold_mountains_or_swamp: "Cold Mountains",
    desert_blighted_wasteland: "Desert"
  },
  gatherQuickPresets: [
    {
      id: "travel-water",
      label: "Travel Water",
      description: "Water while traveling",
      options: {
        environment: "desert_blighted_wasteland",
        resourceType: "water",
        gatherMode: "plant",
        seasonMod: 3,
        weatherMod: -5,
        corruptionMod: 1,
        hostileTerrain: true,
        isCorruptedRegion: true,
        waterAutoFound: true,
        duringTravel: true,
        travelTradeoff: "fell-behind"
      }
    }
  ],
  gameRef: {
    settings: {
      get(moduleId, key) {
        assert.equal(moduleId, "party-operations");
        return settingValues[key];
      }
    }
  }
});

assert.equal(gather.getGatherRollModeSetting(), "manual");
assert.equal(gather.clampGatherInteger(50, 1, 24, 4), 24);
assert.equal(gather.clampGatherModifier(-50, 0), -20);
assert.equal(gather.normalizeGatherTravelTradeoff("fell-behind"), "fell-behind");
assert.equal(gather.normalizeGatherTravelTradeoff("invalid"), "pace");
assert.equal(gather.normalizeGatherEnvironmentKey("temperate_hills_or_light_woodland"), "temperate_hills_or_light_woodland");
assert.equal(gather.normalizeGatherEnvironmentKey("invalid"), "lush_forest_or_river_valley");
assert.equal(gather.normalizeGatherResourceType("water"), "water");
assert.equal(gather.normalizeGatherResourceType("anything"), "food");

const config = gather.getGatherResourceConfig();
assert.deepEqual(config, {
  enabled: true,
  minimumHours: 24,
  disallowCombat: false,
  baseDc: {
    lush_forest_or_river_valley: 12,
    temperate_hills_or_light_woodland: 14,
    sparse_plains_or_rocky: 30,
    cold_mountains_or_swamp: 16,
    desert_blighted_wasteland: 8
  },
  seasonMod: 20,
  weatherMod: -20,
  corruptionMod: 2,
  herbalismAdvantageEnabled: true,
  hostileEncounterFlagEnabled: false,
  failBy5ComplicationEnabled: true,
  successBy5DoubleEnabled: true,
  nat20BonusEnabled: true,
  nat1ComplicationEnabled: false,
  corruptionWaterCheckEnabled: true,
  corruptionConSaveDc: 30,
  waterAutoFoundEnabled: true,
  travelTradeoffEnabled: true,
  travelTradeoffDefault: "fell-behind",
  travelConSaveDc: 1
});

assert.deepEqual(gather.getGatherEnvironmentChoices(config)[0], {
  value: "lush_forest_or_river_valley",
  label: "Lush Forest (DC 12)"
});

const preset = gather.getGatherQuickPresetById("travel-water", config);
assert.equal(preset.options.resourceType, "water");
assert.equal(preset.options.gatherMode, "plant");
assert.equal(preset.options.travelTradeoff, "fell-behind");

assert.equal(gather.getGatherResourceTypeLabel("water"), "Water");
assert.equal(gather.getGatherResourceTypeLabel("food"), "Food");

assert.deepEqual(gather.buildGatherPresetContext(config), [
  {
    id: "travel-water",
    label: "Travel Water",
    description: "Water while traveling",
    summary: "Water | Desert | Plant",
    tagsText: "Travel - Hostile - Corrupted - Auto-water",
    hasTags: true
  }
]);

process.stdout.write("gather settings validation passed\n");
