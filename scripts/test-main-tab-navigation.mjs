import assert from "node:assert/strict";

import { createMainTabNavigator } from "./features/main-tab-navigation.js";

function createApp(label) {
  return {
    label,
    element: { isConnected: true },
    closeCalls: 0,
    renderCalls: [],
    close() {
      this.closeCalls += 1;
      this.element.isConnected = false;
    },
    render(options) {
      this.renderCalls.push(options);
      this.element.isConnected = true;
    }
  };
}

{
  const apps = {
    rest: createApp("rest"),
    ops: createApp("ops"),
    march: createApp("march"),
    player: createApp("player")
  };
  const history = [];
  const warnings = [];
  const activeTabs = [];
  const queueSignals = [];
  let createdRestApp = null;
  let createdOpsApp = null;
  let createdMarchApp = null;
  const navigator = createMainTabNavigator({
    normalizeMainTabId: (value, fallback) =>
      String(value ?? fallback)
        .trim()
        .toLowerCase(),
    logUiDebug: () => {},
    getTemplateForMainTab: (tabId) => `template:${tabId}`,
    canAccessAllPlayerOps: () => true,
    canAccessGmPage: () => true,
    notifyUiWarnThrottled: (message) => warnings.push(message),
    getAppInstance(key) {
      if (key === "rest") return apps.rest;
      if (key === "operations") return apps.ops;
      if (key === "march") return apps.march;
      if (key === "player") return apps.player;
      return null;
    },
    appInstanceKeys: {
      REST_WATCH: "rest",
      OPERATIONS_SHELL: "operations",
      MARCHING_ORDER: "march",
      REST_WATCH_PLAYER: "player"
    },
    RestWatchApp: class {
      constructor() {
        createdRestApp = createApp("rest-new");
        return createdRestApp;
      }
    },
    OperationsShellApp: class {
      constructor() {
        createdOpsApp = createApp("ops-new");
        return createdOpsApp;
      }
    },
    MarchingOrderApp: class {
      constructor() {
        createdMarchApp = createApp("march-new");
        return createdMarchApp;
      }
    },
    getResponsiveWindowOptions: (key) => ({ key }),
    setActiveRestMainTab: (tabId) => activeTabs.push(tabId),
    queueManagedAudioMixPlaybackResync: () => queueSignals.push("queued"),
    writePoBrowserHistoryEntry: (entry) => history.push(entry)
  });

  navigator.openMainTab("marching-order");
  assert.equal(apps.rest.closeCalls, 1);
  assert.equal(apps.ops.closeCalls, 1);
  assert.equal(apps.player.closeCalls, 1);
  assert.equal(apps.march.renderCalls.length + (createdMarchApp?.renderCalls.length ?? 0), 1);
  assert.deepEqual(history.at(-1), { type: "main", tab: "marching-order" });

  apps.rest.element.isConnected = true;
  apps.ops.element.isConnected = true;
  navigator.openMainTab("operations");
  assert.deepEqual(activeTabs.at(-1), "operations");
  assert.equal(apps.rest.closeCalls, 2);
  assert.equal(apps.ops.renderCalls.length, 1);

  navigator.openMainTab("gm");
  assert.deepEqual(activeTabs.at(-1), "gm");
  assert.equal(warnings.length, 0);

  navigator.openMainTab("rest-watch");
  assert.deepEqual(activeTabs.at(-1), "rest-watch");
  assert.equal(apps.rest.renderCalls.length + (createdRestApp?.renderCalls.length ?? 0), 1);
  assert.equal(queueSignals.length, 4);
}

{
  const warnings = [];
  const playerApp = createApp("player-nongm");
  const restApp = createApp("rest-nongm");
  const opsApp = createApp("ops-nongm");
  const marchApp = createApp("march-nongm");
  const history = [];
  const activeTabs = [];
  const playerHubTabs = [];
  const queueSignals = [];
  const playerOpenOptions = [];
  let playerOpenCalls = 0;
  const navigator = createMainTabNavigator({
    normalizeMainTabId: (value, fallback) =>
      String(value ?? fallback)
        .trim()
        .toLowerCase(),
    canAccessAllPlayerOps: () => false,
    canAccessGmPage: () => false,
    notifyUiWarnThrottled: (message) => warnings.push(message),
    getAppInstance(key) {
      if (key === "rest") return restApp;
      if (key === "operations") return opsApp;
      if (key === "march") return marchApp;
      return null;
    },
    appInstanceKeys: {
      REST_WATCH: "rest",
      OPERATIONS_SHELL: "operations",
      MARCHING_ORDER: "march"
    },
    RestWatchApp: class {},
    OperationsShellApp: class {},
    MarchingOrderApp: class {},
    getResponsiveWindowOptions: () => ({}),
    setActiveRestMainTab: (tabId) => activeTabs.push(tabId),
    setPlayerHubTab: (tabId) => playerHubTabs.push(tabId),
    queueManagedAudioMixPlaybackResync: () => queueSignals.push("queued"),
    writePoBrowserHistoryEntry: (entry) => history.push(entry),
    openRestWatchPlayerApp: (options) => {
      playerOpenCalls += 1;
      playerOpenOptions.push(options);
      return playerApp;
    }
  });

  assert.equal(navigator.openMainTab("gm"), null);
  assert.equal(warnings.length, 1);
  assert.equal(navigator.openMainTab("rest-watch"), playerApp);
  assert.equal(playerOpenCalls, 1);
  assert.deepEqual(activeTabs.at(-1), "rest-watch");
  assert.deepEqual(playerHubTabs.at(-1), "watch");
  assert.deepEqual(playerOpenOptions.at(-1), { force: true, hubTab: "watch" });
  assert.deepEqual(history.at(-1), { type: "player", tab: "watch" });
  assert.equal(queueSignals.length, 1);
  assert.equal(navigator.openMainTab("marching-order"), playerApp);
  assert.equal(playerOpenCalls, 2);
  assert.equal(marchApp.closeCalls, 1);
  assert.deepEqual(playerHubTabs.at(-1), "march");
  assert.deepEqual(playerOpenOptions.at(-1), { force: true, hubTab: "march" });
  assert.deepEqual(history.at(-1), { type: "player", tab: "march" });
  assert.equal(navigator.openMainTab("operations"), playerApp);
  assert.equal(playerOpenCalls, 3);
  assert.equal(opsApp.closeCalls, 1);
  assert.deepEqual(playerHubTabs.at(-1), "downtime");
  assert.deepEqual(playerOpenOptions.at(-1), { force: true, hubTab: "downtime" });
  assert.deepEqual(history.at(-1), { type: "player", tab: "downtime" });
}
