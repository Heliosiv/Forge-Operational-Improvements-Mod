const DAYS_PER_SEASON = 91;
const HOURS_PER_DAY = 24;

export const GMSCREEN_WEATHER_SEASONS = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);
export const GMSCREEN_WEATHER_CLIMATES = Object.freeze([
  "Temperate",
  "Coastal",
  "Tropical",
  "Mountain",
  "Arid",
  "Arctic",
  "Swamp",
  "Underdark"
]);

const DAILY_RANGE_BY_CLIMATE = Object.freeze({
  Temperate: 10,
  Coastal: 7,
  Tropical: 6,
  Mountain: 12,
  Arid: 16,
  Arctic: 9,
  Swamp: 6,
  Underdark: 4
});

const SEASONAL_RANGE_SHIFT = Object.freeze({
  Spring: 0,
  Summer: 2,
  Autumn: -1,
  Winter: -2
});

const EMPTY_TERRAIN_COUNTS = Object.freeze({
  Mountain: 0,
  Desert: 0,
  Forest: 0,
  Water: 0,
  Coast: 0,
  Swamp: 0,
  Urban: 0,
  Plains: 0
});

function freezeLocationProfiles(profiles) {
  for (const profile of profiles) {
    Object.freeze(profile.terrainCounts);
    Object.freeze(profile.activeTerrains);
    Object.freeze(profile);
  }
  return Object.freeze(profiles);
}

export const GMSCREEN_WEATHER_FORECAST_DAY_OPTIONS = Object.freeze([7, 14, 30]);

export const GMSCREEN_WEATHER_LOCATION_PROFILES = freezeLocationProfiles([
  {
    key: "temperate-lowlands",
    label: "Temperate Lowlands",
    climate: "Temperate",
    terrainCounts: { Plains: 4, Forest: 2 },
    activeTerrains: ["Plains", "Forest"],
    description: "Farm roads, mixed woods, and settled valleys."
  },
  {
    key: "deep-forest",
    label: "Deep Forest",
    climate: "Temperate",
    terrainCounts: { Forest: 6, Plains: 1 },
    activeTerrains: ["Forest"],
    description: "Dense tree cover, damp shade, and broken sightlines."
  },
  {
    key: "coast-islands",
    label: "Coast And Islands",
    climate: "Coastal",
    terrainCounts: { Coast: 5, Water: 3, Plains: 1 },
    activeTerrains: ["Coast", "Water"],
    description: "Sea air, tides, surf, and exposed crossings."
  },
  {
    key: "mountains",
    label: "Mountains",
    climate: "Mountain",
    terrainCounts: { Mountain: 5, Forest: 1 },
    activeTerrains: ["Mountain", "Forest"],
    description: "High passes, thin air, and fast-changing skies."
  },
  {
    key: "desert",
    label: "Desert",
    climate: "Arid",
    terrainCounts: { Desert: 6, Plains: 1 },
    activeTerrains: ["Desert", "Plains"],
    description: "Dry basins, exposed flats, and cold nights."
  },
  {
    key: "jungle",
    label: "Jungle",
    climate: "Tropical",
    terrainCounts: { Forest: 5, Swamp: 2, Water: 1 },
    activeTerrains: ["Forest", "Swamp", "Water"],
    description: "Hot canopy, saturated ground, and daily rain risk."
  },
  {
    key: "swamp",
    label: "Swamp",
    climate: "Swamp",
    terrainCounts: { Swamp: 5, Water: 2, Forest: 2 },
    activeTerrains: ["Swamp", "Water", "Forest"],
    description: "Wetlands, standing water, insects, and low mist."
  },
  {
    key: "arctic",
    label: "Arctic",
    climate: "Arctic",
    terrainCounts: { Plains: 2, Mountain: 2, Water: 1 },
    activeTerrains: ["Plains", "Mountain", "Water"],
    description: "Tundra, ice fields, cold water, and hard wind."
  },
  {
    key: "city",
    label: "City Or Town",
    climate: "Temperate",
    terrainCounts: { Urban: 5, Plains: 1 },
    activeTerrains: ["Urban"],
    description: "Streets, rooftops, stone heat, smoke, and shelter."
  },
  {
    key: "underdark",
    label: "Underdark",
    climate: "Underdark",
    terrainCounts: { Mountain: 3, Water: 1 },
    activeTerrains: ["Mountain", "Water"],
    description: "Caverns, still air, thermal vents, and no open sky."
  }
]);

export const GMSCREEN_WEATHER_TERRAIN_ROWS = Object.freeze([
  {
    key: "Mountain",
    label: "Mountains",
    hint: "Lowers temperatures and keeps steep routes slower."
  },
  {
    key: "Water",
    label: "Open Water",
    hint: "Adds moisture and increases rainfall."
  },
  {
    key: "Coast",
    label: "Coast",
    hint: "Adds sea air, stronger wind, and rain risk."
  },
  {
    key: "Forest",
    label: "Forest",
    hint: "Favors mist and limits long sightlines."
  },
  {
    key: "Swamp",
    label: "Swamp",
    hint: "Keeps humidity high and ground unstable."
  },
  {
    key: "Desert",
    label: "Desert",
    hint: "Dries the air and raises daytime heat."
  },
  {
    key: "Urban",
    label: "Urban",
    hint: "Retains heat after sunset."
  },
  {
    key: "Plains",
    label: "Plains",
    hint: "Keeps wind moving and open ground faster."
  }
]);

function freezeWeatherTable(table) {
  for (const climate of Object.values(table)) {
    for (const seasonRows of Object.values(climate)) {
      Object.freeze(seasonRows);
      for (const row of seasonRows) Object.freeze(row);
    }
    Object.freeze(climate);
  }
  return Object.freeze(table);
}

