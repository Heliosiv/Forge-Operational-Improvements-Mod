export function registerHookModule({
  HooksRef = globalThis.Hooks,
  module
} = {}) {
  if (typeof HooksRef?.on !== "function") return;

  const registrations = Array.isArray(module?.registrations) ? module.registrations : [];
  for (const registration of registrations) {
    if (!Array.isArray(registration) || registration.length < 2) continue;
    const eventName = String(registration[0] ?? "").trim();
    const handler = registration[1];
    if (!eventName || typeof handler !== "function") continue;
    HooksRef.on(eventName, handler);
  }
}

export function createPartyOpsHookRegistrar({
  HooksRef = globalThis.Hooks,
  getHookModules
} = {}) {
  let hooksRegistered = false;

  return function registerPartyOpsHooks() {
    if (hooksRegistered) return;
    hooksRegistered = true;

    const hookModules = typeof getHookModules === "function" ? getHookModules() : [];
    for (const hookModule of hookModules) {
      registerHookModule({ HooksRef, module: hookModule });
    }
  };
}

function buildTimeHookModule({
  notifyDailyInjuryReminders,
  handleAutomaticOperationalUpkeepTick,
  handleAutomaticMerchantAutoRefreshTick,
  gameRef
} = {}) {
  return {
    id: "time",
    registrations: [
      ["updateWorldTime", async () => {
        await notifyDailyInjuryReminders?.();
        if (!gameRef?.user?.isGM) return;
        await handleAutomaticOperationalUpkeepTick?.();
        await handleAutomaticMerchantAutoRefreshTick?.();
      }]
    ]
  };
}

function buildChatHookModule({
  moduleId,
  autoUpkeepPromptStates,
  handleAutomaticUpkeepChatAction
} = {}) {
  return {
    id: "chat",
    registrations: [
      ["renderChatMessage", (message, html) => {
        const promptState = String(message?.flags?.[moduleId]?.autoUpkeepPrompt?.state ?? "").trim().toLowerCase();
        if (!Object.values(autoUpkeepPromptStates ?? {}).includes(promptState)) return;
        if (promptState === autoUpkeepPromptStates?.IDLE) return;

        const root = html?.[0] ?? html;
        if (!root?.querySelectorAll) return;

        for (const button of root.querySelectorAll("[data-po-chat-action]")) {
          button.addEventListener("click", async (event) => {
            event.preventDefault();
            await handleAutomaticUpkeepChatAction?.(button.dataset.poChatAction, message);
          });
        }
      }]
    ]
  };
}

function buildUserPresenceHookModule({
  schedulePendingSopNoteSync,
  gameRef
} = {}) {
  return {
    id: "user-presence",
    registrations: [
      ["updateUser", (user, changed) => {
        if (!user || !changed || gameRef?.user?.isGM) return;
        if (!Object.prototype.hasOwnProperty.call(changed, "active")) return;
        if (!user.isGM || !user.active) return;
        schedulePendingSopNoteSync?.("gm-activated");
      }]
    ]
  };
}

function buildTokenHookModule({
  applyAutoInventoryToUnlinkedToken,
  environmentMoveOriginByToken,
  maybePromptEnvironmentMovementCheck
} = {}) {
  return {
    id: "tokens",
    registrations: [
      ["createToken", async (tokenDoc, options, userId) => {
        await applyAutoInventoryToUnlinkedToken?.(tokenDoc, options ?? {}, userId ?? null);
      }],
      ["preUpdateToken", (tokenDoc, changed, options) => {
        if (options?.poEnvironmentClamp) return;
        if (!changed || (changed.x === undefined && changed.y === undefined)) return;

        environmentMoveOriginByToken?.set?.(tokenDoc.id, {
          x: Number(tokenDoc.x ?? 0),
          y: Number(tokenDoc.y ?? 0)
        });
      }],
      ["updateToken", async (tokenDoc, changed, options) => {
        await maybePromptEnvironmentMovementCheck?.(tokenDoc, changed, options ?? {});
      }]
    ]
  };
}

