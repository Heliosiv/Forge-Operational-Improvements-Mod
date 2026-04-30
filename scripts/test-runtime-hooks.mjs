import assert from "node:assert/strict";

import { createFeatureRegistrar } from "./core/feature-registry.js";
import {
  buildPartyOpsRuntimeHookModules,
  createPartyOpsHookRegistrar,
  registerHookModule
} from "./hooks/runtime-hooks.js";

{
  const registrations = [];

  registerHookModule({
    HooksRef: {
      on(eventName, handler) {
        registrations.push({ eventName, handler });
      }
    },
    module: {
      registrations: [
        ["ready", () => {}],
        ["", () => {}],
        ["init", null]
      ]
    }
  });

  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].eventName, "ready");
}

{
  const seen = [];
  const registerFeatures = createFeatureRegistrar({
    features: [
      {
        register() {
          seen.push("rest");
        }
      },
      {},
      {
        register() {
          seen.push("march");
        }
      }
    ]
  });

  registerFeatures();
  assert.deepEqual(seen, ["rest", "march"]);
}

{
  const registrations = [];
  const registerHooks = createPartyOpsHookRegistrar({
    HooksRef: {
      on(eventName, handler) {
        registrations.push({ eventName, handler });
      }
    },
    getHookModules() {
      return [{ registrations: [["ready", () => {}]] }, { registrations: [["init", () => {}]] }];
    }
  });

  registerHooks();
  registerHooks();

  assert.deepEqual(
    registrations.map((entry) => entry.eventName),
    ["ready", "init"]
  );
}

