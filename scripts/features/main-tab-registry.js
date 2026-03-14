export function createMainTabRegistry({ templateMap = {} } = {}) {
  const mainTabIds = new Set(["rest-watch", "marching-order", "operations", "gm"]);
  const mainTabActions = Object.freeze({
    "rest-watch": "rest",
    operations: "operations",
    "marching-order": "march",
    gm: "gm"
  });
  const switchTabIds = new Set(["rest", "march", "operations", "gm"]);
  const switchToMainTab = Object.freeze({
    rest: "rest-watch",
    march: "marching-order",
    operations: "operations",
    gm: "gm"
  });
  const mainToSwitchTab = Object.freeze({
    "rest-watch": "rest",
    "marching-order": "march",
    operations: "operations",
    gm: "gm"
  });

  function getTemplateForMainTab(tabId) {
    const normalized = String(tabId ?? "").trim().toLowerCase();
    if (normalized === "marching-order") return templateMap["marching-order"];
    if (normalized === "rest-watch") return templateMap["rest-watch"];
    if (normalized === "operations" || normalized === "gm") return templateMap["rest-watch"];
    return templateMap["rest-watch"];
  }

  function normalizeMainTabId(value, fallback = "rest-watch") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (switchTabIds.has(normalized)) return switchToMainTab[normalized] ?? fallback;
    if (normalized === "rest") return "rest-watch";
    if (normalized === "march") return "marching-order";
    if (!mainTabIds.has(normalized)) return fallback;
    return normalized;
  }

  function normalizeSwitchTabId(value, fallback = "rest") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (switchTabIds.has(normalized)) return normalized;
    const mainTab = normalizeMainTabId(normalized, switchToMainTab[fallback] ?? "rest-watch");
    return mainToSwitchTab[mainTab] ?? fallback;
  }

  function getSwitchTabIdFromMainTabId(mainTabId) {
    const normalized = normalizeMainTabId(mainTabId, "rest-watch");
    return mainToSwitchTab[normalized] ?? "rest";
  }

  function getMainTabIdFromAction(action) {
    const normalizedAction = String(action ?? "").trim().toLowerCase();
    for (const [tabId, tabAction] of Object.entries(mainTabActions)) {
      if (tabAction === normalizedAction) return tabId;
    }
    return null;
  }

  return {
    mainTabIds,
    mainTabActions,
    getTemplateForMainTab,
    normalizeMainTabId,
    normalizeSwitchTabId,
    getSwitchTabIdFromMainTabId,
    getMainTabIdFromAction
  };
}
