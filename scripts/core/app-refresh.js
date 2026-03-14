export function createOpenAppRefresher(options = {}) {
  const {
    normalizeRefreshScopeList,
    getRefreshTargetWindowIds,
    refreshableWindowIds = [],
    getKnownInstances = () => [],
    getUiWindows = () => ({}),
    getAppWindowId,
    appHasFocusedTypingInput,
    logUiDebug,
    captureWindowState,
    rememberWindowState,
    renderAppWithPreservedState,
    captureCanvasViewState,
    refreshLauncherAudioUi,
    queueCanvasViewRestore,
    requestAnimationFrameFn = globalThis.requestAnimationFrame?.bind(globalThis)
  } = options;

  let refreshQueued = false;
  let refreshAll = false;
  const scopeQueue = new Set();

  return function refreshOpenApps(refreshOptions = {}) {
    const scopes = normalizeRefreshScopeList(refreshOptions?.scopes ?? refreshOptions?.scope);
    if (scopes.length <= 0 || refreshOptions?.all === true) {
      refreshAll = true;
    } else {
      for (const scope of scopes) scopeQueue.add(scope);
    }

    if (refreshQueued) return;
    refreshQueued = true;

    requestAnimationFrameFn?.(() => {
      refreshQueued = false;
      const targetIds = refreshAll
        ? new Set(refreshableWindowIds)
        : getRefreshTargetWindowIds(Array.from(scopeQueue));
      refreshAll = false;
      scopeQueue.clear();

      const canvasSnapshot = captureCanvasViewState();
      const knownInstances = getKnownInstances()
        .filter((app) => app?.element?.isConnected)
        .filter((app) => targetIds.has(getAppWindowId(app)));
      const apps = Object.values(getUiWindows() ?? {})
        .filter((app) => targetIds.has(getAppWindowId(app)));
      const unique = Array.from(new Set([...apps, ...knownInstances]));

      for (const app of unique) {
        if (!app?.render) continue;
        if (appHasFocusedTypingInput(app)) {
          logUiDebug?.("refresh", "skipping rerender for app with focused text input", {
            appId: String(app?.id ?? app?.options?.id ?? ""),
            appClass: String(app?.constructor?.name ?? "Application")
          });
          continue;
        }
        const windowState = captureWindowState(app);
        if (windowState) rememberWindowState(app, windowState);
        renderAppWithPreservedState(app, { force: true, parts: ["main"], focus: false }, {
          preserveCanvas: false
        });
      }

      refreshLauncherAudioUi();
      queueCanvasViewRestore(canvasSnapshot, {
        action: "refresh-open-apps",
        eventType: "refresh"
      });
    });
  };
}
