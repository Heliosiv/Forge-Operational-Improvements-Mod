import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmEnvironmentPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setOperationalEnvironmentSyncNonParty,
    setOperationalEnvironmentPreset,
    setOperationalEnvironmentDc,
    setOperationalEnvironmentSuccessive,
    setOperationalEnvironmentNote,
    toggleOperationalEnvironmentActor,
    resetOperationalEnvironmentSuccessiveDefaults,
    addOperationalEnvironmentLog,
    clearOperationalEnvironmentEffects,
    showOperationalEnvironmentBrief,
    gmQuickLogCurrentWeather,
    gmQuickAddWeatherDaeChange,
    gmQuickRemoveWeatherDaeChange,
    gmQuickSaveWeatherPreset,
    gmQuickDeleteWeatherPreset,
    gmQuickSubmitWeather,
    gmQuickSelectWeatherPreset,
    gmQuickUpdateWeatherDraftField,
    gmQuickApplyWeatherDaeKeyPreset,
    openGmPanelByKey
  } = deps;

  return class GmEnvironmentPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-environment-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Environment" },
      position: getResponsiveWindowPosition?.("gm-environment") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-environment.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmEnvironmentPage";
    }

    _getActionErrorScope() {
      return "gm-environment-page";
    }

    _getActionErrorMessage() {
      return "Environment action failed. Check console for details.";
    }

    _shouldHandleInputAction(action) {
      return action === "gm-quick-weather-set" || action === "set-environment-note" || action === "set-environment-successive";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, openPanelTab } = createPageActionHelpers(this);
      const rerenderUnlessInput = (operation) => async (actionElement, event) => {
        await operation(actionElement, event);
        if (event?.type !== "input") rerender();
      };
      return {
        "gm-environment-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-environment-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("environment", openGmPanelByKey),
        "set-environment-sync-non-party": rerenderAlways(setOperationalEnvironmentSyncNonParty),
        "set-environment-preset": rerenderAlways(setOperationalEnvironmentPreset),
        "set-environment-dc": rerenderAlways(setOperationalEnvironmentDc),
        "set-environment-successive": rerenderUnlessInput(setOperationalEnvironmentSuccessive),
        "set-environment-note": rerenderUnlessInput(setOperationalEnvironmentNote),
        "toggle-environment-actor": rerenderAlways(toggleOperationalEnvironmentActor),
        "reset-environment-successive-defaults": rerenderAlways(() => resetOperationalEnvironmentSuccessiveDefaults()),
        "add-environment-log": rerenderAlways(() => addOperationalEnvironmentLog()),
        "clear-environment-effects": rerenderAlways(() => clearOperationalEnvironmentEffects()),
        "show-environment-brief": async () => {
          await showOperationalEnvironmentBrief();
        },
        "gm-quick-log-weather": rerenderAlways(() => gmQuickLogCurrentWeather()),
        "gm-quick-weather-add-dae": rerenderAlways(gmQuickAddWeatherDaeChange),
        "gm-quick-weather-remove-dae": rerenderAlways(gmQuickRemoveWeatherDaeChange),
        "gm-quick-weather-save-preset": rerenderAlways(gmQuickSaveWeatherPreset),
        "gm-quick-weather-delete-preset": rerenderAlways(gmQuickDeleteWeatherPreset),
        "gm-quick-submit-weather": rerenderAlways(gmQuickSubmitWeather),
        "gm-quick-weather-select": rerenderAlways(gmQuickSelectWeatherPreset),
        "gm-quick-weather-set": async (actionElement) => {
          gmQuickUpdateWeatherDraftField(actionElement);
        },
        "gm-quick-weather-dae-key-preset": async (actionElement) => {
          gmQuickApplyWeatherDaeKeyPreset(actionElement);
        }
      };
    }
  };
}
