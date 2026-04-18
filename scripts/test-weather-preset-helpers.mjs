/**
 * Regression tests for scripts/features/weather-preset-helpers.js
 * Run with: node scripts/test-weather-preset-helpers.mjs
 */

import { createWeatherPresetHelpers } from "./features/weather-preset-helpers.js";

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
  assert(WEATHER_PRESET_DEFINITIONS.some((preset) => preset.id === id), `Expected built-in preset ${id}.`);
}

const validChange = normalizeWeatherDaeChange({ id: "x1", key: "system.speed", mode: 2, value: "10", label: "Speed Up" });
assertEq(validChange.id, "x1", "normalizeWeatherDaeChange should preserve id");
assertEq(validChange.key, "system.speed", "normalizeWeatherDaeChange should preserve key");
assertEq(validChange.mode, 2, "normalizeWeatherDaeChange should preserve valid mode");
assertEq(validChange.value, "10", "normalizeWeatherDaeChange should preserve value");
assertEq(validChange.label, "Speed Up", "normalizeWeatherDaeChange should preserve label");

const badMode = normalizeWeatherDaeChange({ mode: 999, key: "attr", value: "1" });
assertEq(badMode.mode, 2, "normalizeWeatherDaeChange should clamp invalid mode to ADD");

const emptyChange = normalizeWeatherDaeChange({});
assert(typeof emptyChange.id === "string" && emptyChange.id.length > 0, "normalizeWeatherDaeChange should generate an id for empty input");
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
assertEq(withDae.daeChanges.length, 1, "normalizeWeatherPreset should filter invalid daeChanges");
assertEq(withDae.daeChanges[0].key, "speed", "normalizeWeatherPreset should retain valid daeChanges");

const builtIns = getBuiltInWeatherPresets();
assertEq(builtIns.length, 6, "getBuiltInWeatherPresets should return 6 presets");
assert(builtIns.every((preset) => preset.isBuiltIn === true), "getBuiltInWeatherPresets should mark every preset as built-in");
assert(builtIns.every((preset) => Array.isArray(preset.daeChanges) && preset.daeChanges.length === 0), "getBuiltInWeatherPresets should return empty daeChanges");
const clearPreset = builtIns.find((preset) => preset.id === "clear");
assert(clearPreset != null, "getBuiltInWeatherPresets should include clear");
assertEq(clearPreset?.visibilityModifier, 0, "clear should have neutral visibility");
assertEq(clearPreset?.darkness, 0.1, "clear should have low darkness");

const catalogEmpty = getWeatherPresetCatalog({});
assertEq(catalogEmpty.length, 6, "getWeatherPresetCatalog should return built-ins for empty state");

const catalogWithCustom = getWeatherPresetCatalog({
  customPresets: [{ id: "ash", label: "Ash Cloud", visibilityModifier: -2, darkness: 0.5 }]
});
assertEq(catalogWithCustom.length, 7, "getWeatherPresetCatalog should include custom presets");
assert(catalogWithCustom.some((preset) => preset.id === "ash"), "getWeatherPresetCatalog should include custom preset");

const dupeCatalog = getWeatherPresetCatalog({
  customPresets: [
    { id: "clear", label: "Duplicate Clear" },
    { id: "fog", label: "Fog" },
    { id: "fog", label: "Fog Duplicate" }
  ]
});
assertEq(dupeCatalog.length, 7, "getWeatherPresetCatalog should deduplicate preset ids");
assertEq(dupeCatalog.find((preset) => preset.id === "clear")?.isBuiltIn, true, "Built-in preset should win on duplicate id");

const selectionCatalog = buildWeatherSelectionCatalog({}, null);
assertEq(selectionCatalog.length, 6, "buildWeatherSelectionCatalog should return 6 entries without scene snapshot");
assert(selectionCatalog.every((entry) => typeof entry.key === "string" && entry.key.length > 0), "buildWeatherSelectionCatalog should populate keys");
assert(selectionCatalog.every((entry) => typeof entry.weatherId === "string"), "buildWeatherSelectionCatalog should populate weather ids");

const selectionCatalogScene = buildWeatherSelectionCatalog({}, { darkness: 0.8 });
assert(selectionCatalogScene.every((entry) => entry.darkness === 0.8), "buildWeatherSelectionCatalog should apply scene darkness");

assertEq(computeWeatherVisibilityModifier({ label: "Clear", weatherId: "clear", darkness: 0.1 }), 1, "clear low darkness should improve visibility");
assertEq(computeWeatherVisibilityModifier({ label: "Rain", weatherId: "rain", darkness: 0.3 }), -1, "rain should reduce visibility");
assertEq(computeWeatherVisibilityModifier({ label: "Heavy Storm", weatherId: "storm", darkness: 0.5 }), -3, "heavy storm should strongly reduce visibility");
assertEq(computeWeatherVisibilityModifier({ label: "Fog", weatherId: "fog", darkness: 0.8 }), -4, "fog plus darkness should heavily reduce visibility");
assertEq(computeWeatherVisibilityModifier({}), 1, "default clear/low-darkness case should improve visibility");

assertEq(getWeatherEffectSummary(0), "No perception modifier from weather.", "getWeatherEffectSummary should handle zero");
assertEq(getWeatherEffectSummary(2), "Perception checks gain +2.", "getWeatherEffectSummary should describe positive values");
assertEq(getWeatherEffectSummary(-3), "Perception checks suffer -3.", "getWeatherEffectSummary should describe negative values");
assertEq(getWeatherEffectSummary(99), "Perception checks gain +5.", "getWeatherEffectSummary should clamp positive values");
assertEq(getWeatherEffectSummary(-99), "Perception checks suffer -5.", "getWeatherEffectSummary should clamp negative values");

assertEq(describeWeatherDaeChanges([]), "No additional global DAE changes.", "describeWeatherDaeChanges should handle empty arrays");
assertEq(describeWeatherDaeChanges(null), "No additional global DAE changes.", "describeWeatherDaeChanges should handle null");
const desc = describeWeatherDaeChanges([{ key: "system.speed", label: "Speed", value: "10", mode: 2 }]);
assert(typeof desc === "string" && desc.includes("Speed"), "describeWeatherDaeChanges should include labels");
assert(desc.includes("10"), "describeWeatherDaeChanges should include values");
assert(desc.includes("ADD"), "describeWeatherDaeChanges should include mode labels");

assertEq(resolveWeatherFxEffectIdForPreset({ key: "clear" }), "", "clear preset should not resolve an FX id");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "" }), "", "empty preset key should not resolve an FX id");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "rainy", label: "Rainy" }), "weather-rain", "rainy should map to rain FX");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "stormy", label: "Stormy" }), "weather-storm", "stormy should map to storm FX");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "snowy", label: "Snowy" }), "weather-snow", "snowy should map to snow FX");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "unknown-custom" }), "", "unknown preset should not resolve an FX id");

const helpers2 = createWeatherPresetHelpers({});
assert(helpers2.WEATHER_PRESET_DEFINITIONS !== WEATHER_PRESET_DEFINITIONS, "Factory instances should be independent");
assertEq(helpers2.WEATHER_PRESET_DEFINITIONS.length, 6, "Independent factory should still define 6 presets");

if (failed > 0) {
  console.error(`${failed} assertion(s) failed, ${passed} passed`);
  process.exit(1);
}

process.stdout.write(`weather preset helpers validation passed (${passed} assertions)\n`);
