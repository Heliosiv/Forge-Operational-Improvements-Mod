import assert from "node:assert/strict";

import { createLauncherUiController } from "./features/launcher-ui.js";

function createController(overrides = {}) {
  const calls = {
    clearErrors: 0,
    refreshes: 0,
    played: [],
    toggled: 0,
    next: 0,
    stopped: 0,
    setErrors: [],
    warnings: [],
    openedTabs: []
  };

  const controller = createLauncherUiController({
    moduleId: "party-operations",
    settings: {
      LAUNCHER_PLACEMENT: "launcherPlacement",
      FLOATING_LAUNCHER_POS: "floatingPos",
      FLOATING_LAUNCHER_LOCKED: "floatingLocked"
    },
    launcherPlacements: {
      FLOATING: "floating",
      SIDEBAR: "sidebar",
      BOTH: "both"
    },
    getGame: () => ({
      settings: {
        get: () => "floating",
        set: async () => {}
      }
    }),
    getDocument: () => ({
      getElementById(id) {
        if (id !== "po-sidebar-launcher") return null;
        return {
          querySelector() {
            return { innerHTML: "", remove() {} };
          }
        };
      }
    }),
    getUi: () => ({
      notifications: {
        warn: (message) => calls.warnings.push(message),
        error: () => {}
      }
    }),
    canAccessAllPlayerOps: () => true,
    canAccessGmPage: () => true,
    getMainTabIdFromAction: (action) => {
      if (action === "rest") return "rest-watch";
      return null;
    },
    getTemplateForMainTab: (tabId) => `template:${tabId}`,
    openMainTab: (tabId, options) => calls.openedTabs.push({ tabId, options }),
    logUiDebug: () => {},
    refreshOpenApps: () => {
      calls.refreshes += 1;
    },
    refreshScopeKeys: {
      LOOT: "loot"
    },
    getAudioLibraryCatalog: () => ({
      items: [{ id: "track-1" }]
    }),
    getSelectedAudioMixPreset: () => ({
      id: "preset-1",
      label: "Camp",
      description: "Campfire mix"
    }),
    getAudioMixPlaybackState: () => ({
      presetId: "preset-1",
      presetLabel: "Camp",
      activeTrackName: "Rain",
      isPlaying: false,
      isPaused: false,
      hasQueue: true,
      hasActiveTrack: false,
      canSkipNext: true,
      playbackId: "mix-1"
    }),
    getPlayableAudioMixCandidates: () => [{ id: "track-1" }],
    getAllAudioMixPresets: () => [{ id: "preset-1", label: "Camp" }],
    selectAudioMixPreset: () => {},
    playAudioMixPresetById: async (presetId) => {
      calls.played.push(presetId);
    },
    toggleAudioMixPlayback: async () => {
      calls.toggled += 1;
    },
    playNextAudioMixTrack: async () => {
      calls.next += 1;
    },
    stopAudioMixPlayback: async () => {
      calls.stopped += 1;
    },
    clearAudioLibraryError: () => {
      calls.clearErrors += 1;
    },
    setAudioLibraryError: (message) => {
      calls.setErrors.push(message);
    },
    ...overrides
  });

  return { controller, calls };
}

function createFakeElement(tagName = "div", options = {}) {
  const children = [];
  const classNames = new Set(
    String(options.className ?? "")
      .split(/\s+/)
      .filter(Boolean)
  );
  const element = {
    tagName,
    nodeType: 1,
    id: String(options.id ?? ""),
    className: String(options.className ?? ""),
    dataset: {},
    style: {},
    children,
    parentElement: null,
    _html: "",
    _listeners: {},
    classList: {
      add: (...names) => {
        names.forEach((name) => classNames.add(name));
        element.className = Array.from(classNames).join(" ");
      },
      contains: (name) => classNames.has(name)
    },
    appendChild(child) {
      child.parentElement = element;
      children.push(child);
      return child;
    },
    prepend(child) {
      child.parentElement = element;
      const existingIndex = children.indexOf(child);
      if (existingIndex >= 0) children.splice(existingIndex, 1);
      children.unshift(child);
      return child;
    },
    remove() {
      const siblings = element.parentElement?.children;
      const index = siblings?.indexOf?.(element) ?? -1;
      if (index >= 0) siblings.splice(index, 1);
      element.parentElement = null;
    },
    removeAttribute(name) {
      if (name === "id") element.id = "";
    },
    addEventListener(type, handler) {
      element._listeners[type] = handler;
    },
    querySelector(selector) {
      return queryFakeElement(element, selector, true);
    },
    querySelectorAll(selector) {
      return queryFakeElement(element, selector, false);
    },
    get firstElementChild() {
      return children[0] ?? null;
    },
    set innerHTML(value) {
      element._html = String(value ?? "");
    },
    get innerHTML() {
      return element._html;
    }
  };
  return element;
}

