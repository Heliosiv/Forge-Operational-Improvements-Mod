import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmDowntimePageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setGmDowntimeViewState,
    publishDowntimeHoursToPlayers,
    setDowntimeHoursGranted,
    setDowntimeTuningField,
    renderDowntimeSubmissionMaterialDropList,
    syncDowntimeUiDraftFromElement,
    applyDowntimeResolverBaseToUi,
    preResolveSelectedDowntimeEntry,
    resolveSelectedDowntimeEntry,
    editDowntimeResult,
    submitDowntimeAction,
    clearDowntimeEntry,
    clearDowntimeResults,
    unarchiveDowntimeLogEntry,
    clearDowntimeLogEntry,
    postDowntimeLogOutcome,
    collectDowntimeResult,
    removeDowntimeSubmissionMaterialDropFromUi,
    removeDowntimeResolverItemDropFromUi,
    addDowntimeSubmissionMaterialDropFromDropEvent,
    addDowntimeResolverCraftingItemDropFromDropEvent,
    addDowntimeResolverItemRewardFromDropEvent,
    renderDowntimeResolverItemDropList,
    openGmPanelByKey
  } = deps;

  return class GmDowntimePageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-downtime-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Downtime" },
      position: getResponsiveWindowPosition?.("gm-downtime") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-downtime.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmDowntimePage";
    }

    _getActionErrorScope() {
      return "gm-downtime-page";
    }

    _getActionErrorMessage() {
      return "Downtime action failed. Check console for details.";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, openPanelTab } = createPageActionHelpers(this);
      return {
        "gm-downtime-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-downtime-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("downtime", openGmPanelByKey),
        "set-downtime-entry-sort": async (actionElement) => {
          setGmDowntimeViewState({ entriesSort: String(actionElement?.value ?? "") });
          rerender();
        },
        "set-downtime-log-sort": async (actionElement) => {
          setGmDowntimeViewState({ logsSort: String(actionElement?.value ?? "") });
          rerender();
        },
        "publish-downtime-hours": rerenderAlways(publishDowntimeHoursToPlayers),
        "set-downtime-hours": rerenderAlways(setDowntimeHoursGranted),
        "set-downtime-tuning": rerenderAlways(setDowntimeTuningField),
        "refresh-downtime-submit-selection": async (actionElement) => {
          syncDowntimeUiDraftFromElement(actionElement);
          rerender();
        },
        "set-downtime-resolve-target": async (actionElement) => {
          syncDowntimeUiDraftFromElement(actionElement);
          rerender();
        },
        "prefill-downtime-resolution": async (actionElement) => {
          applyDowntimeResolverBaseToUi(actionElement, { force: true });
        },
        "pre-resolve-selected-downtime-entry": rerenderAlways(preResolveSelectedDowntimeEntry),
        "resolve-selected-downtime-entry": rerenderAlways(resolveSelectedDowntimeEntry),
        "edit-downtime-result": rerenderAlways(editDowntimeResult),
        "submit-downtime-action": rerenderAlways(submitDowntimeAction),
        "clear-downtime-entry": rerenderAlways(clearDowntimeEntry),
        "clear-downtime-results": rerenderAlways(() => clearDowntimeResults()),
        "unarchive-downtime-log": rerenderAlways(unarchiveDowntimeLogEntry),
        "clear-downtime-log": rerenderAlways(clearDowntimeLogEntry),
        "post-downtime-log": rerenderAlways(postDowntimeLogOutcome),
        "collect-downtime-result": rerenderAlways(collectDowntimeResult),
        "remove-downtime-material-drop": async (actionElement) => {
          removeDowntimeSubmissionMaterialDropFromUi(actionElement);
          rerender();
        },
        "remove-downtime-item-drop": async (actionElement) => {
          removeDowntimeResolverItemDropFromUi(actionElement);
        }
      };
    }

    _bindAdditionalListeners(root) {
      const syncDraft = (target) => {
        if (!target?.matches?.("select[name='downtimeActorId'], select[name='downtimeActionKey'], input[name='downtimeHours'], textarea[name='downtimeNote'], select[name='downtimeBrowsingAbility'], select[name='downtimeCraftItemId'], select[name='downtimeCraftMaterialsOwned'], select[name='downtimeProfessionId'], select[name='resolveDowntimeActorId'], input[name='resolveDowntimeSummary'], input[name='resolveDowntimeGp'], input[name='resolveDowntimeCost'], input[name='resolveDowntimeRumors'], select[name='resolveDowntimeContractKey'], textarea[name='resolveDowntimeContractNotes'], textarea[name='resolveDowntimeItems'], input[name='resolveDowntimeItemDrops'], textarea[name='resolveDowntimeNotes']")) return;
        syncDowntimeUiDraftFromElement(target);
      };

      root.addEventListener("input", (event) => {
        syncDraft(event.target);
      });
      root.addEventListener("change", (event) => {
        syncDraft(event.target);
      });
      root.addEventListener("dragover", (event) => {
        const dropZone = event.target?.closest?.("[data-downtime-material-dropzone], [data-downtime-item-dropzone], [data-downtime-crafting-item-dropzone]");
        if (!dropZone) return;
        event.preventDefault();
      });
      root.addEventListener("drop", (event) => {
        void (async () => {
          const materialDropZone = event.target?.closest?.("[data-downtime-material-dropzone]");
          const textDropZone = event.target?.closest?.("[data-downtime-item-dropzone]");
          const craftingDropZone = event.target?.closest?.("[data-downtime-crafting-item-dropzone]");
          if (materialDropZone) {
            event.preventDefault();
            await addDowntimeSubmissionMaterialDropFromDropEvent(event);
            return;
          }
          if (craftingDropZone) {
            event.preventDefault();
            await addDowntimeResolverCraftingItemDropFromDropEvent(event);
            return;
          }
          if (!textDropZone) return;
          event.preventDefault();
          await addDowntimeResolverItemRewardFromDropEvent(event);
        })();
      });
    }

    async _onPostRender() {
      renderDowntimeSubmissionMaterialDropList(this.element);
      const resolverRoot = this.element?.querySelector?.(".po-downtime-resolver");
      if (resolverRoot) renderDowntimeResolverItemDropList(resolverRoot);
    }
  };
}