function buildInventoryHookModule({
  hasInventoryDelta,
  queueInventoryRefresh,
  foundryRef
} = {}) {
  return {
    id: "inventory",
    registrations: [
      ["updateActor", (actor, changed) => {
        if (!hasInventoryDelta?.(changed)) return;
        queueInventoryRefresh?.(actor, "inventory-update-actor");
      }],
      ["createItem", (item) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        queueInventoryRefresh?.(actor, "inventory-create-item");
      }],
      ["updateItem", (item, changed) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        if (!changed || typeof changed !== "object") return;

        const touchesQuantity = foundryRef?.utils?.getProperty?.(changed, "system.quantity") !== undefined;
        const touchesContainer = foundryRef?.utils?.getProperty?.(changed, "system.container") !== undefined;
        const touchesEquipped = foundryRef?.utils?.getProperty?.(changed, "system.equipped") !== undefined;
        const touchesWeight = foundryRef?.utils?.getProperty?.(changed, "system.weight") !== undefined;
        const touchesName = Object.prototype.hasOwnProperty.call(changed, "name");

        if (!touchesQuantity && !touchesContainer && !touchesEquipped && !touchesWeight && !touchesName) return;
        queueInventoryRefresh?.(actor, "inventory-update-item");
      }],
      ["deleteItem", (item) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        queueInventoryRefresh?.(actor, "inventory-delete-item");
      }]
    ]
  };
}

function buildSettingHookModule({
  moduleId,
  settings,
  consumeSuppressedSettingRefresh,
  refreshOpenApps,
  getRefreshScopesForSettingKey,
  scheduleIntegrationSync,
  gameRef
} = {}) {
  const restKey = `${moduleId}.${settings?.REST_STATE}`;
  const marchKey = `${moduleId}.${settings?.MARCH_STATE}`;
  const actKey = `${moduleId}.${settings?.REST_ACTIVITIES}`;
  const opsKey = `${moduleId}.${settings?.OPS_LEDGER}`;
  const injuryKey = `${moduleId}.${settings?.INJURY_RECOVERY}`;
  const lootSourceKey = `${moduleId}.${settings?.LOOT_SOURCE_CONFIG}`;
  const integrationModeKey = `${moduleId}.${settings?.INTEGRATION_MODE}`;
  const journalVisibilityKey = `${moduleId}.${settings?.JOURNAL_ENTRY_VISIBILITY}`;
  const sessionSummaryRangeKey = `${moduleId}.${settings?.SESSION_SUMMARY_RANGE}`;
  const refreshKeys = new Set([
    restKey,
    marchKey,
    actKey,
    opsKey,
    injuryKey,
    lootSourceKey,
    journalVisibilityKey,
    sessionSummaryRangeKey
  ]);
  const integrationSyncKeys = new Set([restKey, marchKey, opsKey, injuryKey, integrationModeKey]);

  return {
    id: "settings",
    registrations: [
      ["updateSetting", (setting) => {
        const settingKey = String(setting?.key ?? "").trim();
        if (!settingKey) return;
        if (consumeSuppressedSettingRefresh?.(settingKey)) return;
        if (refreshKeys.has(settingKey)) {
          refreshOpenApps?.({ scopes: getRefreshScopesForSettingKey?.(settingKey) });
        }
        if (gameRef?.user?.isGM && integrationSyncKeys.has(settingKey)) {
          scheduleIntegrationSync?.("update-setting");
        }
      }]
    ]
  };
}

function buildIntegrationHookModule({
  scheduleIntegrationSync,
  bindFolderOwnershipProxySubmit,
  gameRef
} = {}) {
  return {
    id: "integration",
    registrations: [
      ["canvasReady", () => {
        if (!gameRef?.user?.isGM) return;
        scheduleIntegrationSync?.("canvas-ready");
      }],
      ["renderDocumentOwnershipConfig", (app, html) => {
        bindFolderOwnershipProxySubmit?.(app, html);
      }]
    ]
  };
}

