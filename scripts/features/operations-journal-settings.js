// Encapsulate journal-related settings reads so UI and services do not reach into game.settings directly.
export function createOperationsJournalSettings({
  moduleId = "party-operations",
  settings = {},
  journalVisibilityModes = {},
  sessionSummaryRangeOptions = {},
  gameRef = globalThis.game ?? {}
} = {}) {
  function getJournalVisibilityMode() {
    const raw = String(
      gameRef.settings?.get?.(moduleId, settings.JOURNAL_ENTRY_VISIBILITY)
      ?? journalVisibilityModes.PUBLIC
    ).trim().toLowerCase();
    if (raw === journalVisibilityModes.GM_PRIVATE) return journalVisibilityModes.GM_PRIVATE;
    if (raw === journalVisibilityModes.REDACTED) return journalVisibilityModes.REDACTED;
    return journalVisibilityModes.PUBLIC;
  }

  function getJournalFilterDebounceMs() {
    const raw = Number(gameRef.settings?.get?.(moduleId, settings.JOURNAL_FILTER_DEBOUNCE_MS) ?? 180);
    if (!Number.isFinite(raw)) return 180;
    return Math.max(0, Math.min(1000, Math.floor(raw)));
  }

  function getSessionSummaryRangeSetting() {
    const raw = String(gameRef.settings?.get?.(moduleId, settings.SESSION_SUMMARY_RANGE) ?? "last-24h").trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(sessionSummaryRangeOptions, raw) ? raw : "last-24h";
  }

  function getSessionSummaryWindowBounds() {
    const mode = getSessionSummaryRangeSetting();
    const now = Date.now();
    if (mode === "last-7d") {
      return { mode, start: now - (7 * 86400000), end: now, label: sessionSummaryRangeOptions[mode] };
    }
    if (mode === "today") {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      return { mode, start: Number(startDate.getTime()), end: now, label: sessionSummaryRangeOptions[mode] };
    }
    return { mode: "last-24h", start: now - 86400000, end: now, label: sessionSummaryRangeOptions["last-24h"] };
  }

  return {
    getJournalVisibilityMode,
    getJournalFilterDebounceMs,
    getSessionSummaryRangeSetting,
    getSessionSummaryWindowBounds
  };
}
