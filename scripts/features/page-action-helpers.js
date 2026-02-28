function normalizePanelKey(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createPageActionHelpers(app) {
  const rerender = () => app._renderWithPreservedState({ force: true, parts: ["main"] });

  const rerenderAlways = (operation) => async (actionElement, event) => {
    await operation(actionElement, event);
    rerender();
  };

  const rerenderIfTruthy = (operation) => async (actionElement, event) => {
    const result = await operation(actionElement, event);
    if (result) rerender();
  };

  const openPanelTab = (currentPanelKey, openPanelByKey) => async (actionElement) => {
    const panelKey = normalizePanelKey(actionElement?.dataset?.panel);
    if (!panelKey) return;
    if (panelKey === normalizePanelKey(currentPanelKey)) return;
    if (typeof openPanelByKey === "function") openPanelByKey(panelKey, { force: true });
  };

  return Object.freeze({
    rerender,
    rerenderAlways,
    rerenderIfTruthy,
    openPanelTab
  });
}