export const GMSCREEN_WEATHER_TABLE = freezeWeatherTable({
  Temperate: {
    Spring: [
      { condition: "Light Rain", weight: 25, wind: "Breeze", baseTempC: 12, note: "Fresh growth and damp trails." },
      { condition: "Clear", weight: 35, wind: "Light Wind", baseTempC: 16, note: "Stable skies and good visibility." },
      { condition: "Overcast", weight: 25, wind: "Calm", baseTempC: 14, note: "Muted light and steady travel." },
      {
        condition: "Thunderstorm",
        weight: 15,
        wind: "Strong Wind",
        baseTempC: 10,
        note: "Storm fronts push across the region."
      }
    ],
    Summer: [
      { condition: "Clear", weight: 45, wind: "Calm", baseTempC: 26, note: "Long, bright daylight." },
      { condition: "Hot", weight: 20, wind: "Light Wind", baseTempC: 31, note: "Heat lingers through the afternoon." },
      { condition: "Humid", weight: 20, wind: "Calm", baseTempC: 28, note: "Heavy air and slow marches." },
      { condition: "Storm", weight: 15, wind: "Strong Wind", baseTempC: 22, note: "Fast rain and hard gusts." }
    ],
    Autumn: [
      { condition: "Fog", weight: 20, wind: "Calm", baseTempC: 11, note: "Low ground stays cloaked in mist." },
      { condition: "Clear", weight: 30, wind: "Breeze", baseTempC: 13, note: "Cool and steady conditions." },
      { condition: "Drizzle", weight: 30, wind: "Light Wind", baseTempC: 10, note: "Persistent damp air." },
      { condition: "Heavy Rain", weight: 20, wind: "Strong Wind", baseTempC: 9, note: "Rivers and roads worsen." }
    ],
    Winter: [
      { condition: "Cold Clear", weight: 25, wind: "Breeze", baseTempC: 1, note: "Sharp air and bright horizons." },
      { condition: "Snow", weight: 35, wind: "Light Wind", baseTempC: -2, note: "Travel slows under fresh snow." },
      { condition: "Sleet", weight: 25, wind: "Strong Wind", baseTempC: 0, note: "Wet cold bites through gear." },
      {
        condition: "Blizzard",
        weight: 15,
        wind: "Gale",
        baseTempC: -6,
        note: "Exposure and navigation become dangerous."
      }
    ]
  },
  Arid: {
    Spring: [
      { condition: "Dry", weight: 60, wind: "Light Wind", baseTempC: 25, note: "Dust lifts from exposed ground." },
      {
        condition: "Dusty",
        weight: 40,
        wind: "Strong Wind",
        baseTempC: 23,
        note: "Visibility suffers on open stretches."
      }
    ],
    Summer: [
      { condition: "Scorching", weight: 55, wind: "Calm", baseTempC: 37, note: "Heat dominates the day." },
      { condition: "Heatwave", weight: 30, wind: "Hot Wind", baseTempC: 41, note: "Sustained brutal temperatures." },
      { condition: "Dust Storm", weight: 15, wind: "Gale", baseTempC: 35, note: "Dust walls roll across the region." }
    ],
    Autumn: [
      { condition: "Dry", weight: 65, wind: "Breeze", baseTempC: 26, note: "Cooler nights but dry days." },
      { condition: "Dusty", weight: 35, wind: "Strong Wind", baseTempC: 24, note: "Loose earth keeps moving." }
    ],
    Winter: [
      { condition: "Cool Day", weight: 70, wind: "Calm", baseTempC: 17, note: "Mild sun and cold evenings." },
      {
        condition: "Cold Desert Rain",
        weight: 30,
        wind: "Light Wind",
        baseTempC: 10,
        note: "Rare rain creates slick ground."
      }
    ]
  },
  Coastal: {
    Spring: [
      { condition: "Mild Rain", weight: 35, wind: "Breeze", baseTempC: 11, note: "Wet sea air reaches inland." },
      { condition: "Clear", weight: 40, wind: "Light Wind", baseTempC: 14, note: "Good sailing weather." },
      { condition: "Fog", weight: 25, wind: "Calm", baseTempC: 9, note: "Harbors and cliffs vanish in mist." }
    ],
    Summer: [
      { condition: "Clear", weight: 50, wind: "Light Wind", baseTempC: 22, note: "Mild sea-cooled warmth." },
      { condition: "Humid", weight: 30, wind: "Calm", baseTempC: 25, note: "Sticky, salt-heavy air." },
      { condition: "Storm", weight: 20, wind: "Strong Wind", baseTempC: 18, note: "Sudden squalls off the water." }
    ],
    Autumn: [
      { condition: "Breezy", weight: 45, wind: "Strong Wind", baseTempC: 14, note: "Cold wind sweeps the shore." },
      { condition: "Clear", weight: 40, wind: "Breeze", baseTempC: 12, note: "Cool but workable conditions." },
      { condition: "Gale", weight: 15, wind: "Gale", baseTempC: 8, note: "Breaking waves and dangerous crossings." }
    ],
    Winter: [
      { condition: "Cold Rain", weight: 50, wind: "Strong Wind", baseTempC: 4, note: "Hard rain driven sideways." },
      { condition: "Clear Cold", weight: 35, wind: "Breeze", baseTempC: 1, note: "Sea air keeps the cold damp." },
      { condition: "Storm", weight: 15, wind: "Gale", baseTempC: 0, note: "Harsh coastal storms." }
    ]
  },
  Mountain: {
    Spring: [
      { condition: "Clear", weight: 40, wind: "Breeze", baseTempC: 8, note: "Melting slopes and unstable ridges." },
      { condition: "Fog", weight: 35, wind: "Calm", baseTempC: 6, note: "Passes close in quickly." },
      { condition: "Snow Flurry", weight: 25, wind: "Strong Wind", baseTempC: 3, note: "High ground still sheds snow." }
    ],
    Summer: [
      { condition: "Clear", weight: 60, wind: "Calm", baseTempC: 18, note: "Thin, bright air." },
      {
        condition: "Afternoon Storm",
        weight: 30,
        wind: "Strong Wind",
        baseTempC: 14,
        note: "Storms build fast on peaks."
      },
      { condition: "Hot Wind", weight: 10, wind: "Hot Wind", baseTempC: 22, note: "Dry gusts sweep exposed rock." }
    ],
    Autumn: [
      { condition: "Clear", weight: 50, wind: "Breeze", baseTempC: 10, note: "Cold nights and crisp days." },
      { condition: "Early Snow", weight: 35, wind: "Light Wind", baseTempC: 2, note: "The season turns abruptly." },
      { condition: "Fog", weight: 15, wind: "Calm", baseTempC: 6, note: "Ridges vanish at distance." }
    ],
    Winter: [
      { condition: "Snow", weight: 60, wind: "Strong Wind", baseTempC: -5, note: "Deep accumulation on high routes." },
      { condition: "Clear Cold", weight: 30, wind: "Breeze", baseTempC: -8, note: "Hard freezes and brittle ice." },
      { condition: "Whiteout", weight: 10, wind: "Gale", baseTempC: -10, note: "Movement becomes hazardous." }
    ]
  },
  Tropical: {
    Spring: [
      { condition: "Warm Rain", weight: 60, wind: "Light Wind", baseTempC: 28, note: "Rain feeds heavy growth." },
      { condition: "Clear", weight: 30, wind: "Calm", baseTempC: 32, note: "Heat builds under direct sun." },
      { condition: "Storm", weight: 10, wind: "Strong Wind", baseTempC: 30, note: "Brief but violent tropical rain." }
    ],
    Summer: [
      { condition: "Monsoon", weight: 70, wind: "Strong Wind", baseTempC: 28, note: "Days of heavy rain dominate." },
      { condition: "Humid", weight: 20, wind: "Calm", baseTempC: 35, note: "The air feels oppressive." },
      { condition: "Typhoon", weight: 10, wind: "Gale", baseTempC: 25, note: "Major storm danger." }
    ],
    Autumn: [
      { condition: "Warm", weight: 50, wind: "Breeze", baseTempC: 30, note: "Dense heat lingers." },
      { condition: "Rain", weight: 40, wind: "Light Wind", baseTempC: 26, note: "Ground saturates quickly." },
      { condition: "Storm", weight: 10, wind: "Strong Wind", baseTempC: 24, note: "Sudden squalls and thunder." }
    ],
    Winter: [
      { condition: "Mild", weight: 70, wind: "Calm", baseTempC: 26, note: "Warm season baseline." },
      { condition: "Rain", weight: 20, wind: "Breeze", baseTempC: 23, note: "Daily showers remain common." },
      { condition: "Thunder", weight: 10, wind: "Strong Wind", baseTempC: 22, note: "Storm cells burst through fast." }
    ]
  },
  Arctic: {
    Spring: [
      { condition: "Snow Melt", weight: 60, wind: "Strong Wind", baseTempC: -5, note: "Ice breaks and routes shift." },
      { condition: "Fog", weight: 30, wind: "Calm", baseTempC: -8, note: "Cold mist settles low." },
      { condition: "Clear", weight: 10, wind: "Breeze", baseTempC: -3, note: "Rare calm clarity." }
    ],
    Summer: [
      { condition: "Clear", weight: 60, wind: "Light Wind", baseTempC: 5, note: "Brief workable thaw." },
      { condition: "Fog", weight: 30, wind: "Calm", baseTempC: 0, note: "Cold fog rolls off ice." },
      { condition: "Storm", weight: 10, wind: "Gale", baseTempC: -2, note: "A freeze can return fast." }
    ],
    Autumn: [
      { condition: "Cold Clear", weight: 50, wind: "Breeze", baseTempC: -5, note: "Freeze returns across the region." },
      { condition: "Snow", weight: 40, wind: "Light Wind", baseTempC: -10, note: "Routes close again." },
      { condition: "Gale", weight: 10, wind: "Gale", baseTempC: -15, note: "Travel becomes punishing." }
    ],
    Winter: [
      { condition: "Blizzard", weight: 60, wind: "Gale", baseTempC: -20, note: "White conditions erase landmarks." },
      {
        condition: "Bitter Cold",
        weight: 30,
        wind: "Strong Wind",
        baseTempC: -25,
        note: "Exposure is constant danger."
      },
      { condition: "Whiteout", weight: 10, wind: "Gale", baseTempC: -30, note: "Movement may stop entirely." }
    ]
  },
  Swamp: {
    Spring: [
      { condition: "Drizzle", weight: 40, wind: "Calm", baseTempC: 17, note: "Waterlogged ground expands." },
      { condition: "Fog", weight: 35, wind: "Calm", baseTempC: 16, note: "Mist hangs over channels." },
      { condition: "Rain", weight: 25, wind: "Breeze", baseTempC: 18, note: "Flooded paths worsen." },
      {
        condition: "Overcast Lull",
        weight: 15,
        wind: "Calm",
        baseTempC: 17,
        note: "The drizzle pauses; low cloud stays close."
      }
    ],
    Summer: [
      { condition: "Humid", weight: 45, wind: "Calm", baseTempC: 29, note: "Heavy wet heat settles in." },
      { condition: "Storm", weight: 30, wind: "Strong Wind", baseTempC: 26, note: "Rain beats down across bogs." },
      { condition: "Fog", weight: 25, wind: "Calm", baseTempC: 24, note: "Warm mist limits sight." },
      {
        condition: "Stifling Clear",
        weight: 15,
        wind: "Calm",
        baseTempC: 32,
        note: "The sun breaks through and the heat becomes oppressive."
      }
    ],
    Autumn: [
      { condition: "Fog", weight: 45, wind: "Calm", baseTempC: 14, note: "The marsh disappears into haze." },
      { condition: "Rain", weight: 35, wind: "Light Wind", baseTempC: 13, note: "Channels overflow." },
      { condition: "Clear", weight: 20, wind: "Breeze", baseTempC: 15, note: "A brief workable day." }
    ],
    Winter: [
      { condition: "Cold Rain", weight: 40, wind: "Light Wind", baseTempC: 5, note: "Wet cold lingers." },
      { condition: "Fog", weight: 35, wind: "Calm", baseTempC: 4, note: "Clammy low fog persists." },
      { condition: "Sleet", weight: 25, wind: "Strong Wind", baseTempC: 2, note: "Bog surfaces turn treacherous." },
      {
        condition: "Cold Snap",
        weight: 15,
        wind: "Breeze",
        baseTempC: 1,
        note: "A hard freeze stills the bog; the air turns brittle and dry."
      }
    ]
  },
  Underdark: {
    Spring: [
      { condition: "Still Air", weight: 55, wind: "Calm", baseTempC: 14, note: "The caverns remain static." },
      {
        condition: "Damp Drift",
        weight: 30,
        wind: "Light Wind",
        baseTempC: 13,
        note: "Condensation gathers on stone."
      },
      { condition: "Vent Gusts", weight: 15, wind: "Strong Wind", baseTempC: 16, note: "Heat vents alter routes." }
    ],
    Summer: [
      { condition: "Still Air", weight: 45, wind: "Calm", baseTempC: 18, note: "Warm stagnant caverns." },
      { condition: "Sulfur Drift", weight: 30, wind: "Breeze", baseTempC: 20, note: "Irritating vapors gather." },
      {
        condition: "Vent Gusts",
        weight: 25,
        wind: "Strong Wind",
        baseTempC: 22,
        note: "Pressure shifts through tunnels."
      }
    ],
    Autumn: [
      { condition: "Damp Drift", weight: 40, wind: "Calm", baseTempC: 12, note: "Wet stone and slick paths." },
      { condition: "Still Air", weight: 40, wind: "Calm", baseTempC: 13, note: "Quiet and stale conditions." },
      { condition: "Echo Gusts", weight: 20, wind: "Breeze", baseTempC: 11, note: "Cross tunnels breathe cold." }
    ],
    Winter: [
      { condition: "Cold Cavern Air", weight: 50, wind: "Calm", baseTempC: 8, note: "Heat retreats from the tunnels." },
      { condition: "Still Air", weight: 35, wind: "Calm", baseTempC: 10, note: "Dry silence dominates." },
      {
        condition: "Vent Gusts",
        weight: 15,
        wind: "Strong Wind",
        baseTempC: 12,
        note: "Thermal pockets create pressure bursts."
      }
    ]
  }
});

