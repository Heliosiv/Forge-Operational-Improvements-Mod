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

{
  const { controller } = createController();
  const markup = controller.buildSidebarLauncherAudioMarkup();

  assert.match(markup, /Audio Deck/);
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

process.stdout.write("audio launcher controls validation passed\n");
