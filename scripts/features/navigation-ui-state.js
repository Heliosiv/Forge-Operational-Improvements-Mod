import {
  getCurrentUserId,
  readSessionValue,
  writeSessionValue
} from "../core/browser-session-state.js";

const OPERATIONS_PAGE_VALUES = new Set(["planning", "reputation", "base", "merchants", "downtime", "recovery", "gm"]);
const PLAYER_HUB_TAB_VALUES = new Set(["watch", "march", "loot", "downtime"]);
const GM_QUICK_PANEL_VALUES = new Set(["none", "faction", "modifier", "weather"]);
const GM_OPERATIONS_TAB_VALUES = new Set(["environment", "loot-sources"]);
const OPERATIONS_PLANNING_TAB_VALUES = new Set(["roles", "sops", "resources", "loot", "bonuses"]);

// Group the app-wide navigation/session preferences behind a single browser-state boundary.
export function createNavigationUiState({
  normalizeMainTabId,
  canAccessAllPlayerOps = () => false,
  canAccessGmPage = canAccessAllPlayerOps
} = {}) {
  if (typeof normalizeMainTabId !== "function") {
    throw new Error("createNavigationUiState requires normalizeMainTabId");
  }

  const hasGmAccess = () => Boolean(canAccessGmPage());

  function getGmPanelTabStorageKey() {
    return `po-gm-panel-tab-${getCurrentUserId()}`;
  }

  function getActiveGmPanelTab() {
    return readSessionValue(getGmPanelTabStorageKey()) === "operations" ? "operations" : "core";
  }

  function setActiveGmPanelTab(tab) {
    writeSessionValue(getGmPanelTabStorageKey(), tab === "operations" ? "operations" : "core");
  }

  function getRestMainTabStorageKey() {
    return `po-rest-main-tab-${getCurrentUserId()}`;
  }

  function getActiveRestMainTab() {
    const stored = normalizeMainTabId(readSessionValue(getRestMainTabStorageKey()), "rest-watch");
    if (stored === "gm" && hasGmAccess()) return "gm";
    if (stored === "operations") return "operations";
    return "rest-watch";
  }

  function setActiveRestMainTab(tab) {
    const normalized = normalizeMainTabId(tab, "rest-watch");
    const value = normalized === "gm" && hasGmAccess()
      ? "gm"
      : (normalized === "operations" ? "operations" : "rest-watch");
    writeSessionValue(getRestMainTabStorageKey(), value);
  }

  function getOperationsPageStorageKey() {
    return `po-operations-page-${getCurrentUserId()}`;
  }

  function normalizeOperationsPage(page) {
    let normalized = String(page ?? "planning").trim().toLowerCase();
    if (normalized === "supply") normalized = "base";
    if (normalized === "readiness" || normalized === "comms") normalized = "planning";
    if (normalized === "gm" && !hasGmAccess()) normalized = "planning";
    return OPERATIONS_PAGE_VALUES.has(normalized) ? normalized : "planning";
  }

  function getActiveOperationsPage() {
    return normalizeOperationsPage(readSessionValue(getOperationsPageStorageKey()) ?? "planning");
  }

  function setActiveOperationsPage(page) {
    writeSessionValue(getOperationsPageStorageKey(), normalizeOperationsPage(page));
  }

  function getPlayerHubTabStorageKey() {
    return `po-player-hub-tab-${getCurrentUserId()}`;
  }

  function normalizePlayerHubTab(value, fallback = "watch") {
    const normalized = String(value ?? "").trim().toLowerCase();
    return PLAYER_HUB_TAB_VALUES.has(normalized) ? normalized : fallback;
  }

  function getPlayerHubTab() {
    return normalizePlayerHubTab(readSessionValue(getPlayerHubTabStorageKey()), "watch");
  }

  function setPlayerHubTab(value) {
    const normalized = normalizePlayerHubTab(value, "watch");
    writeSessionValue(getPlayerHubTabStorageKey(), normalized);
    return normalized;
  }

  function getGmQuickPanelStorageKey() {
    return `po-gm-quick-panel-${getCurrentUserId()}`;
  }

  function getActiveGmQuickPanel() {
    const stored = String(readSessionValue(getGmQuickPanelStorageKey()) ?? "none").trim().toLowerCase();
    return GM_QUICK_PANEL_VALUES.has(stored) ? stored : "none";
  }

  function setActiveGmQuickPanel(panel) {
    const value = String(panel ?? "none").trim().toLowerCase();
    writeSessionValue(getGmQuickPanelStorageKey(), GM_QUICK_PANEL_VALUES.has(value) ? value : "none");
  }

  function getGmOperationsTabStorageKey() {
    return `po-gm-ops-tab-${getCurrentUserId()}`;
  }

  function getActiveGmOperationsTab() {
    const stored = String(readSessionValue(getGmOperationsTabStorageKey()) ?? "environment").trim().toLowerCase();
    return GM_OPERATIONS_TAB_VALUES.has(stored) ? stored : "environment";
  }

  function setActiveGmOperationsTab(tab) {
    const value = String(tab ?? "environment").trim().toLowerCase();
    writeSessionValue(getGmOperationsTabStorageKey(), GM_OPERATIONS_TAB_VALUES.has(value) ? value : "environment");
  }

  function normalizeGmOperationsTab(tab, fallback = "environment") {
    const value = String(tab ?? fallback).trim().toLowerCase();
    return GM_OPERATIONS_TAB_VALUES.has(value) ? value : fallback;
  }

  function getOperationsPlanningTabStorageKey() {
    return `po-operations-planning-tab-${getCurrentUserId()}`;
  }

  function getActiveOperationsPlanningTab() {
    const stored = String(readSessionValue(getOperationsPlanningTabStorageKey()) ?? "roles").trim().toLowerCase();
    return OPERATIONS_PLANNING_TAB_VALUES.has(stored) ? stored : "roles";
  }

  function setActiveOperationsPlanningTab(tab) {
    const normalized = String(tab ?? "").trim().toLowerCase();
    const value = OPERATIONS_PLANNING_TAB_VALUES.has(normalized) ? normalized : "roles";
    writeSessionValue(getOperationsPlanningTabStorageKey(), value);
  }

  function getMiniVizStorageKey() {
    return `po-mini-viz-collapsed-${getCurrentUserId()}`;
  }

  function isMiniVizCollapsed() {
    return readSessionValue(getMiniVizStorageKey()) === "1";
  }

  function setMiniVizCollapsed(collapsed) {
    writeSessionValue(getMiniVizStorageKey(), collapsed ? "1" : "0");
  }

  function getMarchSectionsStorageKey() {
    return `po-march-sections-${getCurrentUserId()}`;
  }

  function getMarchSectionState() {
    const raw = readSessionValue(getMarchSectionsStorageKey());
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function setMarchSectionState(state) {
    writeSessionValue(getMarchSectionsStorageKey(), JSON.stringify(state ?? {}));
  }

  function isMarchSectionCollapsed(sectionId) {
    if (!sectionId) return false;
    const state = getMarchSectionState();
    return Boolean(state[sectionId]);
  }

  function setMarchSectionCollapsed(sectionId, collapsed) {
    if (!sectionId) return;
    const state = getMarchSectionState();
    state[sectionId] = Boolean(collapsed);
    setMarchSectionState(state);
  }

  return {
    getActiveGmPanelTab,
    setActiveGmPanelTab,
    getActiveRestMainTab,
    setActiveRestMainTab,
    getActiveOperationsPage,
    setActiveOperationsPage,
    normalizePlayerHubTab,
    getPlayerHubTab,
    setPlayerHubTab,
    getActiveGmQuickPanel,
    setActiveGmQuickPanel,
    getActiveGmOperationsTab,
    setActiveGmOperationsTab,
    normalizeGmOperationsTab,
    getActiveOperationsPlanningTab,
    setActiveOperationsPlanningTab,
    isMiniVizCollapsed,
    setMiniVizCollapsed,
    getMarchSectionState,
    setMarchSectionState,
    isMarchSectionCollapsed,
    setMarchSectionCollapsed
  };
}
