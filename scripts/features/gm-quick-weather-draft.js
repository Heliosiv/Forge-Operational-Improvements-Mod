export function createGmQuickWeatherDraftStorage({
  storage = globalThis.sessionStorage,
  gameRef = globalThis.game
} = {}) {
  const getGmQuickWeatherDraftStorageKey = () => `po-gm-quick-weather-draft-${gameRef?.user?.id ?? "anon"}`;

  const normalizeBoundedNumber = (value, { fallback = 0, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, round = false } = {}) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const bounded = Math.max(min, Math.min(max, numeric));
    return round ? Math.floor(bounded) : bounded;
  };

  const normalizeWeatherDraft = (draft = {}) => ({
    selectedKey: String(draft?.selectedKey ?? "").trim(),
    darkness: normalizeBoundedNumber(draft?.darkness, { fallback: 0, min: 0, max: 1 }),
    visibilityModifier: normalizeBoundedNumber(draft?.visibilityModifier, { fallback: 0, min: -5, max: 5, round: true }),
    note: String(draft?.note ?? ""),
    presetName: String(draft?.presetName ?? "")
  });

  const getGmQuickWeatherDraft = () => {
    const raw = storage?.getItem?.(getGmQuickWeatherDraftStorageKey());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return normalizeWeatherDraft(parsed);
    } catch {
      return null;
    }
  };

  const setGmQuickWeatherDraft = (draft = null) => {
    if (!draft || typeof draft !== "object") {
      storage?.removeItem?.(getGmQuickWeatherDraftStorageKey());
      return;
    }
    storage?.setItem?.(getGmQuickWeatherDraftStorageKey(), JSON.stringify(normalizeWeatherDraft(draft)));
  };

  return Object.freeze({
    getGmQuickWeatherDraft,
    getGmQuickWeatherDraftStorageKey,
    setGmQuickWeatherDraft
  });
}
