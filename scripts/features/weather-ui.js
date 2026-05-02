import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmWeatherPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    gmWeatherSetLocation,
    gmWeatherSetForecastDays,
    gmWeatherToggleAuto,
    gmWeatherRoll,
    removeWeatherLogById,
    openJournalEntryFromElement,
    openGmPanelByKey
  } = deps;

  return class GmWeatherPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-weather-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Weather" },
      position: getResponsiveWindowPosition?.("gm-weather") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-weather.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmWeatherPage";
    }

    _getActionErrorScope() {
      return "gm-weather-page";
    }

    _getActionErrorMessage() {
      return "Weather action failed. Check console for details.";
    }

    _shouldHandleInputAction() {
      return false;
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, rerenderIfTruthy, openPanelTab } = createPageActionHelpers(this);
      return {
        "gm-weather-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-weather-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("weather", openGmPanelByKey),
        "gm-weather-set-location": rerenderAlways(gmWeatherSetLocation),
        "gm-weather-set-forecast-days": rerenderAlways(gmWeatherSetForecastDays),
        "gm-weather-toggle-auto": rerenderAlways(gmWeatherToggleAuto),
        "gm-weather-roll": rerenderAlways(() => gmWeatherRoll()),
        "gm-weather-remove-log": rerenderIfTruthy((actionElement) =>
          removeWeatherLogById(actionElement?.dataset?.logId)
        ),
        "open-journal-entry": async (actionElement) => {
          await openJournalEntryFromElement?.(actionElement);
        }
      };
    }
  };
}
