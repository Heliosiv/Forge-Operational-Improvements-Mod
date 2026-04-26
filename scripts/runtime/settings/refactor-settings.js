import { MODULE_ID } from "../../core/constants.js";
import { SETTINGS } from "../../core/settings-keys.js";
import { LAUNCHER_PLACEMENTS } from "../../core/window-config.js";

const REFACTOR_MODE_SETTING = "modularRefactorMode";

function getSettingsRegistry(gameRef = globalThis.game) {
  return gameRef?.settings?.settings ?? null;
}

function hasSetting(moduleId, settingKey, gameRef = globalThis.game) {
  return Boolean(getSettingsRegistry(gameRef)?.has?.(`${moduleId}.${settingKey}`));
}

function registerSetting(moduleId, settingKey, config, gameRef = globalThis.game) {
  if (hasSetting(moduleId, settingKey, gameRef)) return false;
  gameRef?.settings?.register?.(moduleId, settingKey, config);
  return true;
}

export function registerRefactorSettings(onSettingsChanged = () => {}, { gameRef = globalThis.game } = {}) {
  registerSetting(
    MODULE_ID,
    SETTINGS.DEBUG_ENABLED,
    {
      name: "Debug Logging",
      hint: "Enable Party Operations debug logging while the modular rebuild is in progress.",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => onSettingsChanged(SETTINGS.DEBUG_ENABLED)
    },
    gameRef
  );

  registerSetting(
    MODULE_ID,
    REFACTOR_MODE_SETTING,
    {
      name: "Modular Refactor Mode",
      hint: "Marks this world as running the stripped modular Party Operations shell.",
      scope: "world",
      config: false,
      type: Boolean,
      default: true,
      onChange: () => onSettingsChanged(REFACTOR_MODE_SETTING)
    },
    gameRef
  );

  registerSetting(
    MODULE_ID,
    SETTINGS.LAUNCHER_PLACEMENT,
    {
      name: "Launcher Placement",
      hint: "Choose whether the Party Operations launcher floats on screen, docks in the sidebar, or uses both.",
      scope: "client",
      config: true,
      type: String,
      choices: {
        [LAUNCHER_PLACEMENTS.FLOATING]: "Floating on Screen",
        [LAUNCHER_PLACEMENTS.SIDEBAR]: "Pinned in Sidebar",
        [LAUNCHER_PLACEMENTS.BOTH]: "Show Both"
      },
      default: LAUNCHER_PLACEMENTS.FLOATING,
      onChange: () => onSettingsChanged(SETTINGS.LAUNCHER_PLACEMENT)
    },
    gameRef
  );

  registerSetting(
    MODULE_ID,
    SETTINGS.FLOATING_LAUNCHER_POS,
    {
      name: "Floating Launcher Position",
      scope: "client",
      config: false,
      type: Object,
      default: { left: 72, top: 180 },
      onChange: () => onSettingsChanged(SETTINGS.FLOATING_LAUNCHER_POS)
    },
    gameRef
  );

  registerSetting(
    MODULE_ID,
    SETTINGS.FLOATING_LAUNCHER_LOCKED,
    {
      name: "Lock Floating Launcher Position",
      scope: "client",
      config: true,
      type: Boolean,
      default: false,
      onChange: () => onSettingsChanged(SETTINGS.FLOATING_LAUNCHER_LOCKED)
    },
    gameRef
  );
}

export function ensureRefactorSettingsRegistered(options = {}) {
  registerRefactorSettings(() => {}, options);
}

export function getRefactorSettingsKeys() {
  return [
    SETTINGS.DEBUG_ENABLED,
    REFACTOR_MODE_SETTING,
    SETTINGS.LAUNCHER_PLACEMENT,
    SETTINGS.FLOATING_LAUNCHER_POS,
    SETTINGS.FLOATING_LAUNCHER_LOCKED
  ];
}
