export function createRenderPreservationTools({
  foundryRef,
  globalObject,
  requestAnimationFrameFn,
  setTimeoutFn,
  pendingUiRestore,
  pendingScrollRestore,
  pendingWindowRestore,
  captureUiState,
  captureScrollState,
  captureWindowState
} = {}) {
  let latestCanvasRestoreRequestId = 0;

  function normalizePreservedRenderOptions(renderOptions = null) {
    const patch = renderOptions && typeof renderOptions === "object" ? renderOptions : {};
    return foundryRef.utils.mergeObject({
      force: true,
      parts: ["main"],
      focus: false
    }, patch, { inplace: false, overwrite: true });
  }

  function captureCanvasViewState() {
    try {
      const liveCanvas = globalObject?.canvas;
      if (!liveCanvas?.ready || !liveCanvas?.stage) return null;
      const sceneId = String(liveCanvas.scene?.id ?? "");
      if (!sceneId) return null;
      const x = Number(liveCanvas.stage.pivot?.x);
      const y = Number(liveCanvas.stage.pivot?.y);
      const scale = Number(liveCanvas.stage.scale?.x ?? liveCanvas.stage.scale?.y ?? 1);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(scale)) return null;
      return {
        sceneId,
        x,
        y,
        scale,
        capturedAt: Date.now()
      };
    } catch {
      return null;
    }
  }

  function hasCanvasViewShifted(previous, current, options = {}) {
    if (!previous || !current) return false;
    if (String(previous.sceneId ?? "") !== String(current.sceneId ?? "")) return false;
    const tolerancePx = Math.max(0.25, Number(options.tolerancePx ?? 1.5));
    const toleranceScale = Math.max(0.0005, Number(options.toleranceScale ?? 0.0025));
    return Math.abs(Number(current.x ?? 0) - Number(previous.x ?? 0)) > tolerancePx
      || Math.abs(Number(current.y ?? 0) - Number(previous.y ?? 0)) > tolerancePx
      || Math.abs(Number(current.scale ?? 1) - Number(previous.scale ?? 1)) > toleranceScale;
  }

  function restoreCanvasViewState(snapshot, options = {}) {
    try {
      if (!snapshot) return false;
      const liveCanvas = globalObject?.canvas;
      if (!liveCanvas?.ready || !liveCanvas?.stage) return false;
      if (String(liveCanvas.scene?.id ?? "") !== String(snapshot.sceneId ?? "")) return false;
      const current = captureCanvasViewState();
      if (!hasCanvasViewShifted(snapshot, current, options)) return false;
      const panData = {
        x: Number(snapshot.x ?? 0),
        y: Number(snapshot.y ?? 0),
        scale: Number(snapshot.scale ?? 1),
        duration: 0
      };
      if (typeof liveCanvas.animatePan === "function") {
        void liveCanvas.animatePan(panData);
        return true;
      }
      if (typeof liveCanvas.pan === "function") {
        liveCanvas.pan(panData);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  function queueCanvasViewRestore(snapshot, options = {}) {
    if (!snapshot) return;
    const latestOnly = options?.latestOnly !== false;
    const requestId = latestOnly ? ++latestCanvasRestoreRequestId : 0;
    const maxAgeMs = Math.max(80, Math.floor(Number(options.maxAgeMs ?? 1500)));
    const runRestore = () => {
      if ((Date.now() - Number(snapshot.capturedAt ?? 0)) > maxAgeMs) return;
      if (latestOnly && requestId !== latestCanvasRestoreRequestId) return;
      restoreCanvasViewState(snapshot, options);
    };
    requestAnimationFrameFn(() => {
      requestAnimationFrameFn(runRestore);
    });
    try {
      setTimeoutFn(runRestore, 64);
    } catch {
      // Ignore timer failures in non-browser execution contexts.
    }
  }

  function shouldPreserveCanvasForUiEvent(event, actionElement, actionInput = "") {
    const eventType = String(event?.type ?? "").trim().toLowerCase();
    if (eventType === "change" || eventType === "input") return true;
    const action = String(actionInput ?? actionElement?.dataset?.action ?? "").trim().toLowerCase();
    if (action === "ping") return false;
    const tag = String(actionElement?.tagName ?? "").trim().toUpperCase();
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return true;
    return false;
  }

  function renderAppWithPreservedState(app, renderOptions = { force: true, parts: ["main"], focus: false }, options = {}) {
    if (!app?.render) return;
    const uiState = captureUiState(app);
    if (uiState) pendingUiRestore.set(app, uiState);
    const scrollState = captureScrollState(app);
    if (scrollState.length > 0) pendingScrollRestore.set(app, scrollState);
    const preserveWindow = options?.preserveWindow !== false;
    if (preserveWindow) {
      const windowState = captureWindowState(app);
      if (windowState) pendingWindowRestore.set(app, windowState);
    }
    const normalizedOptions = normalizePreservedRenderOptions(renderOptions);
    const preserveCanvas = options?.preserveCanvas !== false;
    const canvasSnapshot = preserveCanvas ? captureCanvasViewState() : null;
    app.render(normalizedOptions);
    if (preserveCanvas) {
      queueCanvasViewRestore(canvasSnapshot, {
        action: String(options?.action ?? ""),
        eventType: String(options?.eventType ?? "")
      });
    }
  }

  return {
    normalizePreservedRenderOptions,
    captureCanvasViewState,
    queueCanvasViewRestore,
    shouldPreserveCanvasForUiEvent,
    renderAppWithPreservedState
  };
}
