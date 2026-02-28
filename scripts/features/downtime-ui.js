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
      position: getResponsiveWindowPosition?.("gm-downtime") ?? { width: 980, height: 760 },
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
      const rerender = () => this._renderWithPreservedState({ force: true, parts: ["main"] });
      return {
        "gm-downtime-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-downtime-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": async (actionElement) => {
          const panelKey = String(actionElement?.dataset?.panel ?? "").trim().toLowerCase();
          if (!panelKey) return;
          if (panelKey === "downtime") return;
          openGmPanelByKey(panelKey, { force: false });
        },
        "set-downtime-entry-sort": async (actionElement) => {
          setGmDowntimeViewState({ entriesSort: String(actionElement?.value ?? "") });
          rerender();
        },
        "set-downtime-log-sort": async (actionElement) => {
          setGmDowntimeViewState({ logsSort: String(actionElement?.value ?? "") });
          rerender();
        },
        "set-downtime-hours": async (actionElement) => {
          await setDowntimeHoursGranted(actionElement);
          rerender();
        },
        "set-downtime-tuning": async (actionElement) => {
          await setDowntimeTuningField(actionElement);
          rerender();
        },
        "set-downtime-resolve-target": async (actionElement) => {
          applyDowntimeResolverBaseToUi(actionElement, { force: true });
        },
        "prefill-downtime-resolution": async (actionElement) => {
          applyDowntimeResolverBaseToUi(actionElement, { force: true });
        },
        "pre-resolve-selected-downtime-entry": async (actionElement) => {
          await preResolveSelectedDowntimeEntry(actionElement);
          rerender();
        },
        "resolve-selected-downtime-entry": async (actionElement) => {
          await resolveSelectedDowntimeEntry(actionElement);
          rerender();
        },
        "edit-downtime-result": async (actionElement) => {
          await editDowntimeResult(actionElement);
          rerender();
        },
        "submit-downtime-action": async (actionElement) => {
          await submitDowntimeAction(actionElement);
          rerender();
        },
        "clear-downtime-entry": async (actionElement) => {
          await clearDowntimeEntry(actionElement);
          rerender();
        },
        "clear-downtime-results": async () => {
          await clearDowntimeResults();
          rerender();
        },
        "unarchive-downtime-log": async (actionElement) => {
          await unarchiveDowntimeLogEntry(actionElement);
          rerender();
        },
        "clear-downtime-log": async (actionElement) => {
          await clearDowntimeLogEntry(actionElement);
          rerender();
        },
        "post-downtime-log": async (actionElement) => {
          await postDowntimeLogOutcome(actionElement);
          rerender();
        },
        "collect-downtime-result": async (actionElement) => {
          await collectDowntimeResult(actionElement);
          rerender();
        },
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
