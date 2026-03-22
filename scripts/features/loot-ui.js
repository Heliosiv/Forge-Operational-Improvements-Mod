import { createPageActionHelpers } from "./page-action-helpers.js";

function bindLootItemCardIconOpeners(root, openLootItemFromElement) {
  if (!(root instanceof HTMLElement) || root.dataset.poBoundLootItemCardOpeners === "1") return;
  root.dataset.poBoundLootItemCardOpeners = "1";
  root.addEventListener("dblclick", (event) => {
    const target = event?.target instanceof Element ? event.target : null;
    if (!target) return;
    const openTarget = target.closest("[data-po-item-open-target]");
    if (!openTarget || !root.contains(openTarget)) return;
    const itemCard = openTarget.closest("[data-po-item-card]") ?? openTarget.closest("[data-uuid]");
    if (!itemCard) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    void openLootItemFromElement(itemCard);
  });
}

function createDebouncedAction(callback, delayMs = 160) {
  let timeoutId = null;
  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      callback(...args);
    }, Math.max(0, Number(delayMs) || 0));
  };
}

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
    importLootManifestCompendiumToWorld,
    clearLootManifestImportedWorldItems,
    setLootKeywordIncludeMode,
    setLootKeywordIncludeTags,
    setLootKeywordExcludeTags,
    resetLootSourceConfig,
    setLootPreviewField,
    rollLootPreview,
    generateLootPreviewItemFromSnapshot,
    addLootPreviewItemByPicker,
    editLootPreviewItem,
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
      const context = buildContext() ?? {};
      const uiStatus = this._uiActionStatus ?? { message: "", tone: "" };
      return {
        ...context,
        uiActionStatusMessage: uiStatus.message,
        uiActionStatusWarn: uiStatus.tone === "warn",
        uiActionStatusGood: uiStatus.tone === "good"
      };
    }

    _setUiActionStatus(message, tone = "") {
      this._uiActionStatus = {
        message: String(message ?? ""),
        tone: String(tone ?? "")
      };
      const root = this.element instanceof HTMLElement
        ? this.element
        : (this.element?.[0] instanceof HTMLElement ? this.element[0] : null);
      const statusNode = root?.querySelector?.("[data-page-action-status]");
      if (statusNode instanceof HTMLElement) {
        statusNode.textContent = this._uiActionStatus.message;
        statusNode.classList.toggle("is-warn", this._uiActionStatus.tone === "warn");
        statusNode.classList.toggle("is-good", this._uiActionStatus.tone === "good");
      }
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
      const applyLootPackFilterDebounced = createDebouncedAction((value) => {
        setLootPackSourcesUiState({ filter: String(value ?? "") });
        rerender();
      });
      const withActionStatus = (operation, {
        pending = "Working…",
        success = "Update complete.",
        failure = "Action failed."
      } = {}) => async (actionElement, event) => {
        this._setUiActionStatus(pending);
        try {
          const result = await operation(actionElement, event);
          this._setUiActionStatus(success, "good");
          return result;
        } catch (error) {
          this._setUiActionStatus(failure, "warn");
          throw error;
        }
      };
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
        "set-loot-pack-filter": async (actionElement) => {
          applyLootPackFilterDebounced(String(actionElement?.value ?? ""));
        },
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
        "import-loot-manifest-compendium": rerenderAlways(withActionStatus(
          () => importLootManifestCompendiumToWorld(),
          {
            pending: "Importing manifest items…",
            success: "Manifest items imported.",
            failure: "Manifest import failed."
          }
        )),
        "clear-loot-manifest-imported-items": rerenderAlways(withActionStatus(
          () => clearLootManifestImportedWorldItems(),
          {
            pending: "Clearing imported world items…",
            success: "Imported world items cleared.",
            failure: "Unable to clear imported world items."
          }
        )),
        "set-loot-keyword-include-mode": rerenderAlways(setLootKeywordIncludeMode),
        "set-loot-keyword-include-tags": rerenderAlways(setLootKeywordIncludeTags),
        "set-loot-keyword-exclude-tags": rerenderAlways(setLootKeywordExcludeTags),
        "reset-loot-source-config": rerenderAlways(() => resetLootSourceConfig()),
        "set-loot-preview-field": rerenderUnlessInput((actionElement) => {
          setLootPreviewField(actionElement);
        }),
        "roll-loot-preview": rerenderAlways(withActionStatus(rollLootPreview, {
          pending: "Generating loot preview…",
          success: "Loot preview generated.",
          failure: "Loot generation failed."
        })),
        "generate-loot-preview-item": rerenderIfTruthy(() => generateLootPreviewItemFromSnapshot()),
        "add-loot-preview-item": rerenderIfTruthy(() => addLootPreviewItemByPicker()),
        "edit-loot-preview-item": rerenderIfTruthy(editLootPreviewItem),
        "remove-loot-preview-item": rerenderIfTruthy(removeLootPreviewItem),
        "adjust-loot-preview-currency": rerenderIfTruthy(adjustLootPreviewCurrency),
        "clear-loot-preview": rerenderAlways(() => clearLootPreviewResult()),
        "publish-loot-claims": rerenderAlways(withActionStatus(
          () => publishLootPreviewToClaims(),
          {
            pending: "Publishing claim board…",
            success: "Claim board published to players.",
            failure: "Unable to publish claim board."
          }
        )),
        "clear-loot-claims": rerenderAlways(withActionStatus(
          () => clearLootClaimsPool(),
          {
            pending: "Archiving selected claim run…",
            success: "Claim run archived.",
            failure: "Unable to archive selected claim run."
          }
        )),
        "open-loot-item": async (actionElement) => {
          await openLootItemFromElement(actionElement);
        }
      };
    }

    _bindAdditionalListeners(root) {
      bindLootItemCardIconOpeners(root, openLootItemFromElement);
      const setDropzoneState = (eventTarget, active) => {
        const dropZone = eventTarget?.closest?.("[data-loot-preview-dropzone]");
        if (!dropZone) return null;
        dropZone.classList.toggle("is-drop-active", active);
        return dropZone;
      };

      const clearDropzoneState = () => {
        root.querySelectorAll?.("[data-loot-preview-dropzone].is-drop-active")?.forEach?.((dropZone) => {
          dropZone.classList.remove("is-drop-active");
        });
      };

      root.addEventListener("dragenter", (event) => {
        const dropZone = setDropzoneState(event.target, true);
        if (!dropZone) return;
        event.preventDefault();
      });
      root.addEventListener("dragover", (event) => {
        const dropZone = setDropzoneState(event.target, true);
        if (!dropZone) return;
        event.preventDefault();
      });
      root.addEventListener("dragleave", (event) => {
        const dropZone = event.target?.closest?.("[data-loot-preview-dropzone]");
        if (!dropZone) return;
        dropZone.classList.remove("is-drop-active");
      });
      root.addEventListener("drop", (event) => {
        void (async () => {
          const dropZone = event.target?.closest?.("[data-loot-preview-dropzone]");
          if (!dropZone) return;
          event.preventDefault();
          dropZone.classList.remove("is-drop-active");
          const added = await addLootPreviewItemFromDropEvent(event);
          if (added) this._renderWithPreservedState({ force: true, parts: ["main"] });
        })();
      });
      root.addEventListener("dragend", () => {
        clearDropzoneState();
      });
    }
  };
}
