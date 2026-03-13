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
    setAudioMixTrackBrowserView,
    changeAudioMixTrackBrowserPage,
    toggleAudioMixTrackSelection,
    selectVisibleAudioMixTracks,
    clearAudioMixTrackSelections,
    selectAudioMixPreset,
    createAudioMixPresetFromSelection,
    promptAndUpdateSelectedAudioMixPresetField,
    setSelectedAudioMixPresetTextField,
    setSelectedAudioMixPresetOption,
    deleteSelectedAudioMixPreset,
    addTrackToSelectedAudioMixPreset,
    addSelectedLibraryTrackToAudioMixPreset,
    addSelectedAudioMixTracksToPreset,
    clearSelectedAudioMixPresetTrackList,
    hideAudioLibraryTrack,
    hideSelectedAudioLibraryTracks,
    getAudioPreviewVolumeSetting,
    setAudioPreviewVolumeSetting,
    getManagedAudioMixPlaybackMonitorSnapshot,
    queueSelectedTrackNext,
    moveTrackToIndexInSelectedAudioMixPreset,
    moveTrackToTopInSelectedAudioMixPreset,
    moveTrackWithinSelectedAudioMixPreset,
    removeTrackFromSelectedAudioMixPreset,
    restoreAllHiddenAudioLibraryTracks,
    restoreHiddenAudioLibraryTrack,
    playSelectedAudioMixPreset,
    playSelectedAudioMixCandidate,
    toggleAudioMixPlayback,
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
      this._audioLiveMonitorTimer = null;
      this._audioQueueDragState = null;
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
      if (this._audioLiveMonitorTimer) {
        window.clearInterval(this._audioLiveMonitorTimer);
        this._audioLiveMonitorTimer = null;
      }
      this._resetAudioMixQueueDragState();
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
      this._bindAudioMixQueueDragAndDrop();
      this._bindLiveAudioMonitorCards();
    }

    _clearAudioMixQueueDropIndicators() {
      const root = this.element;
      if (!root) return;
      for (const row of root.querySelectorAll("[data-po-audio-queue-row]")) {
        row.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
      }
    }

    _resetAudioMixQueueDragState() {
      this._audioQueueDragState = null;
      this._clearAudioMixQueueDropIndicators();
    }

    _getAudioMixQueueDropIndex(targetRow, clientY) {
      if (!(targetRow instanceof HTMLElement)) return null;
      const targetIndex = Math.max(0, Math.floor(Number(targetRow.dataset.queueIndex ?? 0) || 0));
      const rect = targetRow.getBoundingClientRect();
      const shouldInsertAfter = clientY >= rect.top + (rect.height / 2);
      const proposedIndex = shouldInsertAfter ? targetIndex + 1 : targetIndex;
      const sourceIndex = Math.max(0, Math.floor(Number(this._audioQueueDragState?.sourceIndex ?? 0) || 0));
      const adjustedIndex = sourceIndex < proposedIndex ? proposedIndex - 1 : proposedIndex;
      return {
        shouldInsertAfter,
        targetIndex: Math.max(0, adjustedIndex)
      };
    }

    async _reorderAudioMixQueue(trackId, targetIndex) {
      this._clearAudioMixQueueDropIndicators();
      const moved = await moveTrackToIndexInSelectedAudioMixPreset?.(trackId, targetIndex);
      this._audioQueueDragState = null;
      if (moved) this._renderWithPreservedState({ force: true, parts: ["main"] });
    }

    _bindAudioMixQueueDragAndDrop() {
      const root = this.element;
      if (!root) return;
      const queueList = root.querySelector("[data-po-audio-queue-list]");
      if (!(queueList instanceof HTMLElement)) return;

      const isEditable = queueList.dataset.poAudioQueueEditable === "1";
      const rows = Array.from(queueList.querySelectorAll("[data-po-audio-queue-row]"));
      if (!isEditable || rows.length < 2 || typeof moveTrackToIndexInSelectedAudioMixPreset !== "function") {
        this._resetAudioMixQueueDragState();
        return;
      }

      for (const row of rows) {
        if (!(row instanceof HTMLElement)) continue;

        row.addEventListener("dragstart", (event) => {
          const trackId = String(row.dataset.trackId ?? "").trim();
          const sourceIndex = Math.max(0, Math.floor(Number(row.dataset.queueIndex ?? 0) || 0));
          if (!trackId) {
            event.preventDefault();
            return;
          }
          this._audioQueueDragState = { trackId, sourceIndex };
          row.classList.add("is-dragging");
          if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", trackId);
          }
        });

        row.addEventListener("dragover", (event) => {
          if (!this._audioQueueDragState?.trackId) return;
          event.preventDefault();
          const dropState = this._getAudioMixQueueDropIndex(row, event.clientY);
          if (!dropState) return;
          this._audioQueueDragState.targetIndex = dropState.targetIndex;
          this._clearAudioMixQueueDropIndicators();
          row.classList.add(dropState.shouldInsertAfter ? "is-drop-after" : "is-drop-before");
          if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        });

        row.addEventListener("drop", async (event) => {
          if (!this._audioQueueDragState?.trackId) return;
          event.preventDefault();
          event.stopPropagation();
          const dropState = this._getAudioMixQueueDropIndex(row, event.clientY);
          if (!dropState) {
            this._resetAudioMixQueueDragState();
            return;
          }
          const { trackId } = this._audioQueueDragState;
          await this._reorderAudioMixQueue(trackId, dropState.targetIndex);
        });

        row.addEventListener("dragend", () => {
          this._resetAudioMixQueueDragState();
        });
      }

      queueList.addEventListener("dragover", (event) => {
        if (!this._audioQueueDragState?.trackId) return;
        if (event.target?.closest?.("[data-po-audio-queue-row]")) return;
        event.preventDefault();
        const lastRow = rows.at(-1);
        if (!(lastRow instanceof HTMLElement)) return;
        const sourceIndex = Math.max(0, Math.floor(Number(this._audioQueueDragState.sourceIndex ?? 0) || 0));
        this._audioQueueDragState.targetIndex = Math.max(0, rows.length - (sourceIndex < rows.length ? 1 : 0));
        this._clearAudioMixQueueDropIndicators();
        lastRow.classList.add("is-drop-after");
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      });

      queueList.addEventListener("drop", async (event) => {
        if (!this._audioQueueDragState?.trackId) return;
        if (event.target?.closest?.("[data-po-audio-queue-row]")) return;
        event.preventDefault();
        event.stopPropagation();
        const { trackId, targetIndex = Math.max(0, rows.length - 1) } = this._audioQueueDragState;
        await this._reorderAudioMixQueue(trackId, targetIndex);
      });
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
        const defaultDuration = Math.max(0, Number(player.dataset.defaultDuration ?? media.dataset.defaultDuration ?? 0) || 0);
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
          if (durationLabel) durationLabel.textContent = duration > 0
            ? formatAudioPreviewTime(duration)
            : (defaultDuration > 0 ? formatAudioPreviewTime(defaultDuration) : "--:--");
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

        media.preload = player.dataset.preloadMode ?? media.preload ?? "none";
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

    _bindLiveAudioMonitorCards() {
      if (this._audioLiveMonitorTimer) {
        window.clearInterval(this._audioLiveMonitorTimer);
        this._audioLiveMonitorTimer = null;
      }
      const root = this.element;
      if (!root) return;
      const cards = Array.from(root.querySelectorAll("[data-po-audio-live-monitor]"));
      if (cards.length < 1 || typeof getManagedAudioMixPlaybackMonitorSnapshot !== "function") return;

      const syncCards = () => {
        const snapshot = getManagedAudioMixPlaybackMonitorSnapshot() ?? {};
        const livePlaybackId = String(snapshot?.playbackId ?? "").trim();
        for (const card of cards) {
          const expectedPlaybackId = String(card?.dataset?.playbackId ?? "").trim();
          const isActive = !expectedPlaybackId || !livePlaybackId || expectedPlaybackId === livePlaybackId;
          const currentLabel = card.querySelector("[data-role='current']");
          const durationLabel = card.querySelector("[data-role='duration']");
          const progress = card.querySelector("[data-role='live-progress']");
          const volumeInput = card.querySelector("[data-role='live-volume']");
          const volumeLabel = card.querySelector("[data-role='live-volume-label']");
          const currentSeconds = isActive ? Math.max(0, Number(snapshot?.currentSeconds ?? 0) || 0) : 0;
          const durationSeconds = isActive ? Math.max(0, Number(snapshot?.durationSeconds ?? 0) || 0) : 0;
          const progressPermille = isActive ? Math.max(0, Math.min(1000, Number(snapshot?.progressPermille ?? 0) || 0)) : 0;
          const volumePercent = isActive ? Math.max(0, Math.min(100, Number(snapshot?.volumePercent ?? 0) || 0)) : 0;

          if (currentLabel) currentLabel.textContent = formatAudioPreviewTime(currentSeconds);
          if (durationLabel) durationLabel.textContent = durationSeconds > 0 ? formatAudioPreviewTime(durationSeconds) : "--:--";

          if (progress instanceof HTMLInputElement) {
            progress.disabled = durationSeconds <= 0;
            progress.value = String(progressPermille);
          }
          if (volumeLabel) volumeLabel.textContent = `${volumePercent}%`;
          if (volumeInput instanceof HTMLInputElement && document.activeElement !== volumeInput) {
            volumeInput.value = String(volumePercent);
          }
        }
      };

      syncCards();
      this._audioLiveMonitorTimer = window.setInterval(syncCards, 250);
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
        "set-audio-mix-track-browser-view": rerenderAlways((actionElement) => {
          setAudioMixTrackBrowserView(actionElement);
        }),
        "change-audio-mix-track-browser-page": rerenderAlways((actionElement) => {
          changeAudioMixTrackBrowserPage(actionElement);
        }),
        "toggle-audio-mix-track-selection": rerenderAlways((actionElement) => {
          toggleAudioMixTrackSelection(actionElement);
        }),
        "select-visible-audio-mix-tracks": rerenderAlways(() => {
          selectVisibleAudioMixTracks();
        }),
        "clear-selected-audio-mix-tracks": rerenderAlways(() => {
          clearAudioMixTrackSelections();
        }),
        "select-audio-mix-preset": rerenderAlways((actionElement) => {
          selectAudioMixPreset(actionElement);
        }),
        "create-audio-mix-preset": rerenderAlways(() => {
          return createAudioMixPresetFromSelection();
        }),
        "set-audio-mix-preset-text-field": rerenderAlways((actionElement) => {
          return setSelectedAudioMixPresetTextField(actionElement);
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
        "add-selected-audio-mix-tracks": rerenderAlways(() => {
          return addSelectedAudioMixTracksToPreset();
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
        "move-audio-mix-track-to-top": rerenderAlways((actionElement) => {
          return moveTrackToTopInSelectedAudioMixPreset(actionElement?.dataset?.trackId);
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
        "toggle-audio-mix-playback": rerenderAlways(() => {
          return toggleAudioMixPlayback();
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