function clampNumber(value, min, max, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function clampInteger(value, min, max, fallback = 0) {
  return Math.floor(clampNumber(value, min, max, fallback));
}

function slugifyWeatherKey(value, fallback = "weather") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

export function normalizeGmScreenWeatherForecastDays(value = 7) {
  const numeric = Math.floor(Number(value) || 7);
  if (numeric <= 7) return 7;
  if (numeric <= 14) return 14;
  return 30;
}

export function getGmScreenWeatherForecastDayOptions(selectedDays = 7) {
  const selected = normalizeGmScreenWeatherForecastDays(selectedDays);
  return GMSCREEN_WEATHER_FORECAST_DAY_OPTIONS.map((days) => ({
    value: days,
    label: days === 30 ? "30 Days" : `${days} Days`,
    selected: days === selected
  }));
}

export function normalizeGmScreenWeatherLocationKey(value = "") {
  const normalized = slugifyWeatherKey(value, "");
  if (GMSCREEN_WEATHER_LOCATION_PROFILES.some((profile) => profile.key === normalized)) return normalized;
  const labelProfile = GMSCREEN_WEATHER_LOCATION_PROFILES.find(
    (profile) => slugifyWeatherKey(profile.label, "") === normalized
  );
  if (labelProfile) return labelProfile.key;
  const climate = normalizeGmScreenWeatherClimate(value);
  const climateProfile = GMSCREEN_WEATHER_LOCATION_PROFILES.find((profile) => profile.climate === climate);
  return climateProfile?.key ?? "temperate-lowlands";
}

export function getGmScreenWeatherLocationProfile(value = "") {
  const key = normalizeGmScreenWeatherLocationKey(value);
  const profile =
    GMSCREEN_WEATHER_LOCATION_PROFILES.find((entry) => entry.key === key) ?? GMSCREEN_WEATHER_LOCATION_PROFILES[0];
  return {
    ...profile,
    terrainCounts: normalizeGmScreenWeatherTerrainCounts(profile.terrainCounts),
    activeTerrains: Array.isArray(profile.activeTerrains) ? [...profile.activeTerrains] : []
  };
}

export function getGmScreenWeatherLocationOptions(selectedLocation = "") {
  const selected = normalizeGmScreenWeatherLocationKey(selectedLocation);
  return GMSCREEN_WEATHER_LOCATION_PROFILES.map((profile) => ({
    value: profile.key,
    label: profile.label,
    description: profile.description,
    selected: profile.key === selected
  }));
}

export function normalizeGmScreenWeatherTerrainCounts(terrainCounts = {}) {
  const normalized = {};
  for (const [key, fallback] of Object.entries(EMPTY_TERRAIN_COUNTS)) {
    normalized[key] = Math.max(0, Math.floor(Number(terrainCounts?.[key] ?? fallback) || 0));
  }
  return normalized;
}

function normalizeTerrainCounts(terrainCounts = {}) {
  return normalizeGmScreenWeatherTerrainCounts(terrainCounts);
}

function normalizeTerrainSet(activeTerrains = []) {
  if (activeTerrains instanceof Set) return activeTerrains;
  if (!Array.isArray(activeTerrains)) return new Set();
  return new Set(activeTerrains.map((entry) => String(entry ?? "").trim()).filter(Boolean));
}

export function getActiveGmScreenWeatherTerrains(terrainCounts = {}) {
  const normalized = normalizeTerrainCounts(terrainCounts);
  return Object.entries(normalized)
    .filter(([, value]) => Number(value) > 0)
    .map(([key]) => key);
}

export function getGmScreenWeatherTerrainRows(terrainCounts = {}) {
  const normalized = normalizeTerrainCounts(terrainCounts);
  return GMSCREEN_WEATHER_TERRAIN_ROWS.map((row) => ({
    ...row,
    value: Number(normalized[row.key] ?? 0),
    active: Number(normalized[row.key] ?? 0) > 0
  }));
}

export function formatGmScreenWeatherTerrainSummary(terrainCounts = {}) {
  const rows = getGmScreenWeatherTerrainRows(terrainCounts).filter((row) => row.active);
  if (!rows.length) return "No regional terrain profile.";
  return rows.map((row) => `${row.label} ${row.value}`).join(", ");
}

function getDominantTerrainRows(terrainCounts = {}, limit = 3) {
  return getGmScreenWeatherTerrainRows(terrainCounts)
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, Math.max(1, Math.floor(Number(limit) || 3)));
}

export function recommendGmScreenWeatherClimateForTerrain(terrainCounts = {}) {
  const terrain = normalizeTerrainCounts(terrainCounts);
  const total = Object.values(terrain).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  if (total <= 0) {
    return {
      climate: "Temperate",
      confidenceLabel: "Low",
      reason: "No terrain profile; using Temperate as the safest default.",
      scores: {}
    };
  }

  const scores = {
    Temperate: 6 + terrain.Plains * 1.2 + terrain.Forest * 0.7 + terrain.Urban * 0.5,
    Coastal: terrain.Coast * 5 + terrain.Water * 2 + terrain.Plains * 0.4 + terrain.Urban * 0.2,
    Mountain: terrain.Mountain * 5 + terrain.Forest * 0.7 - terrain.Water * 0.2,
    Arid: terrain.Desert * 5 + terrain.Plains * 0.7 - terrain.Water * 0.8 - terrain.Swamp * 1.4,
    Swamp: terrain.Swamp * 5 + terrain.Water * 1.2 + terrain.Forest * 1.1,
    Tropical: terrain.Forest * 1.8 + terrain.Swamp * 1.6 + terrain.Water * 0.5 - terrain.Mountain * 0.5,
    Arctic: 0,
    Underdark: 0
  };
  const ranked = Object.entries(scores)
    .map(([climate, score]) => ({ climate, score: Math.max(0, Number(score) || 0) }))
    .sort((left, right) => right.score - left.score || left.climate.localeCompare(right.climate));
  const best = ranked[0] ?? { climate: "Temperate", score: 0 };
  const second = ranked[1] ?? { score: 0 };
  const margin = best.score - second.score;
  const confidenceLabel = best.score <= 0 ? "Low" : margin >= Math.max(2, total * 0.25) ? "High" : "Mixed";
  const dominantRows = getDominantTerrainRows(terrain);
  const terrainText = dominantRows.map((row) => `${row.label} ${row.value}`).join(", ");
  const reason = terrainText
    ? `${best.climate} best fits ${terrainText}.`
    : `${best.climate} best fits the current terrain profile.`;
  return {
    climate: normalizeGmScreenWeatherClimate(best.climate),
    confidenceLabel,
    reason,
    scores: Object.fromEntries(ranked.map((entry) => [entry.climate, Math.round(entry.score * 10) / 10]))
  };
}

function formatTerrainAnalysisPercent(value = 0) {
  const numeric = Math.max(0, Math.min(100, Number(value) || 0));
  if (numeric > 0 && numeric < 10) return `${numeric.toFixed(1)}%`;
  return `${Math.round(numeric)}%`;
}

function normalizeRgbComponent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

function rgbToHsl({ r = 0, g = 0, b = 0 } = {}) {
  const red = normalizeRgbComponent(r) / 255;
  const green = normalizeRgbComponent(g) / 255;
  const blue = normalizeRgbComponent(b) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue, saturation, lightness };
}

function isHueBetween(hue, min, max) {
  const value = Number(hue) % 360;
  if (min <= max) return value >= min && value <= max;
  return value >= min || value <= max;
}

export function classifyGmScreenWeatherTerrainPixel(pixel = {}) {
  const r = normalizeRgbComponent(pixel?.r);
  const g = normalizeRgbComponent(pixel?.g);
  const b = normalizeRgbComponent(pixel?.b);
  const a = normalizeRgbComponent(pixel?.a ?? 255);
  if (a < 24) return "";

  const { hue, saturation, lightness } = rgbToHsl({ r, g, b });
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if ((lightness > 0.96 && saturation < 0.16) || lightness < 0.04) return "";

  const isBlueWater =
    (isHueBetween(hue, 175, 250) && saturation >= 0.18 && b > r + 8 && b >= g * 0.72) ||
    (isHueBetween(hue, 165, 210) && saturation >= 0.22 && g > r + 10 && b > r + 10);
  if (isBlueWater) return "Water";

  if (isHueBetween(hue, 95, 165) && saturation >= 0.18 && g > r && g >= b * 0.75) {
    return lightness < 0.56 ? "Forest" : "Plains";
  }

  if (isHueBetween(hue, 58, 118) && saturation >= 0.14 && lightness < 0.52 && g >= b && r >= b * 0.75) {
    return "Swamp";
  }

  if (isHueBetween(hue, 28, 66) && saturation >= 0.16 && lightness >= 0.48 && r >= b + 16) {
    return "Desert";
  }

  if (isHueBetween(hue, 42, 95) && saturation >= 0.16 && lightness >= 0.36) {
    return "Plains";
  }

  if (isHueBetween(hue, 16, 44) && saturation >= 0.16 && lightness < 0.5 && r >= g * 0.85) {
    return "Mountain";
  }

  if (saturation <= 0.18 && lightness >= 0.18 && lightness <= 0.58 && chroma <= 44) {
    return "Mountain";
  }

  if (saturation <= 0.2 && lightness > 0.58 && lightness < 0.92 && chroma <= 55) {
    return "Urban";
  }

  if (isHueBetween(hue, 24, 70) && saturation >= 0.12 && lightness >= 0.34 && r >= b + 8) {
    return lightness > 0.58 ? "Desert" : "Plains";
  }

  return "";
}

function buildEmptyTerrainCounts() {
  return normalizeGmScreenWeatherTerrainCounts({});
}

export function normalizeGmScreenWeatherTerrainImageAnalysis(analysis = {}) {
  const width = Math.max(0, Math.floor(Number(analysis?.width ?? 0) || 0));
  const height = Math.max(0, Math.floor(Number(analysis?.height ?? 0) || 0));
  const sampledPixels = Math.max(0, Math.floor(Number(analysis?.sampledPixels ?? 0) || 0));
  const ignoredPixels = Math.max(0, Math.floor(Number(analysis?.ignoredPixels ?? 0) || 0));
  const coastPixels = Math.max(0, Math.floor(Number(analysis?.coastPixels ?? 0) || 0));
  const totalPixels = Math.max(width * height, sampledPixels + ignoredPixels);
  const terrainCounts = normalizeTerrainCounts(analysis?.terrainCounts);
  const pixelCounts = buildEmptyTerrainCounts();
  for (const key of Object.keys(pixelCounts)) {
    pixelCounts[key] = Math.max(0, Math.floor(Number(analysis?.pixelCounts?.[key] ?? 0) || 0));
  }
  if (coastPixels > 0 && pixelCounts.Coast <= 0) pixelCounts.Coast = coastPixels;

  const recognizedPercent = totalPixels > 0 ? (sampledPixels / totalPixels) * 100 : 0;
  const ignoredPercent = totalPixels > 0 ? (ignoredPixels / totalPixels) * 100 : 0;
  const confidenceLabel = recognizedPercent >= 70 ? "High" : recognizedPercent >= 35 ? "Mixed" : "Low";
  const terrainSummary = formatGmScreenWeatherTerrainSummary(terrainCounts);
  const terrainRows = GMSCREEN_WEATHER_TERRAIN_ROWS.map((row) => {
    const pixelCount = Number(pixelCounts[row.key] ?? 0);
    const percent = sampledPixels > 0 ? (pixelCount / sampledPixels) * 100 : 0;
    const value = Number(terrainCounts[row.key] ?? 0);
    return {
      ...row,
      value,
      pixelCount,
      percent,
      percentLabel: formatTerrainAnalysisPercent(percent),
      active: value > 0 || pixelCount > 0
    };
  });
  const summary =
    sampledPixels > 0
      ? `${terrainSummary} - ${formatTerrainAnalysisPercent(recognizedPercent)} recognized (${width}x${height} sample)`
      : "No terrain image analysis.";

  return {
    width,
    height,
    sampledPixels,
    ignoredPixels,
    coastPixels,
    totalPixels,
    recognizedPercent,
    recognizedPercentLabel: formatTerrainAnalysisPercent(recognizedPercent),
    ignoredPercent,
    ignoredPercentLabel: formatTerrainAnalysisPercent(ignoredPercent),
    confidenceLabel,
    pixelCounts,
    terrainCounts,
    terrainRows,
    terrainSummary,
    summary,
    hasAnalysis: sampledPixels > 0
  };
}

function normalizeTerrainAnalysisCounts(pixelCounts = {}, sampledPixels = 0, { maxBucketValue = 20 } = {}) {
  const normalized = buildEmptyTerrainCounts();
  const scores = buildEmptyTerrainCounts();
  for (const key of Object.keys(scores)) {
    scores[key] = Math.max(0, Number(pixelCounts?.[key] ?? 0) || 0);
  }
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore <= 0) return normalized;

  const activeThreshold = Math.max(2, Math.floor(Math.max(0, Number(sampledPixels) || 0) * 0.0025));
  const maxValue = Math.max(1, Math.min(20, Math.floor(Number(maxBucketValue) || 20)));
  for (const key of Object.keys(normalized)) {
    const score = scores[key];
    if (score < activeThreshold) continue;
    normalized[key] = Math.max(1, Math.min(maxValue, Math.round((score / maxScore) * maxValue)));
  }
  return normalized;
}

