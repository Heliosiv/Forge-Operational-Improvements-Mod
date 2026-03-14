import assert from "node:assert/strict";

import { registerPartyOpsUiSettings } from "./core/settings-ui.js";

const originalGame = globalThis.game;
const originalFoundry = globalThis.foundry;
const originalConsoleWarn = console.warn;

try {
  const registeredMenus = [];
  const registeredSettings = [];
  const warnings = [];

  globalThis.game = {
    settings: {
      registerMenu(namespace, key, config) {
        registeredMenus.push({ namespace, key, config });
        throw new Error("menu registration failed");
      },
      register(namespace, key, config) {
        registeredSettings.push({ namespace, key, config });
      }
    }
  };

  globalThis.foundry = {
    utils: {
      deepClone(value) {
        return JSON.parse(JSON.stringify(value));
      }
    }
  };

  console.warn = (...args) => {
    warnings.push(args.map((entry) => String(entry)).join(" "));
  };

  registerPartyOpsUiSettings({
    moduleId: "party-operations",
    settings: {
      ADVANCED_SETTINGS_ENABLED: "advancedSettingsEnabled",
      DEBUG_ENABLED: "debugEnabled",
      LOOT_SCARCITY: "lootScarcity",
      REST_AUTOMATION_ENABLED: "restAutomationEnabled",
      MARCHING_ORDER_LOCK_PLAYERS: "marchingOrderLockPlayers",
      PLAYER_HUB_MODE: "playerHubMode",
      UI_BUTTON_SOUNDS_ENABLED: "uiButtonSoundsEnabled",
      UI_BUTTON_SOUND_PATH: "uiButtonSoundPath",
      PARTY_OPS_CONFIG: "partyOpsConfig"
    },
    settingsHubType: class MockSettingsHub {},
    areAdvancedSettingsEnabled: () => false,
    lootScarcityLevels: {
      ABUNDANT: "abundant",
      NORMAL: "normal",
      SCARCE: "scarce"
    },
    playerHubModes: {
      SIMPLE: "simple",
      ADVANCED: "advanced"
    },
    defaultPartyOpsConfig: {
      debugEnabled: false
    },
    validatePartyOpsConfig: (value) => value ?? {},
    notifyUiInfoThrottled: () => {},
    normalizePlayerHubMode: (value) => String(value ?? "").trim().toLowerCase() === "advanced" ? "advanced" : "simple",
    setModuleSettingWithLocalRefreshSuppressed: async () => {},
    isPartyOpsConfigNormalizationInProgress: () => false,
    setPartyOpsConfigNormalizationInProgress: () => {},
    onSettingsChanged: () => {}
  });

  assert.equal(registeredMenus.length, 1);
  assert.ok(warnings.some((entry) => entry.includes("failed to register settings hub menu")));
  assert.ok(
    registeredSettings.some((entry) => entry.key === "advancedSettingsEnabled"),
    "advanced settings toggle should still register after a menu failure"
  );
  assert.ok(
    registeredSettings.some((entry) => entry.key === "playerHubMode"),
    "core visible settings should still register after a menu failure"
  );
} finally {
  globalThis.game = originalGame;
  globalThis.foundry = originalFoundry;
  console.warn = originalConsoleWarn;
}

process.stdout.write("settings ui validation passed\n");
