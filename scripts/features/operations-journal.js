import {
  getCurrentUserId,
  readSessionValue,
  writeSessionValue
} from "../core/browser-session-state.js";

function getGame() {
  return globalThis.game ?? {};
}

// Encapsulate operations-journal view state and context building behind a small feature boundary.
export function createOperationsJournalFeature({
  journalSortOptions = [],
  journalCategories = {},
  operationsJournalRootName = "Party Operations Logs",
  getJournalFilterDebounceMs = () => 180,
  getJournalFolderParentId = () => "",
  findOperationsJournalRootFolder = () => null,
  journalFolderIsUnderRoot = () => false,
  openJournalEntryFromElement = null,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window) ?? globalThis.setTimeout?.bind(globalThis),
  clearTimeoutFn = globalThis.window?.clearTimeout?.bind(globalThis.window) ?? globalThis.clearTimeout?.bind(globalThis)
} = {}) {
  const debounceTimers = new WeakMap();
  const allowedSorts = new Set(
    Array.isArray(journalSortOptions)
      ? journalSortOptions.map((entry) => String(entry?.value ?? "").trim().toLowerCase()).filter(Boolean)
      : []
  );
  const allowedCategories = new Set(["all", ...Object.keys(journalCategories)]);

  function getOperationsJournalViewStorageKey() {
    return `po-operations-journal-view-${getCurrentUserId()}`;
  }

  function normalizeJournalSort(value) {
    const normalized = String(value ?? "newest").trim().toLowerCase();
    return allowedSorts.has(normalized) ? normalized : "newest";
  }

  function normalizeJournalCategory(value) {
    const normalized = String(value ?? "all").trim().toLowerCase();
    return allowedCategories.has(normalized) ? normalized : "all";
  }

  function getOperationsJournalViewState() {
    const fallback = { filter: "", sort: "newest", category: "all" };
    const raw = readSessionValue(getOperationsJournalViewStorageKey());
    if (!raw) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return {
        filter: String(parsed?.filter ?? "").trim(),
        sort: normalizeJournalSort(parsed?.sort),
        category: normalizeJournalCategory(parsed?.category)
      };
    } catch {
      return fallback;
    }
  }

  function setOperationsJournalViewState(patch = {}) {
    const previous = getOperationsJournalViewState();
    const next = {
      ...previous,
      ...patch
    };
    next.filter = String(next.filter ?? "").trim();
    next.sort = normalizeJournalSort(next.sort);
    next.category = normalizeJournalCategory(next.category);
    writeSessionValue(getOperationsJournalViewStorageKey(), JSON.stringify(next));
    return next;
  }

  function buildJournalSortOptions(selectedSort = "newest") {
    const selected = normalizeJournalSort(selectedSort);
    return journalSortOptions.map((entry) => ({
      value: entry.value,
      label: entry.label,
      selected: entry.value === selected
    }));
  }

  function buildJournalCategoryOptions(selectedCategory = "all") {
    const selected = normalizeJournalCategory(selectedCategory);
    return [
      { value: "all", label: "All Categories", selected: selected === "all" },
      ...Object.entries(journalCategories).map(([value, label]) => ({
        value,
        label,
        selected: selected === value
      }))
    ];
  }

  function scheduleOperationsJournalFilterUpdate(app, value, rerender) {
    if (!app) return;
    const existing = debounceTimers.get(app);
    if (existing && typeof clearTimeoutFn === "function") clearTimeoutFn(existing);
    const runUpdate = () => {
      setOperationsJournalViewState({ filter: String(value ?? "") });
      try {
        rerender?.();
      } finally {
        debounceTimers.delete(app);
      }
    };
    const delay = Number(getJournalFilterDebounceMs?.() ?? 180);
    if (typeof setTimeoutFn !== "function") {
      runUpdate();
      return;
    }
    const timer = setTimeoutFn(runUpdate, delay);
    debounceTimers.set(app, timer);
  }

  async function handleOperationsJournalAction(action, element, rerender) {
    const actionKey = String(action ?? "").trim();
    if (!actionKey) return false;
    if (actionKey === "set-journal-filter") {
      setOperationsJournalViewState({ filter: String(element?.value ?? "") });
      rerender?.();
      return true;
    }
    if (actionKey === "set-journal-sort") {
      setOperationsJournalViewState({ sort: String(element?.value ?? "newest") });
      rerender?.();
      return true;
    }
    if (actionKey === "set-journal-category") {
      setOperationsJournalViewState({ category: String(element?.value ?? "all") });
      rerender?.();
      return true;
    }
    if (actionKey === "open-journal-entry" && typeof openJournalEntryFromElement === "function") {
      await openJournalEntryFromElement(element);
      return true;
    }
    return false;
  }

  function buildOperationsJournalContext() {
    const gameRef = getGame();
    const view = getOperationsJournalViewState();
    const root = findOperationsJournalRootFolder();
    const rootFolderId = String(root?.id ?? "").trim();
    const rootFolderName = String(root?.name ?? operationsJournalRootName).trim() || operationsJournalRootName;
    const selectedCategory = normalizeJournalCategory(view?.category);
    const filterNeedle = String(view?.filter ?? "").trim().toLowerCase();
    const selectedSort = normalizeJournalSort(view?.sort);

    const resolveEntryFolder = (entry) => {
      const folderId = String(entry?.folder?.id ?? entry?.folder ?? "").trim();
      return folderId ? gameRef.folders?.get(folderId) ?? null : null;
    };

    const resolveCategoryForEntry = (entryFolder) => {
      const folder = entryFolder;
      if (!folder) {
        return {
          key: "session",
          label: String(journalCategories.session ?? "Session")
        };
      }

      let current = folder;
      let guard = 0;
      while (current && guard < 40) {
        const parentId = getJournalFolderParentId(current);
        if (parentId === rootFolderId) {
          const label = String(current.name ?? "").trim();
          const key = Object.entries(journalCategories)
            .find(([, value]) => String(value ?? "").trim().toLowerCase() === label.toLowerCase())?.[0] ?? "session";
          return {
            key,
            label: label || String(journalCategories[key] ?? journalCategories.session ?? "Session")
          };
        }
        current = parentId ? gameRef.folders?.get(parentId) ?? null : null;
        guard += 1;
      }

      return {
        key: "session",
        label: String(journalCategories.session ?? "Session")
      };
    };

    const rows = (gameRef.journal?.contents ?? [])
      .filter((entry) => {
        if (!entry || !rootFolderId) return false;
        const entryFolder = resolveEntryFolder(entry);
        const entryFolderId = String(entryFolder?.id ?? "").trim();
        return journalFolderIsUnderRoot(entryFolderId, rootFolderId);
      })
      .map((entry) => {
        const name = String(entry?.name ?? "Untitled").trim() || "Untitled";
        const entryFolder = resolveEntryFolder(entry);
        const folderLabel = String(entryFolder?.name ?? "Unfiled").trim() || "Unfiled";
        const category = resolveCategoryForEntry(entryFolder);
        const updatedAtRaw = Number(entry?._stats?.modifiedTime ?? entry?._stats?.createdTime ?? Date.now());
        const updatedAt = Number.isFinite(updatedAtRaw) ? updatedAtRaw : Date.now();
        const updatedAtDate = new Date(updatedAt);
        const searchBlob = [name, folderLabel, category.label, category.key].join(" ").toLowerCase();
        return {
          id: String(entry?.id ?? "").trim(),
          name,
          folderLabel,
          categoryKey: category.key,
          categoryLabel: category.label,
          updatedAt,
          updatedAtLabel: Number.isFinite(updatedAtDate.getTime()) ? updatedAtDate.toLocaleString() : "Unknown",
          searchBlob
        };
      })
      .filter((row) => {
        if (selectedCategory !== "all" && row.categoryKey !== selectedCategory) return false;
        if (filterNeedle && !row.searchBlob.includes(filterNeedle)) return false;
        return true;
      });

    const sortedRows = [...rows].sort((left, right) => {
      if (selectedSort === "oldest") return Number(left.updatedAt) - Number(right.updatedAt);
      if (selectedSort === "title") return String(left.name ?? "").localeCompare(String(right.name ?? ""));
      if (selectedSort === "folder") {
        const folderCompare = String(left.folderLabel ?? "").localeCompare(String(right.folderLabel ?? ""));
        if (folderCompare !== 0) return folderCompare;
        return String(left.name ?? "").localeCompare(String(right.name ?? ""));
      }
      return Number(right.updatedAt) - Number(left.updatedAt);
    });

    return {
      rootFolderName,
      hasRootFolder: Boolean(rootFolderId),
      selectedFilter: String(view?.filter ?? ""),
      selectedSort,
      selectedCategory,
      sortOptions: buildJournalSortOptions(selectedSort),
      categoryOptions: buildJournalCategoryOptions(selectedCategory),
      rows: sortedRows,
      visibleCount: sortedRows.length,
      totalCount: rows.length,
      hasRows: sortedRows.length > 0,
      hasFilter: Boolean(filterNeedle)
    };
  }

  return {
    getOperationsJournalViewState,
    setOperationsJournalViewState,
    buildJournalSortOptions,
    buildJournalCategoryOptions,
    scheduleOperationsJournalFilterUpdate,
    handleOperationsJournalAction,
    buildOperationsJournalContext
  };
}
