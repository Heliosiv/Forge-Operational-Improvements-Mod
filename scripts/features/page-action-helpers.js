import { createModulePerfTracker } from "../core/perf.js";

function normalizePanelKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function buildActionMeta(actionElement, event) {
  return {
    action: String(actionElement?.dataset?.action ?? "").trim(),
    panel: String(actionElement?.dataset?.panel ?? "").trim(),
    eventType: String(event?.type ?? "").trim()
  };
}

function resolveActionControl(actionElement) {
  if (!(actionElement instanceof HTMLElement)) return null;
  if ("disabled" in actionElement) return actionElement;
  return null;
}

function setPanelBusyState(app, isBusy) {
  const root =
    app?.element instanceof HTMLElement
      ? app.element
      : app?.element?.[0] instanceof HTMLElement
        ? app.element[0]
        : null;
  if (!root) return;
  if (isBusy) root.setAttribute("aria-busy", "true");
  else root.removeAttribute("aria-busy");
}

export function createPageActionHelpers(app, { perfTracker = createModulePerfTracker("page-actions") } = {}) {
  const inflightActionKeys = new Set();

  const rerender = (meta = {}) => {
    perfTracker.increment("page-main-rerender", 1, meta);
    return app._renderWithPreservedState({ force: true, parts: ["main"] });
  };

  const runSingleFlightAction = async (actionElement, event, operation) => {
    const meta = buildActionMeta(actionElement, event);
    perfTracker.increment("action-invoked", 1, meta);

    const control = resolveActionControl(actionElement);
    const key = `${meta.action}|${meta.panel}`;
    if (inflightActionKeys.has(key)) {
      perfTracker.increment("action-skipped-inflight", 1, meta);
      return { meta, result: undefined, skipped: true };
    }

    inflightActionKeys.add(key);
    if (control) control.disabled = true;
    setPanelBusyState(app, true);
    try {
      const result = await operation(actionElement, event, meta);
      return { meta, result, skipped: false };
    } finally {
      inflightActionKeys.delete(key);
      if (control) control.disabled = false;
      setPanelBusyState(app, false);
    }
  };

  const rerenderAlways = (operation) => async (actionElement, event) => {
    const { meta, skipped } = await runSingleFlightAction(actionElement, event, operation);
    if (!skipped) rerender(meta);
  };

  const rerenderIfTruthy = (operation) => async (actionElement, event) => {
    const { meta, result, skipped } = await runSingleFlightAction(actionElement, event, operation);
    if (!skipped && result) rerender(meta);
  };

  const openPanelTab = (currentPanelKey, openPanelByKey) => async (actionElement) => {
    const panelKey = normalizePanelKey(actionElement?.dataset?.panel);
    if (!panelKey) return;
    if (panelKey === normalizePanelKey(currentPanelKey)) return;
    app.persistWindowPosition?.({ immediate: true });
    if (panelKey === "cockpit") await app.close?.();
    if (typeof openPanelByKey === "function") openPanelByKey(panelKey, { force: true });
  };

  return Object.freeze({
    rerender,
    rerenderAlways,
    rerenderIfTruthy,
    openPanelTab
  });
}
