export function createGmMerchantsPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    cacheMerchantEditorDraftFromElement,
    setMerchantGmViewTab,
    setMerchantGmViewTabFromElement,
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
    setMerchantGmCollectionFilterFromElement,
    resetMerchantGmCollectionFilterFromElement,
    setMerchantShopRestrictionFromElement,
    setMerchantShopPlayerAllowedFromElement,
    setMerchantShopPlayersAllFromElement,
    setMerchantShopPlayersNoneFromElement,
    setMerchantShopTradableFromElement,
    setMerchantShopTradableAllFromElement,
    setMerchantShopTradableNoneFromElement,
    ringMerchantShopBellFromElement,
    closeMerchantShopsFromElement,
    openMerchantActorFromElement,
    openGmPanelByKey
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
        "gm-panel-tab": async (actionElement) => {
          const panelKey = String(actionElement?.dataset?.panel ?? "").trim().toLowerCase();
          if (!panelKey) return;
          if (panelKey === "merchants") return;
          openGmPanelByKey(panelKey, { force: false });
        },
        "merchant-editor-draft-change": async (actionElement) => {
          if (cacheMerchantEditorDraftFromElement(actionElement, { suppressMissingFormWarning: true })) rerender();
        },
        "merchant-editor-view-tab": async (actionElement) => {
          if (setMerchantEditorViewTabFromElement(actionElement)) rerender();
        },
        "merchant-gm-view-tab": async (actionElement) => {
          cacheMerchantEditorDraftFromElement(actionElement, { suppressMissingFormWarning: true });
          if (setMerchantGmViewTabFromElement(actionElement)) rerender();
        },
        "merchant-new": async () => {
          resetMerchantEditorSelection();
          setMerchantGmViewTab?.("editor");
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
          if (setMerchantEditorSelectionFromElement(actionElement)) {
            setMerchantGmViewTab?.("editor");
            rerender();
          }
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
        "merchant-gm-filter-change": async (actionElement) => {
          if (setMerchantGmCollectionFilterFromElement(actionElement)) rerender();
        },
        "merchant-gm-filter-reset": async (actionElement) => {
          if (resetMerchantGmCollectionFilterFromElement(actionElement)) rerender();
        },
        "merchant-shop-restrict-toggle": async (actionElement) => {
          if (await setMerchantShopRestrictionFromElement(actionElement)) rerender();
        },
        "merchant-shop-player-toggle": async (actionElement) => {
          if (await setMerchantShopPlayerAllowedFromElement(actionElement)) rerender();
        },
        "merchant-shop-player-all": async (actionElement) => {
          if (await setMerchantShopPlayersAllFromElement(actionElement)) rerender();
        },
        "merchant-shop-player-none": async (actionElement) => {
          if (await setMerchantShopPlayersNoneFromElement(actionElement)) rerender();
        },
        "merchant-toggle-shop-tradable": async (actionElement) => {
          if (await setMerchantShopTradableFromElement(actionElement)) rerender();
        },
        "merchant-shop-tradable-all": async (actionElement) => {
          if (await setMerchantShopTradableAllFromElement(actionElement)) rerender();
        },
        "merchant-shop-tradable-none": async (actionElement) => {
          if (await setMerchantShopTradableNoneFromElement(actionElement)) rerender();
        },
        "merchant-shop-bell": async (actionElement) => {
          if (await ringMerchantShopBellFromElement(actionElement)) rerender();
        },
        "merchant-shop-close": async (actionElement) => {
          if (await closeMerchantShopsFromElement(actionElement)) rerender();
        },
        "merchant-open-actor": async (actionElement) => {
          await openMerchantActorFromElement(actionElement);
        }
      };
    }
  };
}
