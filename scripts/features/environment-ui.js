import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmEnvironmentPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setOperationalEnvironmentPreset,
    setOperationalEnvironmentDc,
    setOperationalEnvironmentSuccessive,
    setOperationalEnvironmentNote,
    selectOperationalEnvironmentConfigurePreset,
    createOperationalEnvironmentPreset,
    duplicateOperationalEnvironmentPreset,
    restoreOperationalEnvironmentPresetDefaults,
    deleteOperationalEnvironmentPreset,
    setOperationalEnvironmentPresetField,
    addOperationalEnvironmentPresetEffectChange,
    removeOperationalEnvironmentPresetEffectChange,
    setOperationalEnvironmentPresetEffectChange,
    selectOperationalEnvironmentConfigureAction,
    createOperationalEnvironmentAction,
    deleteOperationalEnvironmentAction,
    setOperationalEnvironmentActionField,
    toggleOperationalEnvironmentActor,
    resetOperationalEnvironmentSuccessiveDefaults,
    addOperationalEnvironmentLog,
    editOperationalEnvironmentLog,
    removeOperationalEnvironmentLog,
    requestOperationalEnvironmentChecks,
    showOperationalEnvironmentBrief,
    gmQuickLogCurrentWeather,
    gmQuickSaveWeatherPreset,
    gmQuickDeleteWeatherPreset,
    gmQuickSubmitWeather,
    gmQuickSelectWeatherPreset,
    gmQuickUpdateWeatherDraftField,
    gmCalendarWeatherSetClimate,
    gmCalendarWeatherToggleAutoClimate,
    gmCalendarWeatherApplySuggestedClimate,
    gmCalendarWeatherSetTerrain,
    gmCalendarWeatherClearTerrain,
    gmCalendarWeatherSetTerrainImage,
    gmCalendarWeatherBrowseTerrainImage,
    gmCalendarWeatherPreviewTerrainImage,
    gmCalendarWeatherImportTerrainImage,
    gmCalendarWeatherToggleAuto,
    gmCalendarWeatherRoll,
    loadWeatherLogToQuickPanel,
    removeWeatherLogById,
    openJournalEntryFromElement,
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
      return [
        "gm-quick-weather-set",
        "gm-calendar-weather-set-terrain",
        "gm-calendar-weather-set-terrain-image",
        "set-environment-note",
        "set-environment-successive",
        "set-environment-preset-field",
        "set-environment-preset-effect-change",
        "set-environment-action-field"
      ].includes(action);
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, rerenderIfTruthy, openPanelTab } = createPageActionHelpers(this);
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
        "set-environment-preset": rerenderAlways(setOperationalEnvironmentPreset),
        "set-environment-dc": rerenderAlways(setOperationalEnvironmentDc),
        "set-environment-successive": rerenderUnlessInput(setOperationalEnvironmentSuccessive),
        "set-environment-note": rerenderUnlessInput(setOperationalEnvironmentNote),
        "select-environment-config-preset": rerenderAlways(selectOperationalEnvironmentConfigurePreset),
        "create-environment-preset": rerenderAlways(() => createOperationalEnvironmentPreset()),
        "duplicate-environment-preset": rerenderAlways(() => duplicateOperationalEnvironmentPreset()),
        "restore-environment-preset-defaults": rerenderAlways(() => restoreOperationalEnvironmentPresetDefaults()),
        "delete-environment-preset": rerenderAlways(() => deleteOperationalEnvironmentPreset()),
        "set-environment-preset-field": rerenderUnlessInput(setOperationalEnvironmentPresetField),
        "add-environment-preset-effect-change": rerenderAlways(() => addOperationalEnvironmentPresetEffectChange()),
        "remove-environment-preset-effect-change": rerenderAlways(removeOperationalEnvironmentPresetEffectChange),
        "set-environment-preset-effect-change": rerenderUnlessInput(setOperationalEnvironmentPresetEffectChange),
        "select-environment-config-action": rerenderAlways(selectOperationalEnvironmentConfigureAction),
        "create-environment-action": rerenderAlways(() => createOperationalEnvironmentAction()),
        "delete-environment-action": rerenderAlways(() => deleteOperationalEnvironmentAction()),
        "set-environment-action-field": rerenderUnlessInput(setOperationalEnvironmentActionField),
        "toggle-environment-actor": rerenderAlways(toggleOperationalEnvironmentActor),
        "reset-environment-successive-defaults": rerenderAlways(() => resetOperationalEnvironmentSuccessiveDefaults()),
        "add-environment-log": rerenderAlways(() => addOperationalEnvironmentLog()),
        "edit-environment-log": rerenderAlways(editOperationalEnvironmentLog),
        "remove-environment-log": rerenderAlways(removeOperationalEnvironmentLog),
        "request-environment-checks": rerenderAlways(() => requestOperationalEnvironmentChecks()),
        "show-environment-brief": async () => {
          await showOperationalEnvironmentBrief();
        },
        "gm-quick-log-weather": rerenderAlways(() => gmQuickLogCurrentWeather()),
        "gm-quick-weather-save-preset": rerenderAlways(gmQuickSaveWeatherPreset),
        "gm-quick-weather-delete-preset": rerenderAlways(gmQuickDeleteWeatherPreset),
        "gm-quick-submit-weather": rerenderAlways(gmQuickSubmitWeather),
        "gm-quick-weather-select": rerenderAlways(gmQuickSelectWeatherPreset),
        "gm-quick-weather-set": async (actionElement) => {
          gmQuickUpdateWeatherDraftField(actionElement);
        },
        "gm-calendar-weather-set-climate": rerenderAlways(gmCalendarWeatherSetClimate),
        "gm-calendar-weather-toggle-auto-climate": rerenderAlways(gmCalendarWeatherToggleAutoClimate),
        "gm-calendar-weather-apply-suggested-climate": rerenderAlways(() => gmCalendarWeatherApplySuggestedClimate()),
        "gm-calendar-weather-set-terrain": rerenderAlways(gmCalendarWeatherSetTerrain),
        "gm-calendar-weather-clear-terrain": rerenderAlways(() => gmCalendarWeatherClearTerrain()),
        "gm-calendar-weather-set-terrain-image": rerenderUnlessInput(gmCalendarWeatherSetTerrainImage),
        "gm-calendar-weather-browse-terrain-image": rerenderAlways(() => gmCalendarWeatherBrowseTerrainImage()),
        "gm-calendar-weather-preview-terrain-image": rerenderAlways(() => gmCalendarWeatherPreviewTerrainImage()),
        "gm-calendar-weather-import-terrain-image": rerenderAlways(() => gmCalendarWeatherImportTerrainImage()),
        "gm-calendar-weather-toggle-auto": rerenderAlways(gmCalendarWeatherToggleAuto),
        "gm-calendar-weather-roll": rerenderAlways(() => gmCalendarWeatherRoll()),
        "load-weather-log": rerenderIfTruthy((actionElement) =>
          loadWeatherLogToQuickPanel(actionElement?.dataset?.logId)
        ),
        "remove-weather-log": rerenderIfTruthy((actionElement) => removeWeatherLogById(actionElement?.dataset?.logId)),
        "open-journal-entry": async (actionElement) => {
          await openJournalEntryFromElement?.(actionElement);
        }
      };
    }
  };
}
