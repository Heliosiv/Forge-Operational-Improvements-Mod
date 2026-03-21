export function createGmQuickWeatherDraftStorage({
  storage = globalThis.sessionStorage,
  gameRef = globalThis.game
} = {}) {
  const getGmQuickWeatherDraftStorageKey = () => `po-gm-quick-weather-draft-${gameRef?.user?.id ?? "anon"}`;

  const getGmQuickWeatherDraft = () => {
    const raw = storage?.getItem?.(getGmQuickWeatherDraftStorageKey());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        selectedKey: String(parsed.selectedKey ?? "").trim(),
        darkness: Number(parsed.darkness ?? 0),
        visibilityModifier: Number(parsed.visibilityModifier ?? 0),
        note: String(parsed.note ?? ""),
        presetName: String(parsed.presetName ?? ""),
        daeChanges: Array.isArray(parsed.daeChanges) ? parsed.daeChanges : []
      };
    } catch {
      return null;
    }
  };

  const setGmQuickWeatherDraft = (draft = null) => {
    if (!draft || typeof draft !== "object") {
      storage?.removeItem?.(getGmQuickWeatherDraftStorageKey());
      return;
    }
    storage?.setItem?.(getGmQuickWeatherDraftStorageKey(), JSON.stringify({
      selectedKey: String(draft.selectedKey ?? "").trim(),
      darkness: Number(draft.darkness ?? 0),
      visibilityModifier: Number(draft.visibilityModifier ?? 0),
      note: String(draft.note ?? ""),
      presetName: String(draft.presetName ?? ""),
      daeChanges: Array.isArray(draft.daeChanges) ? draft.daeChanges : []
    }));
  };

  return Object.freeze({
    getGmQuickWeatherDraft,
    getGmQuickWeatherDraftStorageKey,
    setGmQuickWeatherDraft
  });
}