function getTerrainLabelAt(labels, width, x, y) {
  if (x < 0 || y < 0 || x >= width) return "";
  return labels[y * width + x] ?? "";
}

function countCoastPixels(labels, width, height) {
  let coastPixels = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const label = getTerrainLabelAt(labels, width, x, y);
      if (!label || label === "Water") continue;
      let touchesWater = false;
      for (let oy = -1; oy <= 1 && !touchesWater; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue;
          if (getTerrainLabelAt(labels, width, x + ox, y + oy) === "Water") {
            touchesWater = true;
            break;
          }
        }
      }
      if (touchesWater) coastPixels += 1;
    }
  }
  return coastPixels;
}

export function analyzeGmScreenWeatherTerrainImageData(imageData = {}, options = {}) {
  const width = Math.max(0, Math.floor(Number(imageData?.width ?? options?.width ?? 0) || 0));
  const height = Math.max(0, Math.floor(Number(imageData?.height ?? options?.height ?? 0) || 0));
  const data = imageData?.data ?? options?.data ?? [];
  const pixelCount = width * height;
  const pixelCounts = buildEmptyTerrainCounts();
  const labels = new Array(pixelCount).fill("");
  let sampledPixels = 0;
  let ignoredPixels = 0;

  if (!width || !height || !data || Number(data.length ?? 0) < pixelCount * 4) {
    return normalizeGmScreenWeatherTerrainImageAnalysis({
      width,
      height,
      sampledPixels,
      ignoredPixels,
      coastPixels: 0,
      pixelCounts,
      terrainCounts: buildEmptyTerrainCounts(),
      terrainSummary: formatGmScreenWeatherTerrainSummary({})
    });
  }

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const label = classifyGmScreenWeatherTerrainPixel({
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
      a: data[offset + 3]
    });
    if (!label) {
      ignoredPixels += 1;
      continue;
    }
    labels[index] = label;
    pixelCounts[label] = Number(pixelCounts[label] ?? 0) + 1;
    sampledPixels += 1;
  }

  const coastPixels = countCoastPixels(labels, width, height);
  const scores = {
    ...pixelCounts,
    Coast: Math.max(Number(pixelCounts.Coast ?? 0), coastPixels * 4)
  };
  const terrainCounts = normalizeTerrainAnalysisCounts(scores, sampledPixels, options);
  return normalizeGmScreenWeatherTerrainImageAnalysis({
    width,
    height,
    sampledPixels,
    ignoredPixels,
    coastPixels,
    pixelCounts: {
      ...pixelCounts,
      Coast: coastPixels
    },
    terrainCounts,
    terrainSummary: formatGmScreenWeatherTerrainSummary(terrainCounts)
  });
}

function hashStringToUint32(value) {
  let hash = 2166136261;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createGmScreenWeatherSeededRandom(seed = "") {
  let state = hashStringToUint32(seed || "party-operations-weather") || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeGmScreenWeatherClimate(value = "Temperate") {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return GMSCREEN_WEATHER_CLIMATES.find((entry) => entry.toLowerCase() === text) ?? "Temperate";
}

export function normalizeGmScreenWeatherSeason(value = "Spring") {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  return GMSCREEN_WEATHER_SEASONS.find((entry) => entry.toLowerCase() === text) ?? "Spring";
}

function normalizeMoonPhaseLabel(value = "") {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text) return "";
  if (text.includes("new")) return "New Moon";
  if (text.includes("full")) return "Full Moon";
  if (text.includes("first") || text.includes("waxing half")) return "First Quarter";
  if (text.includes("third") || text.includes("last") || text.includes("waning half")) return "Last Quarter";
  if (text.includes("waxing") && text.includes("crescent")) return "Waxing Crescent";
  if (text.includes("waxing") && text.includes("gibbous")) return "Waxing Gibbous";
  if (text.includes("waning") && text.includes("gibbous")) return "Waning Gibbous";
  if (text.includes("waning") && text.includes("crescent")) return "Waning Crescent";
  if (text.includes("crescent")) return "Crescent Moon";
  if (text.includes("gibbous")) return "Gibbous Moon";
  if (text.includes("quarter") || text.includes("half")) return "Quarter Moon";
  return "";
}

function lunarPhaseFromFraction(fraction = 0) {
  const normalized = (((Number(fraction) || 0) % 1) + 1) % 1;
  if (normalized < 0.0625 || normalized >= 0.9375) return "New Moon";
  if (normalized < 0.1875) return "Waxing Crescent";
  if (normalized < 0.3125) return "First Quarter";
  if (normalized < 0.4375) return "Waxing Gibbous";
  if (normalized < 0.5625) return "Full Moon";
  if (normalized < 0.6875) return "Waning Gibbous";
  if (normalized < 0.8125) return "Last Quarter";
  return "Waning Crescent";
}

function getLunarPhaseKey(label = "") {
  const normalized = normalizeMoonPhaseLabel(label);
  const text = normalized.toLowerCase();
  if (text.includes("new")) return "new";
  if (text.includes("full")) return "full";
  if (text.includes("first")) return "first-quarter";
  if (text.includes("last")) return "last-quarter";
  if (text.includes("waxing") && text.includes("crescent")) return "waxing-crescent";
  if (text.includes("waxing") && text.includes("gibbous")) return "waxing-gibbous";
  if (text.includes("waning") && text.includes("gibbous")) return "waning-gibbous";
  if (text.includes("waning") && text.includes("crescent")) return "waning-crescent";
  if (text.includes("quarter")) return "quarter";
  if (text.includes("gibbous")) return "gibbous";
  if (text.includes("crescent")) return "crescent";
  return "unknown";
}

function illuminationForLunarPhase(label = "") {
  const key = getLunarPhaseKey(label);
  if (key === "new") return 0;
  if (key === "full") return 100;
  if (key.includes("quarter")) return 50;
  if (key.includes("crescent")) return 25;
  if (key.includes("gibbous")) return 75;
  return 50;
}

function darknessAdjustmentForLunarPhase(label = "") {
  const key = getLunarPhaseKey(label);
  if (key === "new") return 0.16;
  if (key === "full") return -0.14;
  if (key.includes("crescent")) return 0.08;
  if (key.includes("gibbous")) return -0.06;
  return 0;
}

function describeLunarPhase(label = "") {
  const normalized = normalizeMoonPhaseLabel(label) || "Moon Phase";
  const key = getLunarPhaseKey(normalized);
  if (key === "new") return "New moon means the moon is dark; nights are at their darkest.";
  if (key === "full") return "Full moon means the moon is fully lit; open ground is much brighter at night.";
  if (key === "first-quarter") return "First quarter means the moon is half-lit and growing brighter each night.";
  if (key === "last-quarter") return "Last quarter means the moon is half-lit and fading darker each night.";
  if (key === "waxing-crescent") return "Waxing crescent means a thin moon is growing brighter after sunset.";
  if (key === "waning-crescent") return "Waning crescent means a thin moon is fading toward a dark new moon.";
  if (key === "waxing-gibbous") return "Waxing gibbous means a mostly lit moon is building toward full moon.";
  if (key === "waning-gibbous") return "Waning gibbous means a mostly lit moon is fading after full moon.";
  if (key.includes("quarter")) return "Quarter moon means the moon is roughly half-lit.";
  if (key.includes("crescent")) return "Crescent moon means only a small slice of the moon is lit.";
  if (key.includes("gibbous")) return "Gibbous moon means most of the moon is lit.";
  return `${normalized} changes night brightness and coastal water behavior.`;
}

function describeLunarIllumination(percent = 50) {
  const value = clampInteger(percent, 0, 100, 50);
  if (value <= 5) return "The moon gives almost no useful light.";
  if (value < 30) return "Only a small slice is lit, so nights stay quite dark.";
  if (value < 45) return "Less than half is lit, giving weak night light.";
  if (value <= 60) return "About half the moon is lit, giving mixed shadows and partial night light.";
  if (value < 80) return "Most of the moon is lit, so clear nights are noticeably brighter.";
  if (value < 95) return "Nearly the whole moon is lit, so clear nights are bright.";
  return "The moon is essentially full, so clear nights are at their brightest.";
}

function describeLunarTide(phaseKey = "") {
  if (phaseKey === "new" || phaseKey === "full") {
    return "Spring tides mean larger high and low tide swings; coasts, marshes, and fords are more volatile.";
  }
  if (String(phaseKey ?? "").includes("quarter")) {
    return "Neap tides mean smaller tide swings; coastal water is steadier than it is near a new or full moon.";
  }
  return "Ordinary tides mean no special lunar tide pressure today.";
}

function collectMoonCandidates(value, candidates = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return candidates;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) collectMoonCandidates(entry, candidates, seen);
    return candidates;
  }

  const hasMoonShape = [
    "phase",
    "phaseName",
    "phaseLabel",
    "currentPhase",
    "moonPhase",
    "cycleDay",
    "phaseIndex",
    "illumination"
  ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
  if (hasMoonShape) candidates.push(value);

  for (const key of ["moon", "moons", "moonPhase", "moonPhases", "lunar", "lunarCycle", "lunarCycles"]) {
    collectMoonCandidates(value[key], candidates, seen);
  }
  collectMoonCandidates(value.display?.moon, candidates, seen);
  collectMoonCandidates(value.display?.moons, candidates, seen);
  return candidates;
}

