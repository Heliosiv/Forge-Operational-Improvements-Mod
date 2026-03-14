import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmFactionsPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    setReputationFilterState,
    showReputationBrief,
    setReputationScore,
    adjustReputationScore,
    setReputationNote,
    logReputationNote,
    loadReputationNoteLog,
    useReputationNoteLog,
    postReputationNoteLog,
    clearReputationNote,
    removeReputationNoteLog,
    setReputationLabel,
    setReputationDetail,
    setReputationOperationsVisibility,
    setReputationOperationsField,
    setReputationPlayerImpactField,
    addReputationPlayerImpact,
    removeReputationPlayerImpact,
    setReputationBuilderField,
    setReputationBuilderImpactField,
    addReputationBuilderImpact,
    removeReputationBuilderImpact,
    clearReputationBuilder,
    addReputationFaction,
    removeReputationFaction,
    openGmPanelByKey
  } = deps;

  return class GmFactionsPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-factions-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Factions" },
      position: getResponsiveWindowPosition?.("gm-factions") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-factions.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmFactionsPage";
    }

    _getActionErrorScope() {
      return "gm-factions-page";
    }

    _getActionErrorMessage() {
      return "Faction action failed. Check console for details.";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, openPanelTab } = createPageActionHelpers(this);
      return {
        "gm-factions-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-factions-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("faction", openGmPanelByKey),
        "set-reputation-filter-keyword": async (actionElement) => {
          setReputationFilterState({ keyword: String(actionElement?.value ?? "") });
          rerender();
        },
        "set-reputation-filter-standing": async (actionElement) => {
          setReputationFilterState({ standing: String(actionElement?.value ?? "all") });
          rerender();
        },
        "clear-reputation-filters": async () => {
          setReputationFilterState({ keyword: "", standing: "all" });
          rerender();
        },
        "show-reputation-brief": async () => {
          await showReputationBrief();
        },
        "set-reputation-score": rerenderAlways(setReputationScore),
        "adjust-reputation-score": rerenderAlways(adjustReputationScore),
        "set-reputation-note": rerenderAlways(setReputationNote),
        "log-reputation-note": rerenderAlways(logReputationNote),
        "load-reputation-note-log": rerenderAlways(loadReputationNoteLog),
        "use-reputation-note-log": rerenderAlways(useReputationNoteLog),
        "post-reputation-note-log": rerenderAlways(postReputationNoteLog),
        "clear-reputation-note": rerenderAlways(clearReputationNote),
        "remove-reputation-note-log": rerenderAlways(removeReputationNoteLog),
        "set-reputation-label": rerenderAlways(setReputationLabel),
        "set-reputation-detail": rerenderAlways(setReputationDetail),
        "set-reputation-operations-visible": rerenderAlways(setReputationOperationsVisibility),
        "set-reputation-operations-field": rerenderAlways(setReputationOperationsField),
        "set-reputation-player-impact": rerenderAlways(setReputationPlayerImpactField),
        "add-reputation-player-impact": rerenderAlways(addReputationPlayerImpact),
        "remove-reputation-player-impact": rerenderAlways(removeReputationPlayerImpact),
        "set-reputation-builder-field": rerenderAlways(setReputationBuilderField),
        "set-reputation-builder-impact": rerenderAlways(setReputationBuilderImpactField),
        "add-reputation-builder-impact": rerenderAlways(() => addReputationBuilderImpact()),
        "remove-reputation-builder-impact": rerenderAlways(removeReputationBuilderImpact),
        "clear-reputation-builder": rerenderAlways(() => clearReputationBuilder()),
        "add-reputation-faction": rerenderAlways(addReputationFaction),
        "remove-reputation-faction": rerenderAlways(removeReputationFaction)
      };
    }
  };
}
