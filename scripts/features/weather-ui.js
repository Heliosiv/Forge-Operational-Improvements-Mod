import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmWeatherPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    gmWeatherSetClimate,
    gmWeatherToggleAutoClimate,
    gmWeatherApplySuggestedClimate,
    gmWeatherSetTerrain,
    gmWeatherClearTerrain,
    gmWeatherSetTerrainImage,
    gmWeatherBrowseTerrainImage,
    gmWeatherPreviewTerrainImage,
    gmWeatherImportTerrainImage,
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

    _shouldHandleInputAction(action) {
      return ["gm-weather-set-terrain", "gm-weather-set-terrain-image"].includes(action);
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, rerenderIfTruthy, openPanelTab } = createPageActionHelpers(this);
      const rerenderUnlessInput = (operation) => async (actionElement, event) => {
        await operation(actionElement, event);
        if (event?.type !== "input") rerender();
      };
      return {
        "gm-weather-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-weather-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("weather", openGmPanelByKey),
        "gm-weather-set-climate": rerenderAlways(gmWeatherSetClimate),
        "gm-weather-toggle-auto-climate": rerenderAlways(gmWeatherToggleAutoClimate),
        "gm-weather-apply-suggested-climate": rerenderAlways(() => gmWeatherApplySuggestedClimate()),
        "gm-weather-set-terrain": rerenderAlways(gmWeatherSetTerrain),
        "gm-weather-clear-terrain": rerenderAlways(() => gmWeatherClearTerrain()),
        "gm-weather-set-terrain-image": rerenderUnlessInput(gmWeatherSetTerrainImage),
        "gm-weather-browse-terrain-image": rerenderAlways(() => gmWeatherBrowseTerrainImage()),
        "gm-weather-preview-terrain-image": rerenderAlways(() => gmWeatherPreviewTerrainImage()),
        "gm-weather-import-terrain-image": rerenderAlways(() => gmWeatherImportTerrainImage()),
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
