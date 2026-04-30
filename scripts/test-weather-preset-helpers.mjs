/**
 * Regression tests for scripts/features/weather-preset-helpers.js
 * Run with: node scripts/test-weather-preset-helpers.mjs
 */

import { createWeatherPresetHelpers } from "./features/weather-preset-helpers.js";
import {
  GMSCREEN_WEATHER_CLIMATES,
  analyzeGmScreenWeatherTerrainImageData,
  buildGmScreenWeatherPreset,
  buildGmScreenWeatherRecord,
  buildGmScreenWeatherSnapshot,
  buildGmScreenWeatherSnapshotDetailLines,
  classifyGmScreenWeatherTerrainPixel,
  getGmScreenWeatherTerrainRows,
  normalizeGmScreenWeatherTerrainCounts,
  normalizeGmScreenWeatherTerrainImageAnalysis,
  pickGmScreenWeatherEntry,
  recommendGmScreenWeatherClimateForTerrain,
  resolveGmScreenCalendarContext,
  resolveGmScreenSeasonForDayNumber,
  resolveGmScreenSeasonFromCalendarDate,
  visibilityModifierForGmScreenWeatherRecord
} from "./features/gmscreen-weather-model.js";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${label}`);
}

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

const MOCK_CONST = {
  ACTIVE_EFFECT_MODES: { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 }
};

let idCounter = 0;
const mockRandomId = () => `id-${++idCounter}`;

const {
  WEATHER_PRESET_DEFINITIONS,
  buildWeatherSelectionCatalog,
  computeWeatherVisibilityModifier,
  describeWeatherDaeChanges,
  getBuiltInWeatherPresets,
  getWeatherEffectSummary,
  getWeatherPresetCatalog,
  normalizeWeatherDaeChange,
  normalizeWeatherPreset,
  resolveWeatherFxEffectIdForPreset
} = createWeatherPresetHelpers({
  constRef: MOCK_CONST,
  randomIdFn: mockRandomId,
  getConfigWeatherEffects: () => ({
    "weather-rain": { label: "Rain" },
    "weather-storm": { label: "Thunder Storm" },
    "weather-snow": { label: "Snowfall" }
  })
});

assert(Array.isArray(WEATHER_PRESET_DEFINITIONS), "WEATHER_PRESET_DEFINITIONS should be an array");
assertEq(WEATHER_PRESET_DEFINITIONS.length, 6, "WEATHER_PRESET_DEFINITIONS should contain 6 presets");
for (const id of ["clear", "cloudy", "rainy", "stormy", "snowy", "hail"]) {
  assert(
    WEATHER_PRESET_DEFINITIONS.some((preset) => preset.id === id),
    `Expected built-in preset ${id}.`
  );
}

const validChange = normalizeWeatherDaeChange({
  id: "x1",
  key: "system.speed",
  mode: 2,
  value: "10",
  label: "Speed Up"
});
assertEq(validChange.id, "x1", "normalizeWeatherDaeChange should preserve id");
assertEq(validChange.key, "system.speed", "normalizeWeatherDaeChange should preserve key");
assertEq(validChange.mode, 2, "normalizeWeatherDaeChange should preserve valid mode");
assertEq(validChange.value, "10", "normalizeWeatherDaeChange should preserve value");
assertEq(validChange.label, "Speed Up", "normalizeWeatherDaeChange should preserve label");

const badMode = normalizeWeatherDaeChange({ mode: 999, key: "attr", value: "1" });
assertEq(badMode.mode, 2, "normalizeWeatherDaeChange should clamp invalid mode to ADD");

const emptyChange = normalizeWeatherDaeChange({});
assert(
  typeof emptyChange.id === "string" && emptyChange.id.length > 0,
  "normalizeWeatherDaeChange should generate an id for empty input"
);
assertEq(emptyChange.label, "Weather Effect", "normalizeWeatherDaeChange should default label");

const customPreset = normalizeWeatherPreset(
  { id: "my-preset", label: "Ash Cloud", visibilityModifier: -2, darkness: 0.6, isBuiltIn: false },
  {}
);
assertEq(customPreset.id, "my-preset", "normalizeWeatherPreset should preserve id");
assertEq(customPreset.label, "Ash Cloud", "normalizeWeatherPreset should preserve label");
assertEq(customPreset.visibilityModifier, -2, "normalizeWeatherPreset should preserve visibilityModifier");
assertEq(customPreset.darkness, 0.6, "normalizeWeatherPreset should preserve darkness");
assertEq(customPreset.isBuiltIn, false, "normalizeWeatherPreset should preserve isBuiltIn");
assertEq(customPreset.daeChanges, [], "normalizeWeatherPreset should default daeChanges");

const clampedPreset = normalizeWeatherPreset({ visibilityModifier: -99, darkness: 5 });
assertEq(clampedPreset.visibilityModifier, -5, "normalizeWeatherPreset should clamp visibilityModifier");
assertEq(clampedPreset.darkness, 1, "normalizeWeatherPreset should clamp darkness");

const withDae = normalizeWeatherPreset({
  id: "dae-test",
  daeChanges: [
    { key: "speed", value: "5", mode: 2 },
    { key: "", value: "x" },
    { key: "attr", value: "" }
  ]
});
assertEq(withDae.daeChanges, [], "normalizeWeatherPreset should strip legacy weather daeChanges");

const builtIns = getBuiltInWeatherPresets();
assertEq(builtIns.length, 6, "getBuiltInWeatherPresets should return 6 presets");
assert(
  builtIns.every((preset) => preset.isBuiltIn === true),
  "getBuiltInWeatherPresets should mark every preset as built-in"
);
assert(
  builtIns.every((preset) => Array.isArray(preset.daeChanges) && preset.daeChanges.length === 0),
  "getBuiltInWeatherPresets should return empty daeChanges"
);
const clearPreset = builtIns.find((preset) => preset.id === "clear");
assert(clearPreset != null, "getBuiltInWeatherPresets should include clear");
assertEq(clearPreset?.visibilityModifier, 0, "clear should have neutral visibility");
assertEq(clearPreset?.darkness, 0.1, "clear should have low darkness");

const catalogEmpty = getWeatherPresetCatalog({});
assertEq(catalogEmpty.length, 6, "getWeatherPresetCatalog should return built-ins for empty state");

const catalogWithCustom = getWeatherPresetCatalog({
  customPresets: [
    {
      id: "ash",
      label: "Ash Cloud",
      visibilityModifier: -2,
      darkness: 0.5,
      daeChanges: [{ key: "flags.midi-qol.DR.all", mode: 2, value: "-1" }]
    }
  ]
});
assertEq(catalogWithCustom.length, 7, "getWeatherPresetCatalog should include custom presets");
assert(
  catalogWithCustom.some((preset) => preset.id === "ash"),
  "getWeatherPresetCatalog should include custom preset"
);
assertEq(
  catalogWithCustom.find((preset) => preset.id === "ash")?.daeChanges,
  [],
  "getWeatherPresetCatalog should not expose legacy custom weather daeChanges"
);

const dupeCatalog = getWeatherPresetCatalog({
  customPresets: [
    { id: "clear", label: "Duplicate Clear" },
    { id: "fog", label: "Fog" },
    { id: "fog", label: "Fog Duplicate" }
  ]
});
assertEq(dupeCatalog.length, 7, "getWeatherPresetCatalog should deduplicate preset ids");
assertEq(
  dupeCatalog.find((preset) => preset.id === "clear")?.isBuiltIn,
  true,
  "Built-in preset should win on duplicate id"
);

const selectionCatalog = buildWeatherSelectionCatalog({}, null);
assertEq(selectionCatalog.length, 6, "buildWeatherSelectionCatalog should return 6 entries without scene snapshot");
assert(
  selectionCatalog.every((entry) => typeof entry.key === "string" && entry.key.length > 0),
  "buildWeatherSelectionCatalog should populate keys"
);
assert(
  selectionCatalog.every((entry) => typeof entry.weatherId === "string"),
  "buildWeatherSelectionCatalog should populate weather ids"
);

const selectionWithLegacyDae = buildWeatherSelectionCatalog(
  {
    customPresets: [
      {
        id: "legacy-storm",
        label: "Legacy Storm",
        daeChanges: [{ key: "flags.midi-qol.DR.all", mode: 2, value: "-1" }]
      }
    ]
  },
  null
);
assertEq(
  selectionWithLegacyDae.find((entry) => entry.key === "legacy-storm")?.daeChanges,
  [],
  "buildWeatherSelectionCatalog should not carry weather daeChanges into runtime selections"
);

const selectionCatalogScene = buildWeatherSelectionCatalog({}, { darkness: 0.8 });
assert(
  selectionCatalogScene.every((entry) => entry.darkness === 0.8),
  "buildWeatherSelectionCatalog should apply scene darkness"
);

assertEq(
  computeWeatherVisibilityModifier({ label: "Clear", weatherId: "clear", darkness: 0.1 }),
  1,
  "clear low darkness should improve visibility"
);
assertEq(
  computeWeatherVisibilityModifier({ label: "Rain", weatherId: "rain", darkness: 0.3 }),
  -1,
  "rain should reduce visibility"
);
assertEq(
  computeWeatherVisibilityModifier({ label: "Heavy Storm", weatherId: "storm", darkness: 0.5 }),
  -3,
  "heavy storm should strongly reduce visibility"
);
assertEq(
  computeWeatherVisibilityModifier({ label: "Fog", weatherId: "fog", darkness: 0.8 }),
  -4,
  "fog plus darkness should heavily reduce visibility"
);
assertEq(computeWeatherVisibilityModifier({}), 1, "default clear/low-darkness case should improve visibility");

assertEq(
  getWeatherEffectSummary(0),
  "No perception modifier from weather.",
  "getWeatherEffectSummary should handle zero"
);
assertEq(
  getWeatherEffectSummary(2),
  "Perception checks gain +2.",
  "getWeatherEffectSummary should describe positive values"
);
assertEq(
  getWeatherEffectSummary(-3),
  "Perception checks suffer -3.",
  "getWeatherEffectSummary should describe negative values"
);
assertEq(
  getWeatherEffectSummary(99),
  "Perception checks gain +5.",
  "getWeatherEffectSummary should clamp positive values"
);
assertEq(
  getWeatherEffectSummary(-99),
  "Perception checks suffer -5.",
  "getWeatherEffectSummary should clamp negative values"
);

assertEq(
  describeWeatherDaeChanges([]),
  "No additional global DAE changes.",
  "describeWeatherDaeChanges should handle empty arrays"
);
assertEq(
  describeWeatherDaeChanges(null),
  "No additional global DAE changes.",
  "describeWeatherDaeChanges should handle null"
);
const desc = describeWeatherDaeChanges([{ key: "system.speed", label: "Speed", value: "10", mode: 2 }]);
assertEq(desc, "No additional global DAE changes.", "describeWeatherDaeChanges should ignore legacy weather DAE rows");

assertEq(resolveWeatherFxEffectIdForPreset({ key: "clear" }), "", "clear preset should not resolve an FX id");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "" }), "", "empty preset key should not resolve an FX id");
assertEq(
  resolveWeatherFxEffectIdForPreset({ key: "rainy", label: "Rainy" }),
  "weather-rain",
  "rainy should map to rain FX"
);
assertEq(
  resolveWeatherFxEffectIdForPreset({ key: "stormy", label: "Stormy" }),
  "weather-storm",
  "stormy should map to storm FX"
);
assertEq(
  resolveWeatherFxEffectIdForPreset({ key: "snowy", label: "Snowy" }),
  "weather-snow",
  "snowy should map to snow FX"
);
assertEq(
  resolveWeatherFxEffectIdForPreset({ key: "unknown-custom" }),
  "",
  "unknown preset should not resolve an FX id"
);

const helpers2 = createWeatherPresetHelpers({});
assert(helpers2.WEATHER_PRESET_DEFINITIONS !== WEATHER_PRESET_DEFINITIONS, "Factory instances should be independent");
assertEq(helpers2.WEATHER_PRESET_DEFINITIONS.length, 6, "Independent factory should still define 6 presets");

assertEq(GMSCREEN_WEATHER_CLIMATES.length, 8, "GMScreen weather model should expose every climate table");
assertEq(resolveGmScreenSeasonForDayNumber(1), "Spring", "Day 1 should start in Spring");
assertEq(resolveGmScreenSeasonForDayNumber(92), "Summer", "Day 92 should roll into Summer");
assertEq(
  resolveGmScreenSeasonFromCalendarDate({ season: { name: "Autumn" } }),
  "Autumn",
  "Simple Calendar season names should map into the GMScreen season table"
);
assertEq(
  resolveGmScreenCalendarContext({
    date: { dayOfYear: 183, hour: 15, season: { name: "Autumn" } },
    dayKey: "Y1-M7-D1",
    dateLabel: "Harvest 1"
  }),
  {
    dayNumber: 183,
    dayKey: "Y1-M7-D1",
    hourOfDay: 15,
    season: "Autumn",
    dateLabel: "Harvest 1",
    hasCalendarDate: true
  },
  "Calendar context should preserve Simple Calendar day keys and labels"
);

const pickedWeatherA = pickGmScreenWeatherEntry({ climate: "Temperate", season: "Summer", seed: "same-day" });
const pickedWeatherB = pickGmScreenWeatherEntry({ climate: "Temperate", season: "Summer", seed: "same-day" });
assertEq(pickedWeatherA, pickedWeatherB, "GMScreen daily weather rolls should be deterministic for the same seed");

const severeRecord = buildGmScreenWeatherRecord({
  climate: "Arctic",
  season: "Winter",
  dayNumber: 277,
  hourOfDay: 8,
  seed: "whiteout-test",
  entry: {
    condition: "Whiteout",
    weight: 1,
    wind: "Gale",
    baseTempC: -30,
    note: "Movement may stop entirely."
  }
});
assert(
  severeRecord.hazardFlags.includes("Whiteout"),
  "GMScreen severe weather records should carry human-readable hazards"
);
assertEq(
  visibilityModifierForGmScreenWeatherRecord(severeRecord),
  -5,
  "Whiteout plus gale should clamp to the worst visibility modifier"
);
assert(
  severeRecord.terrainSummary.includes("No regional terrain"),
  "Weather records should describe an empty terrain profile"
);
const severePreset = buildGmScreenWeatherPreset(severeRecord, {
  dayKey: "Y2-M10-D4",
  dateLabel: "Deepwinter 4"
});
assertEq(severePreset.source, "gmscreen", "Generated GMScreen presets should be source-tagged");
assertEq(severePreset.daeChanges, [], "Generated GMScreen presets should never carry DAE changes");
assert(
  severePreset.note.includes("Deepwinter 4") && severePreset.note.includes("Travel:"),
  "Generated GMScreen presets should include calendar and travel details"
);
const severeSnapshot = buildGmScreenWeatherSnapshot(severePreset, {
  id: "weather-snapshot",
  loggedAt: 1000,
  loggedBy: "GM",
  calendarDayKey: "Y2-M10-D4",
  calendarDateLabel: "Deepwinter 4"
});
assertEq(severeSnapshot.id, "weather-snapshot", "GMScreen weather snapshots should preserve provided ids");
assertEq(severeSnapshot.source, "gmscreen", "GMScreen weather snapshots should retain source metadata");
assertEq(severeSnapshot.hazards.includes("Whiteout"), true, "GMScreen weather snapshots should preserve hazards");
const severeSnapshotDetails = buildGmScreenWeatherSnapshotDetailLines(severeSnapshot);
assert(
  severeSnapshotDetails.some((line) => line.includes("Climate: Arctic Winter")),
  "GMScreen snapshot detail lines should include climate and season"
);
assert(
  severeSnapshotDetails.some((line) => line.startsWith("Hazards:") && line.includes("Whiteout")),
  "GMScreen snapshot detail lines should include hazards"
);
assert(
  severeSnapshotDetails.some((line) => line.startsWith("Travel:")),
  "GMScreen snapshot detail lines should include travel impact"
);

const normalizedTerrain = normalizeGmScreenWeatherTerrainCounts({ Mountain: 3, Water: 2, unknown: 99 });
assertEq(normalizedTerrain.Mountain, 3, "Terrain normalization should preserve known mountain counts");
assertEq(normalizedTerrain.Water, 2, "Terrain normalization should preserve known water counts");
assertEq(normalizedTerrain.Desert, 0, "Terrain normalization should default absent known terrain to zero");
assert(
  getGmScreenWeatherTerrainRows(normalizedTerrain).some((row) => row.key === "Mountain" && row.active),
  "Terrain rows should mark non-zero terrain as active"
);
assertEq(
  classifyGmScreenWeatherTerrainPixel({ r: 25, g: 110, b: 210, a: 255 }),
  "Water",
  "Terrain image classifier should recognize blue map water"
);
assertEq(
  classifyGmScreenWeatherTerrainPixel({ r: 92, g: 92, b: 88, a: 255 }),
  "Mountain",
  "Terrain image classifier should recognize grey mountain/rock"
);
assertEq(
  classifyGmScreenWeatherTerrainPixel({ r: 28, g: 105, b: 42, a: 255 }),
  "Forest",
  "Terrain image classifier should recognize deep forest greens"
);
assertEq(
  classifyGmScreenWeatherTerrainPixel({ r: 168, g: 168, b: 162, a: 255 }),
  "Urban",
  "Terrain image classifier should recognize pale settlement greys"
);

const terrainImagePixels = [
  [25, 110, 210, 255],
  [25, 110, 210, 255],
  [222, 188, 92, 255],
  [170, 205, 95, 255],
  [25, 110, 210, 255],
  [28, 105, 42, 255],
  [92, 92, 88, 255],
  [168, 168, 162, 255],
  [25, 110, 210, 255],
  [90, 105, 45, 255],
  [92, 92, 88, 255],
  [28, 105, 42, 255]
].flat();
const terrainImageAnalysis = analyzeGmScreenWeatherTerrainImageData({
  width: 4,
  height: 3,
  data: Uint8ClampedArray.from(terrainImagePixels)
});
assert(terrainImageAnalysis.terrainCounts.Water > 0, "Terrain image analysis should produce a water terrain weight");
assert(
  terrainImageAnalysis.terrainCounts.Coast > 0,
  "Terrain image analysis should infer coast where land touches water"
);
assert(
  terrainImageAnalysis.terrainCounts.Mountain > 0,
  "Terrain image analysis should produce a mountain terrain weight"
);
assert(terrainImageAnalysis.terrainCounts.Forest > 0, "Terrain image analysis should produce a forest terrain weight");
assert(
  terrainImageAnalysis.terrainSummary.includes("Coast"),
  "Terrain image analysis summary should include inferred coast details"
);
assert(
  terrainImageAnalysis.terrainRows.some((row) => row.key === "Water" && row.percentLabel.endsWith("%")),
  "Terrain image analysis should expose table-ready percentage rows"
);
assertEq(
  terrainImageAnalysis.confidenceLabel,
  "High",
  "Terrain image analysis should mark mostly recognized color maps as high confidence"
);
const mixedTerrainAnalysis = normalizeGmScreenWeatherTerrainImageAnalysis({
  width: 10,
  height: 10,
  sampledPixels: 40,
  ignoredPixels: 60,
  pixelCounts: { Water: 20, Forest: 20 },
  terrainCounts: { Water: 20, Forest: 20 }
});
assertEq(
  mixedTerrainAnalysis.confidenceLabel,
  "Mixed",
  "Terrain image analysis should flag partially recognized maps as mixed confidence"
);
assertEq(
  mixedTerrainAnalysis.ignoredPercentLabel,
  "60%",
  "Terrain image analysis should report ignored pixel percentage"
);
assertEq(
  recommendGmScreenWeatherClimateForTerrain({}).climate,
  "Temperate",
  "Terrain climate recommendation should default to Temperate with no terrain profile"
);
assertEq(
  recommendGmScreenWeatherClimateForTerrain({ Coast: 5, Water: 3 }).climate,
  "Coastal",
  "Terrain climate recommendation should prefer Coastal for shore and water profiles"
);
assertEq(
  recommendGmScreenWeatherClimateForTerrain({ Mountain: 4, Forest: 1 }).climate,
  "Mountain",
  "Terrain climate recommendation should prefer Mountain for highland profiles"
);
assertEq(
  recommendGmScreenWeatherClimateForTerrain({ Desert: 4, Plains: 1 }).climate,
  "Arid",
  "Terrain climate recommendation should prefer Arid for desert profiles"
);
assertEq(
  recommendGmScreenWeatherClimateForTerrain({ Swamp: 4, Water: 1, Forest: 1 }).climate,
  "Swamp",
  "Terrain climate recommendation should prefer Swamp for wetland profiles"
);

const flatRainRecord = buildGmScreenWeatherRecord({
  climate: "Temperate",
  season: "Spring",
  dayNumber: 12,
  hourOfDay: 12,
  seed: "terrain-rain",
  entry: {
    condition: "Heavy Rain",
    weight: 1,
    wind: "Strong Wind",
    baseTempC: 10,
    note: "Rivers and roads worsen."
  }
});
const wetRainRecord = buildGmScreenWeatherRecord({
  climate: "Temperate",
  season: "Spring",
  dayNumber: 12,
  hourOfDay: 12,
  seed: "terrain-rain",
  terrainCounts: { Water: 4, Swamp: 3, Coast: 2 },
  entry: {
    condition: "Heavy Rain",
    weight: 1,
    wind: "Strong Wind",
    baseTempC: 10,
    note: "Rivers and roads worsen."
  }
});
assert(
  wetRainRecord.rainAmount > flatRainRecord.rainAmount,
  "Water, coast, and swamp terrain should increase precipitation"
);
assert(wetRainRecord.terrainSummary.includes("Open Water 4"), "Weather records should include terrain summary details");
const wetRainDetails = buildGmScreenWeatherSnapshotDetailLines(
  buildGmScreenWeatherSnapshot(
    buildGmScreenWeatherPreset(wetRainRecord, {
      dayKey: "Y1-M1-D12",
      dateLabel: "Spring 12"
    }),
    {
      id: "wet-weather-snapshot",
      loggedAt: 1000,
      loggedBy: "GM"
    }
  )
);
assert(
  wetRainDetails.some((line) => line.includes("Terrain: Open Water 4")),
  "GMScreen snapshot detail lines should include terrain profile details"
);
assert(
  wetRainDetails.some((line) => line.startsWith("Moisture:")),
  "GMScreen snapshot detail lines should include humidity and rain"
);

const flatClearRecord = buildGmScreenWeatherRecord({
  climate: "Temperate",
  season: "Summer",
  dayNumber: 12,
  hourOfDay: 12,
  seed: "terrain-temp",
  entry: {
    condition: "Clear",
    weight: 1,
    wind: "Breeze",
    baseTempC: 18,
    note: "Stable skies."
  }
});
const mountainClearRecord = buildGmScreenWeatherRecord({
  climate: "Temperate",
  season: "Summer",
  dayNumber: 12,
  hourOfDay: 12,
  seed: "terrain-temp",
  terrainCounts: { Mountain: 3, Forest: 1 },
  entry: {
    condition: "Clear",
    weight: 1,
    wind: "Breeze",
    baseTempC: 18,
    note: "Stable skies."
  }
});
assert(
  mountainClearRecord.dailyHighC < flatClearRecord.dailyHighC,
  "Mountain terrain should lower generated high temperatures"
);

if (failed > 0) {
  console.error(`${failed} assertion(s) failed, ${passed} passed`);
  process.exit(1);
}

process.stdout.write(`weather preset helpers validation passed (${passed} assertions)\n`);
