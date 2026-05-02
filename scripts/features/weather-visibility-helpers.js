export function createWeatherVisibilityHelpers() {
  function computeWeatherVisibilityModifier({ label = "", weatherId = "", darkness = 0 } = {}) {
    const normalizedLabel = String(label ?? "").toLowerCase();
    const normalizedId = String(weatherId ?? "").toLowerCase();
    const normalizedDarkness = Number.isFinite(Number(darkness)) ? Math.max(0, Math.min(1, Number(darkness))) : 0;

    const text = `${normalizedLabel} ${normalizedId}`;
    let visibilityModifier = 0;
    if (text.includes("rain") || text.includes("wind") || text.includes("cloud")) visibilityModifier -= 1;
    if (
      text.includes("heavy") ||
      text.includes("storm") ||
      text.includes("fog") ||
      text.includes("mist") ||
      text.includes("blizzard") ||
      text.includes("smoke") ||
      text.includes("snow")
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

  return Object.freeze({
    computeWeatherVisibilityModifier,
    getWeatherEffectSummary
  });
}
