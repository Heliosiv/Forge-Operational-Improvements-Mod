import { createPageActionHelpers } from "./page-action-helpers.js";

function clampAudioPreviewVolume(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(0, Math.min(1, numeric));
}

function formatAudioPreviewTime(seconds) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric) || numeric < 0) return "--:--";
  const totalSeconds = Math.floor(numeric);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

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
    toggleAudioLibraryTrackSelection,
    selectVisibleAudioLibraryTracks,
    clearAudioLibraryTrackSelections,
    selectAudioMixPreset,
    createAudioMixPresetFromSelection,
    promptAndUpdateSelectedAudioMixPresetField,
    setSelectedAudioMixPresetOption,
    deleteSelectedAudioMixPreset,
    addTrackToSelectedAudioMixPreset,
    addSelectedLibraryTrackToAudioMixPreset,
    clearSelectedAudioMixPresetTrackList,
    hideAudioLibraryTrack,
    hideSelectedAudioLibraryTracks,
    getAudioPreviewVolumeSetting,
    setAudioPreviewVolumeSetting,
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
    syncManagedAudioMixPlaybackForCurrentUser,
    openGmPanelByKey
  } = deps;

  return class GmAudioPageApp extends BaseStatefulPageApp {
    constructor(options = {}) {
      super(options);
      this._audioPreviewVolumeSaveTimer = null;
    }

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

    async close(options = {}) {
      if (this._audioPreviewVolumeSaveTimer) {
        window.clearTimeout(this._audioPreviewVolumeSaveTimer);
        this._audioPreviewVolumeSaveTimer = null;
      }
      const result = await super.close(options);
      if (typeof syncManagedAudioMixPlaybackForCurrentUser === "function") {
        window.setTimeout(() => {
          void syncManagedAudioMixPlaybackForCurrentUser();
        }, 40);
      }
      return result;
    }

    _shouldHandleInputAction(action) {
      return action === "set-audio-library-draft-field"
        || action === "set-audio-library-filter"
        || action === "set-audio-mix-preset-option";
    }

    async _onPostRender(context, options) {
      await super._onPostRender(context, options);
      this._bindAudioPreviewPlayers();
    }

    _queueAudioPreviewVolumeSave(volume) {
      const normalized = clampAudioPreviewVolume(volume);
      if (this._audioPreviewVolumeSaveTimer) window.clearTimeout(this._audioPreviewVolumeSaveTimer);
      this._audioPreviewVolumeSaveTimer = window.setTimeout(() => {
        this._audioPreviewVolumeSaveTimer = null;
        void setAudioPreviewVolumeSetting(normalized);
      }, 120);
    }

    _bindAudioPreviewPlayers() {
      const root = this.element;
      if (!root) return;
      const players = Array.from(root.querySelectorAll("[data-po-audio-player]"));
      const defaultVolume = clampAudioPreviewVolume(getAudioPreviewVolumeSetting?.() ?? 1);

      for (const player of players) {
        if (player.dataset.poAudioPlayerBound === "1") continue;
        player.dataset.poAudioPlayerBound = "1";

        const media = player.querySelector("audio");
        const toggle = player.querySelector("[data-role='toggle']");
        const toggleIcon = player.querySelector("[data-role='toggle-icon']");
        const currentLabel = player.querySelector("[data-role='current']");
        const durationLabel = player.querySelector("[data-role='duration']");
        const seek = player.querySelector("[data-role='seek']");
        const volume = player.querySelector("[data-role='volume']");
        const volumeLabel = player.querySelector("[data-role='volume-label']");
        if (!(media instanceof HTMLAudioElement) || !(seek instanceof HTMLInputElement) || !(volume instanceof HTMLInputElement)) continue;

        let isSeeking = false;
        const syncPlayState = () => {
          const isPlaying = !media.paused && !media.ended;
          toggle?.setAttribute("aria-label", isPlaying ? "Pause audio preview" : "Play audio preview");
          if (toggleIcon) {
            toggleIcon.classList.toggle("fa-play", !isPlaying);
            toggleIcon.classList.toggle("fa-pause", isPlaying);
          }
        };
        const syncTimeState = () => {
          const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
          const current = Number.isFinite(media.currentTime) && media.currentTime > 0 ? media.currentTime : 0;
          if (currentLabel) currentLabel.textContent = formatAudioPreviewTime(current);
          if (durationLabel) durationLabel.textContent = duration > 0 ? formatAudioPreviewTime(duration) : "--:--";
          if (!isSeeking) {
            seek.disabled = duration <= 0;
            seek.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
          }
        };
        const syncVolumeState = (value, { persist = false } = {}) => {
          const normalized = clampAudioPreviewVolume(value);
          const percent = Math.round(normalized * 100);
          media.volume = normalized;
          volume.value = String(percent);
          if (volumeLabel) volumeLabel.textContent = `${percent}%`;
          if (persist) this._queueAudioPreviewVolumeSave(normalized);
        };

        media.preload = "metadata";
        syncVolumeState(Number(player.dataset.defaultVolume ?? defaultVolume));
        syncPlayState();
        syncTimeState();

        toggle?.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (media.paused || media.ended) await media.play().catch(() => {});
          else media.pause();
          syncPlayState();
        });

        media.addEventListener("play", syncPlayState);
        media.addEventListener("pause", syncPlayState);
        media.addEventListener("ended", () => {
          syncPlayState();
          syncTimeState();
        });
        media.addEventListener("loadedmetadata", syncTimeState);
        media.addEventListener("durationchange", syncTimeState);
        media.addEventListener("timeupdate", syncTimeState);

        seek.addEventListener("input", () => {
          isSeeking = true;
          const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
          const ratio = Math.max(0, Math.min(1, Number(seek.value) / 1000));
          if (currentLabel) currentLabel.textContent = formatAudioPreviewTime(duration * ratio);
        });
        seek.addEventListener("change", () => {
          const duration = Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
          const ratio = Math.max(0, Math.min(1, Number(seek.value) / 1000));
          media.currentTime = duration * ratio;
          isSeeking = false;
          syncTimeState();
        });

        volume.addEventListener("input", () => {
          syncVolumeState(Number(volume.value) / 100, { persist: true });
        });
        volume.addEventListener("change", () => {
          syncVolumeState(Number(volume.value) / 100, { persist: true });
        });
      }
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
        "toggle-audio-track-selection": rerenderAlways((actionElement) => {
          toggleAudioLibraryTrackSelection(actionElement);
        }),
        "select-visible-audio-tracks": rerenderAlways(() => {
          selectVisibleAudioLibraryTracks();
        }),
        "clear-selected-audio-tracks": rerenderAlways(() => {
          clearAudioLibraryTrackSelections();
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
        "hide-selected-audio-tracks": rerenderAlways(() => {
          return hideSelectedAudioLibraryTracks();
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