{
  const refreshes = [];
  const integrationReasons = [];
  const audioResyncs = [];
  const pendingSyncReasons = [];
  const upkeepActions = [];
  const timeActions = [];
  const perfEvents = [];
  const environmentMoves = new Map();

  const modules = buildPartyOpsRuntimeHookModules({
    moduleId: "party-operations",
    settings: {
      REST_STATE: "restWatchState",
      MARCH_STATE: "marchingOrderState",
      REST_ACTIVITIES: "restActivities",
      OPS_LEDGER: "operationsLedger",
      INJURY_RECOVERY: "injuryRecoveryState",
      LOOT_SOURCE_CONFIG: "lootSourceConfig",
      INTEGRATION_MODE: "integrationMode",
      JOURNAL_ENTRY_VISIBILITY: "journalVisibility",
      SESSION_SUMMARY_RANGE: "sessionSummaryRange"
    },
    autoUpkeepPromptStates: {
      IDLE: "idle",
      PENDING: "pending"
    },
    notifyDailyInjuryReminders() {},
    handleAutomaticOperationalUpkeepTick() {
      timeActions.push("upkeep");
    },
    handleAutomaticMerchantAutoRefreshTick() {
      timeActions.push("merchants");
    },
    handleAutomaticCalendarWeatherTick() {
      timeActions.push("weather");
    },
    handleAutomaticUpkeepChatAction(action, message) {
      upkeepActions.push({ action, message });
    },
    schedulePendingSopNoteSync(reason) {
      pendingSyncReasons.push(reason);
    },
    applyAutoInventoryToUnlinkedToken() {},
    environmentMoveOriginByToken: environmentMoves,
    maybePromptEnvironmentMovementCheck() {},
    hasInventoryDelta() {
      return true;
    },
    queueInventoryRefresh() {},
    consumeSuppressedSettingRefresh(settingKey) {
      return settingKey === "party-operations.ignored";
    },
    refreshOpenApps(payload) {
      refreshes.push(payload);
    },
    getRefreshScopesForSettingKey(settingKey) {
      return [`scope:${settingKey}`];
    },
    scheduleIntegrationSync(reason) {
      integrationReasons.push(reason);
    },
    bindFolderOwnershipProxySubmit() {},
    isManagedAudioMixPlaylist(playlist) {
      return playlist?.id === "playlist-1";
    },
    queueManagedAudioMixPlaybackResync(delayMs, payload) {
      audioResyncs.push({ delayMs, payload });
    },
    perfTracker: {
      increment(metricName, value, meta) {
        perfEvents.push({ metricName, value, meta });
      },
      record(metricName, value, meta) {
        perfEvents.push({ metricName, value, meta, type: "record" });
      }
    },
    gameRef: {
      user: {
        isGM: false
      }
    },
    foundryRef: {
      utils: {
        getProperty(target, path) {
          const segments = String(path).split(".");
          let current = target;
          for (const segment of segments) {
            if (current == null || !Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
            current = current[segment];
          }
          return current;
        }
      }
    }
  });

  assert.equal(modules.length, 10);

  const timeHandler = modules.find((module) => module.id === "time").registrations[0][1];
  await timeHandler();
  assert.deepEqual(timeActions, [], "Non-GM clients should not run automatic GM time ticks");

  const settingsHandler = modules.find((module) => module.id === "settings").registrations[0][1];
  settingsHandler({ key: "party-operations.restWatchState" });
  settingsHandler({ key: "party-operations.integrationMode" });
  settingsHandler({ key: "party-operations.ignored" });

  assert.deepEqual(refreshes, [{ scopes: ["scope:party-operations.restWatchState"] }]);
  assert.deepEqual(integrationReasons, []);

  const audioHandler = modules.find((module) => module.id === "audio-playback").registrations[0][1];
  audioHandler({ parent: { id: "playlist-1" } }, { volume: 0.5 });
  assert.deepEqual(audioResyncs, [
    {
      delayMs: 80,
      payload: {
        playlist: { id: "playlist-1" },
        refresh: true
      }
    }
  ]);
  assert.ok(
    perfEvents.some(
      (entry) => entry.metricName === "setting.updated" && entry.meta?.settingKey === "party-operations.restWatchState"
    )
  );
  assert.ok(perfEvents.some((entry) => entry.metricName === "refresh-open-apps"));
  assert.ok(perfEvents.some((entry) => entry.metricName === "audio-playback-resync"));

  const userPresenceHandler = modules.find((module) => module.id === "user-presence").registrations[0][1];
  userPresenceHandler({ isGM: true, active: true }, { active: true });
  assert.deepEqual(pendingSyncReasons, ["gm-activated"]);

  const chatHandler = modules.find((module) => module.id === "chat").registrations[0][1];
  const clickListeners = [];
  chatHandler(
    {
      flags: {
        "party-operations": {
          autoUpkeepPrompt: {
            state: "pending"
          }
        }
      }
    },
    {
      querySelectorAll() {
        return [
          {
            dataset: { poChatAction: "approve" },
            addEventListener(eventName, handler) {
              clickListeners.push({ eventName, handler });
            }
          }
        ];
      }
    }
  );
  assert.equal(clickListeners.length, 1);
  await clickListeners[0].handler({ preventDefault() {} });
  assert.deepEqual(upkeepActions, [
    {
      action: "approve",
      message: {
        flags: {
          "party-operations": {
            autoUpkeepPrompt: {
              state: "pending"
            }
          }
        }
      }
    }
  ]);

  const tokenPreUpdateHandler = modules.find((module) => module.id === "tokens").registrations[1][1];
  tokenPreUpdateHandler({ id: "token-1", x: 3, y: 9 }, { x: 5 }, {});
  assert.deepEqual(environmentMoves.get("token-1"), { x: 3, y: 9 });

  const lootRecentRollsModule = modules.find((module) => module.id === "loot-recent-rolls-cache");
  assert.equal(lootRecentRollsModule.registrations[0][0], "canvasReady");
}

await (async () => {
  const integrationReasons = [];
  const perfEvents = [];

  const modules = buildPartyOpsRuntimeHookModules({
    moduleId: "party-operations",
    settings: {
      REST_STATE: "restWatchState",
      MARCH_STATE: "marchingOrderState",
      REST_ACTIVITIES: "restActivities",
      OPS_LEDGER: "operationsLedger",
      INJURY_RECOVERY: "injuryRecoveryState",
      LOOT_SOURCE_CONFIG: "lootSourceConfig",
      INTEGRATION_MODE: "integrationMode",
      JOURNAL_ENTRY_VISIBILITY: "journalVisibility",
      SESSION_SUMMARY_RANGE: "sessionSummaryRange"
    },
    consumeSuppressedSettingRefresh() {
      return false;
    },
    refreshOpenApps() {},
    getRefreshScopesForSettingKey() {
      return [];
    },
    scheduleIntegrationSync(reason) {
      integrationReasons.push(reason);
    },
    perfTracker: {
      increment(metricName, value, meta) {
        perfEvents.push({ metricName, value, meta });
      }
    },
    gameRef: {
      user: {
        isGM: true
      }
    }
  });

  const settingsHandler = modules.find((module) => module.id === "settings").registrations[0][1];
  settingsHandler({ key: "party-operations.integrationMode" });

  const integrationHandler = modules.find((module) => module.id === "integration").registrations[0][1];
  await integrationHandler();

  assert.deepEqual(integrationReasons, ["update-setting", "canvas-ready"]);
  assert.ok(
    perfEvents.some((entry) => entry.metricName === "integration-sync" && entry.meta?.reason === "canvas-ready")
  );
})();

{
  const timeActions = [];
  const modules = buildPartyOpsRuntimeHookModules({
    notifyDailyInjuryReminders() {
      timeActions.push("injury");
    },
    handleAutomaticOperationalUpkeepTick() {
      timeActions.push("upkeep");
    },
    handleAutomaticMerchantAutoRefreshTick() {
      timeActions.push("merchants");
    },
    handleAutomaticCalendarWeatherTick() {
      timeActions.push("weather");
    },
    gameRef: {
      user: {
        isGM: true
      }
    }
  });

  const timeHandler = modules.find((module) => module.id === "time").registrations[0][1];
  await timeHandler();
  assert.deepEqual(timeActions, ["injury", "upkeep", "merchants", "weather"]);
}

{
  const audioResyncs = [];

  const modules = buildPartyOpsRuntimeHookModules({
    isManagedAudioMixPlaylist(playlist) {
      return playlist?.id === "playlist-1";
    },
    queueManagedAudioMixPlaybackResync(delayMs, payload) {
      audioResyncs.push({ delayMs, payload });
    },
    gameRef: {
      user: {
        isGM: true
      }
    }
  });

  const audioHandler = modules.find((module) => module.id === "audio-playback").registrations[0][1];
  audioHandler({ parent: { id: "playlist-1" } }, { volume: 0.5 });
  audioHandler({ parent: { id: "playlist-2" } }, { volume: 0.5 });

  assert.deepEqual(audioResyncs, [
    {
      delayMs: 80,
      payload: {
        playlist: { id: "playlist-1" },
        refresh: true
      }
    }
  ]);
}
