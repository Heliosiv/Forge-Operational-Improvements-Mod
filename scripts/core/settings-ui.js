export function registerPartyOpsUiSettings({
  moduleId,
  settings,
  settingsHubType,
  areAdvancedSettingsEnabled,
  lootScarcityLevels,
  playerHubModes,
  defaultPartyOpsConfig,
  validatePartyOpsConfig,
  notifyUiInfoThrottled,
  normalizePlayerHubMode,
  setModuleSettingWithLocalRefreshSuppressed,
  isPartyOpsConfigNormalizationInProgress,
  setPartyOpsConfigNormalizationInProgress,
  onSettingsChanged = () => {}
} = {}) {
  const notifySettingChanged = (key, value) => {
    try {
      onSettingsChanged(key, value);
    } catch (error) {
      console.warn(`${moduleId}: settings onChange callback failed`, { key, value, error });
    }
  };

  try {
    game.settings.registerMenu(moduleId, "settingsHub", {
      name: "Settings Hub",
      label: "Open Settings Hub",
      hint: "Open a guided Party Operations settings editor.",
      icon: "fas fa-sliders-h",
      type: settingsHubType,
      restricted: true
    });
  } catch (error) {
    console.warn(`${moduleId}: failed to register settings hub menu`, error);
  }

  game.settings.register(moduleId, settings.ADVANCED_SETTINGS_ENABLED, {
    name: "Show Advanced Settings",
    hint: "Reveal advanced Party Operations tuning options. Re-open Configure Settings after changing this toggle.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      const enabled = Boolean(value);
      notifySettingChanged(settings.ADVANCED_SETTINGS_ENABLED, enabled);
      const message = enabled
        ? "Party Operations advanced settings are now visible. Re-open Configure Settings to refresh the list."
        : "Party Operations advanced settings are now hidden. Re-open Configure Settings to refresh the list.";
      notifyUiInfoThrottled(message, { key: "advanced-settings-refresh-tip", ttlMs: 2000 });
    }
  });

  const showAdvancedSettings = areAdvancedSettingsEnabled();

  game.settings.register(moduleId, settings.DEBUG_ENABLED, {
    name: "Enable Debug Logging",
    hint: "Turn on verbose Party Operations debug output for troubleshooting.",
    scope: "world",
    config: showAdvancedSettings,
    type: Boolean,
    default: false,
    onChange: (value) => notifySettingChanged(settings.DEBUG_ENABLED, Boolean(value))
  });

  game.settings.register(moduleId, settings.LOOT_SCARCITY, {
    name: "Loot Scarcity",
    hint: "Set overall loot availability used by Party Operations loot systems.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      [lootScarcityLevels.ABUNDANT]: "Abundant",
      [lootScarcityLevels.NORMAL]: "Normal",
      [lootScarcityLevels.SCARCE]: "Scarce"
    },
    default: lootScarcityLevels.NORMAL,
    onChange: (value) => {
      const raw = String(value ?? lootScarcityLevels.NORMAL).trim().toLowerCase();
      const normalized = raw === lootScarcityLevels.ABUNDANT || raw === lootScarcityLevels.SCARCE
        ? raw
        : lootScarcityLevels.NORMAL;
      notifySettingChanged(settings.LOOT_SCARCITY, normalized);
    }
  });

  game.settings.register(moduleId, settings.REST_AUTOMATION_ENABLED, {
    name: "Enable Rest Automation",
    hint: "Allow Party Operations to automate supported rest workflows.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => notifySettingChanged(settings.REST_AUTOMATION_ENABLED, Boolean(value))
  });

  game.settings.register(moduleId, settings.MARCHING_ORDER_LOCK_PLAYERS, {
    name: "Lock Marching Order For Players",
    hint: "Prevent non-GM players from changing marching order positions.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => notifySettingChanged(settings.MARCHING_ORDER_LOCK_PLAYERS, Boolean(value))
  });

  game.settings.register(moduleId, settings.PLAYER_HUB_MODE, {
    name: "Player Hub Mode",
    hint: "Choose the player-facing Party Operations UI: streamlined hub or full classic layout.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      [playerHubModes.SIMPLE]: "Simple (Hub)",
      [playerHubModes.ADVANCED]: "Advanced (Classic)"
    },
    default: playerHubModes.SIMPLE,
    onChange: (value) => notifySettingChanged(settings.PLAYER_HUB_MODE, normalizePlayerHubMode(value))
  });

  game.settings.register(moduleId, settings.UI_BUTTON_SOUNDS_ENABLED, {
    name: "UI Button Sounds",
    hint: "Play a short local sound when pressing Party Operations buttons and tabs.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => notifySettingChanged(settings.UI_BUTTON_SOUNDS_ENABLED, Boolean(value))
  });

  game.settings.register(moduleId, settings.UI_BUTTON_SOUND_PATH, {
    name: "UI Button Sound Path",
    hint: "Audio path used for Party Operations button sounds. Leave blank to fall back to Foundry's core UI sound.",
    scope: "client",
    config: true,
    type: String,
    default: "sounds/lock.wav",
    onChange: (value) => {
      const normalized = String(value ?? "").trim() || "sounds/lock.wav";
      notifySettingChanged(settings.UI_BUTTON_SOUND_PATH, normalized);
    }
  });

  game.settings.register(moduleId, settings.PARTY_OPS_CONFIG, {
    name: "Party Operations Config",
    hint: "Validated module config payload for loot/scarcity tuning and debug wiring.",
    scope: "world",
    config: false,
    type: Object,
    default: foundry.utils.deepClone(defaultPartyOpsConfig),
    onChange: (value) => {
      const normalized = validatePartyOpsConfig(value);
      notifySettingChanged(settings.PARTY_OPS_CONFIG, normalized);
      const incomingSerialized = JSON.stringify(value ?? null);
      const normalizedSerialized = JSON.stringify(normalized);
      if (isPartyOpsConfigNormalizationInProgress()) return;
      if (incomingSerialized === normalizedSerialized) return;
      setPartyOpsConfigNormalizationInProgress(true);
      void setModuleSettingWithLocalRefreshSuppressed(settings.PARTY_OPS_CONFIG, normalized)
        .catch((error) => {
          console.warn(`${moduleId}: failed to normalize partyOpsConfig on save`, error);
        })
        .finally(() => {
          setPartyOpsConfigNormalizationInProgress(false);
        });
    }
  });
}
