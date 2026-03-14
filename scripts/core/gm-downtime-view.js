export function createGmDowntimeViewAccess({
  downtimeEntrySortOptions = [],
  downtimeLogSortOptions = [],
  sessionStorageRef = globalThis.sessionStorage ?? null,
  resolveUserId = () => globalThis.game?.user?.id ?? "anon"
} = {}) {
  const allowedEntrySortValues = new Set(downtimeEntrySortOptions.map((entry) => entry.value));
  const allowedLogSortValues = new Set(downtimeLogSortOptions.map((entry) => entry.value));

  function getGmDowntimeViewStorageKey() {
    return `po-gm-downtime-view-${resolveUserId() ?? "anon"}`;
  }

  function normalizeDowntimeEntriesSort(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedEntrySortValues.has(normalized) ? normalized : "pending";
  }

  function normalizeDowntimeLogsSort(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedLogSortValues.has(normalized) ? normalized : "resolved-desc";
  }

  function getGmDowntimeViewState() {
    const fallback = { entriesSort: "pending", logsSort: "resolved-desc" };
    const raw = sessionStorageRef?.getItem?.(getGmDowntimeViewStorageKey());
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return {
        entriesSort: normalizeDowntimeEntriesSort(parsed?.entriesSort),
        logsSort: normalizeDowntimeLogsSort(parsed?.logsSort)
      };
    } catch {
      return fallback;
    }
  }

  function setGmDowntimeViewState(patch = {}) {
    const previous = getGmDowntimeViewState();
    const next = {
      entriesSort: patch?.entriesSort === undefined
        ? previous.entriesSort
        : normalizeDowntimeEntriesSort(patch.entriesSort),
      logsSort: patch?.logsSort === undefined
        ? previous.logsSort
        : normalizeDowntimeLogsSort(patch.logsSort)
    };
    sessionStorageRef?.setItem?.(getGmDowntimeViewStorageKey(), JSON.stringify(next));
    return next;
  }

  return {
    getGmDowntimeViewStorageKey,
    normalizeDowntimeEntriesSort,
    normalizeDowntimeLogsSort,
    getGmDowntimeViewState,
    setGmDowntimeViewState
  };
}
