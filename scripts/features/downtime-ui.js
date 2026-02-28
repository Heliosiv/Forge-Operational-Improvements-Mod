import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmDowntimePageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setGmDowntimeViewState,
    setDowntimeHoursGranted,
    setDowntimeTuningField,
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
    removeDowntimeResolverItemDropFromUi,
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
        "set-downtime-hours": rerenderAlways(setDowntimeHoursGranted),
        "set-downtime-tuning": rerenderAlways(setDowntimeTuningField),
        "set-downtime-resolve-target": async (actionElement) => {
          applyDowntimeResolverBaseToUi(actionElement, { force: true });
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
        "remove-downtime-item-drop": async (actionElement) => {
          removeDowntimeResolverItemDropFromUi(actionElement);
        }
      };
    }

    _bindAdditionalListeners(root) {
      root.addEventListener("dragover", (event) => {
        const dropZone = event.target?.closest?.("[data-downtime-item-dropzone], [data-downtime-crafting-item-dropzone]");
        if (!dropZone) return;
        event.preventDefault();
      });
      root.addEventListener("drop", (event) => {
        void (async () => {
          const textDropZone = event.target?.closest?.("[data-downtime-item-dropzone]");
          const craftingDropZone = event.target?.closest?.("[data-downtime-crafting-item-dropzone]");
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
      const resolverRoot = this.element?.querySelector?.(".po-downtime-resolver");
      if (resolverRoot) renderDowntimeResolverItemDropList(resolverRoot);
    }
  };
}
