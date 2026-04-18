import assert from "node:assert/strict";

import { registerPartyOperationsUiHooks } from "./hooks/ui-hooks.js";

{
  const registrations = new Map();
  const openedTabs = [];
  const launcherCalls = [];
  const hiddenRoots = [];
  const timers = [];
  const perfEvents = [];
  const documentRef = { nodeName: "#document" };
  let nowValue = 0;

  registerPartyOperationsUiHooks({
    HooksRef: {
      on(eventName, handler) {
        registrations.set(eventName, handler);
      }
    },
    openMainTab(tabId, options) {
      openedTabs.push({ tabId, options });
    },
    canAccessAllPlayerOps() {
      return true;
    },
    ensureLauncherUi() {
      launcherCalls.push("ensure");
    },
    hideManagedAudioMixPlaylistUi(root) {
      hiddenRoots.push(root);
    },
    perfTracker: {
      increment(metricName, value, meta) {
        perfEvents.push({ metricName, value, meta });
      }
    },
    nowFn() {
      return nowValue;
    },
    setTimeoutFn(callback, delayMs) {
      timers.push(delayMs);
      nowValue += delayMs;
      callback();
    },
    documentRef
  });

  const controls = [];
  registrations.get("getSceneControlButtons")(controls);

  assert.equal(controls.length, 1);
  assert.equal(controls[0].name, "party-operations");
  assert.deepEqual(
    controls[0].tools.map((tool) => tool.name),
    ["po-rest-watch", "po-marching-order", "po-operations", "po-gm"]
  );

  controls[0].tools[0].onClick();
  controls[0].tools[3].onClick();
  assert.deepEqual(openedTabs, [
    { tabId: "rest-watch", options: { force: true } },
    { tabId: "gm", options: { force: true } }
  ]);

  const duplicateControls = [{ name: "party-operations" }];
  registrations.get("getSceneControlButtons")(duplicateControls);
  assert.equal(duplicateControls.length, 1);

  registrations.get("renderSceneControls")();
  registrations.get("canvasReady")();
  registrations.get("renderHotbar")();
  registrations.get("renderSidebarTab")(null, { 0: { nodeName: "sidebar-root" } });
  registrations.get("renderNavigation")();

  assert.equal(launcherCalls.length, 4);
  assert.deepEqual(hiddenRoots, [{ nodeName: "sidebar-root" }, documentRef]);
  assert.deepEqual(timers, [30, 30, 30]);
  assert.ok(perfEvents.some((entry) => entry.metricName === "launcher.ensure-request" && entry.meta?.reason === "renderSidebarTab"));
  assert.ok(perfEvents.some((entry) => entry.metricName === "audio.playlist-hide" && entry.meta?.deferred));
  assert.ok(perfEvents.some((entry) => entry.metricName === "launcher.ensure-skipped" && entry.meta?.reason === "canvasReady"));
}

{
  const registrations = new Map();

  registerPartyOperationsUiHooks({
    HooksRef: {
      on(eventName, handler) {
        registrations.set(eventName, handler);
      }
    },
    canAccessAllPlayerOps() {
      return false;
    }
  });

  const controls = [];
  registrations.get("getSceneControlButtons")(controls);

  assert.deepEqual(
    controls[0].tools.map((tool) => tool.name),
    ["po-rest-watch", "po-marching-order", "po-operations"]
  );
}
