import assert from "node:assert/strict";

import { createMerchantUiState } from "./features/merchant-ui-state.js";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

class MockInputElement {
  constructor({ value = "", type = "text", checked = false, dataset = {} } = {}) {
    this.value = value;
    this.type = type;
    this.checked = checked;
    this.dataset = dataset;
  }
}

globalThis.sessionStorage = new MemoryStorage();
globalThis.game = {
  user: { id: "user-1" },
  world: { id: "world-1" }
};
globalThis.HTMLInputElement = MockInputElement;

const currentSettlementState = { value: "Waterdeep" };

const uiState = createMerchantUiState({
  moduleId: "party-operations",
  merchantGmFilterAccessValues: { ALL: "all", PUBLIC: "public", ASSIGNED: "assigned" },
  merchantGmFilterStockValues: { ALL: "all", STOCKED: "stocked", EMPTY: "empty" },
  normalizeMerchantSettlementSelection(value) {
    const settlement = String(value ?? "").trim().slice(0, 120);
    if (!settlement) return "";
    return settlement.toLowerCase() === "global" ? "" : settlement;
  },
  getMerchantDefinitionDraftSource(raw = {}) {
    return { ...(raw && typeof raw === "object" ? raw : {}) };
  },
  getCurrentSettlement() {
    return currentSettlementState.value;
  }
});

assert.equal(uiState.setSelectedMerchantActorId("actor-1"), "actor-1");
assert.equal(uiState.getSelectedMerchantActorId(), "actor-1");

assert.equal(
  uiState.setSelectedMerchantSettlementFromElement(new MockInputElement({ value: "Neverwinter" })),
  true
);
assert.equal(uiState.getSelectedMerchantSettlement(), "Neverwinter");

uiState.setMerchantEditorSelection("merchant-1");
uiState.setMerchantEditorDraftState("merchant-1", { id: "merchant-1", name: "Quartermaster Vale" });
assert.deepEqual(uiState.getMerchantEditorDraftState(), {
  selectionKey: "merchant-1",
  draft: { id: "merchant-1", name: "Quartermaster Vale" }
});
assert.equal(uiState.getMerchantEditorPersistedId("merchant-fallback"), "merchant-1");

uiState.setMerchantEditorSelection("__new__");
assert.equal(uiState.getMerchantEditorPersistedId("merchant-fallback"), "");

uiState.setMerchantEditorSelection("");
assert.equal(uiState.getMerchantEditorPersistedId("merchant-fallback"), "merchant-fallback");

assert.equal(uiState.setMerchantEditorViewTab("settings"), "settings");
assert.equal(uiState.getMerchantEditorViewTab(), "settings");

assert.equal(uiState.setMerchantEditorSourceFilter("  adventuring   gear  "), "adventuring gear");
assert.equal(uiState.getMerchantEditorSourceFilter(), "adventuring gear");
assert.equal(uiState.getMerchantEditorPackFilter(), "adventuring gear");

assert.equal(
  uiState.setMerchantGmViewTabFromElement(new MockInputElement({ dataset: { tab: "shop" } })),
  true
);
assert.equal(uiState.getMerchantGmViewTab(), uiState.MERCHANT_GM_VIEW_TABS.SHOP);

const searchInput = new MockInputElement({
  value: "  market   gear  ",
  dataset: { filterKey: "search" }
});
assert.equal(uiState.setMerchantGmCollectionFilterStateFromElement(searchInput), true);
assert.deepEqual(uiState.getMerchantGmCollectionFilterState(), {
  search: "market gear",
  city: "",
  access: "all",
  stock: "all"
});
assert.equal(uiState.hasActiveMerchantGmCollectionFilter(uiState.getMerchantGmCollectionFilterState()), true);

uiState.setSelectedMerchantSettlement("Waterdeep");
uiState.syncStoredMerchantSettlementPreference("Waterdeep", "Baldur's Gate");
assert.equal(uiState.getSelectedMerchantSettlement(), "Baldur's Gate");

uiState.setMerchantGmCollectionFilterState({ city: "Waterdeep" });
uiState.syncMerchantGmCollectionFilterLocation("Waterdeep", "Baldur's Gate");
assert.equal(uiState.getMerchantGmCollectionFilterState().city, "Baldur's Gate");

assert.equal(uiState.getMerchantCityCatalogDraftValue(), null);
assert.equal(uiState.setMerchantCityCatalogDraftValue("Waterdeep, Baldur's Gate"), "Waterdeep, Baldur's Gate");
assert.equal(uiState.getMerchantCityCatalogDraftValue(), "Waterdeep, Baldur's Gate");
uiState.clearMerchantCityCatalogDraftValue();
assert.equal(uiState.getMerchantCityCatalogDraftValue(), null);

process.stdout.write("merchant ui state validation passed\n");