function buildAudioPlaybackHookModule({
  isManagedAudioMixPlaylist,
  queueManagedAudioMixPlaybackResync,
  gameRef
} = {}) {
  return {
    id: "audio-playback",
    registrations: [
      ["updatePlaylistSound", (sound, changed) => {
        const playlist = sound?.parent ?? null;
        if (!gameRef?.user?.isGM || !isManagedAudioMixPlaylist?.(playlist)) return;
        if (!changed || typeof changed !== "object") return;

        const touchesPlayback = Object.prototype.hasOwnProperty.call(changed, "playing")
          || Object.prototype.hasOwnProperty.call(changed, "volume")
          || Object.prototype.hasOwnProperty.call(changed, "fade")
          || Object.prototype.hasOwnProperty.call(changed, "channel")
          || Object.prototype.hasOwnProperty.call(changed, "path");
        if (!touchesPlayback) return;

        queueManagedAudioMixPlaybackResync?.(80, { playlist, refresh: true });
      }],
      ["updatePlaylist", (playlist, changed) => {
        if (!gameRef?.user?.isGM || !isManagedAudioMixPlaylist?.(playlist)) return;
        if (!changed || typeof changed !== "object") return;

        const touchesPlayback = Object.prototype.hasOwnProperty.call(changed, "playing")
          || Object.prototype.hasOwnProperty.call(changed, "mode")
          || Object.prototype.hasOwnProperty.call(changed, "channel")
          || Object.prototype.hasOwnProperty.call(changed, "fade");
        if (!touchesPlayback) return;

        queueManagedAudioMixPlaybackResync?.(80, { playlist, refresh: true });
      }]
    ]
  };
}

export function buildPartyOpsRuntimeHookModules({
  moduleId,
  settings,
  autoUpkeepPromptStates,
  notifyDailyInjuryReminders,
  handleAutomaticOperationalUpkeepTick,
  handleAutomaticMerchantAutoRefreshTick,
  handleAutomaticUpkeepChatAction,
  schedulePendingSopNoteSync,
  applyAutoInventoryToUnlinkedToken,
  environmentMoveOriginByToken,
  maybePromptEnvironmentMovementCheck,
  hasInventoryDelta,
  queueInventoryRefresh,
  consumeSuppressedSettingRefresh,
  refreshOpenApps,
  getRefreshScopesForSettingKey,
  scheduleIntegrationSync,
  bindFolderOwnershipProxySubmit,
  isManagedAudioMixPlaylist,
  queueManagedAudioMixPlaybackResync,
  gameRef = globalThis.game,
  foundryRef = globalThis.foundry
} = {}) {
  return [
    buildTimeHookModule({
      notifyDailyInjuryReminders,
      handleAutomaticOperationalUpkeepTick,
      handleAutomaticMerchantAutoRefreshTick,
      gameRef
    }),
    buildChatHookModule({
      moduleId,
      autoUpkeepPromptStates,
      handleAutomaticUpkeepChatAction
    }),
    buildUserPresenceHookModule({
      schedulePendingSopNoteSync,
      gameRef
    }),
    buildTokenHookModule({
      applyAutoInventoryToUnlinkedToken,
      environmentMoveOriginByToken,
      maybePromptEnvironmentMovementCheck
    }),
    buildInventoryHookModule({
      hasInventoryDelta,
      queueInventoryRefresh,
      foundryRef
    }),
    buildSettingHookModule({
      moduleId,
      settings,
      consumeSuppressedSettingRefresh,
      refreshOpenApps,
      getRefreshScopesForSettingKey,
      scheduleIntegrationSync,
      gameRef
    }),
    buildIntegrationHookModule({
      scheduleIntegrationSync,
      bindFolderOwnershipProxySubmit,
      gameRef
    }),
    buildAudioPlaybackHookModule({
      isManagedAudioMixPlaylist,
      queueManagedAudioMixPlaybackResync,
      gameRef
    })
  ];
}
