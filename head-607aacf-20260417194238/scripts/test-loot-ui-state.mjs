import assert from "node:assert/strict";

import { createLootUiState, LOOT_SETTINGS_TABS } from "./features/loot-ui-state.js";

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
  constructor({ value = "", dataset = {} } = {}) {
    this.value = value;
    this.dataset = dataset;
  }
}

globalThis.sessionStorage = new MemoryStorage();
globalThis.game = {
  user: { id: "user-1" }
};

const uiState = createLootUiState({
  lootClaimsArchiveSortOptions: [
    { value: "archived-desc" },
    { value: "archived-asc" },
    { value: "published-desc" },
    { value: "published-asc" },
    { value: "items-desc" },
    { value: "items-asc" }
  ]
});

assert.deepEqual(uiState.getLootPackSourcesUiState(), {
  collapsed: false,
  filter: ""
});

uiState.setLootPackSourcesUiState({
  collapsed: true,
  filter: "  arcane   relics  "
});
assert.deepEqual(uiState.getLootPackSourcesUiState(), {
  collapsed: true,
  filter: "arcane relics"
});

uiState.setLootPackSourcesUiState({ collapsed: false });
assert.deepEqual(uiState.getLootPackSourcesUiState(), {
  collapsed: false,
  filter: "arcane relics"
});

assert.equal(uiState.setLootClaimActorSelection(" actor-1 "), "actor-1");
assert.equal(uiState.getLootClaimActorSelection(), "actor-1");
assert.equal(uiState.setLootClaimActorSelectionFromElement(new MockInputElement({ value: "actor-1" })), false);
assert.equal(uiState.setLootClaimActorSelectionFromElement(new MockInputElement({ value: "actor-2" })), true);
assert.equal(uiState.getLootClaimActorSelection(), "actor-2");
assert.equal(uiState.setLootClaimActorSelection(""), "");
assert.equal(uiState.getLootClaimActorSelection(), "");

assert.equal(uiState.setLootClaimRunSelection(" run-1 "), "run-1");
assert.equal(uiState.getLootClaimRunSelection(), "run-1");
assert.equal(uiState.setLootClaimRunSelectionFromElement(new MockInputElement({ value: "run-1" })), false);
assert.equal(uiState.setLootClaimRunSelectionFromElement(new MockInputElement({ value: "run-2" })), true);
assert.equal(uiState.getLootClaimRunSelection(), "run-2");
assert.equal(uiState.setLootClaimRunSelection(""), "");
assert.equal(uiState.getLootClaimRunSelection(), "");

assert.equal(uiState.setLootClaimsArchiveSort("not-valid"), "archived-desc");
assert.equal(uiState.getLootClaimsArchiveSort(), "archived-desc");
assert.equal(uiState.setLootClaimsArchiveSort("published-asc"), "published-asc");
assert.equal(uiState.getLootClaimsArchiveSort(), "published-asc");

assert.equal(uiState.normalizeLootRegistryTab("settings"), "settings");
assert.equal(uiState.normalizeLootRegistryTab("invalid"), "preview");
uiState.setActiveLootRegistryTab("settings");
assert.equal(uiState.getActiveLootRegistryTab(), "settings");
uiState.setActiveLootRegistryTab("invalid");
assert.equal(uiState.getActiveLootRegistryTab(), "preview");

assert.equal(uiState.setActiveLootSettingsTab(LOOT_SETTINGS_TABS.TABLES), LOOT_SETTINGS_TABS.TABLES);
assert.equal(uiState.getActiveLootSettingsTab(), LOOT_SETTINGS_TABS.TABLES);
assert.equal(uiState.setActiveLootSettingsTab("invalid"), LOOT_SETTINGS_TABS.SOURCES);
assert.equal(uiState.getActiveLootSettingsTab(), LOOT_SETTINGS_TABS.SOURCES);

process.stdout.write("loot ui state validation passed\n");