function getNestedNumber(candidates = []) {
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function normalizeMoonCandidate(candidate = {}, fallbackIndex = 0) {
  const phaseValue =
    candidate?.phase?.name ??
    candidate?.phase?.label ??
    candidate?.currentPhase?.name ??
    candidate?.currentPhase?.label ??
    candidate?.moonPhase?.name ??
    candidate?.moonPhase?.label ??
    candidate?.phaseName ??
    candidate?.phaseLabel ??
    candidate?.phase ??
    candidate?.moonPhase;
  const rawPhaseLabel =
    phaseValue && typeof phaseValue === "object"
      ? String(phaseValue?.name ?? phaseValue?.label ?? "")
      : String(phaseValue ?? "");
  let phaseLabel = normalizeMoonPhaseLabel(rawPhaseLabel);
  const phaseCount = Math.max(
    1,
    Math.floor(
      getNestedNumber([
        candidate?.phaseCount,
        candidate?.phases?.length,
        candidate?.cycleLength,
        candidate?.lunarCycleLength,
        candidate?.moonPhase?.phaseCount
      ]) ?? 8
    )
  );
  const phaseIndex = getNestedNumber([
    candidate?.phaseIndex,
    candidate?.phase?.index,
    candidate?.currentPhase?.index,
    candidate?.moonPhase?.index,
    candidate?.cycleDay
  ]);
  if (!phaseLabel && phaseIndex !== null) phaseLabel = lunarPhaseFromFraction(phaseIndex / phaseCount);
  if (!phaseLabel && typeof phaseValue === "number") phaseLabel = lunarPhaseFromFraction(Number(phaseValue));
  if (!phaseLabel) phaseLabel = lunarPhaseFromFraction(fallbackIndex / Math.max(1, phaseCount));

  let illumination = getNestedNumber([
    candidate?.illuminationPercent,
    candidate?.illumination,
    candidate?.phase?.illuminationPercent,
    candidate?.phase?.illumination,
    candidate?.currentPhase?.illumination
  ]);
  if (illumination !== null && illumination <= 1) illumination *= 100;
  if (illumination === null) illumination = illuminationForLunarPhase(phaseLabel);
  const name = String(candidate?.name ?? candidate?.label ?? candidate?.moon?.name ?? "").trim();
  return {
    name,
    phaseLabel,
    phaseKey: getLunarPhaseKey(phaseLabel),
    phaseIndex: phaseIndex === null ? fallbackIndex : Math.max(0, Math.floor(phaseIndex)),
    phaseCount,
    illuminationPercent: clampInteger(illumination, 0, 100, illuminationForLunarPhase(phaseLabel))
  };
}

function buildFallbackMoonCandidate({ timestamp = null, secondsPerDay = 86400, dayNumber = 1 } = {}) {
  const daySeconds = Math.max(1, Number(secondsPerDay) || 86400);
  const timestampDay =
    timestamp !== null && Number.isFinite(Number(timestamp)) ? Math.floor(Number(timestamp) / daySeconds) : null;
  const day = timestampDay ?? Math.max(0, Math.floor(Number(dayNumber) || 1) - 1);
  const cycleLength = 29.53;
  const phaseFraction = ((day % cycleLength) + cycleLength) / cycleLength;
  const phaseLabel = lunarPhaseFromFraction(phaseFraction);
  return {
    name: "",
    phaseLabel,
    phaseIndex: Math.floor(phaseFraction * 8),
    phaseCount: 8,
    illuminationPercent: illuminationForLunarPhase(phaseLabel)
  };
}

export function resolveGmScreenLunarContext({
  date = null,
  timestamp = null,
  secondsPerDay = 86400,
  dayNumber = 1
} = {}) {
  const calendarMoons = collectMoonCandidates(date).map((candidate, index) => normalizeMoonCandidate(candidate, index));
  const moons = calendarMoons.length
    ? calendarMoons
    : [normalizeMoonCandidate(buildFallbackMoonCandidate({ timestamp, secondsPerDay, dayNumber }))];
  const primary =
    moons.find((moon) => moon.phaseKey === "full" || moon.phaseKey === "new") ??
    moons.find((moon) => moon.phaseKey.includes("quarter")) ??
    moons[0];
  const phaseLabel = primary?.phaseLabel || "Moon Phase";
  const phaseKey = getLunarPhaseKey(phaseLabel);
  const isSpringTide = phaseKey === "full" || phaseKey === "new";
  const isQuarter = phaseKey.includes("quarter");
  const tideLabel = isSpringTide ? "Spring tides" : isQuarter ? "Neap tides" : "Ordinary tides";
  const tideSummary = describeLunarTide(phaseKey);
  const illuminationPercent = clampInteger(primary?.illuminationPercent, 0, 100, illuminationForLunarPhase(phaseLabel));
  const phaseMeaning = describeLunarPhase(phaseLabel);
  const illuminationMeaning = describeLunarIllumination(illuminationPercent);
  const moonName = String(primary?.name ?? "").trim();
  const summary = `${moonName ? `${moonName}: ` : ""}${phaseLabel}`;
  const source = calendarMoons.length ? "Simple Calendar" : "Estimated";
  const plainSummary = `${summary}. ${illuminationMeaning}`;
  const significance =
    phaseKey === "new"
      ? "Use darker nights, easier hiding, and more dangerous night watches."
      : phaseKey === "full"
        ? "Use brighter nights, easier long views, and more visible exposed movement."
        : isQuarter
          ? "Use half-lit nights and steadier coastal water."
          : "Use modest moonlight changes unless the scene happens at night or near water.";
  return {
    source,
    summary,
    plainSummary,
    phaseLabel,
    phaseKey,
    phaseMeaning,
    tideLabel,
    tideSummary,
    significance,
    significanceLabel: phaseKey === "full" || phaseKey === "new" || isQuarter ? "Significant" : "Minor",
    illuminationPercent,
    illuminationMeaning,
    darknessAdjustment: darknessAdjustmentForLunarPhase(phaseLabel),
    moons
  };
}

function buildGmScreenLunarWeatherImpact(lunarContext = {}, terrainCounts = {}) {
  const lunar =
    lunarContext && typeof lunarContext === "object" && lunarContext.phaseKey
      ? lunarContext
      : resolveGmScreenLunarContext({});
  const terrain = normalizeTerrainCounts(terrainCounts);
  const waterWeight = Number(terrain.Water ?? 0) + Number(terrain.Coast ?? 0) + Number(terrain.Swamp ?? 0);
  const hazardFlags = [];
  const travelNotes = [];
  const encounterNotes = [];
  if (lunar.phaseKey === "new") {
    hazardFlags.push("Dark Moon");
    travelNotes.push("new moon darkness makes watches, fords, and landmarks harder to read");
    encounterNotes.push("stealth and hidden movement become more important after sunset");
  } else if (lunar.phaseKey === "full") {
    hazardFlags.push("Bright Moonlight");
    travelNotes.push("full moonlight makes exposed night movement easier to see");
    encounterNotes.push("exposed movement is easier to spot under moonlight");
  }
  if ((lunar.phaseKey === "new" || lunar.phaseKey === "full") && waterWeight > 0) {
    hazardFlags.push("Spring Tides");
    travelNotes.push("spring tides raise the swing between high and low water");
  } else if (lunar.phaseKey.includes("quarter") && waterWeight > 0) {
    travelNotes.push("neap tides keep coastal water swings smaller");
  }
  return {
    hazardFlags,
    travelNote: travelNotes.join("; "),
    encounterNote: encounterNotes.join("; ")
  };
}

export function resolveGmScreenSeasonForDayNumber(dayNumber = 1) {
  const safeDay = Math.max(1, Math.floor(Number(dayNumber) || 1));
  const dayOfYear = (safeDay - 1) % (DAYS_PER_SEASON * GMSCREEN_WEATHER_SEASONS.length);
  return GMSCREEN_WEATHER_SEASONS[Math.floor(dayOfYear / DAYS_PER_SEASON)] ?? "Spring";
}

export function resolveGmScreenSeasonFromCalendarDate(date = {}, fallbackDayNumber = 1) {
  const seasonCandidates = [
    date?.season?.name,
    date?.season?.label,
    date?.seasonName,
    date?.display?.seasonName,
    date?.display?.season
  ];
  for (const candidate of seasonCandidates) {
    const normalized = normalizeGmScreenWeatherSeason(candidate);
    if (String(candidate ?? "").trim() && normalized) return normalized;
  }

  const dayOfYearCandidates = [date?.dayOfYear, date?.dayOfYearIndex, date?.ordinalDay, date?.ordinalDayIndex];
  for (const candidate of dayOfYearCandidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      const oneBasedDay = numeric <= 0 ? 1 : Math.floor(numeric);
      return resolveGmScreenSeasonForDayNumber(oneBasedDay);
    }
  }

  const month = Number(date?.month);
  if (Number.isFinite(month)) {
    const normalizedMonth = ((Math.floor(month) % 12) + 12) % 12;
    return GMSCREEN_WEATHER_SEASONS[Math.floor(normalizedMonth / 3)] ?? "Spring";
  }

  return resolveGmScreenSeasonForDayNumber(fallbackDayNumber);
}

export function resolveGmScreenDayNumberFromCalendarDate(date = {}, fallbackTimestamp = 0, secondsPerDay = 86400) {
  const dayCandidates = [date?.dayOfYear, date?.dayOfYearIndex, date?.ordinalDay, date?.ordinalDayIndex];
  for (const candidate of dayCandidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) return Math.max(1, Math.floor(numeric <= 0 ? numeric + 1 : numeric));
  }

  const month = Number(date?.month);
  const day = Number(date?.day);
  if (Number.isFinite(month) && Number.isFinite(day)) {
    const monthIndex = Math.max(0, Math.floor(month));
    const dayIndex = Math.max(0, Math.floor(day));
    return monthIndex * 30 + dayIndex + 1;
  }

  const timestamp = Number(fallbackTimestamp);
  const daySeconds = Math.max(1, Number(secondsPerDay) || 86400);
  return Number.isFinite(timestamp) ? Math.max(1, Math.floor(timestamp / daySeconds) + 1) : 1;
}

export function resolveGmScreenHourFromCalendarDate(date = {}, fallbackTimestamp = 0, secondsPerDay = 86400) {
  const hour = Number(date?.hour ?? date?.hours);
  if (Number.isFinite(hour)) return clampInteger(hour, 0, HOURS_PER_DAY - 1, 12);

  const timestamp = Number(fallbackTimestamp);
  const daySeconds = Math.max(1, Number(secondsPerDay) || 86400);
  if (!Number.isFinite(timestamp)) return 12;
  const secondsIntoDay = ((Math.floor(timestamp) % daySeconds) + daySeconds) % daySeconds;
  return clampInteger((secondsIntoDay / daySeconds) * HOURS_PER_DAY, 0, HOURS_PER_DAY - 1, 12);
}

export function resolveGmScreenCalendarContext({
  api = null,
  timestamp = 0,
  secondsPerDay = 86400,
  date = null,
  dateLabel = "",
  dayKey = ""
} = {}) {
  let resolvedDate = date && typeof date === "object" ? date : null;
  if (!resolvedDate && typeof api?.timestampToDate === "function") {
    try {
      resolvedDate = api.timestampToDate(Number(timestamp) || 0);
    } catch {
      resolvedDate = null;
    }
  }
  const dayNumber = resolveGmScreenDayNumberFromCalendarDate(resolvedDate ?? {}, timestamp, secondsPerDay);
  return {
    dayNumber,
    dayKey: String(dayKey || `D${dayNumber}`),
    hourOfDay: resolveGmScreenHourFromCalendarDate(resolvedDate ?? {}, timestamp, secondsPerDay),
    season: resolveGmScreenSeasonFromCalendarDate(resolvedDate ?? {}, dayNumber),
    dateLabel: String(dateLabel || `Day ${dayNumber}`),
    hasCalendarDate: Boolean(resolvedDate)
  };
}

export function getGmScreenWeatherClimateOptions(selectedClimate = "Temperate") {
  const selected = normalizeGmScreenWeatherClimate(selectedClimate);
  return GMSCREEN_WEATHER_CLIMATES.map((climate) => ({
    value: climate,
    label: climate,
    selected: climate === selected
  }));
}

export function windSpeedForGmScreenWeather(wind = "") {
  const speeds = {
    Calm: 2,
    Breeze: 8,
    "Light Wind": 12,
    "Strong Wind": 20,
    "Hot Wind": 18,
    Gale: 32
  };
  return speeds[String(wind ?? "").trim()] ?? 10;
}

