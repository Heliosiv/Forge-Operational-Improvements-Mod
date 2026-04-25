import { getLegacySourceSlicesForFeature } from "./legacy-source-map.js";

const REFACTOR_FEATURES = Object.freeze([
  {
    id: "runtime-shell",
    label: "Runtime Shell",
    status: "active",
    owner: "scripts/runtime/index.js"
  },
  {
    id: "settings",
    label: "Settings",
    status: "stubbed",
    owner: "scripts/runtime/settings/refactor-settings.js"
  },
  {
    id: "navigation",
    label: "Navigation",
    status: "stubbed",
    owner: "scripts/runtime/navigation/navigation-api.js"
  },
  {
    id: "sockets",
    label: "Sockets",
    status: "stubbed",
    owner: "scripts/runtime/sockets/refresh-socket.js"
  },
  {
    id: "hooks",
    label: "Runtime Hooks",
    status: "stubbed",
    owner: "scripts/runtime/lifecycle/hook-registration.js"
  },
  {
    id: "rest-watch",
    label: "Rest Watch",
    status: "disabled",
    owner: "scripts/features/rest-feature.js"
  },
  {
    id: "march",
    label: "Marching Order",
    status: "disabled",
    owner: "scripts/features/march-feature.js"
  },
  {
    id: "operations",
    label: "Operations",
    status: "disabled",
    owner: "scripts/features"
  },
  {
    id: "gm-pages",
    label: "GM Pages",
    status: "disabled",
    owner: "scripts/features/*-ui.js"
  },
  {
    id: "loot",
    label: "Loot",
    status: "disabled",
    owner: "scripts/features/loot-*"
  },
  {
    id: "merchants",
    label: "Merchants",
    status: "disabled",
    owner: "scripts/features/merchant-*"
  },
  {
    id: "downtime",
    label: "Downtime",
    status: "disabled",
    owner: "scripts/features/downtime-*"
  },
  {
    id: "audio",
    label: "Audio",
    status: "disabled",
    owner: "scripts/features/audio-*"
  },
  {
    id: "journal",
    label: "Operations Journal",
    status: "disabled",
    owner: "scripts/features/operations-journal*"
  },
  {
    id: "integration-effects",
    label: "Integration Effects",
    status: "disabled",
    owner: "scripts/hooks/runtime-modules"
  }
]);

export function getRefactorFeatureManifest() {
  return REFACTOR_FEATURES.map((feature) => ({
    ...feature,
    legacySource: getLegacySourceSlicesForFeature(feature.id)
  }));
}

export function getDisabledRefactorFeatureIds() {
  return REFACTOR_FEATURES.filter((feature) => feature.status === "disabled").map((feature) => feature.id);
}

export function registerRefactorFeatureModules({ logger = console } = {}) {
  logger?.info?.("[party-operations] modular refactor shell loaded; feature modules are disabled for rebuild.");
  return getRefactorFeatureManifest();
}
