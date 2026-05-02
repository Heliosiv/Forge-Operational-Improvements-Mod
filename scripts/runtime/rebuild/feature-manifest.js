import { getLegacySourceSlicesForFeature } from "./legacy-source-map.js";

const FEATURE_STATUSES = Object.freeze({
  ACTIVE: "active",
  PARTIAL: "partial",
  STUBBED: "stubbed",
  DISABLED: "disabled"
});

const REFACTOR_FEATURES = Object.freeze([
  {
    id: "runtime-shell",
    label: "Runtime Shell",
    status: FEATURE_STATUSES.ACTIVE,
    owner: "scripts/runtime/index.js",
    runtimeOwners: ["scripts/module.js", "scripts/bootstrap/runtime.js", "scripts/runtime/index.js"],
    focusedChecks: ["check:module-entry", "check:bootstrap-runtime", "check:bootstrap-lifecycle"],
    monolithRole: "lazy-loaded-compatibility-layer"
  },
  {
    id: "settings",
    label: "Settings",
    status: FEATURE_STATUSES.ACTIVE,
    owner: "scripts/core/settings-registration.js",
    runtimeOwners: [
      "scripts/core/settings-registration.js",
      "scripts/core/settings-bootstrap.js",
      "scripts/core/settings-access.js",
      "scripts/runtime/settings/refactor-settings.js"
    ],
    focusedChecks: [
      "check:settings-registration",
      "check:settings-bootstrap",
      "check:settings-access",
      "check:settings-ui"
    ],
    monolithRole: "compatibility-caller"
  },
  {
    id: "navigation",
    label: "Navigation",
    status: FEATURE_STATUSES.ACTIVE,
    owner: "scripts/features/main-tab-navigation.js",
    runtimeOwners: [
      "scripts/features/main-tab-navigation.js",
      "scripts/features/main-tab-registry.js",
      "scripts/features/navigation-ui-state.js",
      "scripts/runtime/navigation/navigation-api.js"
    ],
    focusedChecks: ["check:main-tab-registry", "check:main-tab-navigation", "check:navigation-ui-state"],
    monolithRole: "app-shell-dispatcher"
  },
  {
    id: "sockets",
    label: "Sockets",
    status: FEATURE_STATUSES.ACTIVE,
    owner: "scripts/core/socket-routes.js",
    runtimeOwners: [
      "scripts/core/socket-routes.js",
      "scripts/core/socket-route-deps.js",
      "scripts/core/socket-message-handler.js",
      "scripts/runtime/sockets/refresh-socket.js"
    ],
    focusedChecks: ["check:socket-routes", "check:socket-route-deps", "check:socket-gm-requester-routes"],
    monolithRole: "route-dependency-provider"
  },
  {
    id: "hooks",
    label: "Runtime Hooks",
    status: FEATURE_STATUSES.ACTIVE,
    owner: "scripts/hooks/runtime-hooks.js",
    runtimeOwners: [
      "scripts/hooks/runtime-hooks.js",
      "scripts/hooks/ui-hooks.js",
      "scripts/hooks/runtime-modules",
      "scripts/runtime/lifecycle/hook-registration.js"
    ],
    focusedChecks: ["check:runtime-hooks", "check:ui-hooks"],
    monolithRole: "hook-config-provider"
  },
  {
    id: "rest-watch",
    label: "Rest Watch",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/rest-feature.js",
    runtimeOwners: ["scripts/features/rest-feature.js", "scripts/apps/rest-watch-player-app.js"],
    focusedChecks: ["check:rest-feature", "check:rest-watch-summary", "check:player-ui-overrides"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "march",
    label: "Marching Order",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/march-feature.js",
    runtimeOwners: ["scripts/features/march-feature.js", "scripts/features/march-doctrine.js"],
    focusedChecks: ["check:march-feature", "check:march-doctrine"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "operations",
    label: "Operations",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/operations-player-handlers.js",
    runtimeOwners: [
      "scripts/features/operations-player-handlers.js",
      "scripts/features/operations-journal.js",
      "scripts/core/gather-history-view.js"
    ],
    focusedChecks: ["check:operations-player-handlers", "check:operations-journal", "check:gather-history-view"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "gm-pages",
    label: "GM Pages",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/*-ui.js",
    runtimeOwners: [
      "scripts/features/downtime-ui.js",
      "scripts/features/factions-ui.js",
      "scripts/features/loot-ui.js",
      "scripts/features/merchants-ui.js",
      "scripts/features/weather-ui.js"
    ],
    focusedChecks: ["check:template-loader", "check:navigation-ui-state", "check:gm-downtime-view"],
    monolithRole: "context-builder"
  },
  {
    id: "loot",
    label: "Loot",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/loot-*",
    runtimeOwners: [
      "scripts/features/loot-item-overrides.js",
      "scripts/features/loot-item-override-editor.js",
      "scripts/features/loot-candidate-sources.js",
      "scripts/features/loot-ui-state.js",
      "scripts/features/loot-ui.js"
    ],
    focusedChecks: [
      "check:loot-item-overrides",
      "check:loot-ui-state",
      "check:loot-compendium-manifest-source",
      "check:loot-item-candidate-sources"
    ],
    monolithRole: "active-engine-and-dispatcher",
    extractedSlices: ["item-overrides", "source-selection"]
  },
  {
    id: "merchants",
    label: "Merchants",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/merchant-*",
    runtimeOwners: [
      "scripts/features/merchant-domain.js",
      "scripts/features/merchant-ui-state.js",
      "scripts/features/merchants-ui.js"
    ],
    focusedChecks: ["check:merchant-domain", "check:merchant-ui-state"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "downtime",
    label: "Downtime",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/downtime-*",
    runtimeOwners: [
      "scripts/features/downtime-phase1-service.js",
      "scripts/features/downtime-ui.js",
      "scripts/core/downtime-v2.js",
      "scripts/core/downtime-policy.js"
    ],
    focusedChecks: ["check:downtime-v2", "check:downtime-phase1", "check:downtime-submission-ui"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "audio",
    label: "Audio",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/audio-*",
    runtimeOwners: [
      "scripts/features/audio-ui.js",
      "scripts/features/audio-store.js",
      "scripts/features/audio-preset-manager.js",
      "scripts/features/audio-library-scan-cache.js"
    ],
    focusedChecks: ["check:audio-store-shared-cache", "check:audio-preset-manager", "check:audio-library-scan-cache"],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "journal",
    label: "Operations Journal",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/features/operations-journal*",
    runtimeOwners: [
      "scripts/features/operations-journal.js",
      "scripts/features/operations-journal-service.js",
      "scripts/features/operations-journal-settings.js"
    ],
    focusedChecks: [
      "check:operations-journal",
      "check:operations-journal-service",
      "check:operations-journal-settings"
    ],
    monolithRole: "active-compatibility-layer"
  },
  {
    id: "integration-effects",
    label: "Integration Effects",
    status: FEATURE_STATUSES.PARTIAL,
    owner: "scripts/hooks/runtime-modules",
    runtimeOwners: ["scripts/hooks/runtime-modules", "scripts/features/sync-effects-session-state.js"],
    focusedChecks: ["check:runtime-hooks", "check:sync-effects-session-state", "check:integration-access"],
    monolithRole: "active-compatibility-layer"
  }
]);

export function getRefactorFeatureStatuses() {
  return Object.values(FEATURE_STATUSES);
}

export function getRefactorFeatureManifest() {
  return REFACTOR_FEATURES.map((feature) => ({
    ...feature,
    runtimeOwners: [...(feature.runtimeOwners ?? [])],
    focusedChecks: [...(feature.focusedChecks ?? [])],
    extractedSlices: [...(feature.extractedSlices ?? [])],
    legacySource: getLegacySourceSlicesForFeature(feature.id)
  }));
}

export function getDisabledRefactorFeatureIds() {
  return REFACTOR_FEATURES.filter((feature) => feature.status === FEATURE_STATUSES.DISABLED).map(
    (feature) => feature.id
  );
}

export function getRefactorFeatureStatusCounts() {
  return getRefactorFeatureManifest().reduce((counts, feature) => {
    const status = String(feature?.status ?? FEATURE_STATUSES.DISABLED);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

export function registerRefactorFeatureModules({ logger = console } = {}) {
  const manifest = getRefactorFeatureManifest();
  const counts = getRefactorFeatureStatusCounts();
  logger?.info?.(
    `[party-operations] modular refactor manifest loaded (${counts.active ?? 0} active, ${counts.partial ?? 0} partial, ${counts.stubbed ?? 0} stubbed, ${counts.disabled ?? 0} disabled).`
  );
  return manifest;
}