export function humidityForGmScreenWeather(condition = "", terrainCounts = {}) {
  const lowered = String(condition ?? "").toLowerCase();
  const terrain = normalizeTerrainCounts(terrainCounts);
  let humidity = 50;
  if (
    [
      "rain",
      "storm",
      "drizzle",
      "fog",
      "snow",
      "sleet",
      "blizzard",
      "humid",
      "monsoon",
      "typhoon",
      "thunder",
      "whiteout"
    ].some((keyword) => lowered.includes(keyword))
  ) {
    humidity += 25;
  }
  if (["overcast", "damp", "sulfur"].some((keyword) => lowered.includes(keyword))) humidity += 15;
  if (["hot", "dry", "dust", "heatwave", "scorch"].some((keyword) => lowered.includes(keyword))) humidity -= 20;
  humidity += Math.min(18, terrain.Water * 2);
  humidity += Math.min(10, terrain.Swamp * 2);
  humidity += Math.min(8, terrain.Coast * 2);
  humidity -= Math.min(18, terrain.Desert * 3);
  return clampInteger(humidity, 10, 100, 50);
}

function getGmScreenPrecipitationRange(condition = "", climate = "Temperate", season = "Spring") {
  const lowered = String(condition ?? "").toLowerCase();
  const normalizedClimate = normalizeGmScreenWeatherClimate(climate);
  const normalizedSeason = normalizeGmScreenWeatherSeason(season);
  const isTropicalWetSeason = normalizedClimate === "Tropical" && ["Spring", "Summer"].includes(normalizedSeason);

  if (lowered.includes("dust storm") || lowered.includes("scorching") || lowered.includes("heatwave")) {
    return { min: 0, max: 0, kind: "rain", systemLabel: "Dry high-pressure system" };
  }
  if (lowered.includes("typhoon")) {
    return { min: 80, max: 220, kind: "rain", systemLabel: "Tropical cyclone" };
  }
  if (lowered.includes("monsoon")) {
    return { min: 45, max: 160, kind: "rain", systemLabel: "Monsoon surge" };
  }
  if (lowered.includes("blizzard") || lowered.includes("whiteout")) {
    return { min: 12, max: 70, kind: "snow water equivalent", systemLabel: "Winter storm system" };
  }
  if (lowered.includes("snow") || lowered.includes("sleet")) {
    return { min: 3, max: 30, kind: "snow water equivalent", systemLabel: "Cold precipitation band" };
  }
  if (lowered.includes("heavy rain")) {
    return { min: 25, max: 95, kind: "rain", systemLabel: "Slow wet front" };
  }
  if (lowered.includes("storm") || lowered.includes("thunder")) {
    return { min: 12, max: isTropicalWetSeason ? 130 : 105, kind: "rain", systemLabel: "Unstable storm front" };
  }
  if (lowered.includes("drizzle")) {
    return { min: 0.2, max: 5, kind: "rain", systemLabel: "Low cloud and drizzle" };
  }
  if (lowered.includes("rain")) {
    return { min: 4, max: isTropicalWetSeason ? 55 : 35, kind: "rain", systemLabel: "Passing rain band" };
  }
  if (lowered.includes("fog") || lowered.includes("humid") || lowered.includes("overcast")) {
    return { min: 0, max: 2, kind: "rain", systemLabel: "Moist stable air" };
  }
  return { min: 0, max: 0, kind: "rain", systemLabel: "Dry or settled weather" };
}

function precipitationIntensityForAmount(amount = 0) {
  const value = Math.max(0, Number(amount) || 0);
  if (value <= 0) return "Dry";
  if (value < 1) return "Trace";
  if (value < 5) return "Light";
  if (value < 20) return "Moderate";
  if (value < 50) return "Heavy";
  if (value < 100) return "Very heavy";
  return "Torrential";
}

function precipitationImpactForAmount(amount = 0, kind = "rain") {
  const value = Math.max(0, Number(amount) || 0);
  const loweredKind = String(kind ?? "rain").toLowerCase();
  if (value <= 0) return "No measurable precipitation is expected.";
  if (value < 1) return "Only trace moisture is expected; it is mostly atmosphere and damp surfaces.";
  if (value < 5) return "Light precipitation dampens surfaces without changing the whole day.";
  if (value < 20) return "Moderate precipitation makes the day clearly wet.";
  if (value < 50)
    return loweredKind.includes("snow")
      ? "Heavy snow water content can build difficult snowpack."
      : "Heavy rain can fill ditches, soften trails, and raise small streams.";
  if (value < 100)
    return loweredKind.includes("snow")
      ? "Very heavy snow water content can close passes and bury tracks."
      : "Very heavy rain can flood low ground and make crossings dangerous.";
  return loweredKind.includes("snow")
    ? "Extreme snow water content can create whiteout-level accumulation and serious exposure risk."
    : "Torrential rain can produce flash flooding, washed roads, and fast-rising rivers.";
}

export function buildGmScreenPrecipitationProfile({
  condition = "",
  windSpeed = 10,
  terrainCounts = {},
  climate = "Temperate",
  season = "Spring",
  randomFn = null
} = {}) {
  const terrain = normalizeTerrainCounts(terrainCounts);
  const normalizedClimate = normalizeGmScreenWeatherClimate(climate);
  const normalizedSeason = normalizeGmScreenWeatherSeason(season);
  const range = getGmScreenPrecipitationRange(condition, normalizedClimate, normalizedSeason);
  const rawRandom = typeof randomFn === "function" ? Number(randomFn()) : 0.58;
  const randomValue = Number.isFinite(rawRandom) ? Math.max(0, Math.min(0.999, rawRandom)) : 0.58;
  let low = Math.max(0, Number(range.min) || 0);
  let high = Math.max(low, Number(range.max) || 0);

  if (high > 0) {
    const windMultiplier = 1 + Math.max(0, (Number(windSpeed) - 12) * 0.02);
    const moistureMultiplier = 1 + Math.min(0.9, terrain.Water * 0.05 + terrain.Swamp * 0.07 + terrain.Coast * 0.04);
    const desertMultiplier = 1 - Math.min(0.5, terrain.Desert * 0.08);
    const climateMultiplier =
      normalizedClimate === "Tropical" || normalizedClimate === "Swamp"
        ? 1.2
        : normalizedClimate === "Coastal"
          ? 1.1
          : normalizedClimate === "Arid"
            ? 0.6
            : 1;
    low *= windMultiplier * moistureMultiplier * desertMultiplier * climateMultiplier;
    high *= windMultiplier * moistureMultiplier * desertMultiplier * climateMultiplier;
    high += terrain.Water * 1.1 + terrain.Swamp * 1.8 + terrain.Coast * 0.7;
    low += terrain.Swamp > 0 ? 0.5 : 0;
  }

  const spread = Math.max(0, high - low);
  const amount = spread > 0 ? low + spread * Math.pow(randomValue, 1.35) : low;
  const amountMm = Math.round(Math.min(240, Math.max(0, amount)) * 10) / 10;
  const intensityLabel = precipitationIntensityForAmount(amountMm);
  const kind = String(range.kind ?? "rain");
  const amountLabel =
    amountMm <= 0
      ? "0 mm"
      : amountMm < 1
        ? `${amountMm} mm trace`
        : `${amountMm} mm ${kind.includes("snow") ? "water equivalent" : "rain"}`;
  const explanation = [
    `${range.systemLabel}: ${intensityLabel.toLowerCase()} ${kind.includes("snow") ? "snowfall" : "rainfall"} (${amountLabel}).`,
    precipitationImpactForAmount(amountMm, kind)
  ].join(" ");

  return {
    amountMm,
    intensityLabel,
    kind,
    amountLabel,
    systemLabel: range.systemLabel,
    explanation,
    summary: `${range.systemLabel}; ${intensityLabel.toLowerCase()} precipitation, ${amountLabel}`
  };
}

export function precipMmDayForGmScreenWeather(condition = "", windSpeed = 10, terrainCounts = {}, options = {}) {
  return buildGmScreenPrecipitationProfile({
    condition,
    windSpeed,
    terrainCounts,
    climate: options?.climate ?? "Temperate",
    season: options?.season ?? "Spring",
    randomFn: options?.randomFn ?? null
  }).amountMm;
}

export function formatGmScreenPrecipitationLabel(profile = {}) {
  const intensity = String(profile?.intensityLabel ?? precipitationIntensityForAmount(profile?.amountMm)).trim();
  const amountLabel = String(profile?.amountLabel ?? `${Number(profile?.amountMm ?? 0)} mm`).trim();
  return `${intensity} (${amountLabel})`;
}

export function visibilityForGmScreenWeather(condition = "", terrainCounts = {}) {
  const lowered = String(condition ?? "").toLowerCase();
  const terrain = normalizeTerrainCounts(terrainCounts);
  let visibility = "Good";
  if (["blizzard", "whiteout", "dust storm", "typhoon"].some((keyword) => lowered.includes(keyword))) {
    visibility = "Very Poor";
  } else if (
    ["fog", "heavy rain", "storm", "gale", "monsoon", "sleet", "thunder", "sulfur"].some((keyword) =>
      lowered.includes(keyword)
    )
  ) {
    visibility = "Poor";
  } else if (["snow", "drizzle", "rain", "overcast", "humid"].some((keyword) => lowered.includes(keyword))) {
    visibility = "Moderate";
  }
  if (terrain.Forest > 0 && visibility === "Good") visibility = "Moderate";
  return visibility;
}

export function travelImpactForGmScreenWeather(condition = "", wind = "", terrainCounts = {}) {
  const lowered = `${condition} ${wind}`.toLowerCase();
  const terrain = normalizeTerrainCounts(terrainCounts);
  let impact = "Normal travel conditions";
  if (["blizzard", "whiteout", "dust storm", "typhoon"].some((keyword) => lowered.includes(keyword))) {
    impact = "Travel speed -50%, navigation becomes difficult";
  } else if (
    ["storm", "heavy rain", "gale", "monsoon", "thunder", "sleet"].some((keyword) => lowered.includes(keyword))
  ) {
    impact = "Travel speed -25%, ranged attacks and perception suffer";
  } else if (lowered.includes("snow") || lowered.includes("fog")) {
    impact = "Travel speed -10%, sightline checks worsen";
  } else if (["heatwave", "hot", "scorching", "stifling"].some((keyword) => lowered.includes(keyword))) {
    impact = "Forced marches risk exhaustion";
  }

  if (terrain.Mountain > 0) impact += "; steep routes remain slower";
  else if (terrain.Swamp > 0) impact += "; ground stays unstable";
  else if (terrain.Plains > 0 && impact.includes("Normal")) impact += "; open ground favors faster travel";
  return impact;
}

