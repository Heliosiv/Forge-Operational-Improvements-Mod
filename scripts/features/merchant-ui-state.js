export const DEFAULT_MERCHANT_GM_VIEW_TABS = Object.freeze({
  CITY: "city-editor",
  EDITOR: "editor",
  SETTINGS: "settings",
  CONFIGURED: "configured-merchants",
  SHOP: "shop-session"
});

function getGame() {
  return globalThis.game ?? {};
}

function getCurrentUserId() {
  return String(getGame().user?.id ?? "anon").trim() || "anon";
}

function getSessionStorage() {
  return globalThis.sessionStorage ?? null;
}

function readSessionValue(key) {
  try {
    return getSessionStorage()?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function writeSessionValue(key, value) {
  try {
    getSessionStorage()?.setItem?.(key, value);
  } catch {
    // Ignore transient browser storage failures for UI-only state.
  }
}

function removeSessionValue(key) {
  try {
    getSessionStorage()?.removeItem?.(key);
  } catch {
    // Ignore transient browser storage failures for UI-only state.
  }
}

function isCheckboxInput(element) {
  return typeof HTMLInputElement !== "undefined"
    && element instanceof HTMLInputElement
    && String(element.type ?? "").toLowerCase() === "checkbox";
}

// Encapsulate browser-scoped merchant UI state behind injected domain callbacks.
export function createMerchantUiState({
  moduleId = "party-operations",
  merchantGmViewTabs = DEFAULT_MERCHANT_GM_VIEW_TABS,
  merchantGmFilterAccessValues = { ALL: "all", PUBLIC: "public", ASSIGNED: "assigned" },
  merchantGmFilterStockValues = { ALL: "all", STOCKED: "stocked", EMPTY: "empty" },
  normalizeMerchantSettlementSelection,
  getMerchantDefinitionDraftSource,
  getCurrentSettlement = () => ""
} = {}) {
  if (typeof normalizeMerchantSettlementSelection !== "function") {
    throw new Error("createMerchantUiState requires normalizeMerchantSettlementSelection");
  }
  if (typeof getMerchantDefinitionDraftSource !== "function") {
    throw new Error("createMerchantUiState requires getMerchantDefinitionDraftSource");
  }

  function getMerchantActorStorageKey() {
    return `po-merchant-actor-${getCurrentUserId()}`;
  }

  function normalizeMerchantActorId(value) {
    return String(value ?? "").trim();
  }

  function getSelectedMerchantActorId() {
    return normalizeMerchantActorId(readSessionValue(getMerchantActorStorageKey()));
  }

  function setSelectedMerchantActorId(actorIdInput) {
    const actorId = normalizeMerchantActorId(actorIdInput);
    if (!actorId) {
      removeSessionValue(getMerchantActorStorageKey());
      return "";
    }
    writeSessionValue(getMerchantActorStorageKey(), actorId);
    return actorId;
  }

  function setSelectedMerchantActorFromElement(element) {
    const nextActorId = normalizeMerchantActorId(element?.value);
    const currentActorId = getSelectedMerchantActorId();
    if (nextActorId === currentActorId) return false;
    setSelectedMerchantActorId(nextActorId);
    return true;
  }

  function getMerchantSettlementStorageKey() {
    return `po-merchant-settlement-${getCurrentUserId()}`;
  }

  function getMerchantSettlementAllValue() {
    return "__all__";
  }

  function hasSelectedMerchantSettlementPreference() {
    return readSessionValue(getMerchantSettlementStorageKey()) !== null;
  }

  function getSelectedMerchantSettlement() {
    const stored = readSessionValue(getMerchantSettlementStorageKey());
    if (stored === getMerchantSettlementAllValue()) return "";
    return normalizeMerchantSettlementSelection(stored);
  }

  function setSelectedMerchantSettlement(settlementInput) {
    const settlement = normalizeMerchantSettlementSelection(settlementInput);
    if (!settlement) {
      writeSessionValue(getMerchantSettlementStorageKey(), getMerchantSettlementAllValue());
      return "";
    }
    writeSessionValue(getMerchantSettlementStorageKey(), settlement);
    return settlement;
  }

  function setSelectedMerchantSettlementFromElement(element) {
    const nextSettlement = normalizeMerchantSettlementSelection(element?.value);
    const currentSettlement = hasSelectedMerchantSettlementPreference()
      ? getSelectedMerchantSettlement()
      : normalizeMerchantSettlementSelection(getCurrentSettlement());
    if (nextSettlement === currentSettlement) return false;
    setSelectedMerchantSettlement(nextSettlement);
    return true;
  }

  function getMerchantTabStorageKey() {
    return `po-merchant-tab-${getCurrentUserId()}`;
  }

  function normalizeMerchantTabId(value) {
    return String(value ?? "").trim();
  }

  function getSelectedMerchantTabId() {
    return normalizeMerchantTabId(readSessionValue(getMerchantTabStorageKey()));
  }

  function setSelectedMerchantTabId(merchantIdInput) {
    const merchantId = normalizeMerchantTabId(merchantIdInput);
    if (!merchantId) {
      removeSessionValue(getMerchantTabStorageKey());
      return "";
    }
    writeSessionValue(getMerchantTabStorageKey(), merchantId);
    return merchantId;
  }

  function setSelectedMerchantTabIdFromElement(element) {
    const nextMerchantId = normalizeMerchantTabId(element?.dataset?.merchantId ?? element?.value);
    const currentMerchantId = getSelectedMerchantTabId();
    if (nextMerchantId === currentMerchantId) return false;
    setSelectedMerchantTabId(nextMerchantId);
    return true;
  }

  function getMerchantEditorStorageKey() {
    return `po-merchant-editor-${getCurrentUserId()}`;
  }

  function getMerchantEditorSelection() {
    return String(readSessionValue(getMerchantEditorStorageKey()) ?? "").trim();
  }

  function getMerchantEditorPersistedId(fallbackInput = "") {
    const selection = getMerchantEditorSelection();
    if (selection === "__new__") return "";
    const fallback = String(fallbackInput ?? "").trim();
    return selection || fallback;
  }

  function getMerchantEditorDraftStorageKey() {
    return `po-merchant-editor-draft-${getCurrentUserId()}`;
  }

  function normalizeMerchantEditorSelectionKey(value) {
    const normalized = String(value ?? "").trim();
    return normalized || "__new__";
  }

  function getMerchantEditorDraftState() {
    const raw = readSessionValue(getMerchantEditorDraftStorageKey());
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      const selectionKey = normalizeMerchantEditorSelectionKey(parsed.selectionKey);
      const draft = getMerchantDefinitionDraftSource(parsed.draft ?? {});
      if (selectionKey === "__new__") draft.id = "";
      return { selectionKey, draft };
    } catch {
      return null;
    }
  }

  function setMerchantEditorDraftState(selectionKeyInput, draftInput = {}) {
    const selectionKey = normalizeMerchantEditorSelectionKey(selectionKeyInput);
    const draft = getMerchantDefinitionDraftSource(draftInput ?? {});
    if (selectionKey === "__new__") draft.id = "";
    writeSessionValue(getMerchantEditorDraftStorageKey(), JSON.stringify({
      selectionKey,
      draft
    }));
    return { selectionKey, draft };
  }

  function clearMerchantEditorDraftState() {
    removeSessionValue(getMerchantEditorDraftStorageKey());
  }

  function setMerchantEditorSelection(merchantIdInput) {
    const merchantId = String(merchantIdInput ?? "").trim();
    const previous = getMerchantEditorSelection();
    if (!merchantId) {
      removeSessionValue(getMerchantEditorStorageKey());
      clearMerchantEditorDraftState();
      return "";
    }
    writeSessionValue(getMerchantEditorStorageKey(), merchantId);
    if (merchantId !== previous) clearMerchantEditorDraftState();
    return merchantId;
  }

  function getMerchantCityCatalogDraftStorageKey() {
    const worldId = String(getGame().world?.id ?? "world").trim() || "world";
    const userId = getCurrentUserId();
    return `${moduleId}.merchantCityCatalogDraft.${worldId}.${userId}`;
  }

  function getMerchantCityCatalogDraftValue() {
    const raw = readSessionValue(getMerchantCityCatalogDraftStorageKey());
    if (raw === null || raw === undefined) return null;
    return String(raw);
  }

  function setMerchantCityCatalogDraftValue(value) {
    const text = String(value ?? "");
    writeSessionValue(getMerchantCityCatalogDraftStorageKey(), text);
    return text;
  }

  function clearMerchantCityCatalogDraftValue() {
    removeSessionValue(getMerchantCityCatalogDraftStorageKey());
  }

  function getMerchantEditorViewTabStorageKey() {
    return `po-merchant-editor-view-tab-${getCurrentUserId()}`;
  }

  function normalizeMerchantEditorViewTab(value, fallback = "editor") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === "settings") return "settings";
    if (normalized === "editor") return "editor";
    return normalizeMerchantEditorViewTab(fallback, "editor");
  }

  function getMerchantEditorViewTab() {
    return normalizeMerchantEditorViewTab(readSessionValue(getMerchantEditorViewTabStorageKey()), "editor");
  }

  function setMerchantEditorViewTab(value) {
    const next = normalizeMerchantEditorViewTab(value, "editor");
    writeSessionValue(getMerchantEditorViewTabStorageKey(), next);
    return next;
  }

  function setMerchantEditorViewTabFromElement(element) {
    const next = normalizeMerchantEditorViewTab(element?.dataset?.tab ?? element?.value, "editor");
    const current = getMerchantEditorViewTab();
    if (next === current) return false;
    setMerchantEditorViewTab(next);
    return true;
  }

  function getMerchantGmViewTabStorageKey() {
    return `po-merchant-gm-view-tab-${getCurrentUserId()}`;
  }

  function normalizeMerchantGmViewTab(value, fallback = merchantGmViewTabs.CONFIGURED) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === merchantGmViewTabs.CITY || normalized === "city") return merchantGmViewTabs.CITY;
    if (normalized === merchantGmViewTabs.EDITOR) return merchantGmViewTabs.EDITOR;
    if (normalized === merchantGmViewTabs.SETTINGS) return merchantGmViewTabs.SETTINGS;
    if (normalized === merchantGmViewTabs.CONFIGURED || normalized === "configured") return merchantGmViewTabs.CONFIGURED;
    if (normalized === merchantGmViewTabs.SHOP || normalized === "shop") return merchantGmViewTabs.SHOP;
    return normalizeMerchantGmViewTab(fallback, merchantGmViewTabs.CONFIGURED);
  }

  function getMerchantGmViewTab() {
    return normalizeMerchantGmViewTab(readSessionValue(getMerchantGmViewTabStorageKey()), merchantGmViewTabs.CONFIGURED);
  }

  function setMerchantGmViewTab(value) {
    const next = normalizeMerchantGmViewTab(value, merchantGmViewTabs.CONFIGURED);
    writeSessionValue(getMerchantGmViewTabStorageKey(), next);
    return next;
  }

  function setMerchantGmViewTabFromElement(element) {
    const next = normalizeMerchantGmViewTab(element?.dataset?.tab ?? element?.value, merchantGmViewTabs.CONFIGURED);
    const current = getMerchantGmViewTab();
    if (next === current) return false;
    setMerchantGmViewTab(next);
    return true;
  }

  function getMerchantEditorSourceFilterStorageKey() {
    return `po-merchant-pack-filter-${getCurrentUserId()}`;
  }

  function getMerchantEditorItemFilterStorageKey() {
    return `po-merchant-item-filter-${getCurrentUserId()}`;
  }

  function normalizeMerchantEditorFilter(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function getMerchantEditorSourceFilter() {
    return normalizeMerchantEditorFilter(readSessionValue(getMerchantEditorSourceFilterStorageKey()));
  }

  function setMerchantEditorSourceFilter(value) {
    const normalized = normalizeMerchantEditorFilter(value);
    writeSessionValue(getMerchantEditorSourceFilterStorageKey(), normalized);
    return normalized;
  }

  function getMerchantEditorPackFilter() {
    return getMerchantEditorSourceFilter();
  }

  function setMerchantEditorPackFilter(value) {
    return setMerchantEditorSourceFilter(value);
  }

  function getMerchantEditorItemFilter() {
    return normalizeMerchantEditorFilter(readSessionValue(getMerchantEditorItemFilterStorageKey()));
  }

  function setMerchantEditorItemFilter(value) {
    const normalized = normalizeMerchantEditorFilter(value);
    writeSessionValue(getMerchantEditorItemFilterStorageKey(), normalized);
    return normalized;
  }

  function getMerchantGmCollectionFilterStorageKey() {
    return `po-merchant-gm-collection-filter-${getCurrentUserId()}`;
  }

  function normalizeMerchantGmCollectionSearch(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function normalizeMerchantGmCollectionCity(value) {
    return normalizeMerchantSettlementSelection(value);
  }

  function normalizeMerchantGmCollectionAccess(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === merchantGmFilterAccessValues.PUBLIC) return merchantGmFilterAccessValues.PUBLIC;
    if (normalized === merchantGmFilterAccessValues.ASSIGNED) return merchantGmFilterAccessValues.ASSIGNED;
    return merchantGmFilterAccessValues.ALL;
  }

  function normalizeMerchantGmCollectionStock(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === merchantGmFilterStockValues.STOCKED) return merchantGmFilterStockValues.STOCKED;
    if (normalized === merchantGmFilterStockValues.EMPTY) return merchantGmFilterStockValues.EMPTY;
    return merchantGmFilterStockValues.ALL;
  }

  function getDefaultMerchantGmCollectionFilterState() {
    return {
      search: "",
      city: "",
      access: merchantGmFilterAccessValues.ALL,
      stock: merchantGmFilterStockValues.ALL
    };
  }

  function normalizeMerchantGmCollectionFilterState(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      search: normalizeMerchantGmCollectionSearch(source.search),
      city: normalizeMerchantGmCollectionCity(source.city),
      access: normalizeMerchantGmCollectionAccess(source.access),
      stock: normalizeMerchantGmCollectionStock(source.stock)
    };
  }

  function getMerchantGmCollectionFilterState() {
    const raw = readSessionValue(getMerchantGmCollectionFilterStorageKey());
    if (!raw) return normalizeMerchantGmCollectionFilterState(getDefaultMerchantGmCollectionFilterState());
    try {
      return normalizeMerchantGmCollectionFilterState(JSON.parse(raw));
    } catch {
      return normalizeMerchantGmCollectionFilterState(getDefaultMerchantGmCollectionFilterState());
    }
  }

  function setMerchantGmCollectionFilterState(stateInput = {}) {
    const current = getMerchantGmCollectionFilterState();
    const normalized = normalizeMerchantGmCollectionFilterState({
      ...current,
      ...(stateInput && typeof stateInput === "object" ? stateInput : {})
    });
    writeSessionValue(getMerchantGmCollectionFilterStorageKey(), JSON.stringify(normalized));
    return normalized;
  }

  function resetMerchantGmCollectionFilterState() {
    const normalized = normalizeMerchantGmCollectionFilterState(getDefaultMerchantGmCollectionFilterState());
    writeSessionValue(getMerchantGmCollectionFilterStorageKey(), JSON.stringify(normalized));
    return normalized;
  }

  function hasActiveMerchantGmCollectionFilter(state = {}) {
    const normalized = normalizeMerchantGmCollectionFilterState(state);
    return Boolean(
      normalized.search
      || normalized.city
      || normalized.access !== merchantGmFilterAccessValues.ALL
      || normalized.stock !== merchantGmFilterStockValues.ALL
    );
  }

  function setMerchantGmCollectionFilterStateFromElement(element) {
    const filterKey = String(element?.dataset?.filterKey ?? "").trim().toLowerCase();
    if (!filterKey) return false;
    const current = getMerchantGmCollectionFilterState();
    const rawValue = isCheckboxInput(element) ? element.checked : element?.value;
    let next = current;
    if (filterKey === "search") {
      next = {
        ...current,
        search: normalizeMerchantGmCollectionSearch(rawValue)
      };
    } else if (filterKey === "city") {
      next = {
        ...current,
        city: normalizeMerchantGmCollectionCity(rawValue)
      };
    } else if (filterKey === "access") {
      next = {
        ...current,
        access: normalizeMerchantGmCollectionAccess(rawValue)
      };
    } else if (filterKey === "stock") {
      next = {
        ...current,
        stock: normalizeMerchantGmCollectionStock(rawValue)
      };
    }
    if (
      next.search === current.search
      && next.city === current.city
      && next.access === current.access
      && next.stock === current.stock
    ) {
      return false;
    }
    setMerchantGmCollectionFilterState(next);
    return true;
  }

  function syncStoredMerchantSettlementPreference(previousSettlementInput = "", nextSettlementInput = "") {
    const previousSettlement = normalizeMerchantSettlementSelection(previousSettlementInput);
    if (!previousSettlement || !hasSelectedMerchantSettlementPreference()) return;
    const selectedSettlement = getSelectedMerchantSettlement();
    if (selectedSettlement.toLowerCase() !== previousSettlement.toLowerCase()) return;
    setSelectedMerchantSettlement(nextSettlementInput);
  }

  function syncMerchantGmCollectionFilterLocation(previousSettlementInput = "", nextSettlementInput = "") {
    const previousSettlement = normalizeMerchantSettlementSelection(previousSettlementInput);
    if (!previousSettlement) return;
    const filterState = getMerchantGmCollectionFilterState();
    const selectedLocation = normalizeMerchantSettlementSelection(filterState?.city ?? "");
    if (selectedLocation.toLowerCase() !== previousSettlement.toLowerCase()) return;
    setMerchantGmCollectionFilterState({
      city: normalizeMerchantSettlementSelection(nextSettlementInput)
    });
  }

  return {
    MERCHANT_GM_VIEW_TABS: merchantGmViewTabs,
    hasSelectedMerchantSettlementPreference,
    getSelectedMerchantActorId,
    setSelectedMerchantActorId,
    setSelectedMerchantActorFromElement,
    getSelectedMerchantSettlement,
    setSelectedMerchantSettlement,
    setSelectedMerchantSettlementFromElement,
    getSelectedMerchantTabId,
    setSelectedMerchantTabId,
    setSelectedMerchantTabIdFromElement,
    getMerchantEditorSelection,
    getMerchantEditorPersistedId,
    setMerchantEditorSelection,
    normalizeMerchantEditorSelectionKey,
    getMerchantEditorDraftState,
    setMerchantEditorDraftState,
    clearMerchantEditorDraftState,
    getMerchantCityCatalogDraftValue,
    setMerchantCityCatalogDraftValue,
    clearMerchantCityCatalogDraftValue,
    getMerchantEditorViewTab,
    setMerchantEditorViewTab,
    setMerchantEditorViewTabFromElement,
    getMerchantGmViewTab,
    setMerchantGmViewTab,
    setMerchantGmViewTabFromElement,
    normalizeMerchantEditorFilter,
    getMerchantEditorSourceFilter,
    setMerchantEditorSourceFilter,
    getMerchantEditorPackFilter,
    setMerchantEditorPackFilter,
    getMerchantEditorItemFilter,
    setMerchantEditorItemFilter,
    normalizeMerchantGmCollectionSearch,
    normalizeMerchantGmCollectionCity,
    normalizeMerchantGmCollectionAccess,
    normalizeMerchantGmCollectionStock,
    getMerchantGmCollectionFilterState,
    setMerchantGmCollectionFilterState,
    resetMerchantGmCollectionFilterState,
    hasActiveMerchantGmCollectionFilter,
    setMerchantGmCollectionFilterStateFromElement,
    syncStoredMerchantSettlementPreference,
    syncMerchantGmCollectionFilterLocation
  };
}
