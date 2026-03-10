import { bindCanvasKeyboardSuppression } from "./ui-keyboard-guard.js";

export function createPartyOperationsSettingsHub({
  moduleId,
  settings,
  lootScarcityLevels,
  playerHubModes,
  launcherPlacements,
  inventoryHookModes,
  refreshScopeKeys,
  areAdvancedSettingsEnabled,
  normalizePlayerHubMode,
  normalizeInventoryHookMode,
  normalizeLauncherPlacement,
  setModuleSettingWithLocalRefreshSuppressed,
  refreshOpenApps,
  ensureLauncherUi,
  notifyUiInfoThrottled,
  notifyUiWarnThrottled,
  canAccessAllPlayerOps
} = {}) {
  let settingsHubAppInstance = null;

  class PartyOperationsSettingsHub extends FormApplication {
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id: "party-operations-settings-hub",
        title: "Party Operations - Settings Hub",
        template: "modules/party-operations/templates/settings-hub.hbs",
        width: 760,
        height: "auto",
        resizable: true,
        closeOnSubmit: false,
        submitOnClose: false,
        classes: ["party-operations"]
      });
    }

    constructor(options = {}) {
      super(options);
      settingsHubAppInstance = this;
    }

    getData() {
      const advancedEnabled = areAdvancedSettingsEnabled();
      const playerHubMode = normalizePlayerHubMode(game.settings.get(moduleId, settings.PLAYER_HUB_MODE));
      const lootScarcity = String(game.settings.get(moduleId, settings.LOOT_SCARCITY) ?? lootScarcityLevels.NORMAL).trim().toLowerCase();
      const integrationMode = String(game.settings.get(moduleId, settings.INTEGRATION_MODE) ?? "auto").trim().toLowerCase();
      const inventoryHookMode = normalizeInventoryHookMode(game.settings.get(moduleId, settings.INVENTORY_HOOK_MODE));
      const launcherPlacement = normalizeLauncherPlacement(game.settings.get(moduleId, settings.LAUNCHER_PLACEMENT));
      return {
        advancedEnabled,
        playerHubModeSimple: playerHubMode === playerHubModes.SIMPLE,
        playerHubModeAdvanced: playerHubMode === playerHubModes.ADVANCED,
        sharedGmPermissions: Boolean(game.settings.get(moduleId, settings.SHARED_GM_PERMISSIONS)),
        restAutomationEnabled: Boolean(game.settings.get(moduleId, settings.REST_AUTOMATION_ENABLED)),
        marchingOrderLockPlayers: Boolean(game.settings.get(moduleId, settings.MARCHING_ORDER_LOCK_PLAYERS)),
        playerAutoOpenRest: Boolean(game.settings.get(moduleId, settings.PLAYER_AUTO_OPEN_REST)),
        launcherFloating: launcherPlacement === launcherPlacements.FLOATING,
        launcherSidebar: launcherPlacement === launcherPlacements.SIDEBAR,
        launcherBoth: launcherPlacement === launcherPlacements.BOTH,
        launcherLocked: Boolean(game.settings.get(moduleId, settings.FLOATING_LAUNCHER_LOCKED)),
        lootScarcityAbundant: lootScarcity === lootScarcityLevels.ABUNDANT,
        lootScarcityNormal: lootScarcity === lootScarcityLevels.NORMAL,
        lootScarcityScarce: lootScarcity === lootScarcityLevels.SCARCE,
        integrationModeAuto: integrationMode === "auto",
        integrationModeOff: integrationMode === "off",
        integrationModeFlags: integrationMode === "flags",
        integrationModeDae: integrationMode === "dae",
        inventoryHookModeOff: inventoryHookMode === inventoryHookModes.OFF,
        inventoryHookModeRefresh: inventoryHookMode === inventoryHookModes.REFRESH,
        inventoryHookModeSync: inventoryHookMode === inventoryHookModes.SYNC
      };
    }

    activateListeners(html) {
      super.activateListeners(html);
      bindCanvasKeyboardSuppression(html[0]);
      html.find("[data-action='open-foundry-settings']").on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        game.settings.sheet?.render(true);
      });
    }

    async _updateObject(_event, formData) {
      const data = foundry.utils.expandObject(formData ?? {});
      const toBool = (value) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        const text = String(value ?? "").trim().toLowerCase();
        return text === "true" || text === "1" || text === "on" || text === "yes";
      };

      const advancedBefore = areAdvancedSettingsEnabled();
      const updates = [
        [settings.PLAYER_HUB_MODE, normalizePlayerHubMode(data.playerHubMode)],
        [settings.SHARED_GM_PERMISSIONS, toBool(data.sharedGmPermissions)],
        [settings.REST_AUTOMATION_ENABLED, toBool(data.restAutomationEnabled)],
        [settings.MARCHING_ORDER_LOCK_PLAYERS, toBool(data.marchingOrderLockPlayers)],
        [settings.PLAYER_AUTO_OPEN_REST, toBool(data.playerAutoOpenRest)],
        [settings.ADVANCED_SETTINGS_ENABLED, toBool(data.advancedEnabled)],
        [settings.LAUNCHER_PLACEMENT, normalizeLauncherPlacement(data.launcherPlacement)],
        [settings.FLOATING_LAUNCHER_LOCKED, toBool(data.launcherLocked)],
        [settings.LOOT_SCARCITY, (() => {
          const value = String(data.lootScarcity ?? lootScarcityLevels.NORMAL).trim().toLowerCase();
          if (value === lootScarcityLevels.ABUNDANT || value === lootScarcityLevels.SCARCE) return value;
          return lootScarcityLevels.NORMAL;
        })()],
        [settings.INTEGRATION_MODE, (() => {
          const value = String(data.integrationMode ?? "auto").trim().toLowerCase();
          if (value === "off" || value === "flags" || value === "dae") return value;
          return "auto";
        })()],
        [settings.INVENTORY_HOOK_MODE, normalizeInventoryHookMode(data.inventoryHookMode)]
      ];

      for (const [key, value] of updates) {
        await setModuleSettingWithLocalRefreshSuppressed(key, value);
      }

      refreshOpenApps({ scope: refreshScopeKeys.SETTINGS });
      ensureLauncherUi();
      const advancedAfter = areAdvancedSettingsEnabled();
      if (advancedBefore !== advancedAfter) {
        notifyUiInfoThrottled("Advanced settings visibility changed. Re-open Configure Settings to refresh the list.", {
          key: "advanced-settings-refresh-tip",
          ttlMs: 2000
        });
      }
      notifyUiInfoThrottled("Party Operations settings saved.", { key: "settings-hub-saved", ttlMs: 700 });
      this.render(false);
    }

    async close(options = {}) {
      if (settingsHubAppInstance === this) settingsHubAppInstance = null;
      return super.close(options);
    }
  }

  function openPartyOperationsSettingsHub(renderOptions = { force: true }) {
    if (!canAccessAllPlayerOps()) {
      notifyUiWarnThrottled("GM permissions are required for Party Operations settings.");
      return null;
    }
    const app = settingsHubAppInstance?.rendered
      ? settingsHubAppInstance
      : new PartyOperationsSettingsHub();
    app.render(renderOptions);
    return app;
  }

  return {
    PartyOperationsSettingsHub,
    openPartyOperationsSettingsHub
  };
}