export function encounterFlavorForGmScreenWeather(condition = "", activeTerrains = []) {
  const terrainSet = normalizeTerrainSet(activeTerrains);
  const lowered = String(condition ?? "").toLowerCase();
  const parts = [];
  if (lowered.includes("fog") || lowered.includes("overcast")) parts.push("stealth and ambushes become more plausible");
  if (lowered.includes("storm") || lowered.includes("gale") || lowered.includes("thunder")) {
    parts.push("encounters start under pressure and reduced coordination");
  }
  if (lowered.includes("clear")) parts.push("watchers spot movement at range");
  if (terrainSet.has("Forest")) parts.push("tree cover breaks lines of sight");
  if (terrainSet.has("Urban")) parts.push("streets and structures create chokepoints");
  if (terrainSet.has("Water") || terrainSet.has("Coast")) parts.push("water routes and crossings matter");
  return parts.join("; ") || "No special encounter pressure.";
}

export function hazardFlagsForGmScreenWeather(condition = "", windSpeed = 10, rainAmount = 0, visibility = "Good") {
  const lowered = String(condition ?? "").toLowerCase();
  const flags = [];
  if (Number(windSpeed) >= 28 || lowered.includes("gale")) flags.push("High Wind");
  if (
    !lowered.includes("dust storm") &&
    (Number(rainAmount) >= 20 || lowered.includes("storm") || lowered.includes("thunder"))
  ) {
    flags.push("Flood Risk");
  }
  if (Number(rainAmount) >= 100) flags.push("Torrential Rain");
  if (lowered.includes("dust storm")) flags.push("Sandstorm");
  if (lowered.includes("fog") || visibility === "Poor" || visibility === "Very Poor") flags.push("Low Visibility");
  if (lowered.includes("blizzard") || lowered.includes("whiteout")) flags.push("Whiteout");
  if (["heatwave", "scorching", "hot wind", "hot", "stifling"].some((keyword) => lowered.includes(keyword))) {
    flags.push("Heat Stress");
  }
  return flags;
}

export function weatherSeverityForGmScreenWeather(weatherType = "") {
  const lowered = String(weatherType ?? "").toLowerCase();
  if (
    ["blizzard", "whiteout", "typhoon", "monsoon", "dust storm", "storm"].some((keyword) => lowered.includes(keyword))
  ) {
    return 3;
  }
  if (["snow", "sleet", "fog", "heavy rain", "gale", "thunder"].some((keyword) => lowered.includes(keyword))) return 2;
  if (["drizzle", "rain", "humid", "hot", "cold"].some((keyword) => lowered.includes(keyword))) return 1;
  return 0;
}

export function terrainTemperatureAdjustmentForGmScreenWeather(terrainCounts = {}) {
  const terrain = normalizeTerrainCounts(terrainCounts);
  let adjustment = 0;
  adjustment -= Math.min(6, terrain.Mountain * 2);
  adjustment += Math.min(4, terrain.Desert * 2);
  adjustment += Math.min(2, terrain.Urban);
  if (terrain.Water > 0) adjustment += 1;
  if (terrain.Coast > 0) adjustment += 1;
  if (terrain.Forest > 0) adjustment -= 1;
  if (terrain.Swamp > 0) adjustment += 1;
  return adjustment;
}

export function weatherRangeAdjustmentForGmScreenWeather(condition = "", wind = "") {
  const lowered = `${condition} ${wind}`.toLowerCase();
  let adjustment = 0;
  if (["clear", "cold clear", "hot", "scorching"].some((keyword) => lowered.includes(keyword))) adjustment += 3;
  if (["overcast", "fog", "humid", "drizzle"].some((keyword) => lowered.includes(keyword))) adjustment -= 2;
  if (
    ["rain", "snow", "sleet", "storm", "thunder", "blizzard", "whiteout"].some((keyword) => lowered.includes(keyword))
  ) {
    adjustment -= 3;
  }
  if (lowered.includes("gale") || lowered.includes("strong wind")) adjustment -= 1;
  if (lowered.includes("calm")) adjustment += 1;
  return adjustment;
}

export function temperatureForGmScreenWeatherHour(dailyHigh = 20, dailyLow = 10, hourOfDay = 12) {
  const high = Number(dailyHigh);
  const low = Number(dailyLow);
  const hour = clampInteger(hourOfDay, 0, HOURS_PER_DAY - 1, 12);
  const meanTemp = (high + low) / 2;
  const amplitude = (high - low) / 2;
  const phase = ((hour - 9) / HOURS_PER_DAY) * 2 * Math.PI;
  return Math.round(meanTemp + amplitude * Math.sin(phase));
}

export function dailyHighLowForGmScreenWeather({
  climate = "Temperate",
  season = "Spring",
  condition = "Clear",
  wind = "Breeze",
  terrainCounts = {},
  baseTempC = 15,
  tempVariation = 0
} = {}) {
  const normalizedClimate = normalizeGmScreenWeatherClimate(climate);
  const normalizedSeason = normalizeGmScreenWeatherSeason(season);
  const meanTemp =
    Number(baseTempC) + terrainTemperatureAdjustmentForGmScreenWeather(terrainCounts) + (Number(tempVariation) || 0);
  const baseRange = (DAILY_RANGE_BY_CLIMATE[normalizedClimate] ?? 10) + (SEASONAL_RANGE_SHIFT[normalizedSeason] ?? 0);
  const dailyRange = Math.max(3, baseRange + weatherRangeAdjustmentForGmScreenWeather(condition, wind));
  const high = Math.round(meanTemp + dailyRange / 2);
  let low = Math.round(meanTemp - dailyRange / 2);
  if (low >= high) low = high - 2;
  return { dailyHighC: high, dailyLowC: low };
}

export function pickGmScreenWeatherEntry({
  climate = "Temperate",
  season = "Spring",
  seed = "",
  randomFn = null
} = {}) {
  const normalizedClimate = normalizeGmScreenWeatherClimate(climate);
  const normalizedSeason = normalizeGmScreenWeatherSeason(season);
  const rows = GMSCREEN_WEATHER_TABLE[normalizedClimate]?.[normalizedSeason] ?? GMSCREEN_WEATHER_TABLE.Temperate.Spring;
  const totalWeight = rows.reduce((total, row) => total + Math.max(1, Math.floor(Number(row.weight) || 1)), 0);
  const random = typeof randomFn === "function" ? randomFn : createGmScreenWeatherSeededRandom(seed);
  let roll = random() * totalWeight;
  for (const row of rows) {
    roll -= Math.max(1, Math.floor(Number(row.weight) || 1));
    if (roll <= 0) return { ...row, climate: normalizedClimate, season: normalizedSeason };
  }
  return { ...rows[rows.length - 1], climate: normalizedClimate, season: normalizedSeason };
}

export function buildGmScreenWeatherRecord({
  climate = "Temperate",
  season = "Spring",
  dayNumber = 1,
  hourOfDay = 12,
  terrainCounts = {},
  activeTerrains = [],
  seed = "",
  randomFn = null,
  dayOffset = 0,
  entry = null,
  lunarContext = null
} = {}) {
  const normalizedClimate = normalizeGmScreenWeatherClimate(climate);
  const normalizedSeason = normalizeGmScreenWeatherSeason(season);
  const random = typeof randomFn === "function" ? randomFn : createGmScreenWeatherSeededRandom(seed);
  const pickedEntry =
    entry && typeof entry === "object"
      ? { ...entry, climate: normalizedClimate, season: normalizedSeason }
      : pickGmScreenWeatherEntry({
          climate: normalizedClimate,
          season: normalizedSeason,
          seed,
          randomFn: random
        });
  let tempVariation = Math.floor(random() * 7) - 3;
  if (dayOffset) tempVariation += Math.floor(random() * 5) - 2;
  const terrain = normalizeTerrainCounts(terrainCounts);
  const activeTerrainSet = new Set([
    ...getActiveGmScreenWeatherTerrains(terrain),
    ...normalizeTerrainSet(activeTerrains)
  ]);
  const { dailyHighC, dailyLowC } = dailyHighLowForGmScreenWeather({
    climate: normalizedClimate,
    season: normalizedSeason,
    condition: pickedEntry.condition,
    wind: pickedEntry.wind,
    terrainCounts: terrain,
    baseTempC: pickedEntry.baseTempC,
    tempVariation
  });
  const temperatureC = temperatureForGmScreenWeatherHour(dailyHighC, dailyLowC, hourOfDay);
  const windSpeed = windSpeedForGmScreenWeather(pickedEntry.wind);
  const humidity = humidityForGmScreenWeather(pickedEntry.condition, terrain);
  const precipitation = buildGmScreenPrecipitationProfile({
    condition: pickedEntry.condition,
    windSpeed,
    terrainCounts: terrain,
    climate: normalizedClimate,
    season: normalizedSeason,
    randomFn: random
  });
  const rainAmount = precipitation.amountMm;
  const visibility = visibilityForGmScreenWeather(pickedEntry.condition, terrain);
  const lunar =
    lunarContext && typeof lunarContext === "object" && lunarContext.phaseKey
      ? lunarContext
      : resolveGmScreenLunarContext({
          ...(lunarContext && typeof lunarContext === "object" ? lunarContext : {}),
          dayNumber
        });
  const lunarImpact = buildGmScreenLunarWeatherImpact(lunar, terrain);
  const travelImpact = [
    travelImpactForGmScreenWeather(pickedEntry.condition, pickedEntry.wind, terrain),
    lunarImpact.travelNote
  ]
    .filter(Boolean)
    .join("; ");
  const encounterImpact = [
    encounterFlavorForGmScreenWeather(pickedEntry.condition, activeTerrainSet),
    lunarImpact.encounterNote
  ]
    .filter(Boolean)
    .join("; ");
  const hazardFlags = Array.from(
    new Set([
      ...hazardFlagsForGmScreenWeather(pickedEntry.condition, windSpeed, rainAmount, visibility),
      ...lunarImpact.hazardFlags
    ])
  );

  return {
    source: "gmscreen",
    climate: normalizedClimate,
    season: normalizedSeason,
    dayNumber: Math.max(1, Math.floor(Number(dayNumber) || 1)),
    hourOfDay: clampInteger(hourOfDay, 0, HOURS_PER_DAY - 1, 12),
    weatherType: String(pickedEntry.condition ?? "Clear"),
    wind: String(pickedEntry.wind ?? "Breeze"),
    windSpeed,
    baseTempC: Number(pickedEntry.baseTempC ?? 15),
    tempVariation,
    dailyHighC,
    dailyLowC,
    temperatureC,
    visibility,
    travelImpact,
    encounterImpact,
    humidity,
    rainAmount: Math.round(rainAmount * 10) / 10,
    precipitation,
    precipitationLabel: formatGmScreenPrecipitationLabel(precipitation),
    precipitationIntensity: precipitation.intensityLabel,
    precipitationExplanation: precipitation.explanation,
    weatherSystemSummary: precipitation.summary,
    hazardFlags,
    severity: weatherSeverityForGmScreenWeather(pickedEntry.condition),
    terrainCounts: terrain,
    activeTerrains: Array.from(activeTerrainSet),
    terrainSummary: formatGmScreenWeatherTerrainSummary(terrain),
    lunar,
    lunarSummary: lunar.summary,
    lunarPlainSummary: lunar.plainSummary,
    lunarSignificance: lunar.significance,
    lunarTideLabel: lunar.tideLabel,
    lunarTideSummary: lunar.tideSummary,
    tableNote: String(pickedEntry.note ?? "")
  };
}

