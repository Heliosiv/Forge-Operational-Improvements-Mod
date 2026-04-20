export function registerPartyOpsFeatureSettings({
  moduleId,
  settings,
  areAdvancedSettingsEnabled,
  autoInventoryPackIndexCache,
  autoInventoryDefaults,
  gatherDefaults,
  gatherTravelChoices,
  launcherPlacements,
  journalVisibilityModes,
  sessionSummaryRangeOptions,
  inventoryHookModes,
  ensureLauncherUi,
  resetFloatingLauncherPosition,
  refreshOpenApps,
  refreshScopeKeys,
  openRestWatchUiForCurrentUser,
  openMainTab
} = {}) {
  const showAdvancedSettings = areAdvancedSettingsEnabled();

  game.settings.register(moduleId, settings.AUTO_INV_ENABLED, {
    name: "Auto Inventory For Unlinked Tokens",
    hint: "When enabled, new unlinked NPC tokens get generated usable inventory on placement.",
    scope: "world",
    config: showAdvancedSettings,
    type: Boolean,
    default: true
  });

  for (const [settingKey, label, hint] of [
    [settings.AUTO_INV_WEAPON_PACK, "Auto Inventory Weapon Pack", "Compendium pack ID used for weapon lookups (for example dnd5e.items)."],
    [settings.AUTO_INV_ARMOR_PACK, "Auto Inventory Armor Pack", "Compendium pack ID used for armor/shield lookups."],
    [settings.AUTO_INV_GEAR_PACK, "Auto Inventory Gear Pack", "Compendium pack ID used for adventuring gear lookups."],
    [settings.AUTO_INV_CONSUMABLES_PACK, "Auto Inventory Consumables Pack", "Compendium pack ID used for potions and consumables lookups."]
  ]) {
    game.settings.register(moduleId, settingKey, {
      name: label,
      hint,
      scope: "world",
      config: showAdvancedSettings,
      type: String,
      default: "dnd5e.items",
      onChange: () => autoInventoryPackIndexCache.clear()
    });
  }

  game.settings.register(moduleId, settings.AUTO_INV_CURRENCY_ENABLED, {
    name: "Auto Inventory Currency",
    hint: "If enabled, generated unlinked token inventory can include weighted currency bundles.",
    scope: "world",
    config: showAdvancedSettings,
    type: Boolean,
    default: true
  });

  game.settings.register(moduleId, settings.AUTO_INV_ITEM_CHANCE_SCALAR, {
    name: "Auto Inventory Item Chance (%)",
    hint: "Scales non-mandatory equipment/gear chance for unlinked token auto inventory.",
    scope: "world",
    config: showAdvancedSettings,
    type: Number,
    range: { min: 0, max: 200, step: 5 },
    default: autoInventoryDefaults.itemChanceScalar
  });

  game.settings.register(moduleId, settings.AUTO_INV_CONSUMABLE_CHANCE_SCALAR, {
    name: "Auto Inventory Consumable Chance (%)",
    hint: "Scales potion and utility consumable chance for unlinked token auto inventory.",
    scope: "world",
    config: showAdvancedSettings,
    type: Number,
    range: { min: 0, max: 300, step: 5 },
    default: autoInventoryDefaults.consumableChanceScalar
  });

  game.settings.register(moduleId, settings.AUTO_INV_CURRENCY_SCALAR, {
    name: "Auto Inventory Currency Scale (%)",
    hint: "Scales generated currency bundle amounts for unlinked token auto inventory.",
    scope: "world",
    config: showAdvancedSettings,
    type: Number,
    range: { min: 0, max: 300, step: 5 },
    default: autoInventoryDefaults.currencyScalar
  });

  game.settings.register(moduleId, settings.AUTO_INV_QUALITY_SHIFT, {
    name: "Auto Inventory Quality Shift",
    hint: "Shifts item quality band from CR (-2 to +2) for stricter or richer gear quality.",
    scope: "world",
    config: showAdvancedSettings,
    type: Number,
    range: { min: -2, max: 2, step: 1 },
    default: autoInventoryDefaults.qualityShift
  });

  game.settings.register(moduleId, settings.INTEGRATION_MODE, {
    name: "Integration Mode",
    hint: "Legacy integration mode (locked off).",
    scope: "world",
    config: false,
    type: String,
    choices: {
      off: "Off"
    },
    default: "off"
  });

  game.settings.register(moduleId, settings.SESSION_AUTOPILOT_SNAPSHOT, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(moduleId, settings.GATHER_ROLL_MODE, {
    name: "Gather Roll Mode",
    hint: "Choose how Gather Resource checks request Wisdom (Survival) rolls.",
    scope: "world",
    config: showAdvancedSettings,
    type: String,
    choices: {
      "prefer-monks": "Prefer Monk's TokenBar (fallback to Foundry)",
      "monks-only": "Monk's TokenBar Only",
      "foundry-only": "Foundry Only"
    },
    default: "prefer-monks"
  });

  game.settings.register(moduleId, settings.GATHER_ENABLED, {
    name: "Gather Resources Enabled",
    hint: "Enable or disable gather resource actions in Party Operations.",
    scope: "world",
    config: showAdvancedSettings,
    type: Boolean,
    default: gatherDefaults.enabled
  });

  game.settings.register(moduleId, settings.GATHER_MIN_HOURS, {
    name: "Gather Minimum Hours",
    hint: "Minimum hours required for one gather attempt.",
    scope: "world",
    config: showAdvancedSettings,
    type: Number,
    range: { min: 1, max: 24, step: 1 },
    default: gatherDefaults.minimumHours
  });

  game.settings.register(moduleId, settings.GATHER_DISALLOW_COMBAT, {
    name: "Disallow Gather In Combat",
    hint: "Prevent gather attempts when the actor is an active combatant.",
    scope: "world",
    config: showAdvancedSettings,
    type: Boolean,
    default: gatherDefaults.disallowCombat
  });

  for (const [settingKey, label, hint, defaultValue] of [
    [settings.GATHER_DC_LUSH, "Gather DC: Lush Forest / River Valley", "Base DC for lush forest or river valley gather attempts.", gatherDefaults.baseDc.lush_forest_or_river_valley],
    [settings.GATHER_DC_TEMPERATE, "Gather DC: Temperate Hills / Light Woodland", "Base DC for temperate hills or light woodland gather attempts.", gatherDefaults.baseDc.temperate_hills_or_light_woodland],
    [settings.GATHER_DC_SPARSE, "Gather DC: Sparse Plains / Rocky", "Base DC for sparse plains or rocky terrain gather attempts.", gatherDefaults.baseDc.sparse_plains_or_rocky],
    [settings.GATHER_DC_COLD, "Gather DC: Cold Mountains / Swamp", "Base DC for cold mountains or swamp gather attempts.", gatherDefaults.baseDc.cold_mountains_or_swamp],
    [settings.GATHER_DC_DESERT, "Gather DC: Desert / Blighted Wasteland", "Base DC for desert or blighted wasteland gather attempts.", gatherDefaults.baseDc.desert_blighted_wasteland],
    [settings.GATHER_DEFAULT_SEASON_MOD, "Gather Default Season Modifier", "Default DC modifier from season shifts.", gatherDefaults.seasonMod],
    [settings.GATHER_DEFAULT_WEATHER_MOD, "Gather Default Weather Modifier", "Default DC modifier from weather conditions.", gatherDefaults.weatherMod],
    [settings.GATHER_DEFAULT_CORRUPTION_MOD, "Gather Default Corruption Modifier", "Default DC modifier from corruption effects.", gatherDefaults.corruptionMod],
    [settings.GATHER_CORRUPTION_SAVE_DC, "Gather: Corruption Water Con Save DC", "Constitution save DC used when contaminated water is found.", gatherDefaults.corruptionConSaveDc],
    [settings.GATHER_TRAVEL_CON_SAVE_DC, "Gather: Travel Con Save DC", "Constitution save DC when the actor falls behind during travel gathering.", gatherDefaults.travelConSaveDc]
  ]) {
    game.settings.register(moduleId, settingKey, {
      name: label,
      hint,
      scope: "world",
      config: showAdvancedSettings,
      type: Number,
      range: { min: settingKey === settings.GATHER_DEFAULT_SEASON_MOD || settingKey === settings.GATHER_DEFAULT_WEATHER_MOD || settingKey === settings.GATHER_DEFAULT_CORRUPTION_MOD ? -10 : 1, max: 30, step: 1 },
      default: defaultValue
    });
  }

  for (const [settingKey, label, hint, defaultValue] of [
    [settings.GATHER_ENABLE_HERBALISM_ADVANTAGE, "Gather: Herbalism Advantage", "Allow advantage for plant gathering mode when enabled by the GM.", gatherDefaults.herbalismAdvantageEnabled],
    [settings.GATHER_ENABLE_HOSTILE_FAIL_FLAG, "Gather: Hostile Terrain Encounter Flag", "On failure in hostile terrain, flag for encounter checks.", gatherDefaults.hostileEncounterFlagEnabled],
    [settings.GATHER_ENABLE_FAIL_BY5_COMPLICATION, "Gather: Fail by 5+ Complication", "Apply optional complications when the check fails by 5 or more.", gatherDefaults.failBy5ComplicationEnabled],
    [settings.GATHER_ENABLE_SUCCESS_BY5_DOUBLE, "Gather: Success by 5+ Doubles Rations", "Double rations on checks that succeed by 5 or more.", gatherDefaults.successBy5DoubleEnabled],
    [settings.GATHER_ENABLE_NAT20_BONUS, "Gather: Natural 20 Bonus", "Natural 20 grants +1d4 rations and safe campsite flag.", gatherDefaults.nat20BonusEnabled],
    [settings.GATHER_ENABLE_NAT1_FLAG, "Gather: Natural 1 Complication", "Natural 1 triggers spoiled/poison/attract-danger complication flag.", gatherDefaults.nat1ComplicationEnabled],
    [settings.GATHER_ENABLE_CORRUPTION_WATER_CHECK, "Gather: Corruption Water Check", "When gathering water in corrupted regions, run contamination check.", gatherDefaults.corruptionWaterCheckEnabled],
    [settings.GATHER_ENABLE_WATER_AUTO_FOUND, "Gather: Water Auto-Found Toggle", "Allow the obvious-water-source toggle to auto-find water.", gatherDefaults.waterAutoFoundEnabled],
    [settings.GATHER_ENABLE_TRAVEL_TRADEOFF, "Gather: Travel Tradeoff Enabled", "Apply travel tradeoff when gathering during travel.", gatherDefaults.travelTradeoffEnabled]
  ]) {
    game.settings.register(moduleId, settingKey, {
      name: label,
      hint,
      scope: "world",
      config: showAdvancedSettings,
      type: Boolean,
      default: defaultValue
    });
  }

  game.settings.register(moduleId, settings.GATHER_TRAVEL_TRADEOFF_DEFAULT, {
    name: "Gather: Default Travel Tradeoff",
    hint: "Default tradeoff used when gathering during travel.",
    scope: "world",
    config: showAdvancedSettings,
    type: String,
    choices: {
      [gatherTravelChoices.PACE]: "Reduce pace one step",
      [gatherTravelChoices.FELL_BEHIND]: "Fell behind + Con save"
    },
    default: gatherDefaults.travelTradeoffDefault
  });

  game.settings.register(moduleId, settings.LAUNCHER_PLACEMENT, {
    name: "Launcher Placement",
    hint: "Choose whether the Party Operations launcher is on-screen, in the sidebar, or both.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      [launcherPlacements.FLOATING]: "Floating on Screen",
      [launcherPlacements.SIDEBAR]: "Pinned in Sidebar",
      [launcherPlacements.BOTH]: "Show Both"
    },
    default: launcherPlacements.FLOATING,
    onChange: () => ensureLauncherUi()
  });

  game.settings.register(moduleId, settings.FLOATING_LAUNCHER_POS, {
    scope: "client",
    config: false,
    type: Object,
    default: { left: 16, top: 180 }
  });

  game.settings.register(moduleId, settings.FLOATING_LAUNCHER_LOCKED, {
    name: "Lock Launcher Position",
    hint: "When enabled, the floating Party Operations launcher cannot be dragged.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => ensureLauncherUi()
  });

  game.settings.register(moduleId, settings.FLOATING_LAUNCHER_RESET, {
    name: "Reset Launcher Position",
    hint: "Set to true to reset launcher position, then it auto-clears.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (!value) return;
      await resetFloatingLauncherPosition();
      await game.settings.set(moduleId, settings.FLOATING_LAUNCHER_RESET, false);
      ensureLauncherUi();
    }
  });

  game.settings.register(moduleId, settings.PLAYER_AUTO_OPEN_REST, {
    name: "Auto-open Rest Watch for Players",
    hint: "When enabled, opening Rest Watch as GM prompts connected non-GM users to open their player view.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(moduleId, settings.SHARED_GM_PERMISSIONS, {
    name: "Shared GM Permissions (Module)",
    hint: "When enabled, all players can use GM-level Party Operations controls. Changes still execute through the active GM client.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => refreshOpenApps({ scope: refreshScopeKeys.SETTINGS })
  });

  game.settings.register(moduleId, settings.JOURNAL_ENTRY_VISIBILITY, {
    name: "Operations Journal Visibility",
    hint: "Control how sensitive operation logs are exposed in shared journals.",
    scope: "world",
    config: showAdvancedSettings,
    type: String,
    choices: {
      [journalVisibilityModes.PUBLIC]: "Public (full details to observers)",
      [journalVisibilityModes.REDACTED]: "Redacted (sensitive details hidden)",
      [journalVisibilityModes.GM_PRIVATE]: "GM Only (sensitive entries private)"
    },
    default: journalVisibilityModes.REDACTED
  });

  game.settings.register(moduleId, settings.SESSION_SUMMARY_RANGE, {
    name: "Session Summary Default Window",
    hint: "Default lookback window when creating a session summary journal.",
    scope: "world",
    config: showAdvancedSettings,
    type: String,
    choices: sessionSummaryRangeOptions,
    default: "last-24h"
  });

  game.settings.register(moduleId, settings.JOURNAL_FILTER_DEBOUNCE_MS, {
    name: "Journal Filter Debounce (ms)",
    hint: "Delay before applying journal search input, to reduce UI re-renders.",
    scope: "client",
    config: showAdvancedSettings,
    type: Number,
    range: { min: 0, max: 1000, step: 10 },
    default: 180
  });

  game.settings.register(moduleId, settings.JOURNAL_FOLDER_CACHE, {
    scope: "world",
    config: false,
    type: Object,
    default: { folders: {} }
  });

  game.settings.register(moduleId, settings.INVENTORY_HOOK_MODE, {
    name: "Inventory Hook Mode",
    hint: "Controls actor inventory hook behavior for Party Operations refresh/sync.",
    scope: "world",
    config: showAdvancedSettings,
    type: String,
    choices: {
      [inventoryHookModes.OFF]: "Off",
      [inventoryHookModes.REFRESH]: "Refresh UI Only",
      [inventoryHookModes.SYNC]: "Refresh UI + Integration Sync"
    },
    default: inventoryHookModes.SYNC
  });

  game.keybindings.register(moduleId, "openRestWatch", {
    name: "Open Rest Watch",
    editable: [],
    onDown: () => {
      openRestWatchUiForCurrentUser({ force: true });
      return true;
    }
  });

  game.keybindings.register(moduleId, "openMarchingOrder", {
    name: "Open Marching Order",
    editable: [],
    onDown: () => {
      openMainTab("marching-order", { force: true });
      return true;
    }
  });
}
