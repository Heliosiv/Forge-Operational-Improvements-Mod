import assert from "node:assert/strict";

import { createOpenAppRefresher } from "./core/app-refresh.js";

{
  const frames = [];
  const remembered = [];
  const rendered = [];
  const restores = [];
  const refreshCalls = [];
  const debugLogs = [];

  const appA = {
    id: "a",
    element: { isConnected: true },
    render() {}
  };
  const appB = {
    id: "b",
    element: { isConnected: true },
    render() {}
  };

  const refreshOpenApps = createOpenAppRefresher({
    normalizeRefreshScopeList: (value) => {
      if (Array.isArray(value)) return value;
      return value ? [value] : [];
    },
    getRefreshTargetWindowIds: (scopes) => {
      refreshCalls.push(scopes);
      return new Set(scopes.includes("rest") ? ["app-a", "app-b"] : ["app-a"]);
    },
    refreshableWindowIds: ["app-a", "app-b", "app-c"],
    getKnownInstances: () => [appA],
    getUiWindows: () => ({ first: appA, second: appB }),
    getAppWindowId: (app) => (app === appA ? "app-a" : "app-b"),
    appHasFocusedTypingInput: (app) => app === appB,
    logUiDebug: (...args) => debugLogs.push(args),
    captureWindowState: (app) => ({ id: app.id }),
    rememberWindowState: (app, state) => remembered.push({ app, state }),
    renderAppWithPreservedState: (app, options, extra) => rendered.push({ app, options, extra }),
    captureCanvasViewState: () => ({ x: 1 }),
    refreshLauncherAudioUi: () => restores.push("audio"),
    queueCanvasViewRestore: (snapshot, options) => restores.push({ snapshot, options }),
    requestAnimationFrameFn: (callback) => frames.push(callback)
  });

  refreshOpenApps({ scope: "rest" });
  refreshOpenApps({ scope: "ops" });

  assert.equal(frames.length, 1);
  frames[0]();

  assert.deepEqual(refreshCalls, [["rest", "ops"]]);
  assert.deepEqual(remembered, [{ app: appA, state: { id: "a" } }]);
  assert.deepEqual(rendered, [{
    app: appA,
    options: { force: true, parts: ["main"], focus: false },
    extra: { preserveCanvas: false }
  }]);
  assert.equal(debugLogs.length, 1);
  assert.deepEqual(restores, [
    "audio",
    {
      snapshot: { x: 1 },
      options: { action: "refresh-open-apps", eventType: "refresh" }
    }
  ]);
}

{
  const frames = [];
  const targetLookups = [];
  const rendered = [];

  const refreshOpenApps = createOpenAppRefresher({
    normalizeRefreshScopeList: () => [],
    getRefreshTargetWindowIds: (scopes) => {
      targetLookups.push(scopes);
      return new Set(["ignored"]);
    },
    refreshableWindowIds: ["app-a"],
    getKnownInstances: () => [{
      id: "a",
      element: { isConnected: true },
      render() {}
    }],
    getUiWindows: () => ({}),
    getAppWindowId: () => "app-a",
    appHasFocusedTypingInput: () => false,
    captureWindowState: () => null,
    rememberWindowState: () => {},
    renderAppWithPreservedState: (...args) => rendered.push(args),
    captureCanvasViewState: () => null,
    refreshLauncherAudioUi: () => {},
    queueCanvasViewRestore: () => {},
    requestAnimationFrameFn: (callback) => frames.push(callback)
  });

  refreshOpenApps({ all: true });
  frames[0]();

  assert.deepEqual(targetLookups, []);
  assert.equal(rendered.length, 1);
}

process.stdout.write("app refresh validation passed\n");