function matchesFakeSelector(element, selector) {
  const normalized = String(selector ?? "").trim();
  if (!normalized) return false;
  if (normalized.includes("#sidebar-content") || normalized.includes("[data-application-part='content']")) {
    return false;
  }
  if (normalized === ".po-sidebar-launcher" || normalized === "[data-po-sidebar-launcher]") {
    return element.classList?.contains?.("po-sidebar-launcher") || element.dataset?.poSidebarLauncher === "1";
  }
  if (normalized.includes(".sidebar-tab")) return element.classList?.contains?.("sidebar-tab");
  return false;
}

function queryFakeElement(root, selector, firstOnly) {
  const selectors = String(selector ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const matches = [];
  const visit = (node) => {
    for (const child of node.children ?? []) {
      if (selectors.some((entry) => matchesFakeSelector(child, entry))) {
        matches.push(child);
        if (firstOnly) return true;
      }
      if (visit(child) && firstOnly) return true;
    }
    return false;
  };
  visit(root);
  return firstOnly ? (matches[0] ?? null) : matches;
}

{
  const { controller } = createController();
  const markup = controller.buildSidebarLauncherAudioMarkup();

  assert.match(markup, /po-sidebar-launcher-audio-compact/);
  assert.match(markup, /aria-label="Preset Deck"/);
  assert.match(markup, /data-action="launcher-audio-play"[\s\S]*Play/);
  assert.match(markup, /data-action="launcher-audio-next"[\s\S]*Next/);
  assert.match(markup, /data-action="launcher-audio-stop"[\s\S]*Stop/);
}

{
  const { controller, calls } = createController({
    getAudioMixPlaybackState: () => ({
      presetId: "preset-1",
      isPaused: true,
      hasQueue: true
    })
  });

  await controller.handleLauncherAudioTransportAction("launcher-audio-play");

  assert.equal(calls.toggled, 1);
  assert.deepEqual(calls.played, []);
  assert.equal(calls.clearErrors, 1);
}

{
  const { controller, calls } = createController();

  await controller.handleLauncherAudioTransportAction("launcher-audio-play");
  await controller.handleLauncherAudioTransportAction("launcher-audio-next");
  await controller.handleLauncherAudioTransportAction("launcher-audio-stop");
  controller.handleLauncherAction("rest");

  assert.deepEqual(calls.played, ["preset-1"]);
  assert.equal(calls.next, 1);
  assert.equal(calls.stopped, 1);
  assert.deepEqual(calls.openedTabs, [{ tabId: "rest-watch", options: { force: true } }]);
}

{
  const { controller, calls } = createController({
    playNextAudioMixTrack: async () => {
      throw new Error("Next failed");
    }
  });

  await controller.handleLauncherAudioTransportAction("launcher-audio-next");

  assert.deepEqual(calls.setErrors, ["Next failed"]);
  assert.deepEqual(calls.warnings, ["Audio mix failed: Next failed"]);
}

{
  const tabA = createFakeElement("section", { className: "tab sidebar-tab active" });
  const tabB = createFakeElement("section", { className: "tab sidebar-tab" });
  const sidebar = createFakeElement("aside", { id: "sidebar" });
  sidebar.appendChild(tabA);
  sidebar.appendChild(tabB);
  const documentRef = {
    createElement: (tagName) => createFakeElement(tagName),
    getElementById: (id) => (id === "sidebar" ? sidebar : queryFakeElement(sidebar, `#${id}`, true)),
    querySelector: (selector) => queryFakeElement(sidebar, selector, true),
    querySelectorAll: (selector) => queryFakeElement(sidebar, selector, false)
  };
  const { controller } = createController({
    getGame: () => ({
      settings: {
        get: () => "sidebar",
        set: async () => {}
      }
    }),
    getDocument: () => documentRef
  });

  const status = controller.ensureLauncherUi();
  const snapshot = controller.getLauncherStatusSnapshot();

  assert.equal(status.sidebarLauncher, true);
  assert.equal(tabA.children.filter((child) => child.classList.contains("po-sidebar-launcher")).length, 1);
  assert.equal(tabB.children.filter((child) => child.classList.contains("po-sidebar-launcher")).length, 1);
  assert.equal(snapshot.sidebarLauncherCount, 2);
}

process.stdout.write("audio launcher controls validation passed\n");
