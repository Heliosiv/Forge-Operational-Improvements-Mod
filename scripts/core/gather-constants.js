export const GATHER_TRAVEL_CHOICES = Object.freeze({
  PACE: "pace",
  FELL_BEHIND: "fell-behind"
});

export const AUTO_UPKEEP_PROMPT_STATES = Object.freeze({
  IDLE: "idle",
  DECISION: "decision",
  AWAITING_GATHER: "awaiting-gather"
});

export const AUTO_UPKEEP_CHAT_ACTIONS = Object.freeze({
  START_GATHER: "start-gather",
  APPLY_NOW: "apply-now",
  OPEN_RESOURCES: "open-resources"
});

export const GATHER_ENVIRONMENT_KEYS = Object.freeze([
  "lush_forest_or_river_valley",
  "temperate_hills_or_light_woodland",
  "sparse_plains_or_rocky",
  "cold_mountains_or_swamp",
  "desert_blighted_wasteland"
]);

export const GATHER_ENVIRONMENT_LABELS = Object.freeze({
  lush_forest_or_river_valley: "Lush Forest / River Valley",
  temperate_hills_or_light_woodland: "Temperate Hills / Light Woodland",
  sparse_plains_or_rocky: "Sparse Plains / Rocky Terrain",
  cold_mountains_or_swamp: "Cold Mountains / Swamp",
  desert_blighted_wasteland: "Desert / Blighted Wasteland"
});

export const GATHER_DEFAULTS = Object.freeze({
  enabled: true,
  minimumHours: 4,
  disallowCombat: true,
  baseDc: {
    lush_forest_or_river_valley: 10,
    temperate_hills_or_light_woodland: 12,
    sparse_plains_or_rocky: 14,
    cold_mountains_or_swamp: 15,
    desert_blighted_wasteland: 19
  },
  seasonMod: 0,
  weatherMod: 0,
  corruptionMod: 0,
  herbalismAdvantageEnabled: false,
  hostileEncounterFlagEnabled: true,
  failBy5ComplicationEnabled: true,
  successBy5DoubleEnabled: true,
  nat20BonusEnabled: true,
  nat1ComplicationEnabled: true,
  corruptionWaterCheckEnabled: false,
  corruptionConSaveDc: 13,
  waterAutoFoundEnabled: true,
  travelTradeoffEnabled: true,
  travelTradeoffDefault: GATHER_TRAVEL_CHOICES.PACE,
  travelConSaveDc: 10
});

export const GATHER_QUICK_PRESETS = Object.freeze([
  {
    id: "lush-food-sweep",
    label: "Lush Food Sweep",
    description: "Low-risk food pass in lush terrain.",
    options: {
      environment: "lush_forest_or_river_valley",
      resourceType: "food",
      gatherMode: "plant",
      seasonMod: 0,
      weatherMod: 0,
      corruptionMod: 0,
      hostileTerrain: false,
      isCorruptedRegion: false,
      waterAutoFound: false,
      duringTravel: false,
      travelTradeoff: GATHER_TRAVEL_CHOICES.PACE
    }
  },
  {
    id: "river-water-run",
    label: "River Water Run",
    description: "Quick water gather at obvious source.",
    options: {
      environment: "lush_forest_or_river_valley",
      resourceType: "water",
      gatherMode: "standard",
      seasonMod: 0,
      weatherMod: 0,
      corruptionMod: 0,
      hostileTerrain: false,
      isCorruptedRegion: false,
      waterAutoFound: true,
      duringTravel: false,
      travelTradeoff: GATHER_TRAVEL_CHOICES.PACE
    }
  },
  {
    id: "temperate-travel-forage",
    label: "Temperate Travel Forage",
    description: "On-the-move forage with pace reduction tradeoff.",
    options: {
      environment: "temperate_hills_or_light_woodland",
      resourceType: "food",
      gatherMode: "standard",
      seasonMod: 0,
      weatherMod: 1,
      corruptionMod: 0,
      hostileTerrain: false,
      isCorruptedRegion: false,
      waterAutoFound: false,
      duringTravel: true,
      travelTradeoff: GATHER_TRAVEL_CHOICES.PACE
    }
  },
  {
    id: "wasteland-water-risk",
    label: "Wasteland Water Risk",
    description: "High-risk water gather in blighted terrain.",
    options: {
      environment: "desert_blighted_wasteland",
      resourceType: "water",
      gatherMode: "standard",
      seasonMod: 0,
      weatherMod: 2,
      corruptionMod: 2,
      hostileTerrain: true,
      isCorruptedRegion: true,
      waterAutoFound: false,
      duringTravel: true,
      travelTradeoff: GATHER_TRAVEL_CHOICES.FELL_BEHIND
    }
  }
]);
