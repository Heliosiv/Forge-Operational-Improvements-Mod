import { createPageActionHelpers } from "./page-action-helpers.js";

function getTagModeFromElement(element) {
  const mode = String(element?.dataset?.tagMode ?? "").trim().toLowerCase();
  return mode === "exclude" ? "exclude" : "include";
}

function getTagInputName(tagMode) {
  return tagMode === "exclude" ? "merchantExcludeTags" : "merchantIncludeTags";
}

function getTagCheckboxes(root, tagMode) {
  if (!root?.querySelectorAll) return [];
  const inputName = getTagInputName(tagMode);
  return Array.from(root.querySelectorAll(`input[name='${inputName}']`))
    .filter((entry) => entry instanceof HTMLInputElement && String(entry.type ?? "").toLowerCase() === "checkbox");
}

function getMerchantSourceRefCheckboxes(root) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll("input[name='merchantSourceRef']"))
    .filter((entry) => entry instanceof HTMLInputElement && String(entry.type ?? "").toLowerCase() === "checkbox");
}

function getMerchantSourceRefOptionElements(root) {
  if (!root?.querySelectorAll) return [];
  return Array.from(root.querySelectorAll("[data-merchant-source-option]"))
    .filter((entry) => entry instanceof HTMLElement);
}

function syncMerchantSourceRefSelectionUi(root) {
  if (!root?.querySelectorAll) return;
  const inputs = getMerchantSourceRefCheckboxes(root);
  const selectedCount = inputs.filter((entry) => Boolean(entry.checked)).length;
  const totalCount = inputs.length;
  for (const node of root.querySelectorAll("[data-merchant-source-ref-selected-count]")) {
    node.textContent = String(selectedCount);
  }
  for (const node of root.querySelectorAll("[data-merchant-source-ref-total-count]")) {
    node.textContent = String(totalCount);
  }
}

