export function registerPartyOpsDataSettings({
  moduleId,
  settings,
  buildDefaultRestWatchState,
  buildDefaultMarchingOrderState,
  buildDefaultActivityState,
  buildDefaultOperationsLedger,
  buildDefaultInjuryRecoveryState,
  buildDefaultLootSourceConfig
} = {}) {
  game.settings.register(moduleId, settings.REST_STATE, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultRestWatchState()
  });

  game.settings.register(moduleId, settings.REST_COMMITTED, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultRestWatchState()
  });

  game.settings.register(moduleId, settings.MARCH_STATE, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultMarchingOrderState()
  });

  game.settings.register(moduleId, settings.MARCH_COMMITTED, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultMarchingOrderState()
  });

  game.settings.register(moduleId, settings.REST_ACTIVITIES, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultActivityState()
  });

  game.settings.register(moduleId, settings.OPS_LEDGER, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultOperationsLedger()
  });

  game.settings.register(moduleId, settings.INJURY_RECOVERY, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultInjuryRecoveryState()
  });

  game.settings.register(moduleId, settings.INJURY_REMINDER_DAY, {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(moduleId, settings.LOOT_SOURCE_CONFIG, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultLootSourceConfig()
  });
}
