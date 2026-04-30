/**
 * Reputation draft storage — builder draft, filter state, and note-log selection
 * persisted to sessionStorage.
 *
 * Factory params:
 *   gameRef    — live `game` reference (for game.user?.id)
 *   storage    — sessionStorage-compatible object
 *   randomIdFn — () => string  (e.g. foundry.utils.randomID)
 *   deepCloneFn — (obj) => obj  (e.g. foundry.utils.deepClone)
 */
export function createReputationDraftStorage({
  gameRef,
  storage,
  randomIdFn = () => Math.random().toString(36).slice(2),
  deepCloneFn = (v) => JSON.parse(JSON.stringify(v))
} = {}) {
  // ── Storage key helpers ──────────────────────────────────────────────────

  function getReputationFilterStorageKey() {
    return `po-reputation-filter-${gameRef.user?.id ?? "anon"}`;
  }

  function getReputationNoteLogSelectionStorageKey() {
    return `po-reputation-note-log-selection-${gameRef.user?.id ?? "anon"}`;
  }

  function getReputationBuilderStorageKey() {
    return `po-reputation-builder-${gameRef.user?.id ?? "anon"}`;
  }

  // ── Note-log selection persistence ──────────────────────────────────────

  function getReputationNoteLogSelections() {
    const raw = storage.getItem(getReputationNoteLogSelectionStorageKey());
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const normalized = {};
      for (const [factionId, logId] of Object.entries(parsed)) {
        const key = String(factionId ?? "").trim();
        if (!key) continue;
        const value = String(logId ?? "").trim();
        if (!value) continue;
        normalized[key] = value;
      }
      return normalized;
    } catch {
      return {};
    }
  }

  function setReputationNoteLogSelection(factionIdInput, logIdInput) {
    const factionId = String(factionIdInput ?? "").trim();
    if (!factionId) return "";
    const logId = String(logIdInput ?? "").trim();
    const state = getReputationNoteLogSelections();
    if (!logId) {
      delete state[factionId];
    } else {
      state[factionId] = logId;
    }
    storage.setItem(getReputationNoteLogSelectionStorageKey(), JSON.stringify(state));
    return logId;
  }

  function getReputationNoteLogSelection(factionIdInput) {
    const factionId = String(factionIdInput ?? "").trim();
    if (!factionId) return "";
    const state = getReputationNoteLogSelections();
    return String(state[factionId] ?? "").trim();
  }

  // ── Value helpers ────────────────────────────────────────────────────────

  function clampReputationStandingValue(value) {
    const numeric = Number(value ?? 0);
    return Number.isFinite(numeric) ? Math.max(-5, Math.min(5, Math.floor(numeric))) : 0;
  }

  const REPUTATION_VIEW_SCOPES = Object.freeze({
    OPERATIONS: "operations",
    GM: "gm"
  });

  function normalizeReputationViewScope(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase() === REPUTATION_VIEW_SCOPES.GM
      ? REPUTATION_VIEW_SCOPES.GM
      : REPUTATION_VIEW_SCOPES.OPERATIONS;
  }

  // ── Builder draft shape helpers ──────────────────────────────────────────

  function getEmptyReputationPlayerImpact() {
    return {
      id: randomIdFn(),
      actorId: "",
      delta: 0,
      note: ""
    };
  }

  function normalizeReputationPlayerImpact(entry = {}) {
    return {
      id: String(entry?.id ?? randomIdFn()).trim() || randomIdFn(),
      actorId: String(entry?.actorId ?? "").trim(),
      delta: clampReputationStandingValue(entry?.delta ?? 0),
      note: String(entry?.note ?? "")
    };
  }

  function getDefaultReputationBuilderDraft() {
    return {
      label: "",
      category: "",
      represents: "",
      linkedActorId: "",
      score: 0,
      summary: "",
      note: "",
      playerImpacts: [getEmptyReputationPlayerImpact()]
    };
  }

  function normalizeReputationBuilderDraft(entry = {}) {
    const impacts = Array.isArray(entry?.playerImpacts)
      ? entry.playerImpacts.map((row) => normalizeReputationPlayerImpact(row)).slice(0, 12)
      : [];
    return {
      label: String(entry?.label ?? "")
        .trim()
        .slice(0, 120),
      category: String(entry?.category ?? "")
        .trim()
        .slice(0, 120),
      represents: String(entry?.represents ?? "")
        .trim()
        .slice(0, 180),
      linkedActorId: String(entry?.linkedActorId ?? "").trim(),
      score: clampReputationStandingValue(entry?.score ?? 0),
      summary: String(entry?.summary ?? ""),
      note: String(entry?.note ?? ""),
      playerImpacts: impacts.length ? impacts : [getEmptyReputationPlayerImpact()]
    };
  }

  // ── Builder state persistence ────────────────────────────────────────────

  function getReputationBuilderState() {
    const raw = storage.getItem(getReputationBuilderStorageKey());
    if (!raw) return getDefaultReputationBuilderDraft();
    try {
      return normalizeReputationBuilderDraft(JSON.parse(raw));
    } catch {
      return getDefaultReputationBuilderDraft();
    }
  }

  function saveReputationBuilderState(draft = {}) {
    const next = normalizeReputationBuilderDraft(draft);
    storage.setItem(getReputationBuilderStorageKey(), JSON.stringify(next));
    return next;
  }

  function updateReputationBuilderState(mutator) {
    const next = deepCloneFn(getReputationBuilderState());
    if (typeof mutator === "function") mutator(next);
    return saveReputationBuilderState(next);
  }

  function clearReputationBuilderState() {
    storage.removeItem(getReputationBuilderStorageKey());
    return getDefaultReputationBuilderDraft();
  }

  // ── Filter state persistence ─────────────────────────────────────────────

  function getReputationFilterState() {
    const defaults = { keyword: "", standing: "all" };
    const raw = storage.getItem(getReputationFilterStorageKey());
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      return {
        keyword: String(parsed?.keyword ?? ""),
        standing: String(parsed?.standing ?? "all")
      };
    } catch {
      return defaults;
    }
  }

  function setReputationFilterState(patch = {}) {
    const previous = getReputationFilterState();
    const next = {
      keyword: String(patch.keyword ?? previous.keyword ?? ""),
      standing: String(patch.standing ?? previous.standing ?? "all")
    };
    storage.setItem(getReputationFilterStorageKey(), JSON.stringify(next));
  }

  return Object.freeze({
    clearReputationBuilderState,
    clampReputationStandingValue,
    getDefaultReputationBuilderDraft,
    getEmptyReputationPlayerImpact,
    getReputationBuilderState,
    getReputationBuilderStorageKey,
    getReputationFilterState,
    getReputationFilterStorageKey,
    getReputationNoteLogSelection,
    getReputationNoteLogSelections,
    getReputationNoteLogSelectionStorageKey,
    normalizeReputationBuilderDraft,
    normalizeReputationPlayerImpact,
    normalizeReputationViewScope,
    REPUTATION_VIEW_SCOPES,
    saveReputationBuilderState,
    setReputationFilterState,
    setReputationNoteLogSelection,
    updateReputationBuilderState
  });
}
