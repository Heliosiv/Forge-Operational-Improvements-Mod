import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmAudioPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setAudioLibraryDraftField,
    openAudioLibraryRootPicker,
    scanConfiguredAudioLibrary,
    clearAudioLibraryCatalog,
    setAudioLibraryFilterField,
    setAudioLibraryView,
    selectAudioLibraryTrack,
    selectAudioMixPreset,
    playSelectedAudioMixPreset,
    playSelectedAudioMixCandidate,
    stopAudioMixPlayback,
    openGmPanelByKey
  } = deps;

  return class GmAudioPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-audio-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Audio" },
      position: getResponsiveWindowPosition?.("gm-audio") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-audio.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmAudioPage";
    }

    _getActionErrorScope() {
      return "gm-audio-page";
    }

    _getActionErrorMessage() {
      return "Audio library action failed. Check console for details.";
    }

    _shouldHandleInputAction(action) {
      return action === "set-audio-library-draft-field" || action === "set-audio-library-filter";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, openPanelTab } = createPageActionHelpers(this);
      const rerenderUnlessInput = (operation) => async (actionElement, event) => {
        await operation(actionElement, event);
        if (event?.type !== "input") rerender();
      };

      return {
        "gm-audio-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-audio-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("audio", openGmPanelByKey),
        "set-audio-library-view": rerenderAlways((actionElement) => {
          setAudioLibraryView(actionElement);
        }),
        "set-audio-library-draft-field": rerenderUnlessInput((actionElement) => {
          setAudioLibraryDraftField(actionElement);
        }),
        "browse-audio-library-root": async () => {
          await openAudioLibraryRootPicker();
          rerender();
        },
        "scan-audio-library": rerenderAlways(() => scanConfiguredAudioLibrary()),
        "clear-audio-library": rerenderAlways(() => clearAudioLibraryCatalog()),
        "set-audio-library-filter": rerenderUnlessInput((actionElement) => {
          setAudioLibraryFilterField(actionElement);
        }),
        "select-audio-track": rerenderAlways((actionElement) => {
          selectAudioLibraryTrack(actionElement);
        }),
        "select-audio-mix-preset": rerenderAlways((actionElement) => {
          selectAudioMixPreset(actionElement);
        }),
        "play-audio-mix": rerenderAlways(() => {
          return playSelectedAudioMixPreset();
        }),
        "play-audio-mix-candidate": rerenderAlways((actionElement) => {
          return playSelectedAudioMixCandidate(actionElement);
        }),
        "stop-audio-mix": rerenderAlways(() => {
          return stopAudioMixPlayback();
        })
      };
    }
  };
}
