export function createLootPreviewDraftStorage({
  storage = globalThis.sessionStorage,
  gameRef = globalThis.game,
  normalizeLootPreviewDraft
} = {}) {
  const normalizeDraft = (draft = {}) => typeof normalizeLootPreviewDraft === "function"
    ? normalizeLootPreviewDraft(draft)
    : draft;

  const getLootPreviewDraftStorageKey = () => `po-loot-preview-draft-${gameRef?.user?.id ?? "anon"}`;

  const getLootPreviewDraft = () => {
    const raw = storage?.getItem?.(getLootPreviewDraftStorageKey());
    if (!raw) return normalizeDraft({});
    try {
      return normalizeDraft(JSON.parse(raw));
    } catch {
      return normalizeDraft({});
    }
  };

  const setLootPreviewDraft = (draft = {}) => {
    const normalized = normalizeDraft(draft);
    storage?.setItem?.(getLootPreviewDraftStorageKey(), JSON.stringify(normalized));
  };

  const getLootPreviewResultStorageKey = () => `po-loot-preview-result-${gameRef?.user?.id ?? "anon"}`;

  const getLootPreviewResult = () => {
    const raw = storage?.getItem?.(getLootPreviewResultStorageKey());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const setLootPreviewResult = (result = null) => {
    if (!result) {
      storage?.removeItem?.(getLootPreviewResultStorageKey());
      return;
    }
    storage?.setItem?.(getLootPreviewResultStorageKey(), JSON.stringify(result));
  };

  return Object.freeze({
    getLootPreviewDraft,
    getLootPreviewDraftStorageKey,
    getLootPreviewResult,
    getLootPreviewResultStorageKey,
    setLootPreviewDraft,
    setLootPreviewResult,
  });
}