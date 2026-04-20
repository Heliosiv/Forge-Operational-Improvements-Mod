import { bindCanvasKeyboardSuppression } from "./ui-keyboard-guard.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export function createPartyOperationsSettingsHub({
  moduleId,
  settings,
  lootScarcityLevels,
  lootHordeUncommonPlusChanceModes = {},
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

  class PartyOperationsSettingsHub extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-settings-hub",
      tag: "section",
      window: { title: "Party Operations - Settings Hub" },
      position: {
        width: 760,
        height: "auto"
      },
      resizable: true,
      classes: ["party-operations"]
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/settings-hub.hbs" }
    };

    constructor(options = {}) {
      super(options);
      settingsHubAppInstance = this;
      this._saveStatus = { message: "", tone: "", busy: false };
    }

    async _prepareContext() {
      const advancedEnabled = areAdvancedSettingsEnabled();
      const playerHubMode = normalizePlayerHubMode(game.settings.get(moduleId, settings.PLAYER_HUB_MODE));
      const lootScarcity = String(game.settings.get(moduleId, settings.LOOT_SCARCITY) ?? lootScarcityLevels.NORMAL).trim().toLowerCase();
      const hordeUncommonPlusChance = String(
        game.settings.get(moduleId, settings.LOOT_HORDE_UNCOMMON_PLUS_CHANCE) ?? lootHordeUncommonPlusChanceModes.BOOSTED ?? "boosted"
      ).trim().toLowerCase();
      const economyPriceScale = Math.max(25, Math.min(300, Math.round(Number(
        game.settings.get(moduleId, settings.ECONOMY_PRICE_MULTIPLIER) ?? 100
      ) || 100)));
      const inventoryHookMode = normalizeInventoryHookMode(game.settings.get(moduleId, settings.INVENTORY_HOOK_MODE));
      const launcherPlacement = normalizeLauncherPlacement(game.settings.get(moduleId, settings.LAUNCHER_PLACEMENT));
      const journalVisibilityMode = String(
        game.settings.get(moduleId, settings.JOURNAL_ENTRY_VISIBILITY) ?? "public"
      ).trim().toLowerCase();
      const journalVisibilityLabel = journalVisibilityMode === "gm-private"
        ? "GM Only"
        : journalVisibilityMode === "redacted"
          ? "Redacted"
          : "Public";
      return {
        saveStatusMessage: String(this._saveStatus?.message ?? ""),
        saveStatusWarn: this._saveStatus?.tone === "warn",
        saveStatusGood: this._saveStatus?.tone === "good",
        isSaving: Boolean(this._saveStatus?.busy),
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
        hordeUncommonPlusChanceStandard: hordeUncommonPlusChance === (lootHordeUncommonPlusChanceModes.STANDARD ?? "standard"),
        hordeUncommonPlusChanceBoosted: hordeUncommonPlusChance === (lootHordeUncommonPlusChanceModes.BOOSTED ?? "boosted"),
        hordeUncommonPlusChanceHigh: hordeUncommonPlusChance === (lootHordeUncommonPlusChanceModes.HIGH ?? "high"),
        hordeUncommonPlusChanceGuaranteed: hordeUncommonPlusChance === (lootHordeUncommonPlusChanceModes.GUARANTEED ?? "guaranteed"),
        economyPriceScale,
        journalVisibilityLabel,
        journalVisibilityIsGmPrivate: journalVisibilityMode === "gm-private",
        inventoryHookModeOff: inventoryHookMode === inventoryHookModes.OFF,
        inventoryHookModeRefresh: inventoryHookMode === inventoryHookModes.REFRESH,
        inventoryHookModeSync: inventoryHookMode === inventoryHookModes.SYNC
      };
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      const root = this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null);
      if (!root) return;

      bindCanvasKeyboardSuppression(root);
      this.#syncSaveStatusUi(root);

      const form = root.querySelector("form");
      const openSettingsButton = root.querySelector("[data-action='open-foundry-settings']");
      const saveSettingsButton = root.querySelector("[data-action='save-settings-hub']");

      if (openSettingsButton instanceof HTMLElement && openSettingsButton.dataset.poBoundClick !== "1") {
        openSettingsButton.dataset.poBoundClick = "1";
        openSettingsButton.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          game.settings.sheet?.render(true);
        });
      }

      if (saveSettingsButton instanceof HTMLElement && saveSettingsButton.dataset.poBoundClick !== "1") {
        saveSettingsButton.dataset.poBoundClick = "1";
        saveSettingsButton.addEventListener("click", (event) => {
          event.preventDefault();
          void this.#saveSettings();
        });
      }

      if (form instanceof HTMLFormElement && form.dataset.poBoundSubmit !== "1") {
        form.dataset.poBoundSubmit = "1";
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          void this.#saveSettings();
        });
      }
    }

    #toBool(value) {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value !== 0;
      const text = String(value ?? "").trim().toLowerCase();
      return text === "true" || text === "1" || text === "on" || text === "yes";
    }

    #collectFormData() {
      const root = this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null);
      const form = root?.querySelector?.("form");
      if (!(form instanceof HTMLFormElement)) return {};
      const entries = Object.fromEntries(new FormData(form).entries());
      return foundry.utils.expandObject(entries ?? {});
    }

    #syncSaveStatusUi(root = null) {
      const resolvedRoot = root instanceof HTMLElement
        ? root
        : (this.element instanceof HTMLElement ? this.element : (this.element?.[0] ?? null));
      if (!(resolvedRoot instanceof HTMLElement)) return;

      const saveButton = resolvedRoot.querySelector("[data-action='save-settings-hub']");
      const statusNode = resolvedRoot.querySelector("[data-settings-save-status]");
      const form = resolvedRoot.querySelector("form");
      const isSaving = Boolean(this._saveStatus?.busy);

      resolvedRoot.toggleAttribute("aria-busy", isSaving);
      if (form instanceof HTMLFormElement) {
        if (isSaving) form.setAttribute("aria-busy", "true");
        else form.removeAttribute("aria-busy");
      }

      if (saveButton instanceof HTMLButtonElement) {
        saveButton.disabled = isSaving;
        saveButton.innerHTML = isSaving
          ? '<i class="fa-solid fa-floppy-disk"></i> Saving...'
          : '<i class="fa-solid fa-floppy-disk"></i> Save';
      }

      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = String(this._saveStatus?.message ?? "");
        statusNode.classList.toggle("is-warn", this._saveStatus?.tone === "warn");
        statusNode.classList.toggle("is-good", this._saveStatus?.tone === "good");
      }
    }

    #setSaveStatus(message, tone = "", busy = false) {
      this._saveStatus = {
        message: String(message ?? ""),
        tone: String(tone ?? ""),
        busy: Boolean(busy)
      };
      this.#syncSaveStatusUi();
    }

    async #saveSettings() {
      if (this._saveStatus?.busy) return;
      this.#setSaveStatus("Saving settings...", "", true);

      const data = this.#collectFormData();
      try {
        const advancedBefore = areAdvancedSettingsEnabled();
        const updates = [
          [settings.PLAYER_HUB_MODE, normalizePlayerHubMode(data.playerHubMode)],
          [settings.SHARED_GM_PERMISSIONS, this.#toBool(data.sharedGmPermissions)],
          [settings.REST_AUTOMATION_ENABLED, this.#toBool(data.restAutomationEnabled)],
          [settings.MARCHING_ORDER_LOCK_PLAYERS, this.#toBool(data.marchingOrderLockPlayers)],
          [settings.PLAYER_AUTO_OPEN_REST, this.#toBool(data.playerAutoOpenRest)],
          [settings.ADVANCED_SETTINGS_ENABLED, this.#toBool(data.advancedEnabled)],
          [settings.LAUNCHER_PLACEMENT, normalizeLauncherPlacement(data.launcherPlacement)],
          [settings.FLOATING_LAUNCHER_LOCKED, this.#toBool(data.launcherLocked)],
          [settings.LOOT_SCARCITY, (() => {
            const value = String(data.lootScarcity ?? lootScarcityLevels.NORMAL).trim().toLowerCase();
            if (value === lootScarcityLevels.ABUNDANT || value === lootScarcityLevels.SCARCE) return value;
            return lootScarcityLevels.NORMAL;
          })()],
          [settings.LOOT_HORDE_UNCOMMON_PLUS_CHANCE, (() => {
            const value = String(data.lootHordeUncommonPlusChance ?? lootHordeUncommonPlusChanceModes.BOOSTED ?? "boosted").trim().toLowerCase();
            if (value === (lootHordeUncommonPlusChanceModes.STANDARD ?? "standard")) return value;
            if (value === (lootHordeUncommonPlusChanceModes.HIGH ?? "high")) return value;
            if (value === (lootHordeUncommonPlusChanceModes.GUARANTEED ?? "guaranteed")) return value;
            return lootHordeUncommonPlusChanceModes.BOOSTED ?? "boosted";
          })()],
          [settings.ECONOMY_PRICE_MULTIPLIER, (() => {
            return Math.max(25, Math.min(300, Math.round(Number(data.economyPriceScale) || 100)));
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
        this.#setSaveStatus("Settings saved.", "good", false);
        await this.render({ force: true, parts: ["main"] });
        this.bringToFront?.();
      } catch (error) {
        this.#setSaveStatus("Unable to save settings.", "warn", false);
        notifyUiWarnThrottled(`Party Operations settings save failed: ${error instanceof Error ? error.message : String(error ?? "Unknown error")}`, {
          key: "settings-hub-save-failed",
          ttlMs: 1500
        });
        throw error;
      }
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
    const app = settingsHubAppInstance ?? new PartyOperationsSettingsHub();
    app.render(renderOptions);
    return app;
  }

  return {
    PartyOperationsSettingsHub,
    openPartyOperationsSettingsHub
  };
}