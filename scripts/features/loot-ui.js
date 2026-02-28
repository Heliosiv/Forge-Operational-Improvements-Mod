import { createPageActionHelpers } from "./page-action-helpers.js";

export function createGmLootPageApp(deps) {
  const {
    BaseStatefulPageApp,
    getResponsiveWindowPosition,
    setPageInstance,
    buildContext,
    openMainTab,
    openGmLootClaimsBoard,
    getLootClaimRunIdFromElement,
    setActiveLootRegistryTab,
    setActiveLootSettingsTab,
    setLootPackSourcesUiState,
    toggleLootPackSource,
    setLootPackWeight,
    toggleLootTableSource,
    setLootTableType,
    toggleLootItemType,
    setLootRarityFloor,
    setLootRarityCeiling,
    setLootManifestPack,
    setLootKeywordIncludeTags,
    setLootKeywordExcludeTags,
    resetLootSourceConfig,
    setLootPreviewField,
    rollLootPreview,
    addLootPreviewItemByPicker,
    removeLootPreviewItem,
    adjustLootPreviewCurrency,
    clearLootPreviewResult,
    publishLootPreviewToClaims,
    clearLootClaimsPool,
    openLootItemFromElement,
    addLootPreviewItemFromDropEvent,
    openGmPanelByKey
  } = deps;

  return class GmLootPageApp extends BaseStatefulPageApp {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
      id: "party-operations-gm-loot-page",
      classes: ["party-operations"],
      window: { title: "Party Operations - GM Loot" },
      position: getResponsiveWindowPosition?.("gm-loot") ?? { width: 1600, height: 900 },
      resizable: true
    });

    static PARTS = {
      main: { template: "modules/party-operations/templates/gm-loot.hbs" }
    };

    async _prepareContext() {
      return buildContext();
    }

    _setPageInstance(instance) {
      setPageInstance(instance);
    }

    _getBoundDatasetKey() {
      return "poBoundGmLootPage";
    }

    _getActionErrorScope() {
      return "gm-loot-page";
    }

    _getActionErrorMessage() {
      return "Loot action failed. Check console for details.";
    }

    _shouldHandleChangeAction(action) {
      if (action === "set-loot-pack-filter") return false;
      return true;
    }

    _shouldHandleInputAction(action) {
      return action === "set-loot-pack-filter" || action === "set-loot-preview-field";
    }

    _getActionHandlers() {
      const { rerender, rerenderAlways, rerenderIfTruthy, openPanelTab } = createPageActionHelpers(this);
      const rerenderUnlessInput = (operation) => async (actionElement, event) => {
        await operation(actionElement, event);
        if (event?.type !== "input") rerender();
      };
      return {
        "gm-loot-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-loot-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": openPanelTab("loot", openGmPanelByKey),
        "open-gm-loot-claims-board": async (actionElement) => {
          openGmLootClaimsBoard({
            force: true,
            runId: getLootClaimRunIdFromElement(actionElement)
          });
        },
        "set-loot-registry-tab": async (actionElement) => {
          setActiveLootRegistryTab(String(actionElement?.dataset?.tab ?? "preview"));
          rerender();
        },
        "set-loot-settings-tab": async (actionElement) => {
          setActiveLootSettingsTab(String(actionElement?.dataset?.tab ?? "sources"));
          rerender();
        },
        "set-loot-pack-filter": rerenderUnlessInput((actionElement) => {
          setLootPackSourcesUiState({ filter: String(actionElement?.value ?? "") });
        }),
        "clear-loot-pack-filter": async () => {
          setLootPackSourcesUiState({ filter: "" });
          rerender();
        },
        "toggle-loot-pack-source": rerenderAlways(toggleLootPackSource),
        "set-loot-pack-weight": rerenderAlways(setLootPackWeight),
        "toggle-loot-table-source": rerenderAlways(toggleLootTableSource),
        "set-loot-table-type": rerenderAlways(setLootTableType),
        "toggle-loot-item-type": rerenderAlways(toggleLootItemType),
        "set-loot-rarity-floor": rerenderAlways(setLootRarityFloor),
        "set-loot-rarity-ceiling": rerenderAlways(setLootRarityCeiling),
        "set-loot-manifest-pack": rerenderAlways(setLootManifestPack),
        "set-loot-keyword-include-tags": rerenderAlways(setLootKeywordIncludeTags),
        "set-loot-keyword-exclude-tags": rerenderAlways(setLootKeywordExcludeTags),
        "reset-loot-source-config": rerenderAlways(() => resetLootSourceConfig()),
        "set-loot-preview-field": rerenderUnlessInput((actionElement) => {
          setLootPreviewField(actionElement);
        }),
        "roll-loot-preview": rerenderAlways(rollLootPreview),
        "add-loot-preview-item": rerenderIfTruthy(() => addLootPreviewItemByPicker()),
        "remove-loot-preview-item": rerenderIfTruthy(removeLootPreviewItem),
        "adjust-loot-preview-currency": rerenderIfTruthy(adjustLootPreviewCurrency),
        "clear-loot-preview": rerenderAlways(() => clearLootPreviewResult()),
        "publish-loot-claims": rerenderAlways(() => publishLootPreviewToClaims()),
        "clear-loot-claims": rerenderAlways(() => clearLootClaimsPool()),
        "open-loot-item": async (actionElement) => {
          await openLootItemFromElement(actionElement);
        }
      };
    }

    _bindAdditionalListeners(root) {
      root.addEventListener("dragover", (event) => {
        const dropZone = event.target?.closest?.("[data-loot-preview-dropzone]");
        if (!dropZone) return;
        event.preventDefault();
      });
      root.addEventListener("drop", (event) => {
        void (async () => {
          const dropZone = event.target?.closest?.("[data-loot-preview-dropzone]");
          if (!dropZone) return;
          event.preventDefault();
          const added = await addLootPreviewItemFromDropEvent(event);
          if (added) this._renderWithPreservedState({ force: true, parts: ["main"] });
        })();
      });
    }
  };
}
