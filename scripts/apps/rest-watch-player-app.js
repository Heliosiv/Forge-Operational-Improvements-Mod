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
    buildPlayerActorSelectorContext,
    switchActiveCharacter,
    isModuleDebugEnabled,
    game
  } = deps;

  function buildPlayerHubFlowContext({
    overview = {},
    playerMarch = {},
    lootClaims = {},
    downtime = {},
    playerHubTab = "watch"
  } = {}) {
    const openWatchSlots = Math.max(
      0,
      (Number(overview.totalSlots ?? 0) || 0) - (Number(overview.occupiedSlots ?? 0) || 0)
    );
    const openLootRuns = Math.max(0, Number(lootClaims.openRunCount ?? 0) || 0);
    const lootItemCount = Math.max(0, Number(lootClaims.itemCount ?? 0) || 0);
    const downtimePendingCount = Math.max(0, Number(downtime.pendingCount ?? 0) || 0);
    const downtimePlayerDeliveredResults = Array.isArray(downtime?.player?.deliveredResults)
      ? downtime.player.deliveredResults
      : Array.isArray(downtime.deliveredResults)
        ? downtime.deliveredResults
        : [];
    const downtimeV2CollectCount = downtimePlayerDeliveredResults.filter((entry) =>
      Object.hasOwn(entry ?? {}, "canAcknowledge") ? Boolean(entry?.canAcknowledge) : !entry?.acknowledgedAt
    ).length;
    const downtimeLegacyCollectCount = Array.isArray(downtime.entries)
      ? downtime.entries.filter((entry) => entry?.canCollect).length
      : 0;
    const downtimeCollectCount = downtimeV2CollectCount + downtimeLegacyCollectCount;
    const downtimeQueuedCount = Array.isArray(downtime.entries)
      ? downtime.entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.queueCount ?? 0) || 0), 0)
      : 0;
    const downtimeDisabledReason =
      downtimeCollectCount > 0 || downtime?.submit?.canSubmit ? "" : String(downtime?.submit?.disabledReason ?? "");

    const cards = [
      {
        tab: "watch",
        label: "Watch",
        value: `${Math.max(0, Number(overview.occupiedSlots ?? 0) || 0)}/${Math.max(0, Number(overview.totalSlots ?? 0) || 0)}`,
        detail: openWatchSlots > 0 ? `${openWatchSlots} slot(s) open` : "All visible slots filled",
        nextActionLabel: openWatchSlots > 0 ? "Claim a watch slot" : "Review coverage",
        blockedReason: overview.hasLowDarkvisionCoverage ? "Low darkvision coverage" : "",
        hasBlockedReason: Boolean(overview.hasLowDarkvisionCoverage),
        selected: playerHubTab === "watch",
        toneClass: overview.hasLowDarkvisionCoverage ? "is-alert" : ""
      },
      {
        tab: "march",
        label: "March",
        value: String(playerMarch.currentRankLabel ?? "Unassigned"),
        detail: playerMarch.hasActor ? String(playerMarch.actorName ?? "") : "No active character",
        nextActionLabel: playerMarch.canSetRank ? "Choose your rank" : "View current position",
        blockedReason: playerMarch.hasActor ? String(playerMarch.lockState ?? "") : "No active character",
        hasBlockedReason: !playerMarch.hasActor || !playerMarch.canSetRank,
        selected: playerHubTab === "march",
        toneClass: playerMarch.canSetRank ? "" : "is-muted"
      },
      {
        tab: "loot",
        label: "Loot",
        value: `${openLootRuns} open`,
        detail: `${lootItemCount} item(s) visible`,
        nextActionLabel: openLootRuns > 0 ? "Open a claim board" : "Waiting for loot",
        blockedReason: openLootRuns > 0 ? "" : "No active boards",
        hasBlockedReason: openLootRuns <= 0,
        selected: playerHubTab === "loot",
        toneClass: lootClaims.hasOpenRuns ? "" : "is-muted"
      },
      {
        tab: "downtime",
        label: "Downtime",
        value: downtimeCollectCount > 0 ? `${downtimeCollectCount} collect` : `${downtimePendingCount} pending`,
        detail:
          downtimeCollectCount > 0
            ? `${downtimePlayerDeliveredResults.length} delivered`
            : downtimeQueuedCount > 0
              ? `${downtimeQueuedCount} queued`
              : (downtime?.publication?.statusLabel ?? "Not published"),
        nextActionLabel:
          downtimeCollectCount > 0
            ? "Collect rewards"
            : downtime?.submit?.canSubmit
              ? "Submit downtime"
              : "Check status",
        blockedReason: downtimeDisabledReason,
        hasBlockedReason: downtimeDisabledReason.length > 0,
        selected: playerHubTab === "downtime",
        toneClass: downtimeCollectCount > 0 ? "is-alert" : downtime?.submit?.canSubmit ? "" : "is-muted"
      }
    ];
    const attention = cards.find((card) => card.selected) ?? cards[0] ?? null;
    return {
      cards,
      hasCards: cards.length > 0,
      attention,
      hasAttention: Boolean(attention)
    };
  }

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
        const playerActorSelector = buildPlayerActorSelectorContext?.() ?? { hasChoices: false, options: [] };
        const playerHubFlow = buildPlayerHubFlowContext({
          overview: {
            totalSlots,
            occupiedSlots,
            assignedEntries,
            lowDarkvisionSlots,
            hasLowDarkvisionCoverage: lowDarkvisionSlots > 0,
            lockState: state.locked ? "Locked by GM" : "Open"
          },
          playerMarch,
          lootClaims,
          downtime,
          playerHubTab
        });
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
          playerHubFlow,
          playerActorSelector,
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
        logUiDebug("rest-watch-player", "falling back to safe player context", {
          error: String(error?.message ?? error)
        });
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
          playerActorSelector: {
            hasChoices: false,
            options: []
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
          playerHubFlow: { cards: [], hasCards: false },
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
          const queueDropTarget = event.target?.closest?.("[data-downtime-queue-item]");
          if (queueDropTarget) {
            event.preventDefault();
            queueDropTarget.classList.add("is-drop-target");
            return;
          }
          const materialDropZone = event.target?.closest?.("[data-downtime-material-dropzone]");
          if (!materialDropZone) return;
          event.preventDefault();
        },
        dropHandler: async (event) => {
          const queueDropTarget = event.target?.closest?.("[data-downtime-queue-item]");
          if (queueDropTarget) {
            event.preventDefault();
            queueDropTarget.classList.remove("is-drop-target");
            const payloadRaw = event.dataTransfer?.getData("application/x-party-ops-downtime-queue") ?? "";
            if (!payloadRaw) return;
            let payload;
            try {
              payload = JSON.parse(payloadRaw);
            } catch {
              return;
            }
            const sourceActorId = String(payload?.actorId ?? "").trim();
            const sourceQueueIndex = Number(payload?.queueIndex ?? -1);
            const targetActorId = String(queueDropTarget?.dataset?.actorId ?? "").trim();
            const targetQueueIndex = Number(queueDropTarget?.dataset?.queueIndex ?? -1);
            if (!sourceActorId || !targetActorId || sourceActorId !== targetActorId) return;
            if (!Number.isFinite(sourceQueueIndex) || !Number.isFinite(targetQueueIndex)) return;
            if (Math.floor(sourceQueueIndex) === Math.floor(targetQueueIndex)) return;
            await editDowntimeQueueEntry({
              dataset: {
                actorId: sourceActorId,
                queueIndex: String(Math.floor(sourceQueueIndex)),
                targetQueueIndex: String(Math.floor(targetQueueIndex)),
                queueOperation: "move-to"
              }
            });
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            return;
          }
          const materialDropZone = event.target?.closest?.("[data-downtime-material-dropzone]");
          if (!materialDropZone) return;
          event.preventDefault();
          const added = await addDowntimeSubmissionMaterialDropFromDropEvent(event);
          if (added) this.#renderWithPreservedState({ force: true, parts: ["main"] });
        }
      });

      this.element?.addEventListener?.("dragstart", (event) => {
        const queueItem = event.target?.closest?.("[data-downtime-queue-item]");
        if (!queueItem) return;
        const actorId = String(queueItem.dataset?.actorId ?? "").trim();
        const queueIndex = Number(queueItem.dataset?.queueIndex ?? -1);
        if (!actorId || !Number.isFinite(queueIndex) || queueIndex < 0) return;
        event.dataTransfer?.setData(
          "application/x-party-ops-downtime-queue",
          JSON.stringify({
            actorId,
            queueIndex: Math.floor(queueIndex)
          })
        );
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      });

      this.element?.addEventListener?.("dragleave", (event) => {
        const queueDropTarget = event.target?.closest?.("[data-downtime-queue-item]");
        if (!queueDropTarget) return;
        queueDropTarget.classList.remove("is-drop-target");
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
      const tabId = String(tabButton?.dataset?.tab ?? "")
        .trim()
        .toLowerCase();
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
          case "switch-character":
            await switchActiveCharacter?.(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "refresh-downtime-submit-selection":
            syncDowntimeUiDraftFromElement(element);
            this.#renderWithPreservedState({ force: true, parts: ["main"] });
            break;
          case "promote-downtime-queued-entry":
          case "clear-downtime-queue":
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