function normalizeMerchantSourceFilterValue(value, normalizeFilter) {
  const normalizer = typeof normalizeFilter === "function"
    ? normalizeFilter
    : (input) => String(input ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  return String(normalizer(value) ?? "").trim();
}

function applyMerchantSourceRefFilter(root, options = {}) {
  if (!root?.querySelectorAll) return { filterValue: "", visibleCount: 0, totalCount: 0 };
  const filterInput = root.querySelector("[data-merchant-source-filter]");
  const filterValue = normalizeMerchantSourceFilterValue(
    options?.filterValue ?? (filterInput instanceof HTMLInputElement ? filterInput.value : ""),
    options?.normalizeFilter
  );
  if (filterInput instanceof HTMLInputElement && filterInput.value !== filterValue) {
    filterInput.value = filterValue;
  }
  const needle = filterValue.toLowerCase();
  const optionsList = getMerchantSourceRefOptionElements(root);
  let visibleCount = 0;
  for (const optionRow of optionsList) {
    const matchesSourceFilters = String(optionRow.dataset?.sourceFilterMatch ?? "1") !== "0";
    const searchBlob = String(optionRow.dataset?.search ?? optionRow.textContent ?? "").toLowerCase();
    const visible = matchesSourceFilters && (!needle || searchBlob.includes(needle));
    optionRow.hidden = !visible;
    optionRow.classList.toggle("is-hidden", !visible);
    if (visible) visibleCount += 1;
  }
  for (const node of root.querySelectorAll("[data-merchant-source-ref-visible-count]")) {
    node.textContent = String(visibleCount);
  }
  for (const node of root.querySelectorAll("[data-merchant-source-filter-clear]")) {
    if (node instanceof HTMLButtonElement) node.disabled = !filterValue;
  }
  const emptyNode = root.querySelector("[data-merchant-source-ref-empty]");
  if (emptyNode instanceof HTMLElement) {
    emptyNode.hidden = visibleCount > 0 || optionsList.length <= 0;
  }
  return {
    filterValue,
    visibleCount,
    totalCount: optionsList.length
  };
}

function normalizeMerchantKeywordCsvInput(value) {
  const source = String(value ?? "");
  const seen = new Set();
  const normalized = [];
  for (const part of source.split(/[\n,;]+/)) {
    const keyword = String(part ?? "").trim().toLowerCase();
    if (!keyword || seen.has(keyword)) continue;
    seen.add(keyword);
    normalized.push(keyword);
  }
  return normalized;
}

function toggleMerchantKeywordFromElement(actionElement, options = {}) {
  const form = actionElement?.closest?.("form");
  if (!(form instanceof HTMLElement)) return false;
  const mode = String(actionElement?.dataset?.keywordMode ?? "").trim().toLowerCase() === "exclude"
    ? "exclude"
    : "include";
  const inputName = mode === "exclude" ? "merchantKeywordExclude" : "merchantKeywordInclude";
  const input = form.querySelector(`input[name='${inputName}']`);
  if (!(input instanceof HTMLInputElement)) return false;
  const keyword = String(actionElement?.dataset?.keywordValue ?? "").trim().toLowerCase();
  if (!keyword) return false;
  const current = normalizeMerchantKeywordCsvInput(input.value);
  const exists = current.includes(keyword);
  const next = exists ? current.filter((entry) => entry !== keyword) : [...current, keyword];
  const nextValue = next.join(", ");
  if (String(input.value ?? "").trim() === nextValue.trim()) return false;
  input.value = nextValue;
  const draft = options?.cacheDraft?.(input, { suppressMissingFormWarning: true });
  return Boolean(draft);
}

function getTagGroupElementFromAction(actionElement) {
  return actionElement?.closest?.("details.po-merchant-tag-group") ?? null;
}

function setMerchantTagGroupSelectionFromElement(actionElement, options = {}) {
  const group = getTagGroupElementFromAction(actionElement);
  if (!(group instanceof HTMLElement)) return false;
  const tagMode = getTagModeFromElement(group);
  const shouldSelect = options?.selected !== false;
  const inputName = getTagInputName(tagMode);
  const nodes = Array.from(group.querySelectorAll(`input[name='${inputName}']`))
    .filter((entry) => entry instanceof HTMLInputElement
      && String(entry.type ?? "").toLowerCase() === "checkbox"
      && !entry.disabled);
  if (nodes.length <= 0) return false;
  let changed = false;
  for (const node of nodes) {
    const nextChecked = Boolean(shouldSelect);
    if (Boolean(node.checked) === nextChecked) continue;
    node.checked = nextChecked;
    changed = true;
  }
  if (!changed) return false;
  const draft = options?.cacheDraft?.(actionElement, { suppressMissingFormWarning: true });
  return Boolean(draft);
}

function syncMerchantTagGroupCounts(root, tagMode) {
  if (!root?.querySelectorAll) return;
  const groups = Array.from(root.querySelectorAll(`details.po-merchant-tag-group[data-tag-mode='${tagMode}']`));
  for (const group of groups) {
    if (!(group instanceof HTMLElement)) continue;
    const inputs = Array.from(group.querySelectorAll(`input[name='${getTagInputName(tagMode)}']`))
      .filter((entry) => entry instanceof HTMLInputElement && String(entry.type ?? "").toLowerCase() === "checkbox");
    const selectedCount = inputs.filter((entry) => Boolean(entry.checked)).length;
    const totalCount = inputs.length;
    const selectedNode = group.querySelector("[data-merchant-tag-group-selected]");
    const totalNode = group.querySelector("[data-merchant-tag-group-total]");
    if (selectedNode) selectedNode.textContent = String(selectedCount);
    if (totalNode) totalNode.textContent = String(totalCount);
  }
}

function syncMerchantTagSelectionUi(root, tagModeInput = "include") {
  if (!root?.querySelectorAll) return;
  const tagMode = tagModeInput === "exclude" ? "exclude" : "include";
  const inputs = getTagCheckboxes(root, tagMode);
  const selectedCount = inputs.filter((entry) => Boolean(entry.checked)).length;
  const totalCount = inputs.length;
  for (const node of root.querySelectorAll(`[data-merchant-tag-selected-count='${tagMode}']`)) {
    node.textContent = String(selectedCount);
  }
  for (const node of root.querySelectorAll(`[data-merchant-tag-total-count='${tagMode}']`)) {
    node.textContent = String(totalCount);
  }
  syncMerchantTagGroupCounts(root, tagMode);
}

function syncAllMerchantTagSelectionUi(root) {
  if (!root?.querySelectorAll) return;
  syncMerchantTagSelectionUi(root, "include");
  syncMerchantTagSelectionUi(root, "exclude");
}

function getConfiguredMerchantExpandedStorageKey() {
  return `po-merchant-configured-expanded-${game.user?.id ?? "anon"}`;
}

function getConfiguredMerchantExpandedIds() {
  try {
    const raw = globalThis.sessionStorage?.getItem?.(getConfiguredMerchantExpandedStorageKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed
        .map((entry) => String(entry ?? "").trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

function saveConfiguredMerchantExpandedIds(expandedIds) {
  try {
    const values = Array.from(expandedIds ?? [])
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
    if (values.length <= 0) {
      globalThis.sessionStorage?.removeItem?.(getConfiguredMerchantExpandedStorageKey());
      return;
    }
    globalThis.sessionStorage?.setItem?.(getConfiguredMerchantExpandedStorageKey(), JSON.stringify(values));
  } catch {
    // Ignore transient browser storage failures for UI-only state.
  }
}

function setConfiguredMerchantExpandedState(merchantId, expanded) {
  const id = String(merchantId ?? "").trim();
  if (!id) return;
  const expandedIds = getConfiguredMerchantExpandedIds();
  if (expanded) expandedIds.add(id);
  else expandedIds.delete(id);
  saveConfiguredMerchantExpandedIds(expandedIds);
}

function applyConfiguredMerchantExpandedState(root) {
  if (!root?.querySelectorAll) return;
  const expandedIds = getConfiguredMerchantExpandedIds();
  const cards = Array.from(root.querySelectorAll("details.po-merchant-definition-card[data-merchant-id]"));
  for (const card of cards) {
    if (!(card instanceof HTMLDetailsElement)) continue;
    const merchantId = String(card.dataset?.merchantId ?? "").trim();
    if (!merchantId) continue;
    const shouldOpen = expandedIds.has(merchantId);
    if (card.open !== shouldOpen) card.open = shouldOpen;
  }
}

export function createGmMerchantsPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    cacheMerchantEditorDraftFromElement,
    normalizeMerchantEditorFilter,
    getMerchantEditorSourceFilter,
    setMerchantEditorSourceFilter,
    setMerchantGmViewTab,
    setMerchantGmViewTabFromElement,
    resetMerchantEditorSelection,
    createStarterMerchants,
    saveMerchantCityCatalogFromElement,
    updateMerchantCatalogLocationFromElement,
    removeMerchantCatalogLocationFromElement,
    assignMerchantCityFromElement,
    assignMerchantCatalogLocationMerchantFromElement,
    removeMerchantCatalogLocationMerchantFromElement,
    randomizeMerchantNameFromElement,
    randomizeMerchantRaceFromElement,
    setMerchantEditorSelectionFromElement,
    saveMerchantFromElement,
    deleteMerchantFromElement,
    refreshMerchantStockFromElement,
    refreshAllMerchantStocksFromElement,
    setMerchantAccessModeFromElement,
    setMerchantAssignmentFromElement,
    setMerchantAssignmentAllEnabledFromElement,
    setMerchantAssignmentAllDisabledFromElement,
    setMerchantGmCollectionFilterFromElement,
    resetMerchantGmCollectionFilterFromElement,
    selectAllMerchantTagsFromElement,
    deselectAllMerchantTagsFromElement,
    setMerchantShopRestrictionFromElement,
    setMerchantShopPlayerLocationFromElement,
    setMerchantShopPlayerAllowedFromElement,
    setMerchantShopPlayersAllFromElement,
    setMerchantShopPlayersNoneFromElement,
    setMerchantAvailableNowFromElement,
    setMerchantShopTradableFromElement,
    setMerchantShopTradableAllFromElement,
    setMerchantShopTradableNoneFromElement,
    ringMerchantShopBellFromElement,
    closeMerchantShopsFromElement,
    openMerchantActorFromElement,
    setMerchantCityCatalogDraftValue,
    openGmPanelByKey
  } = deps;

  return class GmMerchantsPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-merchants-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Merchants" },
      position: getResponsiveWindowPosition?.("gm-merchants") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-merchants.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmMerchantsPage";
    }

    _getActionErrorScope() {
      return "gm-merchants-page";
    }

    _getActionErrorMessage() {
      return "Merchant editor action failed. Check console for details.";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, rerenderIfTruthy, openPanelTab } = createPageActionHelpers(this);
      return {
        "gm-merchants-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-merchants-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("merchants", openGmPanelByKey),
        "merchant-editor-draft-change": async (actionElement) => {
          const draft = cacheMerchantEditorDraftFromElement(actionElement, { suppressMissingFormWarning: true });
          if (!draft) return;
          const inputName = String(actionElement?.name ?? "").trim();
          const isTagCheckbox = actionElement instanceof HTMLInputElement
            && String(actionElement.type ?? "").toLowerCase() === "checkbox"
            && (inputName === "merchantIncludeTags" || inputName === "merchantExcludeTags");
          if (isTagCheckbox) {
            syncMerchantTagSelectionUi(this.element, inputName === "merchantExcludeTags" ? "exclude" : "include");
            return;
          }
          const isSourceRefCheckbox = actionElement instanceof HTMLInputElement
            && String(actionElement.type ?? "").toLowerCase() === "checkbox"
            && inputName === "merchantSourceRef";
          if (isSourceRefCheckbox) {
            syncMerchantSourceRefSelectionUi(this.element);
            return;
          }
          rerender();
        },
        "merchant-select-all-tags": async (actionElement) => {
          const changed = await selectAllMerchantTagsFromElement(actionElement);
          if (!changed) return;
          syncMerchantTagSelectionUi(this.element, getTagModeFromElement(actionElement));
        },
        "merchant-deselect-all-tags": async (actionElement) => {
          const changed = await deselectAllMerchantTagsFromElement(actionElement);
          if (!changed) return;
          syncMerchantTagSelectionUi(this.element, getTagModeFromElement(actionElement));
        },
        "merchant-select-tag-group": async (actionElement, event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          const changed = setMerchantTagGroupSelectionFromElement(actionElement, {
            selected: true,
            cacheDraft: cacheMerchantEditorDraftFromElement
          });
          if (!changed) return;
          const group = getTagGroupElementFromAction(actionElement);
          syncMerchantTagSelectionUi(this.element, getTagModeFromElement(group ?? actionElement));
        },
        "merchant-deselect-tag-group": async (actionElement, event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          const changed = setMerchantTagGroupSelectionFromElement(actionElement, {
            selected: false,
            cacheDraft: cacheMerchantEditorDraftFromElement
          });
          if (!changed) return;
          const group = getTagGroupElementFromAction(actionElement);
          syncMerchantTagSelectionUi(this.element, getTagModeFromElement(group ?? actionElement));
        },
        "merchant-keyword-toggle": async (actionElement, event) => {
          event?.preventDefault?.();
          event?.stopPropagation?.();
          const changed = toggleMerchantKeywordFromElement(actionElement, {
            cacheDraft: cacheMerchantEditorDraftFromElement
          });
          if (!changed) return;
          rerender();
        },
        "merchant-clear-source-filter": async () => {
          setMerchantEditorSourceFilter?.("");
          applyMerchantSourceRefFilter(this.element, {
            normalizeFilter: normalizeMerchantEditorFilter,
            filterValue: ""
          });
          const input = this.element?.querySelector?.("[data-merchant-source-filter]");
          if (input instanceof HTMLInputElement) input.focus();
        },
        "merchant-gm-view-tab": async (actionElement) => {
          cacheMerchantEditorDraftFromElement(actionElement, { suppressMissingFormWarning: true });
          if (setMerchantGmViewTabFromElement(actionElement)) rerender();
        },
        "merchant-new": async () => {
          resetMerchantEditorSelection();
          setMerchantGmViewTab?.("editor");
          rerender();
        },
        "merchant-create-starters": rerenderAlways(() => createStarterMerchants()),
        "merchant-save-city-catalog": rerenderIfTruthy(saveMerchantCityCatalogFromElement),
        "merchant-update-location-catalog-entry": rerenderIfTruthy(updateMerchantCatalogLocationFromElement),
        "merchant-remove-location-catalog-entry": rerenderIfTruthy(removeMerchantCatalogLocationFromElement),
        "merchant-assign-city": rerenderIfTruthy(assignMerchantCityFromElement),
        "merchant-location-add-merchant": rerenderIfTruthy(assignMerchantCatalogLocationMerchantFromElement),
        "merchant-location-remove-merchant": rerenderIfTruthy(removeMerchantCatalogLocationMerchantFromElement),
        "merchant-set-access-mode": rerenderIfTruthy(setMerchantAccessModeFromElement),
        "merchant-assign-toggle": rerenderIfTruthy(setMerchantAssignmentFromElement),
        "merchant-assign-all": rerenderIfTruthy(setMerchantAssignmentAllEnabledFromElement),
        "merchant-assign-none": rerenderIfTruthy(setMerchantAssignmentAllDisabledFromElement),
        "merchant-randomize-name": rerenderIfTruthy(randomizeMerchantNameFromElement),
        "merchant-randomize-race": rerenderIfTruthy(randomizeMerchantRaceFromElement),
        "merchant-edit": async (actionElement) => {
          if (setMerchantEditorSelectionFromElement(actionElement)) {
            setMerchantGmViewTab?.("editor");
            rerender();
          }
        },
        "merchant-save": rerenderAlways(saveMerchantFromElement),
        "merchant-delete": rerenderAlways(deleteMerchantFromElement),
        "merchant-refresh-stock": rerenderAlways(refreshMerchantStockFromElement),
        "merchant-refresh-all-stock": rerenderAlways(refreshAllMerchantStocksFromElement),
        "merchant-gm-filter-change": rerenderIfTruthy(setMerchantGmCollectionFilterFromElement),
        "merchant-gm-filter-reset": rerenderIfTruthy(resetMerchantGmCollectionFilterFromElement),
        "merchant-shop-restrict-toggle": rerenderIfTruthy(setMerchantShopRestrictionFromElement),
        "merchant-shop-player-location": rerenderIfTruthy(setMerchantShopPlayerLocationFromElement),
        "merchant-shop-player-toggle": rerenderIfTruthy(setMerchantShopPlayerAllowedFromElement),
        "merchant-shop-player-all": rerenderIfTruthy(setMerchantShopPlayersAllFromElement),
        "merchant-shop-player-none": rerenderIfTruthy(setMerchantShopPlayersNoneFromElement),
        "merchant-make-available-now": rerenderIfTruthy(setMerchantAvailableNowFromElement),
        "merchant-toggle-shop-tradable": rerenderIfTruthy(setMerchantShopTradableFromElement),
        "merchant-shop-tradable-all": rerenderIfTruthy(setMerchantShopTradableAllFromElement),
        "merchant-shop-tradable-none": rerenderIfTruthy(setMerchantShopTradableNoneFromElement),
        "merchant-shop-bell": rerenderIfTruthy(ringMerchantShopBellFromElement),
        "merchant-shop-close": rerenderIfTruthy(closeMerchantShopsFromElement),
        "merchant-open-actor": async (actionElement) => {
          await openMerchantActorFromElement(actionElement);
        }
      };
    }

    async _onPostRender() {
      syncAllMerchantTagSelectionUi(this.element);
      syncMerchantSourceRefSelectionUi(this.element);
      applyMerchantSourceRefFilter(this.element, {
        normalizeFilter: normalizeMerchantEditorFilter,
        filterValue: getMerchantEditorSourceFilter?.() ?? ""
      });
      for (const card of this.element?.querySelectorAll?.("details.po-merchant-definition-card[data-merchant-id]") ?? []) {
        if (!(card instanceof HTMLDetailsElement)) continue;
        if (card.dataset.poMerchantDisclosureBound === "1") continue;
        card.dataset.poMerchantDisclosureBound = "1";
        card.addEventListener("toggle", () => {
          setConfiguredMerchantExpandedState(card.dataset?.merchantId, card.open === true);
        });
      }
      queueMicrotask(() => {
        if (!this.element?.isConnected) return;
        applyConfiguredMerchantExpandedState(this.element);
      });
    }

    _bindAdditionalListeners(root) {
      const syncCityCatalogDraft = (target) => {
        if (!target?.matches?.("input[name='merchantCityCatalog']")) return;
        setMerchantCityCatalogDraftValue(target?.value ?? "");
      };

      const syncSourceFilterDraft = (target) => {
        if (!target?.matches?.("[data-merchant-source-filter]")) return;
        const filterValue = setMerchantEditorSourceFilter?.(target?.value ?? "") ?? String(target?.value ?? "");
        applyMerchantSourceRefFilter(root, {
          normalizeFilter: normalizeMerchantEditorFilter,
          filterValue
        });
      };

      root.addEventListener("input", (event) => {
        syncCityCatalogDraft(event.target);
        syncSourceFilterDraft(event.target);
      });
      root.addEventListener("change", (event) => {
        syncCityCatalogDraft(event.target);
        syncSourceFilterDraft(event.target);
      });
    }
  };
}
