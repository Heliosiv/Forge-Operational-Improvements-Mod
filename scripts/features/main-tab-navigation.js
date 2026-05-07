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
  CommandCenterApp,
  getResponsiveWindowOptions,
  setActiveRestMainTab,
  setPlayerHubTab,
  queueManagedAudioMixPlaybackResync,
  writePoBrowserHistoryEntry,
  openRestWatchPlayerApp
} = {}) {
  const playerHubTabValues = new Set(["watch", "march", "loot", "downtime"]);

  function normalizeRequestedPlayerHubTab(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return playerHubTabValues.has(normalized) ? normalized : "";
  }

  function getPlayerHubTabFromMainTab(tabId) {
    const normalized = normalizeMainTabId(tabId, "rest-watch");
    if (normalized === "marching-order") return "march";
    if (normalized === "operations") return "downtime";
    return "watch";
  }

  function openMainTab(tabId, renderOptions = { force: true }) {
    const normalized = normalizeMainTabId(tabId, "rest-watch");
    const suppressHistory = Boolean(renderOptions?.suppressHistory);
    logUiDebug?.("launcher", "openMainTab request", {
      tabId,
      normalized,
      template: getTemplateForMainTab?.(normalized),
      isActualGM: Boolean(typeof game !== "undefined" && game.user?.isGM), // Actual GM status; canAccessGmPage for permissions
      canAccessGmPage: Boolean(canAccessGmPage?.())
    });

    if (!canAccessAllPlayerOps?.()) {
      if (normalized === "gm") {
        notifyUiWarnThrottled?.("GM permissions are required for the GM section.", {
          key: "gm-section-permission",
          ttlMs: 1500
        });
        return null;
      }
      const requestedPlayerHubTab = normalizeRequestedPlayerHubTab(renderOptions?.hubTab);
      const playerHubTab = requestedPlayerHubTab || getPlayerHubTabFromMainTab(normalized);
      setPlayerHubTab?.(playerHubTab);
      const restWatchApp = getAppInstance?.(appInstanceKeys?.REST_WATCH);
      if (restWatchApp?.element?.isConnected) void restWatchApp.close();
      const operationsShellApp = getAppInstance?.(appInstanceKeys?.OPERATIONS_SHELL);
      if (operationsShellApp?.element?.isConnected) void operationsShellApp.close();
      const commandCenterApp = getAppInstance?.(appInstanceKeys?.COMMAND_CENTER);
      if (commandCenterApp?.element?.isConnected) void commandCenterApp.close();
      const marchingOrderApp = getAppInstance?.(appInstanceKeys?.MARCHING_ORDER);
      if (marchingOrderApp?.element?.isConnected) void marchingOrderApp.close();
      setActiveRestMainTab?.("rest-watch");
      const app = openRestWatchPlayerApp?.({ force: true, hubTab: playerHubTab });
      queueManagedAudioMixPlaybackResync?.();
      if (!suppressHistory) writePoBrowserHistoryEntry?.({ type: "player", tab: playerHubTab });
      return app ?? null;
    }

    const commandCenterApp = getAppInstance?.(appInstanceKeys?.COMMAND_CENTER);
    const restWatchApp = getAppInstance?.(appInstanceKeys?.REST_WATCH);
    const operationsShellApp = getAppInstance?.(appInstanceKeys?.OPERATIONS_SHELL);
    const restWatchPlayerApp = getAppInstance?.(appInstanceKeys?.REST_WATCH_PLAYER);
    if (restWatchPlayerApp?.element?.isConnected) void restWatchPlayerApp.close();
    if (restWatchApp?.element?.isConnected) void restWatchApp.close();
    if (operationsShellApp?.element?.isConnected) void operationsShellApp.close();
    const marchingOrderApp = getAppInstance?.(appInstanceKeys?.MARCHING_ORDER);
    if (marchingOrderApp?.element?.isConnected) void marchingOrderApp.close();

    if (normalized === "gm" && !canAccessGmPage?.()) {
      notifyUiWarnThrottled?.("GM permissions are required for the GM section.", {
        key: "gm-section-permission",
        ttlMs: 1500
      });
      return null;
    }

    setActiveRestMainTab?.(normalized);
    const ShellApp = CommandCenterApp ?? OperationsShellApp ?? RestWatchApp;
    const app = commandCenterApp?.element?.isConnected
      ? commandCenterApp
      : new ShellApp(getResponsiveWindowOptions?.("command-center"));
    app._isCommandCenterShell = true;
    app._activePanel = normalized;
    if (renderOptions?.commandCenterView) {
      app._commandCenterView = String(renderOptions.commandCenterView);
    }
    app.render(renderOptions);
    queueManagedAudioMixPlaybackResync?.();
    if (!suppressHistory) writePoBrowserHistoryEntry?.({ type: "main", tab: normalized });
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
