import assert from "node:assert/strict";

import { createPartyOperationsSettingsAccess } from "./core/settings-access.js";

const values = {
  advancedSettingsEnabled: true,
  playerAutoOpenRest: false,
  playerHubMode: "advanced"
};

const settingsAccess = createPartyOperationsSettingsAccess({
  moduleId: "party-operations",
  settings: {
    ADVANCED_SETTINGS_ENABLED: "advancedSettingsEnabled",
    PLAYER_AUTO_OPEN_REST: "playerAutoOpenRest",
    PLAYER_HUB_MODE: "playerHubMode"
  },
  playerHubModes: {
    SIMPLE: "simple",
    ADVANCED: "advanced"
  },
  launcherPlacements: {
    FLOATING: "floating",
    SIDEBAR: "sidebar",
    BOTH: "both"
  },
  gameRef: {
    settings: {
      get(moduleId, key) {
        assert.equal(moduleId, "party-operations");
        return values[key];
      }
    }
  }
});

assert.equal(settingsAccess.areAdvancedSettingsEnabled(), true);
values.advancedSettingsEnabled = 0;
assert.equal(settingsAccess.areAdvancedSettingsEnabled(), false);

assert.equal(settingsAccess.shouldAutoOpenRestForPlayers(), false);
values.playerAutoOpenRest = "yes";
assert.equal(settingsAccess.shouldAutoOpenRestForPlayers(), true);

assert.equal(settingsAccess.normalizePlayerHubMode("simple"), "simple");
assert.equal(settingsAccess.normalizePlayerHubMode("invalid"), "simple");
assert.equal(settingsAccess.getPlayerHubModeSetting(), "advanced");
values.playerHubMode = "invalid";
assert.equal(settingsAccess.getPlayerHubModeSetting(), "simple");

assert.equal(settingsAccess.normalizeLauncherPlacement("sidebar"), "sidebar");
assert.equal(settingsAccess.normalizeLauncherPlacement("both"), "both");
assert.equal(settingsAccess.normalizeLauncherPlacement("invalid"), "floating");

process.stdout.write("settings access validation passed\n");
