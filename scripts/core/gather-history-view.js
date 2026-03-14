export function createGatherHistoryView({
  gatherHistorySortOptions = [],
  gatherHistoryResultFilterOptions = [],
  gatherHistoryResourceFilterOptions = [],
  gatherEnvironmentKeys = [],
  gatherEnvironmentLabels = {},
  normalizeGatherEnvironmentKey = (value) => String(value ?? "").trim().toLowerCase(),
  normalizeGatherResourceType = (value) => String(value ?? "").trim().toLowerCase(),
  getGatherResourceTypeLabel = (value) => String(value ?? "").trim(),
  formatGatherFlagLabel = (value) => String(value ?? "").trim(),
  formatGatherComplicationLabel = (value) => String(value ?? "").trim(),
  sessionStorageRef = globalThis.sessionStorage ?? null,
  resolveUserId = () => globalThis.game?.user?.id ?? "anon",
  randomId = () => globalThis.foundry?.utils?.randomID?.() ?? `${Date.now()}`,
  getNow = () => Date.now(),
  createDate = (value) => new Date(value)
} = {}) {
  const allowedSortValues = new Set(gatherHistorySortOptions.map((entry) => entry.value));
  const allowedResultValues = new Set(gatherHistoryResultFilterOptions.map((entry) => entry.value));
  const allowedResourceValues = new Set(gatherHistoryResourceFilterOptions.map((entry) => entry.value));

  function getGatherHistoryViewStorageKey() {
    return `po-gather-history-view-${resolveUserId() ?? "anon"}`;
  }

  function normalizeGatherHistorySort(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedSortValues.has(normalized) ? normalized : "newest";
  }

  function normalizeGatherHistoryResultFilter(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedResultValues.has(normalized) ? normalized : "all";
  }

  function normalizeGatherHistoryResourceFilter(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedResourceValues.has(normalized) ? normalized : "all";
  }

  function normalizeGatherHistoryEnvironmentFilter(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "all") return "all";
    return gatherEnvironmentKeys.includes(normalized) ? normalized : "all";
  }

  function normalizeGatherHistoryActorFilter(value) {
    const normalized = String(value ?? "").trim().toLowerCase().slice(0, 120);
    return normalized || "all";
  }

  function normalizeGatherHistorySearch(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function getFallbackViewState() {
    return {
      search: "",
      result: "all",
      resource: "all",
      environment: "all",
      actor: "all",
      sort: "newest"
    };
  }

  function getGatherHistoryViewState() {
    const fallback = getFallbackViewState();
    const raw = sessionStorageRef?.getItem?.(getGatherHistoryViewStorageKey());
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return {
        search: normalizeGatherHistorySearch(parsed?.search),
        result: normalizeGatherHistoryResultFilter(parsed?.result),
        resource: normalizeGatherHistoryResourceFilter(parsed?.resource),
        environment: normalizeGatherHistoryEnvironmentFilter(parsed?.environment),
        actor: normalizeGatherHistoryActorFilter(parsed?.actor),
        sort: normalizeGatherHistorySort(parsed?.sort)
      };
    } catch {
      return fallback;
    }
  }

  function setGatherHistoryViewState(patch = {}) {
    const previous = getGatherHistoryViewState();
    const next = {
      search: patch?.search === undefined ? previous.search : normalizeGatherHistorySearch(patch.search),
      result: patch?.result === undefined ? previous.result : normalizeGatherHistoryResultFilter(patch.result),
      resource: patch?.resource === undefined ? previous.resource : normalizeGatherHistoryResourceFilter(patch.resource),
      environment: patch?.environment === undefined ? previous.environment : normalizeGatherHistoryEnvironmentFilter(patch.environment),
      actor: patch?.actor === undefined ? previous.actor : normalizeGatherHistoryActorFilter(patch.actor),
      sort: patch?.sort === undefined ? previous.sort : normalizeGatherHistorySort(patch.sort)
    };
    sessionStorageRef?.setItem?.(getGatherHistoryViewStorageKey(), JSON.stringify(next));
    return next;
  }

  function buildGatherHistoryContext(resourcesState = null, options = {}) {
    const rows = Array.isArray(resourcesState?.gather?.history) ? resourcesState.gather.history : [];
    const viewStateRaw = options?.viewState ?? getGatherHistoryViewState();
    const viewState = {
      search: normalizeGatherHistorySearch(viewStateRaw?.search),
      result: normalizeGatherHistoryResultFilter(viewStateRaw?.result),
      resource: normalizeGatherHistoryResourceFilter(viewStateRaw?.resource),
      environment: normalizeGatherHistoryEnvironmentFilter(viewStateRaw?.environment),
      actor: normalizeGatherHistoryActorFilter(viewStateRaw?.actor),
      sort: normalizeGatherHistorySort(viewStateRaw?.sort)
    };

    const mappedRows = rows.map((entry) => {
      const source = entry && typeof entry === "object" ? entry : {};
      const fallbackNow = getNow();
      const timestamp = Number(source.timestamp ?? fallbackNow);
      const safeTimestamp = Number.isFinite(timestamp) ? timestamp : fallbackNow;
      const timestampDate = createDate(safeTimestamp);
      const success = String(source.result ?? "").trim().toLowerCase() === "success" || source.success === true;
      const environment = normalizeGatherEnvironmentKey(source.environment);
      const environmentLabel = gatherEnvironmentLabels[environment] ?? environment;
      const resourceType = normalizeGatherResourceType(source.resourceType);
      const resourceTypeLabel = getGatherResourceTypeLabel(resourceType);
      const flags = Array.isArray(source.flags) ? source.flags : [];
      const complications = Array.isArray(source.complications) ? source.complications : [];
      const notes = Array.isArray(source.notes) ? source.notes : [];
      const detailParts = [];
      if (flags.length > 0) detailParts.push(`Flags: ${flags.map((flag) => formatGatherFlagLabel(flag)).join(", ")}`);
      if (complications.length > 0) detailParts.push(`Complications: ${complications.map((flag) => formatGatherComplicationLabel(flag)).join(", ")}`);
      if (notes.length > 0) detailParts.push(`Notes: ${notes.join(" | ")}`);
      const inventoryGainAmount = Math.max(0, Number(source.inventoryGainAmount ?? 0) || 0);
      const inventoryGainSource = String(source.inventoryGainSource ?? "").trim();
      const requesterName = String(source.requesterName ?? "").trim();
      const approvedBy = String(source.approvedBy ?? "").trim();
      const rationDieTotal = Number(source.rationDieTotal);
      const yieldRolledBy = String(source.yieldRolledBy ?? "").trim();
      if (inventoryGainAmount > 0) {
        const sourceLabel = inventoryGainSource ? ` (${inventoryGainSource})` : "";
        detailParts.push(`Inventory +${inventoryGainAmount}${sourceLabel}`);
      }
      if (requesterName) detailParts.push(`Requested by ${requesterName}`);
      if (approvedBy) detailParts.push(`Approved by ${approvedBy}`);
      if (Number.isFinite(rationDieTotal)) {
        const yieldByLabel = yieldRolledBy ? ` by ${yieldRolledBy}` : "";
        detailParts.push(`Yield d6 ${Math.max(1, Math.floor(rationDieTotal))}${yieldByLabel}`);
      }
      if (source.appliedToLedger === false && Math.max(0, Number(source.rations ?? 0) || 0) > 0) {
        detailParts.push("Not applied to party pools");
      }

      const checkTotal = Number(source.checkTotal ?? 0);
      const dc = Number(source.dc ?? 0);
      const rollLabel = Number.isFinite(checkTotal) ? `${Math.floor(checkTotal)}` : "-";
      const dcLabel = Number.isFinite(dc) ? `${Math.max(1, Math.floor(dc))}` : "-";
      const actorName = String(source.actorName ?? "Unknown Actor").trim() || "Unknown Actor";
      const actorKey = actorName.toLowerCase();
      const rations = Math.max(0, Math.floor(Number(source.rations ?? 0) || 0));
      const detailsText = detailParts.length > 0 ? detailParts.join(" - ") : "-";
      const createdBy = String(source.createdBy ?? "GM").trim() || "GM";
      const dayKey = String(source.dayKey ?? "").trim();
      const resultKey = success ? "success" : "fail";
      const resultLabel = success ? "Success" : "Fail";

      return {
        id: String(source.id ?? randomId()).trim() || randomId(),
        timestamp: safeTimestamp,
        timestampLabel: Number.isFinite(timestampDate.getTime()) ? timestampDate.toLocaleString() : "Unknown",
        dayKey,
        actorName,
        actorKey,
        environment,
        environmentLabel,
        resultKey,
        resultLabel,
        resultClass: success ? "is-success" : "is-fail",
        isSuccess: success,
        rollVsDc: `${rollLabel} vs ${dcLabel}`,
        resourceType,
        resourceTypeLabel,
        rations,
        detailsText,
        createdBy,
        searchText: `${actorName} ${environmentLabel} ${resultLabel} ${resourceTypeLabel} ${detailsText} ${dayKey} ${createdBy}`.toLowerCase()
      };
    });

    const actorMap = new Map();
    for (const row of mappedRows) {
      if (!row.actorKey || row.actorKey === "all") continue;
      if (!actorMap.has(row.actorKey)) actorMap.set(row.actorKey, row.actorName);
    }
    if (viewState.actor !== "all" && !actorMap.has(viewState.actor)) {
      viewState.actor = "all";
    }

    const filteredRows = mappedRows
      .filter((row) => {
        if (viewState.result !== "all" && row.resultKey !== viewState.result) return false;
        if (viewState.resource !== "all" && row.resourceType !== viewState.resource) return false;
        if (viewState.environment !== "all" && row.environment !== viewState.environment) return false;
        if (viewState.actor !== "all" && row.actorKey !== viewState.actor) return false;
        if (viewState.search && !row.searchText.includes(viewState.search.toLowerCase())) return false;
        return true;
      })
      .sort((left, right) => {
        switch (viewState.sort) {
          case "oldest":
            return Number(left.timestamp ?? 0) - Number(right.timestamp ?? 0);
          case "actor-asc": {
            const nameCompare = String(left.actorName ?? "").localeCompare(String(right.actorName ?? ""));
            if (nameCompare !== 0) return nameCompare;
            return Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0);
          }
          case "actor-desc": {
            const nameCompare = String(right.actorName ?? "").localeCompare(String(left.actorName ?? ""));
            if (nameCompare !== 0) return nameCompare;
            return Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0);
          }
          case "rations-asc": {
            const rationCompare = Number(left.rations ?? 0) - Number(right.rations ?? 0);
            if (rationCompare !== 0) return rationCompare;
            return Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0);
          }
          case "rations-desc": {
            const rationCompare = Number(right.rations ?? 0) - Number(left.rations ?? 0);
            if (rationCompare !== 0) return rationCompare;
            return Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0);
          }
          case "newest":
          default:
            return Number(right.timestamp ?? 0) - Number(left.timestamp ?? 0);
        }
      });

    const actorOptions = [
      { value: "all", label: "All Actors", selected: viewState.actor === "all" },
      ...Array.from(actorMap.entries())
        .sort((left, right) => String(left[1] ?? "").localeCompare(String(right[1] ?? "")))
        .map(([value, label]) => ({
          value,
          label,
          selected: viewState.actor === value
        }))
    ];

    const environmentOptions = [
      { value: "all", label: "All Environments", selected: viewState.environment === "all" },
      ...gatherEnvironmentKeys.map((key) => ({
        value: key,
        label: gatherEnvironmentLabels[key] ?? key,
        selected: viewState.environment === key
      }))
    ];

    return {
      rows: filteredRows,
      hasRows: filteredRows.length > 0,
      hasAnyRows: mappedRows.length > 0,
      totalCount: mappedRows.length,
      visibleCount: filteredRows.length,
      hiddenCount: Math.max(0, mappedRows.length - filteredRows.length),
      hasActiveFilters: Boolean(
        viewState.search
        || viewState.result !== "all"
        || viewState.resource !== "all"
        || viewState.environment !== "all"
        || viewState.actor !== "all"
      ),
      emptyMessage: mappedRows.length > 0
        ? "No gather checks match the current filters."
        : "No gather checks logged yet.",
      sortOptions: gatherHistorySortOptions.map((entry) => ({
        value: entry.value,
        label: entry.label,
        selected: viewState.sort === entry.value
      })),
      resultOptions: gatherHistoryResultFilterOptions.map((entry) => ({
        value: entry.value,
        label: entry.label,
        selected: viewState.result === entry.value
      })),
      resourceOptions: gatherHistoryResourceFilterOptions.map((entry) => ({
        value: entry.value,
        label: entry.label,
        selected: viewState.resource === entry.value
      })),
      environmentOptions,
      actorOptions,
      filters: {
        ...viewState,
        searchPlaceholder: "Filter by actor, note, or result"
      }
    };
  }

  return {
    getGatherHistoryViewStorageKey,
    normalizeGatherHistorySort,
    normalizeGatherHistoryResultFilter,
    normalizeGatherHistoryResourceFilter,
    normalizeGatherHistoryEnvironmentFilter,
    normalizeGatherHistoryActorFilter,
    normalizeGatherHistorySearch,
    getGatherHistoryViewState,
    setGatherHistoryViewState,
    buildGatherHistoryContext
  };
}
