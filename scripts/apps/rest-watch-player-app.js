export function createRestWatchPlayerAppClass(deps = {}) {
  const {
    HandlebarsApplicationMixin,
    ApplicationV2,
    foundry,
    getResponsiveWindowPosition,
    getRestWatchState,
    buildWatchSlotsView,
    buildMiniVisualizationContext,
    buildMiniVizUiContext,
    getPlayerHubModeSetting,
    PLAYER_HUB_MODES,
    getPlayerHubTab,
    buildLootClaimsContext,
    buildOperationsJournalContext,
    getOperationsLedger,
    ensureDowntimeState,
    buildDowntimeContext,
    buildPlayerMarchQuickContext,
    getCurrentModuleVersion,
    logUiDebug,
    PO_TEMPLATE_MAP,
    MODULE_ID,
    setPartyOpsAppInstance,
    APP_INSTANCE_KEYS,
    ensurePartyOperationsClass,
    bindCanvasKeyboardSuppression,
    bindTabListKeyboardNavigation,
    bindRestWatchDelegatedListeners,
    REST_WATCH_ACTION_CONTROL_SELECTOR,
    REST_WATCH_PLAYER_DOWNTIME_DRAFT_SELECTOR,
    syncDowntimeUiDraftFromElement,
    scheduleOperationsJournalFilterUpdate,
    addDowntimeSubmissionMaterialDropFromDropEvent,
    finalizeRestWatchRender,
    updateRestWatchActivityUi,
    getAppRootElement,
    renderAppWithPreservedState,
    normalizeMainTabId,
    getRequestedPanelIdFromElement,
    summarizeClickTarget,
    openMainTab,
    shouldPreserveCanvasForUiEvent,
    captureCanvasViewState,
    handleOperationsJournalAction,
    getPlayerHubActionRequestFromUiAction,
    submitPlayerHubAction,
    emitSocketRefresh,
    setPlayerHubTab,
    setMiniVizCollapsed,
    isMiniVizCollapsed,
    updateActivity,
    clearSlotEntry,
    openRestWatchSharedNoteEditorFromElement,
    pingActorFromElement,
    editDowntimeQueueEntry,
    setLootClaimRunSelectionFromElement,
    removeDowntimeSubmissionMaterialDropFromUi,
    setLootClaimsArchiveSort,
    setLootClaimActorSelectionFromElement,
    setLootClaimsLiveSortFromElement,
    setLootClaimsLiveSearchFromElement,
    splitLootCurrencyForPlayer,
    undoLootClaimFromElement,
    unlockLootClaimRunFromElement,
    openGmLootClaimsBoard,
    getLootClaimRunIdFromElement,
    openLootItemFromElement,
    queueCanvasViewRestore,
    isRestWatchLockedForUser,
    canAccessAllPlayerOps,
    notifyUiWarnThrottled,
    getActiveActorForUser,
    saveRestWatchEntryNoteByContext,
    isModuleDebugEnabled,
    game
  } = deps;

  return class RestWatchPlayerApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "rest-watch-player-app",
      classes: ["party-operations"],
      window: { title: "Party Operations - Rest Watch" },
      position: getResponsiveWindowPosition("rest-watch-player"),
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/rest-watch-player.hbs" }
    };

    async _prepareContext() {
      try {
        const state = getRestWatchState();
        const visibility = state.visibility ?? "names-passives";
        const slots = buildWatchSlotsView(state, false, visibility);
        const lockBannerText = state.locked ? "Locked by GM" : "";
        const lockBannerTooltip = state.locked ? "Edits are disabled while the GM lock is active." : "";
        const miniViz = buildMiniVisualizationContext({ visibility });
        const miniVizUi = buildMiniVizUiContext();
        const totalSlots = slots.length;
        const occupiedSlots = slots.filter((slot) => (slot.entries?.length ?? 0) > 0).length;
        const assignedEntries = slots.reduce((count, slot) => count + (slot.entries?.length ?? 0), 0);
        const lowDarkvisionSlots = slots.filter((slot) => Number(slot.slotNoDarkvision ?? 0) > 0).length;
        const playerHubMode = getPlayerHubModeSetting();
        const playerHubSimpleMode = playerHubMode === PLAYER_HUB_MODES.SIMPLE;
        const playerHubTab = getPlayerHubTab();
        const lootClaims = buildLootClaimsContext(game.user);
        const operationsJournal = buildOperationsJournalContext();
        const ledger = getOperationsLedger();
        const downtime = buildDowntimeContext(ensureDowntimeState(ledger), { user: game.user });
        const playerMarch = buildPlayerMarchQuickContext();
        const context = {
          isGM: false,
          locked: state.locked,
          lockBannerText,
          lockBannerTooltip,
          lockBannerClass: "",
          showPopout: false,
          lastUpdatedAt: state.lastUpdatedAt ?? "-",
          lastUpdatedBy: state.lastUpdatedBy ?? "-",
          moduleVersion: getCurrentModuleVersion(),
          activeTab: "rest",
          playerHubMode,
          playerHubSimpleMode,
          playerHubTab,
          playerHubWatch: playerHubTab === "watch",
          playerHubMarch: playerHubTab === "march",
          playerHubLoot: playerHubTab === "loot",
          playerHubDowntime: playerHubTab === "downtime",
          slots,
          miniViz,
          playerMarch,
          downtime,
          lootClaims,
          operationsJournal,
          ...miniVizUi,
          overview: {
            totalSlots,
            occupiedSlots,
            assignedEntries,
            lowDarkvisionSlots,
            hasLowDarkvisionCoverage: lowDarkvisionSlots > 0,
            lockState: state.locked ? "Locked by GM" : "Open"
          }
        };
        logUiDebug("rest-watch-player", "prepared player context", {
          template: PO_TEMPLATE_MAP["rest-watch-player"],
          slots: slots.length
        });
        return context;
      } catch (error) {
        console.error(`${MODULE_ID}: RestWatchPlayerApp _prepareContext failed`, error);
        logUiDebug("rest-watch-player", "falling back to safe player context", { error: String(error?.message ?? error) });
        return {
          isGM: false,
          locked: false,
          lockBannerText: "",
          lockBannerTooltip: "",
          lockBannerClass: "",
          showPopout: false,
          lastUpdatedAt: "-",
          lastUpdatedBy: "-",
          moduleVersion: getCurrentModuleVersion(),
          activeTab: "rest",
          playerHubMode: PLAYER_HUB_MODES.SIMPLE,
          playerHubSimpleMode: true,
          playerHubTab: "watch",
          playerHubWatch: true,
          playerHubMarch: false,
          playerHubLoot: false,
          playerHubDowntime: false,
          slots: [],
          miniViz: {},
          playerMarch: {
            hasActor: false,
            actorId: "",
            actorName: "",
            currentRankId: "",
            currentRankLabel: "Unassigned",
            canSetRank: false,
            lockState: "Locked",
            rankButtons: []
          },
          downtime: {
            hoursGranted: 0,
            draftHoursGranted: 4,
            publishedHoursGranted: 0,
            publication: {
              isPublished: false,
              publishedHoursGranted: 0,
              publishedAt: 0,
              publishedAtLabel: "-",
              publishedBy: "-",
              statusLabel: "Not published to players",
              submitHint: "Players cannot submit downtime until the GM publishes granted hours.",
              buttonLabel: "Publish Hours to Players"
            },
            submit: {
              actorOptions: [],
              canChooseActor: false,
              canSubmit: false,
              actorName: "",
              actionOptions: [],
              hoursMax: 4,
              hours: 4,
              note: "",
              disabledReason: "Waiting for GM to publish granted downtime hours."
            },
            entries: [],
            hasEntries: false,
            pendingCount: 0,
            resolvedCount: 0,
            logCount: 0,
            logs: [],
            hasLogs: false
          },
          lootClaims: {},
          operationsJournal: {},
          ...buildMiniVizUiContext(),
          overview: {
            totalSlots: 0,
            occupiedSlots: 0,
            assignedEntries: 0,
            lowDarkvisionSlots: 0,
            hasLowDarkvisionCoverage: false,
            lockState: "Open"
          }
        };
      }
    }

    async _onRender(context, options) {
      await super._onRender(context, options);

      setPartyOpsAppInstance(APP_INSTANCE_KEYS.REST_WATCH_PLAYER, this);
      ensurePartyOperationsClass(this);
      bindCanvasKeyboardSuppression(this.element);
      bindTabListKeyboardNavigation(this.element);
      bindRestWatchDelegatedListeners({
        app: this,
        boundDatasetKey: "poBoundRestPlayer",
        debugScope: "rest-watch-player",
        onSwitchTabClick: (event, tabSwitch) => this.#onSwitchTabClick(event, tabSwitch),
        onAction: (event) => this.#onAction(event),
        changeHandlers: [
          (event) => {
            if (!event.target?.matches(REST_WATCH_ACTION_CONTROL_SELECTOR)) return false;
            void this.#onAction(event);
            return true;
          },
          (event) => {
            if (!event.target?.matches(REST_WATCH_PLAYER_DOWNTIME_DRAFT_SELECTOR)) return false;
            syncDowntimeUiDraftFromElement(event.target);
            return true;
          }
        ],
        inputHandlers: [
          (event) => {
            if (!event.target?.matches("input[data-action='set-journal-filter']")) return false;
            scheduleOperationsJournalFilterUpdate(this, event.target?.value ?? "", () => {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            });
            return true;
          },
          (event) => {
            if (!event.target?.matches(REST_WATCH_PLAYER_DOWNTIME_DRAFT_SELECTOR)) return false;
            syncDowntimeUiDraftFromElement(event.target);
            return true;
          }
        ],
        dragOverHandler: (event) => {
          const materialDropZone = event.target?.closest?.("[data-downtime-material-dropzone]");
          if (!materialDropZone) return;
          event.preventDefault();
        },
        dropHandler: async (event) => {
          const materialDropZone = event.target?.closest?.("[data-downtime-material-dropzone]");
          if (!materialDropZone) return;
          event.preventDefault();
          const added = await addDowntimeSubmissionMaterialDropFromDropEvent(event);
          if (added) this.#renderWithPreservedState({ force: true, parts: ["main"] });
        }
      });

      this.#updateActivityUI();
      finalizeRestWatchRender(this, "rest-watch-player");
    }

    #updateActivityUI() {
      updateRestWatchActivityUi(getAppRootElement(this));
    }

    #renderWithPreservedState(renderOptions = { force: true, parts: ["main"], focus: false }) {
      renderAppWithPreservedState(this, renderOptions);
    }

    #onTabClick(tabElement, html, event = null) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      const tabName = normalizeMainTabId(getRequestedPanelIdFromElement(tabElement), "rest-watch");
      logUiDebug("rest-watch-player", "main tab click", {
        tabName,
        target: summarizeClickTarget(event?.target ?? tabElement)
      });
      openMainTab(tabName, { force: true });
    }

    #onSwitchTabClick(event, tabButton) {
      event.preventDefault();
      event.stopPropagation();
      const tabId = String(tabButton?.dataset?.tab ?? "").trim().toLowerCase();
      logUiDebug("rest-watch-player", "switch-tab click", {
        tabId,
        target: summarizeClickTarget(event.target)
      });
      openMainTab(normalizeMainTabId(tabId, "rest-watch"), { force: true });
    }

    async #onAction(event) {
      const element = event.target?.closest("[data-action]");
      const action = element?.dataset?.action;
      const preserveCanvas = shouldPreserveCanvasForUiEvent(event, element, action);
      const canvasSnapshot = preserveCanvas ? captureCanvasViewState() : null;
      try {
        if (event?.type === "click") {
          event.preventDefault();
          event.stopPropagation();
        }
        if (!action) return;
        if (element?.tagName === "SELECT" && event?.type !== "change") return;

        const handledJournalAction = await handleOperationsJournalAction(action, element, () => {
          this.#renderWithPreservedState({ force: true, parts: ["main"] });
        });
        if (handledJournalAction) return;
        const hubActionRequest = getPlayerHubActionRequestFromUiAction(action);
        if (hubActionRequest) {
          const result = await submitPlayerHubAction(hubActionRequest.type, {
            element,
            claimVariant: hubActionRequest.claimVariant
          });
          if (result?.rerender) this.#renderWithPreservedState({ force: true, parts: ["main"] });
          return;
        }

        switch (action) {
          case "refresh":
            emitSocketRefresh();
            break;
          case "player-hub-tab":
            setPlayerHubTab(element?.dataset?.tab);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "refresh-downtime-submit-selection":
            syncDowntimeUiDraftFromElement(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "promote-downtime-queued-entry":
          case "remove-downtime-queued-entry":
          case "move-up-downtime-queued-entry":
          case "move-down-downtime-queued-entry":
            await editDowntimeQueueEntry(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "switch-tab":
            this.#onSwitchTabClick(event, element);
            break;
          case "main-tab":
          case "set-panel":
            this.#onTabClick(element, this.element);
            break;
          case "toggle-mini-viz":
            setMiniVizCollapsed(!isMiniVizCollapsed());
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "set-activity":
            await updateActivity(element, { skipLocalRefresh: true });
            break;
          case "clear":
            await clearSlotEntry(element);
            break;
          case "open-shared-note":
            await openRestWatchSharedNoteEditorFromElement(element);
            break;
          case "ping":
            await pingActorFromElement(element);
            break;
          case "set-loot-claim-run":
            if (setLootClaimRunSelectionFromElement(element)) {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            }
            break;
          case "remove-downtime-material-drop":
            if (removeDowntimeSubmissionMaterialDropFromUi(element)) {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            }
            break;
          case "set-loot-claims-archive-sort":
            setLootClaimsArchiveSort(element?.value);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "set-loot-claim-actor":
            if (setLootClaimActorSelectionFromElement(element)) {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            }
            break;
          case "set-loot-claims-live-sort":
            if (setLootClaimsLiveSortFromElement(element)) {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            }
            break;
          case "set-loot-claims-live-search":
            if (setLootClaimsLiveSearchFromElement(element)) {
              this.#renderWithPreservedState({ force: true, parts: ["main"] });
            }
            break;
          case "split-loot-currency":
            await splitLootCurrencyForPlayer(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "undo-loot-claim":
            await undoLootClaimFromElement(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "unlock-loot-claim-run":
            await unlockLootClaimRunFromElement(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "open-gm-loot-claims-board":
            openGmLootClaimsBoard({
              force: true,
              runId: getLootClaimRunIdFromElement(element)
            });
            break;
          case "open-loot-item":
            await openLootItemFromElement(element);
            break;
          default:
            break;
        }
      } finally {
        if (preserveCanvas) {
          queueCanvasViewRestore(canvasSnapshot, {
            action: String(action ?? ""),
            eventType: String(event?.type ?? "")
          });
        }
      }
    }

    async #onNotesChange(event) {
      if (event?.type === "input") return;
      const state = getRestWatchState();
      if (isRestWatchLockedForUser(state, canAccessAllPlayerOps())) {
        notifyUiWarnThrottled("Rest watch is locked by the GM.", {
          key: "rest-watch-locked",
          ttlMs: 1500
        });
        return;
      }
      const slotId = event.target?.closest(".po-card")?.dataset?.slotId;
      if (!slotId) return;
      const text = event.target.value ?? "";
      const actorId = event.target?.closest(".po-watch-entry")?.dataset?.actorId || getActiveActorForUser()?.id;
      if (!actorId) return;
      await saveRestWatchEntryNoteByContext({ slotId, actorId, text }, {
        notify: false,
        source: "manual"
      });
    }

    async close(options = {}) {
      if (isModuleDebugEnabled()) {
        console.trace(`[${MODULE_ID}] RestWatchPlayerApp.close`, {
          options
        });
      }
      return super.close(options);
    }
  };
}
