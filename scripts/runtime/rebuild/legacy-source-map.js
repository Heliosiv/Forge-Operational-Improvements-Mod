export const LEGACY_SOURCE_FILE = "legacy/party-operations-monolith.js";

const LEGACY_SOURCE_SLICES = Object.freeze([
  {
    id: "bootstrap-shared",
    label: "Bootstrap, Imports, Shared Constants",
    lines: { start: 1, end: 1960 },
    featureIds: ["runtime-shell", "settings", "navigation", "sockets", "hooks"],
    targetModules: ["scripts/runtime", "scripts/core", "scripts/hooks"],
    notes: "Original import graph, shared constants, app registries, template preload, and UI helpers."
  },
  {
    id: "gather-resources",
    label: "Gather Resources And Upkeep State",
    lines: { start: 1961, end: 3273 },
    featureIds: ["operations", "rest-watch"],
    targetModules: ["scripts/features/gather-*", "scripts/core/gather-*"],
    notes: "Steward pools, gather requests, shared actor notes, and daily gather attempt state."
  },
  {
    id: "integration-effects",
    label: "Integration, Environment, And Active Effects",
    lines: { start: 3274, end: 5188 },
    featureIds: ["integration-effects", "hooks", "operations"],
    targetModules: ["scripts/hooks/runtime-modules", "scripts/features/environment-*"],
    notes: "Actor integration payloads, environment presets, DAE metadata, and managed effect sync."
  },
  {
    id: "navigation-notes-drafts",
    label: "Navigation, Reputation, Notes, And Drafts",
    lines: { start: 5189, end: 7401 },
    featureIds: ["navigation", "operations", "loot"],
    targetModules: ["scripts/runtime/navigation", "scripts/features/*-draft-storage.js"],
    notes: "Main-tab labels, reputation drafts, note draft caches, render preservation, and fallback context building."
  },
  {
    id: "application-shells",
    label: "Application Shells And Page Adapters",
    lines: { start: 7402, end: 10810 },
    featureIds: ["rest-watch", "march", "gm-pages", "loot", "merchants", "audio", "downtime"],
    targetModules: ["scripts/apps", "scripts/features/*-ui.js"],
    notes: "RestWatchApp, OperationsShellApp, GM page app adapters, loot claims board, and marching order app."
  },
  {
    id: "state-defaults-audio",
    label: "Default State And Audio Runtime",
    lines: { start: 10811, end: 14030 },
    featureIds: ["audio", "loot", "rest-watch"],
    targetModules: ["scripts/runtime/state", "scripts/features/audio-*", "scripts/features/loot-*"],
    notes:
      "Default state builders, loot source config defaults, audio catalog, mix presets, playlist sync, and audio library search."
  },
  {
    id: "loot-source-registry",
    label: "Loot Source Registry",
    lines: { start: 14031, end: 16204 },
    featureIds: ["loot"],
    targetModules: ["scripts/features/loot-source-*"],
    notes: "Loot source normalization, manifest compendium folders, source documents, and source registry context."
  },
  {
    id: "loot-engine",
    label: "Loot Generation Engine",
    lines: { start: 16205, end: 22956 },
    featureIds: ["loot"],
    targetModules: ["scripts/features/loot-engine-*"],
    notes:
      "Loot item metadata, treasure pools, budget context, weighted selection, currency rolls, item candidates, and preview payload generation."
  },
  {
    id: "operations-ledger-loot-claims",
    label: "Operations Ledger And Loot Claim State",
    lines: { start: 22957, end: 25729 },
    featureIds: ["operations", "loot", "journal"],
    targetModules: ["scripts/features/operations-*", "scripts/features/loot-claims-*"],
    notes:
      "Loot preview context, claim board context, operations ledger defaults, journal helpers, and claim actor selectors."
  },
  {
    id: "merchants",
    label: "Merchant Domain And Workflows",
    lines: { start: 25730, end: 33099 },
    featureIds: ["merchants"],
    targetModules: ["scripts/features/merchant-domain.js", "scripts/features/merchants-ui.js"],
    notes:
      "Merchant definitions, stock state, shop sessions, city catalogs, inventory rows, restock, barter, and editor actions."
  },
  {
    id: "downtime-operations-actions",
    label: "Downtime And Operations Actions",
    lines: { start: 33100, end: 41500 },
    featureIds: ["downtime", "operations", "loot"],
    targetModules: ["scripts/features/downtime-*", "scripts/features/operations-*"],
    notes:
      "Loot claim records, downtime queues, gather submissions, reputation actions, source toggles, and operations page actions."
  },
  {
    id: "loot-runtime-actions",
    label: "Loot Runtime Actions",
    lines: { start: 41501, end: 44578 },
    featureIds: ["loot", "merchants"],
    targetModules: ["scripts/features/loot-runtime-*"],
    notes:
      "Loot source form actions, item preview editing, item sheet fallbacks, loot publishing, claims, split, and undo flows."
  },
  {
    id: "weather-upkeep-autopilot",
    label: "Weather, Upkeep, And Session Autopilot",
    lines: { start: 44579, end: 45609 },
    featureIds: ["operations", "gm-pages"],
    targetModules: ["scripts/features/weather-*", "scripts/features/upkeep-*"],
    notes:
      "Weather quick panel actions, automatic upkeep chat flow, calendar notes, operational brief, and session autopilot."
  },
  {
    id: "injury-recovery",
    label: "Injury Recovery",
    lines: { start: 45610, end: 46899 },
    featureIds: ["operations", "gm-pages"],
    targetModules: ["scripts/features/injury-*"],
    notes:
      "Injury tables, healer kit tracking, recovery state, Simple Calendar sync, treatment checks, and recovery cycle."
  },
  {
    id: "rest-march-runtime",
    label: "Rest Watch And March Runtime",
    lines: { start: 46900, end: 51037 },
    featureIds: ["rest-watch", "march"],
    targetModules: ["scripts/features/rest-feature.js", "scripts/features/march-feature.js", "scripts/apps"],
    notes:
      "Rest activities, marching state, rest/march update writes, assignment actions, formation board, passives, clock, and inventory hooks."
  },
  {
    id: "api-socket-bootstrap",
    label: "API, Socket Handler, And Runtime Bootstrap",
    lines: { start: 51038, end: 51667 },
    featureIds: ["runtime-shell", "sockets", "hooks", "rest-watch"],
    targetModules: ["scripts/runtime", "scripts/core/socket-*", "scripts/bootstrap"],
    notes:
      "Public API builder, world diagnostics, init/ready config builders, socket handler, refresh controller, and open-rest emitters."
  }
]);

export function getLegacySourceSlices() {
  return LEGACY_SOURCE_SLICES.map((slice, index) => ({
    ...slice,
    lines: { ...slice.lines },
    featureIds: [...slice.featureIds],
    targetModules: [...slice.targetModules],
    slicePath: `legacy/slices/${String(index + 1).padStart(2, "0")}-${slice.id}.txt`
  }));
}

export function getLegacySourceSlicesForFeature(featureId) {
  const normalizedFeatureId = String(featureId ?? "").trim();
  if (!normalizedFeatureId) return [];
  return getLegacySourceSlices().filter((slice) => slice.featureIds.includes(normalizedFeatureId));
}
