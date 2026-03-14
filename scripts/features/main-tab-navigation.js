export function createMainTabNavigator({
  normalizeMainTabId,
  logUiDebug,
  getTemplateForMainTab,
  canAccessAllPlayerOps,
  canAccessGmPage = canAccessAllPlayerOps,
  notifyUiWarnThrottled,
  getAppInstance,
  appInstanceKeys,
  RestWatchApp,
  OperationsShellApp,
  MarchingOrderApp,
  getResponsiveWindowOptions,
  setActiveRestMainTab,
  queueManagedAudioMixPlaybackResync,
  writePoBrowserHistoryEntry
} = {}) {
  function openMainTab(tabId, renderOptions = { force: true }) {
    const normalized = normalizeMainTabId(tabId, "rest-watch");
    const suppressHistory = Boolean(renderOptions?.suppressHistory);
    logUiDebug?.("launcher", "openMainTab request", {
      tabId,
      normalized,
      template: getTemplateForMainTab?.(normalized),
      isGM: Boolean(canAccessAllPlayerOps?.()),
      canAccessGmPage: Boolean(canAccessGmPage?.())
    });

    if (normalized === "marching-order") {
      const restWatchApp = getAppInstance?.(appInstanceKeys?.REST_WATCH);
      if (restWatchApp?.element?.isConnected) void restWatchApp.close();
      const operationsShellApp = getAppInstance?.(appInstanceKeys?.OPERATIONS_SHELL);
      if (operationsShellApp?.element?.isConnected) void operationsShellApp.close();
      const restWatchPlayerApp = getAppInstance?.(appInstanceKeys?.REST_WATCH_PLAYER);
      if (restWatchPlayerApp?.element?.isConnected) void restWatchPlayerApp.close();
      const marchingOrderApp = getAppInstance?.(appInstanceKeys?.MARCHING_ORDER);
      const app = marchingOrderApp?.element?.isConnected
        ? marchingOrderApp
        : new MarchingOrderApp(getResponsiveWindowOptions?.("marching-order"));
      app.render(renderOptions);
      queueManagedAudioMixPlaybackResync?.();
      if (!suppressHistory) writePoBrowserHistoryEntry?.({ type: "main", tab: "marching-order" });
      return app;
    }

    const marchingOrderApp = getAppInstance?.(appInstanceKeys?.MARCHING_ORDER);
    if (marchingOrderApp?.element?.isConnected) void marchingOrderApp.close();
    const operationsShellApp = getAppInstance?.(appInstanceKeys?.OPERATIONS_SHELL);
    const restWatchPlayerApp = getAppInstance?.(appInstanceKeys?.REST_WATCH_PLAYER);
    if (restWatchPlayerApp?.element?.isConnected) void restWatchPlayerApp.close();

    if (normalized === "gm" || normalized === "operations") {
      const targetMainTab = normalized === "gm" ? "gm" : "operations";
      if (targetMainTab === "gm" && !canAccessGmPage?.()) {
        notifyUiWarnThrottled?.("GM permissions are required for the GM section.", {
          key: "gm-section-permission",
          ttlMs: 1500
        });
        return null;
      }
      const restWatchApp = getAppInstance?.(appInstanceKeys?.REST_WATCH);
      if (restWatchApp?.element?.isConnected) void restWatchApp.close();
      setActiveRestMainTab?.(targetMainTab);
      const app = operationsShellApp?.element?.isConnected
        ? operationsShellApp
        : new OperationsShellApp(getResponsiveWindowOptions?.("operations-shell"));
      app._activePanel = targetMainTab;
      app.render(renderOptions);
      queueManagedAudioMixPlaybackResync?.();
      if (!suppressHistory) writePoBrowserHistoryEntry?.({ type: "main", tab: targetMainTab });
      return app;
    }

    if (operationsShellApp?.element?.isConnected) void operationsShellApp.close();

    setActiveRestMainTab?.("rest-watch");
    const restWatchApp = getAppInstance?.(appInstanceKeys?.REST_WATCH);
    const app = restWatchApp?.element?.isConnected
      ? restWatchApp
      : new RestWatchApp(getResponsiveWindowOptions?.("rest-watch"));
    app._activePanel = "rest-watch";
    app.render(renderOptions);
    queueManagedAudioMixPlaybackResync?.();
    if (!suppressHistory) writePoBrowserHistoryEntry?.({ type: "main", tab: "rest-watch" });
    return app;
  }

  function openOperationsUi() {
    return openMainTab("operations", { force: true });
  }

  function openRestWatchUiForCurrentUser(renderOptions = { force: true }) {
    return openMainTab("rest-watch", renderOptions);
  }

  function openGmUi() {
    return openMainTab("gm", { force: true });
  }

  return {
    openMainTab,
    openOperationsUi,
    openRestWatchUiForCurrentUser,
    openGmUi
  };
}
