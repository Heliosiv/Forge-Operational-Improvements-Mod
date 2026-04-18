/**
 * Weather preset normalizers, catalog builders, and visibility helpers.
 *
 * Factory params:
 *   constRef              — CONST object with ACTIVE_EFFECT_MODES (e.g. Foundry's CONST)
 *   randomIdFn            — () => string  (e.g. () => foundry.utils.randomID())
 *   getConfigWeatherEffects — () => Record<string,{label?,name?}>  (e.g. () => CONFIG.weatherEffects ?? {})
 */
export function createWeatherPresetHelpers({
  constRef = {},
  randomIdFn = () => Math.random().toString(36).slice(2),
  getConfigWeatherEffects = () => ({}),
} = {}) {
  // ── Built-in preset definitions ──────────────────────────────────────────

  const WEATHER_PRESET_DEFINITIONS = Object.freeze([
    { id: "clear",  label: "Clear",  visibilityModifier: 0,  darkness: 0.10, note: "Clear skies and stable visibility." },
    { id: "cloudy", label: "Cloudy", visibilityModifier: -1, darkness: 0.30, note: "Low cloud cover and muted light." },
    { id: "rainy",  label: "Rainy",  visibilityModifier: -1, darkness: 0.40, note: "Rain interferes with spotting and footing." },
    { id: "stormy", label: "Stormy", visibilityModifier: -3, darkness: 0.65, note: "Thunderstorm conditions reduce awareness." },
    { id: "snowy",  label: "Snowy",  visibilityModifier: -2, darkness: 0.45, note: "Snowfall obscures distance and tracks." },
    { id: "hail",   label: "Hail",   visibilityModifier: -2, darkness: 0.50, note: "Hail disrupts movement and ranged visibility." },
  ]);

  // ── Private helper: active effect mode label ─────────────────────────────

  function _getActiveEffectModeLabel(mode) {
    const numericMode = Math.floor(Number(mode ?? (constRef.ACTIVE_EFFECT_MODES?.ADD ?? 2)));
    const entry = Object.entries(constRef.ACTIVE_EFFECT_MODES ?? {})
      .find(([, value]) => Number(value) === numericMode);
    return entry ? entry[0] : "ADD";
  }

  // ── Normalizers ───────────────────────────────────────────────────────────

  function normalizeWeatherDaeChange(entry = {}) {
    const addMode = Number(constRef.ACTIVE_EFFECT_MODES?.ADD ?? 2);
    const rawMode = Math.floor(Number(entry?.mode ?? addMode));
    const validModes = new Set(
      Object.values(constRef.ACTIVE_EFFECT_MODES ?? {}).map((v) => Number(v))
    );
    return {
      id: String(entry?.id ?? randomIdFn()).trim() || randomIdFn(),
      key: String(entry?.key ?? "").trim(),
      mode: validModes.has(rawMode) ? rawMode : addMode,
      value: String(entry?.value ?? "").trim(),
      label: String(entry?.label ?? "Weather Effect").trim() || "Weather Effect",
      note: String(entry?.note ?? ""),
    };
  }

  function normalizeWeatherPreset(entry = {}, defaults = {}) {
    const daeChanges = Array.isArray(entry?.daeChanges)
      ? entry.daeChanges
          .map((change) => normalizeWeatherDaeChange(change))
          .filter((change) => change.key && change.value)
      : [];
    return {
      id: String(entry?.id ?? defaults?.id ?? randomIdFn()).trim() || randomIdFn(),
      label: String(entry?.label ?? defaults?.label ?? "Custom Weather").trim() || "Custom Weather",
      visibilityModifier: Number.isFinite(Number(entry?.visibilityModifier))
        ? Math.max(-5, Math.min(5, Math.floor(Number(entry.visibilityModifier))))
        : Math.max(-5, Math.min(5, Math.floor(Number(defaults?.visibilityModifier ?? 0)))),
      darkness: Number.isFinite(Number(entry?.darkness))
        ? Math.max(0, Math.min(1, Number(entry.darkness)))
        : Math.max(0, Math.min(1, Number(defaults?.darkness ?? 0))),
      note: String(entry?.note ?? defaults?.note ?? ""),
      isBuiltIn: Boolean(entry?.isBuiltIn ?? defaults?.isBuiltIn),
      daeChanges,
    };
  }

  // ── Catalog builders ──────────────────────────────────────────────────────

  function getBuiltInWeatherPresets() {
    return WEATHER_PRESET_DEFINITIONS.map((entry) =>
      normalizeWeatherPreset({ ...entry, isBuiltIn: true, daeChanges: [] }, entry)
    );
  }

  function getWeatherPresetCatalog(weatherState = {}) {
    const builtIns = getBuiltInWeatherPresets();
    const customPresets = Array.isArray(weatherState?.customPresets)
      ? weatherState.customPresets
          .map((entry) => normalizeWeatherPreset(entry, { isBuiltIn: false }))
          .filter((entry) => !entry.isBuiltIn)
      : [];
    const seen = new Set();
    return [...builtIns, ...customPresets].filter((entry) => {
      const id = String(entry.id ?? "").trim().toLowerCase();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function buildWeatherSelectionCatalog(weatherState = {}, sceneSnapshot = null) {
    const sceneDarkness = Number.isFinite(Number(sceneSnapshot?.darkness))
      ? Math.max(0, Math.min(1, Number(sceneSnapshot.darkness)))
      : null;
    return getWeatherPresetCatalog(weatherState)
      .map((preset) => ({
        key: String(preset.id ?? "").trim(),
        label: String(preset.label ?? "Weather").trim() || "Weather",
        weatherId: String(preset.id ?? "").trim(),
        darkness: sceneDarkness ?? Math.max(0, Math.min(1, Number(preset.darkness ?? 0))),
        visibilityModifier: Math.max(-5, Math.min(5, Math.floor(Number(preset.visibilityModifier ?? 0) || 0))),
        note: String(preset.note ?? ""),
        daeChanges: Array.isArray(preset.daeChanges) ? preset.daeChanges : [],
        isBuiltIn: Boolean(preset.isBuiltIn),
      }))
      .filter((entry) => entry.key);
  }

  // ── Visibility helpers ────────────────────────────────────────────────────

  function computeWeatherVisibilityModifier({ label = "", weatherId = "", darkness = 0 } = {}) {
    const normalizedLabel = String(label ?? "").toLowerCase();
    const normalizedId = String(weatherId ?? "").toLowerCase();
    const normalizedDarkness = Number.isFinite(Number(darkness))
      ? Math.max(0, Math.min(1, Number(darkness)))
      : 0;

    const text = `${normalizedLabel} ${normalizedId}`;
    let visibilityModifier = 0;
    if (text.includes("rain") || text.includes("wind") || text.includes("cloud")) visibilityModifier -= 1;
    if (
      text.includes("heavy") || text.includes("storm") || text.includes("fog") ||
      text.includes("mist") || text.includes("blizzard") || text.includes("smoke") || text.includes("snow")
    ) {
      visibilityModifier -= 2;
    }
    if (normalizedDarkness >= 0.75) visibilityModifier -= 2;
    else if (normalizedDarkness >= 0.4) visibilityModifier -= 1;
    else if (normalizedDarkness <= 0.15 && (!normalizedId || text.includes("clear"))) visibilityModifier += 1;

    return Math.max(-5, Math.min(5, Math.floor(visibilityModifier)));
  }

  function getWeatherEffectSummary(visibilityModifier) {
    const value = Math.max(-5, Math.min(5, Math.floor(Number(visibilityModifier) || 0)));
    if (value > 0) return `Perception checks gain +${value}.`;
    if (value < 0) return `Perception checks suffer ${value}.`;
    return "No perception modifier from weather.";
  }

  // ── DAE change description ────────────────────────────────────────────────

  function describeWeatherDaeChanges(changes = []) {
    const rows = Array.isArray(changes) ? changes : [];
    if (!rows.length) return "No additional global DAE changes.";
    return rows
      .map((entry) => `${entry.label || entry.key}: ${entry.value} (${_getActiveEffectModeLabel(entry.mode)})`)
      .join("; ");
  }

  // ── FX effect resolution ──────────────────────────────────────────────────

  function resolveWeatherFxEffectIdForPreset(preset = {}) {
    const presetKey = String(preset?.key ?? preset?.weatherId ?? "").trim().toLowerCase();
    const presetLabel = String(preset?.label ?? "").trim().toLowerCase();
    if (!presetKey || presetKey.includes("clear") || presetLabel.includes("clear")) return "";

    const configWeatherEffects = getConfigWeatherEffects();
    const effects = Object.entries(configWeatherEffects ?? {})
      .map(([id, cfg]) => ({
        id: String(id ?? "").trim(),
        text: `${String(id ?? "")} ${String(cfg?.label ?? cfg?.name ?? "")}`.toLowerCase(),
      }))
      .filter((entry) => entry.id);
    if (!effects.length) return "";

    const keywordMap = {
      rainy:  ["rain", "drizzle", "shower"],
      stormy: ["storm", "thunder", "lightning", "tempest"],
      snowy:  ["snow", "blizzard", "flurry"],
      cloudy: ["cloud", "overcast", "fog", "mist"],
      hail:   ["hail", "sleet", "ice"],
    };
    const targetWords =
      keywordMap[presetKey] ??
      keywordMap[String(presetLabel).split(" ")[0]] ??
      Object.values(keywordMap).find((words) => words.some((word) => presetLabel.includes(word))) ??
      [];
    if (!targetWords.length) return "";
    const match = effects.find((entry) => targetWords.some((word) => entry.text.includes(word)));
    return String(match?.id ?? "").trim();
  }

  return Object.freeze({
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
  });
}
