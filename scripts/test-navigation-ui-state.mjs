import assert from "node:assert/strict";

import { createNavigationUiState } from "./features/navigation-ui-state.js";

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

globalThis.sessionStorage = new MemoryStorage();
globalThis.game = {
  user: { id: "user-1" }
};

const accessState = { shared: false, gm: false };

function normalizeMainTabId(value, fallback = "rest-watch") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "rest") return "rest-watch";
  if (normalized === "march") return "marching-order";
  if (normalized === "operations") return "operations";
  if (normalized === "gm") return "gm";
  if (normalized === "marching-order") return "marching-order";
  if (normalized === "rest-watch") return "rest-watch";
  return fallback;
}

const uiState = createNavigationUiState({
  normalizeMainTabId,
  canAccessAllPlayerOps: () => accessState.shared,
  canAccessGmPage: () => accessState.gm
});

assert.equal(uiState.getActiveGmPanelTab(), "core");
uiState.setActiveGmPanelTab("operations");
assert.equal(uiState.getActiveGmPanelTab(), "operations");

assert.equal(uiState.getActiveRestMainTab(), "rest-watch");
uiState.setActiveRestMainTab("operations");
assert.equal(uiState.getActiveRestMainTab(), "operations");
uiState.setActiveRestMainTab("gm");
assert.equal(uiState.getActiveRestMainTab(), "rest-watch");
accessState.shared = true;
uiState.setActiveRestMainTab("gm");
assert.equal(uiState.getActiveRestMainTab(), "rest-watch");
accessState.gm = true;
uiState.setActiveRestMainTab("gm");
assert.equal(uiState.getActiveRestMainTab(), "gm");

uiState.setActiveOperationsPage("supply");
assert.equal(uiState.getActiveOperationsPage(), "base");
uiState.setActiveOperationsPage("comms");
assert.equal(uiState.getActiveOperationsPage(), "planning");
accessState.gm = false;
uiState.setActiveOperationsPage("gm");
assert.equal(uiState.getActiveOperationsPage(), "planning");
accessState.shared = true;
uiState.setActiveOperationsPage("gm");
assert.equal(uiState.getActiveOperationsPage(), "planning");
accessState.gm = true;
uiState.setActiveOperationsPage("gm");
assert.equal(uiState.getActiveOperationsPage(), "gm");

assert.equal(uiState.normalizePlayerHubTab("loot"), "loot");
assert.equal(uiState.normalizePlayerHubTab("invalid", "watch"), "watch");
assert.equal(uiState.getPlayerHubTab(), "watch");
assert.equal(uiState.setPlayerHubTab("downtime"), "downtime");
assert.equal(uiState.getPlayerHubTab(), "downtime");

assert.equal(uiState.getActiveGmQuickPanel(), "none");
uiState.setActiveGmQuickPanel("weather");
assert.equal(uiState.getActiveGmQuickPanel(), "weather");
uiState.setActiveGmQuickPanel("invalid");
assert.equal(uiState.getActiveGmQuickPanel(), "none");

assert.equal(uiState.getActiveGmOperationsTab(), "environment");
uiState.setActiveGmOperationsTab("loot-sources");
assert.equal(uiState.getActiveGmOperationsTab(), "loot-sources");
assert.equal(uiState.normalizeGmOperationsTab("invalid", "environment"), "environment");

assert.equal(uiState.getActiveOperationsPlanningTab(), "roles");
uiState.setActiveOperationsPlanningTab("loot");
assert.equal(uiState.getActiveOperationsPlanningTab(), "loot");
uiState.setActiveOperationsPlanningTab("invalid");
assert.equal(uiState.getActiveOperationsPlanningTab(), "roles");

assert.equal(uiState.isMiniVizCollapsed(), false);
uiState.setMiniVizCollapsed(true);
assert.equal(uiState.isMiniVizCollapsed(), true);
uiState.setMiniVizCollapsed(false);
assert.equal(uiState.isMiniVizCollapsed(), false);

assert.deepEqual(uiState.getMarchSectionState(), {});
uiState.setMarchSectionCollapsed("travel", true);
assert.equal(uiState.isMarchSectionCollapsed("travel"), true);
uiState.setMarchSectionCollapsed("travel", false);
assert.equal(uiState.isMarchSectionCollapsed("travel"), false);
assert.deepEqual(uiState.getMarchSectionState(), { travel: false });

process.stdout.write("navigation ui state validation passed\n");