export function visibilityModifierForGmScreenWeatherRecord(record = {}) {
  const visibility = String(record?.visibility ?? "Good");
  let modifier = { Good: 1, Moderate: -1, Poor: -3, "Very Poor": -4 }[visibility] ?? 0;
  if (Number(record?.windSpeed ?? 0) >= 28) modifier -= 1;
  if (Array.isArray(record?.hazardFlags) && record.hazardFlags.includes("Whiteout")) modifier -= 1;
  return clampInteger(modifier, -5, 5, 0);
}

export function darknessForGmScreenWeatherRecord(record = {}) {
  const text = `${record?.weatherType ?? ""} ${record?.climate ?? ""}`.toLowerCase();
  let darkness = 0.1;
  if (text.includes("underdark")) darkness = 0.65;
  else if (["whiteout", "blizzard", "dust storm", "typhoon", "monsoon"].some((keyword) => text.includes(keyword)))
    darkness = 0.75;
  else if (["storm", "thunder", "gale"].some((keyword) => text.includes(keyword))) darkness = 0.65;
  else if (["rain", "snow", "sleet", "fog", "overcast", "drizzle", "humid"].some((keyword) => text.includes(keyword))) {
    darkness = 0.45;
  } else if (["cold", "damp", "sulfur"].some((keyword) => text.includes(keyword))) darkness = 0.35;
  const lunarAdjustment = Number(record?.lunar?.darknessAdjustment ?? 0) || 0;
  return clampNumber(darkness + lunarAdjustment, 0, 1, darkness);
}

export function buildGmScreenWeatherNote(record = {}, { dateLabel = "", dayKey = "" } = {}) {
  const hazards =
    Array.isArray(record?.hazardFlags) && record.hazardFlags.length > 0 ? record.hazardFlags.join(", ") : "None";
  const calendar = String(dateLabel || dayKey || `Day ${record?.dayNumber ?? 1}`);
  return [
    `${calendar}: ${record.weatherType} in ${record.climate} ${record.season}.`,
    `Temp ${record.temperatureC}C (H ${record.dailyHighC} / L ${record.dailyLowC}), wind ${record.wind} ${record.windSpeed} km/h.`,
    `Humidity ${record.humidity}%, precipitation ${record.precipitationLabel || `${record.rainAmount} mm`}, visibility ${record.visibility}, hazards ${hazards}.`,
    record.precipitationExplanation ? `System: ${record.precipitationExplanation}` : "",
    `Terrain: ${record.terrainSummary || formatGmScreenWeatherTerrainSummary(record.terrainCounts)}.`,
    record.lunarSummary
      ? `Moon: ${record.lunarPlainSummary || record.lunarSummary}. ${record.lunarTideSummary || ""} ${record.lunarSignificance || ""}`
      : "",
    `Encounter: ${record.encounterImpact}`,
    String(record.tableNote ?? "")
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function getNumericDetail(value, fallback = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

export function buildGmScreenWeatherSnapshotDetailLines(snapshot = {}) {
  const lines = [];
  const climate = String(snapshot?.climate ?? "").trim();
  const season = String(snapshot?.season ?? "").trim();
  if (climate || season) lines.push(`Climate: ${[climate, season].filter(Boolean).join(" ")}`);

  const temperatureC = getNumericDetail(snapshot?.temperatureC);
  const dailyHighC = getNumericDetail(snapshot?.dailyHighC);
  const dailyLowC = getNumericDetail(snapshot?.dailyLowC);
  if (temperatureC !== null) {
    const range =
      dailyHighC !== null || dailyLowC !== null ? ` (high ${dailyHighC ?? "-"} / low ${dailyLowC ?? "-"})` : "";
    lines.push(`Temperature: ${temperatureC}C${range}`);
  }

  const wind = String(snapshot?.wind ?? "").trim();
  const windSpeed = getNumericDetail(snapshot?.windSpeed);
  if (wind || windSpeed !== null)
    lines.push(`Wind: ${[wind, windSpeed !== null ? `${windSpeed} km/h` : ""].filter(Boolean).join(" ")}`);

  const humidity = getNumericDetail(snapshot?.humidity);
  const rainAmount = getNumericDetail(snapshot?.rainAmount);
  if (humidity !== null || rainAmount !== null) {
    const precipitationLabel = String(snapshot?.precipitationLabel ?? "").trim();
    lines.push(
      `Moisture: ${humidity !== null ? `${humidity}% humidity` : "humidity unknown"}; ${precipitationLabel || (rainAmount !== null ? `${rainAmount} mm precipitation` : "precipitation unknown")}`
    );
  }

  const precipitationExplanation = String(snapshot?.precipitationExplanation ?? "").trim();
  if (precipitationExplanation) lines.push(`Weather System: ${precipitationExplanation}`);

  const visibility = String(snapshot?.visibility ?? "").trim();
  const visibilityModifier = getNumericDetail(snapshot?.visibilityModifier);
  if (visibility || visibilityModifier !== null) {
    const modifierLabel =
      visibilityModifier !== null
        ? `modifier ${visibilityModifier > 0 ? `+${visibilityModifier}` : visibilityModifier}`
        : "";
    lines.push(`Visibility: ${[visibility, modifierLabel].filter(Boolean).join(" - ")}`);
  }

  const terrain = String(snapshot?.terrainSummary ?? "").trim();
  if (terrain) lines.push(`Terrain: ${terrain}`);

  const lunarSummary = String(snapshot?.lunarSummary ?? "").trim();
  if (lunarSummary) {
    const lunarParts = [
      String(snapshot?.lunarPlainSummary ?? "").trim() || lunarSummary,
      String(snapshot?.lunarTideSummary ?? "").trim() || String(snapshot?.lunarTideLabel ?? "").trim()
    ].filter(Boolean);
    lines.push(`Moon: ${lunarParts.join(" - ")}`);
  }

  const lunarSignificance = String(snapshot?.lunarSignificance ?? "").trim();
  if (lunarSignificance) lines.push(`Lunar Significance: ${lunarSignificance}`);

  const encounterImpact = String(snapshot?.encounterImpact ?? "").trim();
  if (encounterImpact) lines.push(`Encounter: ${encounterImpact}`);

  const hazards = Array.isArray(snapshot?.hazards)
    ? snapshot.hazards.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : Array.isArray(snapshot?.hazardFlags)
      ? snapshot.hazardFlags.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : [];
  lines.push(`Hazards: ${hazards.length > 0 ? hazards.join(", ") : "None"}`);

  return lines.filter(Boolean);
}

export function buildGmScreenWeatherPreset(record = {}, { dayKey = "", dateLabel = "" } = {}) {
  const condition = String(record?.weatherType ?? "Clear").trim() || "Clear";
  const climate = normalizeGmScreenWeatherClimate(record?.climate);
  const season = normalizeGmScreenWeatherSeason(record?.season);
  const key = `gmscreen-${slugifyWeatherKey(climate)}-${slugifyWeatherKey(season)}-${slugifyWeatherKey(condition)}`;
  return {
    key,
    label: `${condition} (${climate} ${season})`,
    weatherId: key,
    darkness: darknessForGmScreenWeatherRecord(record),
    visibilityModifier: visibilityModifierForGmScreenWeatherRecord(record),
    note: buildGmScreenWeatherNote(record, { dayKey, dateLabel }),
    daeChanges: [],
    isBuiltIn: true,
    source: "gmscreen",
    climate,
    season,
    dayNumber: Math.max(1, Math.floor(Number(record?.dayNumber) || 1)),
    calendarDayKey: String(dayKey ?? ""),
    calendarDateLabel: String(dateLabel ?? ""),
    record: { ...record }
  };
}

export function buildGmScreenWeatherSnapshot(
  preset = {},
  { id = "", loggedAt = Date.now(), loggedBy = "GM", calendarDayKey = "", calendarDateLabel = "" } = {}
) {
  const record = preset?.record && typeof preset.record === "object" ? preset.record : {};
  return {
    id: String(id || `gmscreen-${hashStringToUint32(`${preset?.key ?? ""}|${loggedAt}`)}`),
    label: String(preset?.label ?? "Calendar Weather").trim() || "Calendar Weather",
    weatherId: String(preset?.weatherId ?? preset?.key ?? "").trim(),
    darkness: clampNumber(preset?.darkness, 0, 1, 0),
    visibilityModifier: clampInteger(preset?.visibilityModifier, -5, 5, 0),
    note: String(preset?.note ?? ""),
    loggedAt: Number.isFinite(Number(loggedAt)) ? Number(loggedAt) : Date.now(),
    loggedBy: String(loggedBy ?? "GM"),
    source: "gmscreen",
    calendarDayKey: String(calendarDayKey || preset?.calendarDayKey || ""),
    calendarDateLabel: String(calendarDateLabel || preset?.calendarDateLabel || ""),
    climate: normalizeGmScreenWeatherClimate(preset?.climate ?? record?.climate),
    season: normalizeGmScreenWeatherSeason(preset?.season ?? record?.season),
    temperatureC: Number(record?.temperatureC ?? 0),
    dailyHighC: Number(record?.dailyHighC ?? 0),
    dailyLowC: Number(record?.dailyLowC ?? 0),
    wind: String(record?.wind ?? ""),
    windSpeed: Number(record?.windSpeed ?? 0),
    humidity: Number(record?.humidity ?? 0),
    rainAmount: Number(record?.rainAmount ?? 0),
    precipitationLabel: String(record?.precipitationLabel ?? ""),
    precipitationIntensity: String(record?.precipitationIntensity ?? ""),
    precipitationExplanation: String(record?.precipitationExplanation ?? ""),
    weatherSystemSummary: String(record?.weatherSystemSummary ?? ""),
    visibility: String(record?.visibility ?? ""),
    hazards: Array.isArray(record?.hazardFlags) ? [...record.hazardFlags] : [],
    terrainSummary: String(record?.terrainSummary ?? ""),
    lunarSummary: String(record?.lunarSummary ?? record?.lunar?.summary ?? ""),
    lunarPlainSummary: String(record?.lunarPlainSummary ?? record?.lunar?.plainSummary ?? ""),
    lunarSignificance: String(record?.lunarSignificance ?? record?.lunar?.significance ?? ""),
    lunarTideLabel: String(record?.lunarTideLabel ?? record?.lunar?.tideLabel ?? ""),
    lunarTideSummary: String(record?.lunarTideSummary ?? record?.lunar?.tideSummary ?? ""),
    lunarPhaseMeaning: String(record?.lunar?.phaseMeaning ?? ""),
    lunarIlluminationMeaning: String(record?.lunar?.illuminationMeaning ?? ""),
    lunarIlluminationPercent: Number(record?.lunar?.illuminationPercent ?? 0),
    lunarSource: String(record?.lunar?.source ?? ""),
    travelImpact: String(record?.travelImpact ?? ""),
    encounterImpact: String(record?.encounterImpact ?? "")
  };
}
