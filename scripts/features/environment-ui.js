export function createGmEnvironmentPageApp(deps) {
  const {
    BaseStatefulPageApp,
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
    gmQuickApplyWeatherDaeKeyPreset
  } = deps;

  return class GmEnvironmentPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-environment-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Environment" },
      position: { width: 980, height: 760 },
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
      const rerender = () => this._renderWithPreservedState({ force: true, parts: ["main"] });
      return {
        "gm-environment-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-environment-page-refresh": async () => {
          rerender();
        },
        "set-environment-sync-non-party": async (actionElement) => {
          await setOperationalEnvironmentSyncNonParty(actionElement);
          rerender();
        },
        "set-environment-preset": async (actionElement) => {
          await setOperationalEnvironmentPreset(actionElement);
          rerender();
        },
        "set-environment-dc": async (actionElement) => {
          await setOperationalEnvironmentDc(actionElement);
          rerender();
        },
        "set-environment-successive": async (actionElement, event) => {
          await setOperationalEnvironmentSuccessive(actionElement);
          if (event?.type !== "input") rerender();
        },
        "set-environment-note": async (actionElement, event) => {
          await setOperationalEnvironmentNote(actionElement);
          if (event?.type !== "input") rerender();
        },
        "toggle-environment-actor": async (actionElement) => {
          await toggleOperationalEnvironmentActor(actionElement);
          rerender();
        },
        "reset-environment-successive-defaults": async () => {
          await resetOperationalEnvironmentSuccessiveDefaults();
          rerender();
        },
        "add-environment-log": async () => {
          await addOperationalEnvironmentLog();
          rerender();
        },
        "clear-environment-effects": async () => {
          await clearOperationalEnvironmentEffects();
          rerender();
        },
        "show-environment-brief": async () => {
          await showOperationalEnvironmentBrief();
        },
        "gm-quick-log-weather": async () => {
          await gmQuickLogCurrentWeather();
          rerender();
        },
        "gm-quick-weather-add-dae": async (actionElement) => {
          await gmQuickAddWeatherDaeChange(actionElement);
          rerender();
        },
        "gm-quick-weather-remove-dae": async (actionElement) => {
          await gmQuickRemoveWeatherDaeChange(actionElement);
          rerender();
        },
        "gm-quick-weather-save-preset": async (actionElement) => {
          await gmQuickSaveWeatherPreset(actionElement);
          rerender();
        },
        "gm-quick-weather-delete-preset": async (actionElement) => {
          await gmQuickDeleteWeatherPreset(actionElement);
          rerender();
        },
        "gm-quick-submit-weather": async (actionElement) => {
          await gmQuickSubmitWeather(actionElement);
          rerender();
        },
        "gm-quick-weather-select": async (actionElement) => {
          await gmQuickSelectWeatherPreset(actionElement);
          rerender();
        },
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
