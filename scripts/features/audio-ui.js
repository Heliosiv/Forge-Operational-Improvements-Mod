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
    uploadLocalAudioFolderToLibrary,
    scanConfiguredAudioLibrary,
    clearAudioLibraryCatalog,
    setAudioLibraryFilterField,
    setAudioLibraryView,
    selectAudioLibraryTrack,
    selectAudioMixPreset,
    createAudioMixPresetFromSelection,
    promptAndUpdateSelectedAudioMixPresetField,
    setSelectedAudioMixPresetOption,
    deleteSelectedAudioMixPreset,
    addTrackToSelectedAudioMixPreset,
    addSelectedLibraryTrackToAudioMixPreset,
    clearSelectedAudioMixPresetTrackList,
    hideAudioLibraryTrack,
    queueSelectedTrackNext,
    moveTrackWithinSelectedAudioMixPreset,
    removeTrackFromSelectedAudioMixPreset,
    restoreAllHiddenAudioLibraryTracks,
    restoreHiddenAudioLibraryTrack,
    playSelectedAudioMixPreset,
    playSelectedAudioMixCandidate,
    playNextAudioMixTrack,
    restartCurrentAudioMixTrack,
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
      return action === "set-audio-library-draft-field"
        || action === "set-audio-library-filter"
        || action === "set-audio-mix-preset-option";
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
        "upload-audio-library-folder": async () => {
          await uploadLocalAudioFolderToLibrary();
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
        "create-audio-mix-preset": rerenderAlways(() => {
          return createAudioMixPresetFromSelection();
        }),
        "edit-audio-mix-preset-field": rerenderAlways((actionElement) => {
          return promptAndUpdateSelectedAudioMixPresetField(actionElement?.dataset?.field);
        }),
        "set-audio-mix-preset-option": rerenderUnlessInput((actionElement) => {
          return setSelectedAudioMixPresetOption(actionElement);
        }),
        "delete-audio-mix-preset": rerenderAlways(() => {
          return deleteSelectedAudioMixPreset();
        }),
        "add-audio-mix-track": rerenderAlways((actionElement) => {
          return addTrackToSelectedAudioMixPreset(actionElement?.dataset?.trackId);
        }),
        "add-selected-audio-track-to-mix": rerenderAlways(() => {
          return addSelectedLibraryTrackToAudioMixPreset();
        }),
        "clear-audio-mix-track-list": rerenderAlways(() => {
          return clearSelectedAudioMixPresetTrackList();
        }),
        "hide-audio-track": rerenderAlways((actionElement) => {
          return hideAudioLibraryTrack(actionElement?.dataset?.trackId);
        }),
        "queue-selected-audio-track-next": rerenderAlways((actionElement) => {
          return queueSelectedTrackNext(actionElement);
        }),
        "move-audio-mix-track": rerenderAlways((actionElement) => {
          return moveTrackWithinSelectedAudioMixPreset(actionElement?.dataset?.trackId, actionElement?.dataset?.direction);
        }),
        "remove-audio-mix-track": rerenderAlways((actionElement) => {
          return removeTrackFromSelectedAudioMixPreset(actionElement?.dataset?.trackId);
        }),
        "restore-hidden-audio-track": rerenderAlways((actionElement) => {
          return restoreHiddenAudioLibraryTrack(actionElement?.dataset?.trackId);
        }),
        "restore-all-hidden-audio-tracks": rerenderAlways(() => {
          return restoreAllHiddenAudioLibraryTracks();
        }),
        "play-audio-mix": rerenderAlways(() => {
          return playSelectedAudioMixPreset();
        }),
        "play-audio-mix-candidate": rerenderAlways((actionElement) => {
          return playSelectedAudioMixCandidate(actionElement);
        }),
        "play-audio-mix-next": rerenderAlways(() => {
          return playNextAudioMixTrack();
        }),
        "restart-audio-mix-track": rerenderAlways(() => {
          return restartCurrentAudioMixTrack();
        }),
        "stop-audio-mix": rerenderAlways(() => {
          return stopAudioMixPlayback();
        })
      };
    }
  };
}
