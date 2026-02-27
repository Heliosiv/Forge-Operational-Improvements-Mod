export function createGmMerchantsPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    cacheMerchantEditorDraftFromElement,
    setMerchantEditorViewTabFromElement,
    resetMerchantEditorSelection,
    createStarterMerchants,
    saveMerchantCityCatalogFromElement,
    assignMerchantCityFromElement,
    randomizeMerchantNameFromElement,
    randomizeMerchantRaceFromElement,
    setMerchantEditorSelectionFromElement,
    saveMerchantFromElement,
    deleteMerchantFromElement,
    refreshMerchantStockFromElement,
    refreshAllMerchantStocksFromElement,
    setMerchantAccessModeFromElement,
    setMerchantAssignmentFromElement,
    setMerchantAssignmentAllEnabledFromElement,
    setMerchantAssignmentAllDisabledFromElement,
    openMerchantActorFromElement
  } = deps;

  return class GmMerchantsPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-merchants-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Merchants" },
      position: getResponsiveWindowPosition?.("gm-merchants") ?? { width: 1120, height: 920 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-merchants.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmMerchantsPage";
    }

    _getActionErrorScope() {
      return "gm-merchants-page";
    }

    _getActionErrorMessage() {
      return "Merchant editor action failed. Check console for details.";
    }

    _getActionHandlers() {
      const rerender = () => this._renderWithPreservedState({ force: true, parts: ["main"] });
      return {
        "gm-merchants-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-merchants-page-refresh": async () => {
          rerender();
        },
        "merchant-editor-draft-change": async (actionElement) => {
          if (cacheMerchantEditorDraftFromElement(actionElement, { suppressMissingFormWarning: true })) rerender();
        },
        "merchant-editor-view-tab": async (actionElement) => {
          if (setMerchantEditorViewTabFromElement(actionElement)) rerender();
        },
        "merchant-new": async () => {
          resetMerchantEditorSelection();
          rerender();
        },
        "merchant-create-starters": async () => {
          await createStarterMerchants();
          rerender();
        },
        "merchant-save-city-catalog": async (actionElement) => {
          if (await saveMerchantCityCatalogFromElement(actionElement)) rerender();
        },
        "merchant-assign-city": async (actionElement) => {
          if (await assignMerchantCityFromElement(actionElement)) rerender();
        },
        "merchant-set-access-mode": async (actionElement) => {
          if (await setMerchantAccessModeFromElement(actionElement)) rerender();
        },
        "merchant-assign-toggle": async (actionElement) => {
          if (await setMerchantAssignmentFromElement(actionElement)) rerender();
        },
        "merchant-assign-all": async (actionElement) => {
          if (await setMerchantAssignmentAllEnabledFromElement(actionElement)) rerender();
        },
        "merchant-assign-none": async (actionElement) => {
          if (await setMerchantAssignmentAllDisabledFromElement(actionElement)) rerender();
        },
        "merchant-randomize-name": async (actionElement) => {
          if (randomizeMerchantNameFromElement(actionElement)) rerender();
        },
        "merchant-randomize-race": async (actionElement) => {
          if (randomizeMerchantRaceFromElement(actionElement)) rerender();
        },
        "merchant-edit": async (actionElement) => {
          if (setMerchantEditorSelectionFromElement(actionElement)) rerender();
        },
        "merchant-save": async (actionElement) => {
          await saveMerchantFromElement(actionElement);
          rerender();
        },
        "merchant-delete": async (actionElement) => {
          await deleteMerchantFromElement(actionElement);
          rerender();
        },
        "merchant-refresh-stock": async (actionElement) => {
          await refreshMerchantStockFromElement(actionElement);
          rerender();
        },
        "merchant-refresh-all-stock": async (actionElement) => {
          await refreshAllMerchantStocksFromElement(actionElement);
          rerender();
        },
        "merchant-open-actor": async (actionElement) => {
          await openMerchantActorFromElement(actionElement);
        }
      };
    }
  };
}
