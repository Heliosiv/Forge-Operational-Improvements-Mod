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
      position: getResponsiveWindowPosition?.("gm-loot", { width: 9999, height: 9999 }) ?? { width: 1800, height: 980 },
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
      const rerender = () => this._renderWithPreservedState({ force: true, parts: ["main"] });
      return {
        "gm-loot-page-back": async () => {
          this.close();
          openMainTab("gm", { force: true });
        },
        "gm-loot-page-refresh": async () => {
          rerender();
        },
        "gm-panel-tab": async (actionElement) => {
          const panelKey = String(actionElement?.dataset?.panel ?? "").trim().toLowerCase();
          if (!panelKey) return;
          if (panelKey === "loot") return;
          openGmPanelByKey(panelKey, { force: false });
        },
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
        "set-loot-pack-filter": async (actionElement, event) => {
          setLootPackSourcesUiState({ filter: String(actionElement?.value ?? "") });
          if (event?.type !== "input") rerender();
        },
        "clear-loot-pack-filter": async () => {
          setLootPackSourcesUiState({ filter: "" });
          rerender();
        },
        "toggle-loot-pack-source": async (actionElement) => {
          await toggleLootPackSource(actionElement);
          rerender();
        },
        "set-loot-pack-weight": async (actionElement) => {
          await setLootPackWeight(actionElement);
          rerender();
        },
        "toggle-loot-table-source": async (actionElement) => {
          await toggleLootTableSource(actionElement);
          rerender();
        },
        "set-loot-table-type": async (actionElement) => {
          await setLootTableType(actionElement);
          rerender();
        },
        "toggle-loot-item-type": async (actionElement) => {
          await toggleLootItemType(actionElement);
          rerender();
        },
        "set-loot-rarity-floor": async (actionElement) => {
          await setLootRarityFloor(actionElement);
          rerender();
        },
        "set-loot-rarity-ceiling": async (actionElement) => {
          await setLootRarityCeiling(actionElement);
          rerender();
        },
        "set-loot-manifest-pack": async (actionElement) => {
          await setLootManifestPack(actionElement);
          rerender();
        },
        "set-loot-keyword-include-tags": async (actionElement) => {
          await setLootKeywordIncludeTags(actionElement);
          rerender();
        },
        "set-loot-keyword-exclude-tags": async (actionElement) => {
          await setLootKeywordExcludeTags(actionElement);
          rerender();
        },
        "reset-loot-source-config": async () => {
          await resetLootSourceConfig();
          rerender();
        },
        "set-loot-preview-field": async (actionElement, event) => {
          setLootPreviewField(actionElement);
          if (event?.type !== "input") rerender();
        },
        "roll-loot-preview": async (actionElement) => {
          await rollLootPreview(actionElement);
          rerender();
        },
        "add-loot-preview-item": async () => {
          const added = await addLootPreviewItemByPicker();
          if (added) rerender();
        },
        "remove-loot-preview-item": async (actionElement) => {
          const removed = await removeLootPreviewItem(actionElement);
          if (removed) rerender();
        },
        "adjust-loot-preview-currency": async (actionElement) => {
          const adjusted = adjustLootPreviewCurrency(actionElement);
          if (adjusted) rerender();
        },
        "clear-loot-preview": async () => {
          clearLootPreviewResult();
          rerender();
        },
        "publish-loot-claims": async () => {
          await publishLootPreviewToClaims();
          rerender();
        },
        "clear-loot-claims": async () => {
          await clearLootClaimsPool();
          rerender();
        },
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
