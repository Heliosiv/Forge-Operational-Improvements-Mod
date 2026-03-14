import assert from "node:assert/strict";

import { createPartyOperationsConfigAccess } from "./core/config-access.js";

const persisted = [];
const settingsState = {
  partyOpsConfig: {
    debugEnabled: true,
    lootScarcity: "invalid",
    rarityWeights: {
      common: -2
    },
    crGoldMultiplier: 0
  },
  inventoryHookMode: "refresh"
};

let normalizationInProgress = false;

const configAccess = createPartyOperationsConfigAccess({
  moduleId: "party-operations",
  settings: {
    PARTY_OPS_CONFIG: "partyOpsConfig",
    INVENTORY_HOOK_MODE: "inventoryHookMode"
  },
  configSchema: 4,
  defaultPartyOpsConfig: {
    debugEnabled: false,
    lootScarcity: "normal",
    rarityWeights: {
      common: 1,
      uncommon: 2
    },
    crGoldMultiplier: 1
  },
  lootScarcityLevels: {
    ABUNDANT: "abundant",
    NORMAL: "normal",
    SCARCE: "scarce"
  },
  partyOpsLootRarities: ["common", "uncommon"],
  inventoryHookModes: {
    OFF: "off",
    REFRESH: "refresh",
    SYNC: "sync"
  },
  gameRef: {
    settings: {
      get(moduleId, key) {
        assert.equal(moduleId, "party-operations");
        return settingsState[key];
      }
    }
  },
  setModuleSettingWithLocalRefreshSuppressed: async (key, value) => {
    persisted.push({ key, value });
    settingsState[key] = value;
  },
  isPartyOpsConfigNormalizationInProgress: () => normalizationInProgress,
  setPartyOpsConfigNormalizationInProgress: (value) => {
    normalizationInProgress = Boolean(value);
  },
  getPlayerHubModeSetting: () => "advanced",
  getLauncherPlacement: () => "both",
  isFloatingLauncherLocked: () => true,
  getIntegrationModeSetting: () => "auto",
  resolveIntegrationMode: () => "dae",
  isDaeAvailable: () => true,
  getJournalVisibilityMode: () => "redacted",
  getJournalFilterDebounceMs: () => 220,
  getSessionSummaryRangeSetting: () => "last-7d",
  getGatherRollModeSetting: () => "prefer-monks",
  getGatherResourceConfig: () => ({ food: 3 }),
  foundryRef: {
    utils: {
      deepClone(value) {
        return structuredClone(value);
      }
    }
  },
  logWarn: () => {}
});

assert.deepEqual(
  configAccess.validatePartyOpsConfig({
    debugEnabled: 1,
    lootScarcity: "abundant",
    rarityWeights: { common: 4, uncommon: -3 },
    crGoldMultiplier: 2.5
  }),
  {
    debugEnabled: true,
    lootScarcity: "abundant",
    rarityWeights: { common: 4, uncommon: 0 },
    crGoldMultiplier: 2.5
  }
);

const normalized = configAccess.getPartyOpsConfigSetting();
assert.deepEqual(normalized, {
  debugEnabled: true,
  lootScarcity: "normal",
  rarityWeights: { common: 0, uncommon: 2 },
  crGoldMultiplier: 1
});
await Promise.resolve();
assert.deepEqual(persisted.at(-1), {
  key: "partyOpsConfig",
  value: normalized
});

assert.equal(configAccess.normalizeInventoryHookMode("off"), "off");
assert.equal(configAccess.normalizeInventoryHookMode("invalid"), "sync");
assert.equal(configAccess.getInventoryHookModeSetting(), "refresh");
assert.equal(await configAccess.setInventoryHookMode("invalid"), "sync");
assert.deepEqual(persisted.at(-1), {
  key: "inventoryHookMode",
  value: "sync"
});

assert.deepEqual(configAccess.getModuleConfigSnapshot(), {
  schema: 4,
  ui: {
    playerHubMode: "advanced"
  },
  launcher: {
    placement: "both",
    floatingLocked: true
  },
  integration: {
    configuredMode: "auto",
    resolvedMode: "dae",
    daeAvailable: true
  },
  journal: {
    visibility: "redacted",
    filterDebounceMs: 220,
    sessionSummaryRange: "last-7d"
  },
  inventory: {
    hookMode: "sync"
  },
  gather: {
    rollMode: "prefer-monks",
    rules: { food: 3 }
  },
  typedConfig: {
    value: normalized
  }
});

process.stdout.write("config access validation passed\n");
