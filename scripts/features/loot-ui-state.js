export const LOOT_REGISTRY_TABS = Object.freeze({
  PREVIEW: "preview",
  SETTINGS: "settings"
});

export const LOOT_SETTINGS_TABS = Object.freeze({
  SOURCES: "sources",
  TABLES: "tables",
  FILTERS: "filters"
});

import {
  getCurrentUserId,
  readSessionValue,
  removeSessionValue,
  writeSessionValue
} from "../core/browser-session-state.js";

// Encapsulate browser-scoped loot UI state behind a small feature boundary.
export function createLootUiState({
  lootClaimsArchiveSortOptions = [],
  lootRegistryTabs = LOOT_REGISTRY_TABS,
  lootSettingsTabs = LOOT_SETTINGS_TABS
} = {}) {
  const allowedArchiveSorts = new Set(
    Array.isArray(lootClaimsArchiveSortOptions)
      ? lootClaimsArchiveSortOptions.map((entry) => String(entry?.value ?? "").trim().toLowerCase()).filter(Boolean)
      : []
  );
  const allowedLootSettingsTabs = new Set(Object.values(lootSettingsTabs));

  function getLootPackSourcesUiStorageKey() {
    return `po-loot-pack-sources-ui-${getCurrentUserId()}`;
  }

  function normalizeLootPackSourcesFilter(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  }

  function getLootPackSourcesUiState() {
    const defaults = { collapsed: false, filter: "" };
    const raw = readSessionValue(getLootPackSourcesUiStorageKey());
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      return {
        collapsed: Boolean(parsed?.collapsed),
        filter: normalizeLootPackSourcesFilter(parsed?.filter)
      };
    } catch {
      return defaults;
    }
  }

  function setLootPackSourcesUiState(patch = {}) {
    const previous = getLootPackSourcesUiState();
    const next = {
      collapsed: patch?.collapsed === undefined ? previous.collapsed : Boolean(patch.collapsed),
      filter: patch?.filter === undefined ? previous.filter : normalizeLootPackSourcesFilter(patch.filter)
    };
    writeSessionValue(getLootPackSourcesUiStorageKey(), JSON.stringify(next));
  }

  function getLootClaimActorStorageKey() {
    return `po-loot-claim-actor-${getCurrentUserId()}`;
  }

  function getLootClaimRunStorageKey() {
    return `po-loot-claim-run-${getCurrentUserId()}`;
  }

  function getLootClaimsArchiveSortStorageKey() {
    return `po-loot-claim-archive-sort-${getCurrentUserId()}`;
  }

  function normalizeLootClaimActorId(value) {
    return String(value ?? "").trim();
  }

  function normalizeLootClaimRunId(value) {
    return String(value ?? "").trim();
  }

  function normalizeLootClaimsArchiveSort(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return allowedArchiveSorts.has(normalized) ? normalized : "archived-desc";
  }

  function getLootClaimActorSelection() {
    return normalizeLootClaimActorId(readSessionValue(getLootClaimActorStorageKey()));
  }

  function getLootClaimRunSelection() {
    return normalizeLootClaimRunId(readSessionValue(getLootClaimRunStorageKey()));
  }

  function getLootClaimsArchiveSort() {
    return normalizeLootClaimsArchiveSort(readSessionValue(getLootClaimsArchiveSortStorageKey()));
  }

  function setLootClaimActorSelection(actorIdInput) {
    const actorId = normalizeLootClaimActorId(actorIdInput);
    if (!actorId) {
      removeSessionValue(getLootClaimActorStorageKey());
      return "";
    }
    writeSessionValue(getLootClaimActorStorageKey(), actorId);
    return actorId;
  }

  function setLootClaimRunSelection(runIdInput) {
    const runId = normalizeLootClaimRunId(runIdInput);
    if (!runId) {
      removeSessionValue(getLootClaimRunStorageKey());
      return "";
    }
    writeSessionValue(getLootClaimRunStorageKey(), runId);
    return runId;
  }

  function setLootClaimsArchiveSort(sortInput) {
    const sort = normalizeLootClaimsArchiveSort(sortInput);
    writeSessionValue(getLootClaimsArchiveSortStorageKey(), sort);
    return sort;
  }

  function setLootClaimActorSelectionFromElement(element) {
    const nextActorId = normalizeLootClaimActorId(element?.value);
    const currentActorId = getLootClaimActorSelection();
    if (nextActorId === currentActorId) return false;
    setLootClaimActorSelection(nextActorId);
    return true;
  }

  function setLootClaimRunSelectionFromElement(element) {
    const nextRunId = normalizeLootClaimRunId(element?.value);
    const currentRunId = getLootClaimRunSelection();
    if (nextRunId === currentRunId) return false;
    setLootClaimRunSelection(nextRunId);
    return true;
  }

  function getLootRegistryTabStorageKey() {
    return `po-loot-registry-tab-${getCurrentUserId()}`;
  }

  function normalizeLootRegistryTab(tab, fallback = lootRegistryTabs.PREVIEW) {
    const fallbackValue = String(fallback ?? lootRegistryTabs.PREVIEW).trim().toLowerCase();
    const normalizedFallback = fallbackValue === lootRegistryTabs.SETTINGS ? lootRegistryTabs.SETTINGS : lootRegistryTabs.PREVIEW;
    const value = String(tab ?? normalizedFallback).trim().toLowerCase();
    return value === lootRegistryTabs.SETTINGS ? lootRegistryTabs.SETTINGS : lootRegistryTabs.PREVIEW;
  }

  function getActiveLootRegistryTab() {
    return normalizeLootRegistryTab(readSessionValue(getLootRegistryTabStorageKey()), lootRegistryTabs.PREVIEW);
  }

  function setActiveLootRegistryTab(tab) {
    writeSessionValue(getLootRegistryTabStorageKey(), normalizeLootRegistryTab(tab, lootRegistryTabs.PREVIEW));
  }

  function getLootSettingsTabStorageKey() {
    return `po-loot-settings-tab-${getCurrentUserId()}`;
  }

  function normalizeLootSettingsTab(tab, fallback = lootSettingsTabs.SOURCES) {
    const normalized = String(tab ?? "").trim().toLowerCase();
    if (allowedLootSettingsTabs.has(normalized)) return normalized;
    const normalizedFallback = String(fallback ?? lootSettingsTabs.SOURCES).trim().toLowerCase();
    return allowedLootSettingsTabs.has(normalizedFallback) ? normalizedFallback : lootSettingsTabs.SOURCES;
  }

  function getActiveLootSettingsTab() {
    return normalizeLootSettingsTab(
      readSessionValue(getLootSettingsTabStorageKey()),
      lootSettingsTabs.SOURCES
    );
  }

  function setActiveLootSettingsTab(tab) {
    const value = normalizeLootSettingsTab(tab, lootSettingsTabs.SOURCES);
    writeSessionValue(getLootSettingsTabStorageKey(), value);
    return value;
  }

  return {
    LOOT_SETTINGS_TABS: lootSettingsTabs,
    normalizeLootPackSourcesFilter,
    getLootPackSourcesUiState,
    setLootPackSourcesUiState,
    normalizeLootClaimActorId,
    normalizeLootClaimRunId,
    getLootClaimActorSelection,
    getLootClaimRunSelection,
    getLootClaimsArchiveSort,
    setLootClaimActorSelection,
    setLootClaimRunSelection,
    setLootClaimsArchiveSort,
    setLootClaimActorSelectionFromElement,
    setLootClaimRunSelectionFromElement,
    normalizeLootRegistryTab,
    getActiveLootRegistryTab,
    setActiveLootRegistryTab,
    getActiveLootSettingsTab,
    setActiveLootSettingsTab
  };
}
