/**
 * Regression tests for scripts/features/weather-preset-helpers.js
 * Run with: node scripts/test-weather-preset-helpers.mjs
 */

import { createWeatherPresetHelpers } from "./features/weather-preset-helpers.js";

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) console.error(`  FAIL: ${label}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
  ok ? passed++ : failed++;
}

// ── Factory with a minimal CONST mock ────────────────────────────────────────

const MOCK_CONST = {
  ACTIVE_EFFECT_MODES: { CUSTOM: 0, MULTIPLY: 1, ADD: 2, DOWNGRADE: 3, UPGRADE: 4, OVERRIDE: 5 },
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
  resolveWeatherFxEffectIdForPreset,
} = createWeatherPresetHelpers({
  constRef: MOCK_CONST,
  randomIdFn: mockRandomId,
  getConfigWeatherEffects: () => ({
    "weather-rain": { label: "Rain" },
    "weather-storm": { label: "Thunder Storm" },
    "weather-snow": { label: "Snowfall" },
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// WEATHER_PRESET_DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[WEATHER_PRESET_DEFINITIONS]");
assert(Array.isArray(WEATHER_PRESET_DEFINITIONS), "is an array");
assertEq(WEATHER_PRESET_DEFINITIONS.length, 6, "has 6 built-in presets");
const ids = WEATHER_PRESET_DEFINITIONS.map((p) => p.id);
assert(ids.includes("clear"), "includes clear");
assert(ids.includes("cloudy"), "includes cloudy");
assert(ids.includes("rainy"), "includes rainy");
assert(ids.includes("stormy"), "includes stormy");
assert(ids.includes("snowy"), "includes snowy");
assert(ids.includes("hail"), "includes hail");

// ─────────────────────────────────────────────────────────────────────────────
// normalizeWeatherDaeChange
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[normalizeWeatherDaeChange]");
const validChange = normalizeWeatherDaeChange({ id: "x1", key: "system.speed", mode: 2, value: "10", label: "Speed Up" });
assertEq(validChange.id, "x1", "preserves id");
assertEq(validChange.key, "system.speed", "preserves key");
assertEq(validChange.mode, 2, "preserves valid mode");
assertEq(validChange.value, "10", "preserves value");
assertEq(validChange.label, "Speed Up", "preserves label");

const badMode = normalizeWeatherDaeChange({ mode: 999, key: "attr", value: "1" });
assertEq(badMode.mode, 2, "invalid mode falls back to ADD (2)");

const emptyChange = normalizeWeatherDaeChange({});
assert(typeof emptyChange.id === "string" && emptyChange.id.length > 0, "empty entry gets generated id");
assertEq(emptyChange.label, "Weather Effect", "empty label defaults to Weather Effect");

// ─────────────────────────────────────────────────────────────────────────────
// normalizeWeatherPreset
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[normalizeWeatherPreset]");
const customPreset = normalizeWeatherPreset(
  { id: "my-preset", label: "Ash Cloud", visibilityModifier: -2, darkness: 0.6, isBuiltIn: false },
  {}
);
assertEq(customPreset.id, "my-preset", "id preserved");
assertEq(customPreset.label, "Ash Cloud", "label preserved");
assertEq(customPreset.visibilityModifier, -2, "visibilityModifier preserved");
assertEq(customPreset.darkness, 0.6, "darkness preserved");
assertEq(customPreset.isBuiltIn, false, "isBuiltIn false");
assertEq(customPreset.daeChanges, [], "empty daeChanges");

const clampedPreset = normalizeWeatherPreset({ visibilityModifier: -99, darkness: 5 });
assertEq(clampedPreset.visibilityModifier, -5, "visibilityModifier clamped to -5");
assertEq(clampedPreset.darkness, 1, "darkness clamped to 1");

const withDae = normalizeWeatherPreset({
  id: "dae-test",
  daeChanges: [
    { key: "speed", value: "5", mode: 2 },
    { key: "", value: "x" },       // filtered out (no key)
    { key: "attr", value: "" },    // filtered out (no value)
  ],
});
assertEq(withDae.daeChanges.length, 1, "invalid daeChanges filtered out");
assertEq(withDae.daeChanges[0].key, "speed", "valid daeChange retained");

// ─────────────────────────────────────────────────────────────────────────────
// getBuiltInWeatherPresets
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[getBuiltInWeatherPresets]");
const builtIns = getBuiltInWeatherPresets();
assertEq(builtIns.length, 6, "returns 6 built-in presets");
assert(builtIns.every((p) => p.isBuiltIn === true), "all have isBuiltIn: true");
assert(builtIns.every((p) => Array.isArray(p.daeChanges) && p.daeChanges.length === 0), "all have empty daeChanges");
const clearPreset = builtIns.find((p) => p.id === "clear");
assert(clearPreset != null, "clear preset present");
assertEq(clearPreset.visibilityModifier, 0, "clear has 0 visibility modifier");
assertEq(clearPreset.darkness, 0.1, "clear has 0.1 darkness");

// ─────────────────────────────────────────────────────────────────────────────
// getWeatherPresetCatalog
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[getWeatherPresetCatalog]");
const catalogEmpty = getWeatherPresetCatalog({});
assertEq(catalogEmpty.length, 6, "empty state returns 6 built-in presets");

const catalogWithCustom = getWeatherPresetCatalog({
  customPresets: [
    { id: "ash", label: "Ash Cloud", visibilityModifier: -2, darkness: 0.5 },
  ],
});
assertEq(catalogWithCustom.length, 7, "custom preset added to catalog");
assert(catalogWithCustom.some((p) => p.id === "ash"), "custom preset included");

const dupeCatalog = getWeatherPresetCatalog({
  customPresets: [
    { id: "clear", label: "Duplicate Clear" }, // duplicate of built-in
    { id: "fog", label: "Fog" },
    { id: "fog", label: "Fog Duplicate" }, // self-duplicate
  ],
});
assertEq(dupeCatalog.length, 7, "duplicates (built-in + self) deduplicated");
const clearEntry = dupeCatalog.find((p) => p.id === "clear");
assertEq(clearEntry.isBuiltIn, true, "built-in clear wins over custom with same id");

// ─────────────────────────────────────────────────────────────────────────────
// buildWeatherSelectionCatalog
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[buildWeatherSelectionCatalog]");
const selCatalog = buildWeatherSelectionCatalog({}, null);
assertEq(selCatalog.length, 6, "returns 6 entries without scene snapshot");
assert(selCatalog.every((e) => typeof e.key === "string" && e.key.length > 0), "all entries have key");
assert(selCatalog.every((e) => typeof e.weatherId === "string"), "all entries have weatherId");

const selCatalogScene = buildWeatherSelectionCatalog({}, { darkness: 0.8 });
assert(selCatalogScene.every((e) => e.darkness === 0.8), "scene darkness applied to all entries");

// ─────────────────────────────────────────────────────────────────────────────
// computeWeatherVisibilityModifier
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[computeWeatherVisibilityModifier]");
assertEq(computeWeatherVisibilityModifier({ label: "Clear", weatherId: "clear", darkness: 0.1 }), 1, "clear low darkness gives +1");
assertEq(computeWeatherVisibilityModifier({ label: "Rain", weatherId: "rain", darkness: 0.3 }), -1, "rain gives -1");
assertEq(computeWeatherVisibilityModifier({ label: "Heavy Storm", weatherId: "storm", darkness: 0.5 }), -3, "heavy storm mid-darkness gives -3");
assertEq(computeWeatherVisibilityModifier({ label: "Fog", weatherId: "fog", darkness: 0.8 }), -4, "fog heavy darkness gives -4");
assertEq(computeWeatherVisibilityModifier({}), 1, "empty input (no weatherId, low darkness) gives +1");

// ─────────────────────────────────────────────────────────────────────────────
// getWeatherEffectSummary
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[getWeatherEffectSummary]");
assertEq(getWeatherEffectSummary(0), "No perception modifier from weather.", "zero returns neutral message");
assertEq(getWeatherEffectSummary(2), "Perception checks gain +2.", "positive returns gain message");
assertEq(getWeatherEffectSummary(-3), "Perception checks suffer -3.", "negative returns suffer message");
assertEq(getWeatherEffectSummary(99), "Perception checks gain +5.", "clamped to +5");
assertEq(getWeatherEffectSummary(-99), "Perception checks suffer -5.", "clamped to -5");

// ─────────────────────────────────────────────────────────────────────────────
// describeWeatherDaeChanges
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[describeWeatherDaeChanges]");
assertEq(describeWeatherDaeChanges([]), "No additional global DAE changes.", "empty array");
assertEq(describeWeatherDaeChanges(null), "No additional global DAE changes.", "null input");
const desc = describeWeatherDaeChanges([
  { key: "system.speed", label: "Speed", value: "10", mode: 2 },
]);
assert(typeof desc === "string" && desc.includes("Speed"), "label appears in description");
assert(desc.includes("10"), "value appears in description");
assert(desc.includes("ADD"), "mode label appears in description");

// ─────────────────────────────────────────────────────────────────────────────
// resolveWeatherFxEffectIdForPreset
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[resolveWeatherFxEffectIdForPreset]");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "clear" }), "", "clear returns empty string");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "" }), "", "empty key returns empty string");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "rainy", label: "Rainy" }), "weather-rain", "rainy maps to weather-rain");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "stormy", label: "Stormy" }), "weather-storm", "stormy maps to weather-storm");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "snowy", label: "Snowy" }), "weather-snow", "snowy maps to weather-snow");
assertEq(resolveWeatherFxEffectIdForPreset({ key: "unknown-custom" }), "", "unknown preset with no keyword match returns empty");

// ─────────────────────────────────────────────────────────────────────────────
// Factory independence
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n[factory independence]");
const helpers2 = createWeatherPresetHelpers({});
assert(helpers2.WEATHER_PRESET_DEFINITIONS !== WEATHER_PRESET_DEFINITIONS, "each factory instance has its own WEATHER_PRESET_DEFINITIONS");
assertEq(helpers2.WEATHER_PRESET_DEFINITIONS.length, 6, "independent factory still defines 6 presets");

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`);
if (failed === 0) {
  console.log(`✓ weather preset helpers validation passed (${passed} assertions)`);
} else {
  console.log(`✗ ${failed} assertion(s) failed, ${passed} passed`);
  process.exit(1);
}
