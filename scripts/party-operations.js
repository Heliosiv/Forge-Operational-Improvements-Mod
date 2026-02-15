const DEBUG_LOG = false;
if (DEBUG_LOG) console.log("party-operations: script loaded");

const MODULE_ID = "party-operations";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const SETTINGS = {
  REST_STATE: "restWatchState",
  REST_COMMITTED: "restWatchStateLastCommitted",
  MARCH_STATE: "marchingOrderState",
  MARCH_COMMITTED: "marchingOrderStateLastCommitted",
  REST_ACTIVITIES: "restActivities",
  OPS_LEDGER: "operationsLedger",
  GATHER_ROLL_MODE: "gatherRollMode",
  INJURY_RECOVERY: "injuryRecoveryState",
  INJURY_REMINDER_DAY: "injuryReminderDay",
  INTEGRATION_MODE: "integrationMode",
  SESSION_AUTOPILOT_SNAPSHOT: "sessionAutopilotSnapshot",
  FLOATING_LAUNCHER_POS: "floatingLauncherPos",
  FLOATING_LAUNCHER_LOCKED: "floatingLauncherLocked",
  FLOATING_LAUNCHER_RESET: "floatingLauncherReset",
  PLAYER_AUTO_OPEN_REST: "playerAutoOpenRest"
};

const SOCKET_CHANNEL = `module.${MODULE_ID}`;

const OPEN_SHARE_TIMEOUT_MS = 5000;
const openShareState = new Map();
let restWatchAppInstance = null;
let marchingOrderAppInstance = null;
let restWatchPlayerAppInstance = null;
const pendingScrollRestore = new WeakMap();
const pendingUiRestore = new WeakMap();
const pendingWindowRestore = new WeakMap();
const suppressedSettingRefreshKeys = new Map();
let refreshOpenAppsQueued = false;
let integrationSyncTimeoutId = null;

const INTEGRATION_MODES = {
  AUTO: "auto",
  OFF: "off",
  FLAGS: "flags",
  DAE: "dae"
};

const INTEGRATION_EFFECT_ORIGIN = `module.${MODULE_ID}`;
const INTEGRATION_EFFECT_NAME = "Party Operations Sync";
const INJURY_EFFECT_ORIGIN = `module.${MODULE_ID}.injury`;
const INJURY_EFFECT_NAME_PREFIX = "Injury:";
const ENVIRONMENT_EFFECT_ORIGIN = `module.${MODULE_ID}.environment`;
const ENVIRONMENT_EFFECT_NAME_PREFIX = "Environment:";

const SCROLL_STATE_SELECTORS = [
  ".po-body",
  ".po-window",
  ".window-content",
  ".po-content",
  ".po-grid",
  ".po-cards",
  ".po-ranks",
  ".po-gm-panel"
];

const RESOURCE_TRACK_KEYS = ["food", "water", "torches"];
const SOP_KEYS = ["campSetup", "watchRotation", "dungeonBreach", "urbanEntry", "prisonerHandling", "retreatProtocol"];
const NON_GM_READONLY_ACTIONS = new Set([
  "set-role",
  "clear-role",
  "toggle-sop",
  "set-resource",
  "set-comm-toggle",
  "set-comm-text",
  "set-recon-field",
  "run-recon-check",
  "set-reputation-score",
  "adjust-reputation-score",
  "set-reputation-note",
  "log-reputation-note",
  "load-reputation-note-log",
  "set-reputation-label",
  "add-reputation-faction",
  "remove-reputation-faction",
  "set-base-ops-config",
  "upsert-base-site",
  "clear-base-site",
  "open-base-site-storage",
  "set-injury-config",
  "upsert-injury",
  "roll-injury-table",
  "set-injury-result",
  "stabilize-injury",
  "clear-injury",
  "apply-recovery-cycle",
  "set-party-health-modifier",
  "set-party-health-custom-field",
  "set-party-health-sync-non-party",
  "add-party-health-custom",
  "remove-party-health-custom",
  "remove-active-sync-effect",
  "archive-active-sync-effect",
  "restore-archived-sync-effect",
  "remove-archived-sync-effect",
  "set-archived-sync-field",
  "set-active-sync-effects-tab",
  "set-environment-preset",
  "set-environment-dc",
  "set-environment-note",
  "set-environment-successive",
  "set-environment-sync-non-party",
  "reset-environment-successive-defaults",
  "toggle-environment-actor",
  "add-environment-log",
  "edit-environment-log",
  "remove-environment-log",
  "clear-environment-effects",
  "show-gm-logs-manager",
  "edit-global-log",
  "remove-global-log",
  "gm-quick-add-faction",
  "gm-quick-add-modifier",
  "gm-quick-submit-faction",
  "gm-quick-submit-modifier",
  "gm-quick-sync-integrations",
  "gm-quick-log-weather",
  "gm-quick-session-autopilot",
  "gm-quick-undo-autopilot",
  "gm-quick-submit-weather",
  "gm-quick-weather-select",
  "gm-quick-weather-set",
  "gm-quick-weather-add-dae",
  "gm-quick-weather-remove-dae",
  "gm-quick-weather-save-preset",
  "gm-quick-weather-delete-preset"
]);
const UPKEEP_DUSK_MINUTES = 20 * 60;
const ENVIRONMENT_MOVE_PROMPT_COOLDOWN_MS = 6000;
const environmentMovePromptByActor = new Map();
const environmentMoveOriginByToken = new Map();

const ENVIRONMENT_PRESETS = [
  {
    key: "none",
    label: "None",
    description: "No active environmental penalty.",
    icon: "icons/svg/sun.svg",
    movementCheck: false,
    checkType: "skill",
    checkKey: "",
    checkLabel: "",
    effectChanges: []
  },
  {
    key: "slippery-surface",
    label: "Slippery Surface",
    description: "Ice, wet stone, blood-slick floors, or algae force balance control.",
    icon: "icons/svg/falling.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "acr",
    checkLabel: "Acrobatics",
    defaultDc: 13,
    failStatusId: "prone",
    failBy5SlideFeet: 5,
    effectChanges: [{ key: "system.attributes.movement.walk", value: "-10" }]
  },
  {
    key: "unstable-footing",
    label: "Unstable Footing",
    description: "Loose gravel, rubble, corpses, and shifting sand punish hard movement.",
    icon: "icons/svg/hazard.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "dex",
    checkLabel: "Dexterity Save",
    defaultDc: 13,
    failSpeedZeroTurns: 1,
    failBy5StatusId: "prone",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "extreme-cold",
    label: "Extreme Cold",
    description: "Freezing exposure tests endurance and shelter discipline.",
    icon: "icons/svg/snowflake.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    defaultDc: 15,
    failExhaustion: 1,
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "extreme-heat",
    label: "Extreme Heat",
    description: "Heat stress drains stamina and worsens resource pressure.",
    icon: "icons/svg/fire.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    defaultDc: 14,
    failExhaustion: 1,
    failBy5DamageFormula: "1d6",
    failBy5DamageType: "fire",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "heavy-obscurement",
    label: "Heavy Obscurement",
    description: "Thick fog, smoke, or magical darkness blinds line-of-sight engagement.",
    icon: "icons/svg/blind.svg",
    movementCheck: false,
    checkType: "skill",
    checkKey: "prc",
    checkLabel: "Perception",
    alwaysStatusId: "blinded",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-5" }]
  },
  {
    key: "necrotic-saturation",
    label: "Necrotic Saturation",
    description: "Blighted ritual zones erode flesh and vitality.",
    icon: "icons/svg/skull.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    defaultDc: 14,
    failDamageFormula: "1d6",
    failDamageType: "necrotic",
    failBy5MaxHpReductionFormula: "1d6",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "high-wind",
    label: "High Wind",
    description: "Gale force winds disrupt ranged pressure and force balance saves.",
    icon: "icons/svg/windmill.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "str",
    checkLabel: "Strength Save",
    defaultDc: 13,
    failSlideFeet: 5,
    effectChanges: [
      { key: "system.skills.prc.bonuses.check", value: "-1" },
      { key: "system.bonuses.rwak.attack", value: "-2" }
    ]
  },
  {
    key: "shifting-ground",
    label: "Shifting Ground",
    description: "Quicksand or moving stone catches and restrains movement.",
    icon: "icons/svg/swirl.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    defaultDc: 14,
    failStatusId: "restrained",
    effectChanges: [{ key: "system.attributes.movement.walk", value: "-10" }]
  },
  {
    key: "psychic-pressure-field",
    label: "Psychic Pressure Field",
    description: "Fractured timeline pressure and sigil echoes fracture resolve.",
    icon: "icons/svg/terror.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "wis",
    checkLabel: "Wisdom Save",
    defaultDc: 15,
    failStatusId: "frightened",
    failBy5StatusId: "incapacitated",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "corrosive-atmosphere",
    label: "Corrosive Atmosphere",
    description: "Acid mist and caustic vapors burn flesh and degrade gear.",
    icon: "icons/svg/acid.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    defaultDc: 13,
    failDamageFormula: "1d4",
    failDamageType: "acid",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  }
];

function isFormActionElement(element) {
  if (!element?.tagName) return false;
  const tag = String(element.tagName).toUpperCase();
  return tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
}

function getAppRootElement(appOrElement) {
  if (!appOrElement) return null;
  const candidate = appOrElement?.element ?? appOrElement;
  if (candidate?.querySelector) return candidate;
  if (candidate?.[0]?.querySelector) return candidate[0];
  return null;
}

function ensureOperationalResourceConfig(resources) {
  if (!resources) return;
  const legacyFoodPool = Number(resources.partyRations);
  const configuredFoodPool = Number(resources.partyFoodRations);
  const configuredWaterPool = Number(resources.partyWaterRations);
  resources.partyFoodRations = Number.isFinite(configuredFoodPool)
    ? Math.max(0, Math.floor(configuredFoodPool))
    : (Number.isFinite(legacyFoodPool) ? Math.max(0, Math.floor(legacyFoodPool)) : 0);
  resources.partyWaterRations = Number.isFinite(configuredWaterPool) ? Math.max(0, Math.floor(configuredWaterPool)) : 0;
  if (Object.prototype.hasOwnProperty.call(resources, "partyRations")) delete resources.partyRations;
  const upkeepTimestamp = Number(resources.upkeepLastAppliedTs);
  resources.upkeepLastAppliedTs = Number.isFinite(upkeepTimestamp) ? upkeepTimestamp : null;
  if (!resources.itemSelections) resources.itemSelections = {};
  for (const key of RESOURCE_TRACK_KEYS) {
    if (!resources.itemSelections[key]) resources.itemSelections[key] = { actorId: "", itemId: "" };
    if (typeof resources.itemSelections[key].actorId !== "string") resources.itemSelections[key].actorId = "";
    if (typeof resources.itemSelections[key].itemId !== "string") resources.itemSelections[key].itemId = "";
  }
  if (!resources.gather) resources.gather = {};
  if (!resources.gather.weatherMods) resources.gather.weatherMods = {};
  if (typeof resources.gather.foodCoveredNextUpkeep !== "boolean") resources.gather.foodCoveredNextUpkeep = false;
  const foodCoverageDueKey = Number(resources.gather.foodCoverageDueKey);
  resources.gather.foodCoverageDueKey = Number.isFinite(foodCoverageDueKey) ? foodCoverageDueKey : null;
  const waterCoverageDueKey = Number(resources.gather.waterCoverageDueKey);
  resources.gather.waterCoverageDueKey = Number.isFinite(waterCoverageDueKey) ? waterCoverageDueKey : null;
  const defaultWeatherMods = {
    clear: 0,
    "light-rain": 2,
    "heavy-rain": 5,
    wind: 2,
    fog: 3,
    extreme: 5
  };
  for (const [key, value] of Object.entries(defaultWeatherMods)) {
    const current = Number(resources.gather.weatherMods[key]);
    resources.gather.weatherMods[key] = Number.isFinite(current) ? current : value;
  }
  if (!resources.upkeep) resources.upkeep = {};
}

function ensurePartyOperationsClass(appOrElement) {
  const root = getAppRootElement(appOrElement);
  if (!root?.classList) return;
  root.classList.add("party-operations");
}

function applyNonGmOperationsReadonly(appOrElement) {
  if (game.user?.isGM) return;
  const root = getAppRootElement(appOrElement);
  if (!root) return;
  const operationsWindow = root.querySelector(".po-window[data-main-tab='operations']");
  if (!operationsWindow) return;

  operationsWindow.querySelectorAll("[data-action]").forEach((element) => {
    const action = String(element?.dataset?.action ?? "").trim();
    if (!NON_GM_READONLY_ACTIONS.has(action)) return;
    if ("disabled" in element) element.disabled = true;
    element.setAttribute("aria-disabled", "true");
    element.dataset.poReadonly = "true";
    const existingTitle = String(element.getAttribute("title") ?? "").trim();
    if (!existingTitle.includes("GM only")) {
      const suffix = existingTitle ? ` ${existingTitle}` : "";
      element.setAttribute("title", `GM only.${suffix}`.trim());
    }
  });

  const selector = [
    ".po-base-site-editor input",
    ".po-base-site-editor select",
    ".po-injury-editor input",
    ".po-injury-editor select",
    ".po-injury-editor textarea",
    ".po-reputation-gm-tools input[name='repFactionName']"
  ].join(", ");
  operationsWindow.querySelectorAll(selector).forEach((element) => {
    if ("disabled" in element) element.disabled = true;
    element.setAttribute("aria-disabled", "true");
    element.dataset.poReadonly = "true";
  });
}

function suppressNextSettingRefresh(fullSettingKey) {
  if (!fullSettingKey) return;
  const count = suppressedSettingRefreshKeys.get(fullSettingKey) ?? 0;
  suppressedSettingRefreshKeys.set(fullSettingKey, count + 1);
}

function consumeSuppressedSettingRefresh(fullSettingKey) {
  const count = suppressedSettingRefreshKeys.get(fullSettingKey) ?? 0;
  if (count <= 0) return false;
  if (count === 1) suppressedSettingRefreshKeys.delete(fullSettingKey);
  else suppressedSettingRefreshKeys.set(fullSettingKey, count - 1);
  return true;
}

function getIntegrationModeSetting() {
  return game.settings.get(MODULE_ID, SETTINGS.INTEGRATION_MODE) ?? INTEGRATION_MODES.AUTO;
}

function getGatherRollModeSetting() {
  return game.settings.get(MODULE_ID, SETTINGS.GATHER_ROLL_MODE) ?? "prefer-monks";
}

function isDaeAvailable() {
  return Boolean(game.modules.get("dae")?.active);
}

function resolveIntegrationMode() {
  const configured = getIntegrationModeSetting();
  if (configured === INTEGRATION_MODES.OFF) return INTEGRATION_MODES.OFF;
  if (configured === INTEGRATION_MODES.FLAGS) return INTEGRATION_MODES.FLAGS;
  if (configured === INTEGRATION_MODES.DAE) return isDaeAvailable() ? INTEGRATION_MODES.DAE : INTEGRATION_MODES.FLAGS;
  return isDaeAvailable() ? INTEGRATION_MODES.DAE : INTEGRATION_MODES.FLAGS;
}

function isTrackableCharacter(actor) {
  if (!actor) return false;
  return actor.type === "character" || actor.hasPlayerOwner;
}

function collectIntegrationActorIds() {
  const actorIds = new Set();

  const restState = getRestWatchState();
  for (const slot of restState.slots ?? []) {
    for (const entry of slot.entries ?? []) {
      if (entry?.actorId) actorIds.add(entry.actorId);
    }
    if (slot.actorId) actorIds.add(slot.actorId);
  }

  const marchState = getMarchingOrderState();
  for (const actorId of getOrderedMarchingActors(marchState)) {
    if (actorId) actorIds.add(actorId);
  }

  const ledger = getOperationsLedger();
  for (const actorId of Object.values(ledger.roles ?? {})) {
    if (actorId) actorIds.add(actorId);
  }

  const recovery = getInjuryRecoveryState();
  for (const actorId of Object.keys(recovery.injuries ?? {})) {
    if (actorId) actorIds.add(actorId);
  }

  for (const actor of getResourceSyncActors()) {
    if (actor?.id) actorIds.add(actor.id);
  }

  return Array.from(actorIds)
    .map((actorId) => game.actors.get(actorId))
    .filter((actor) => isTrackableCharacter(actor));
}

function buildIntegrationGlobalContext() {
  const restState = getRestWatchState();
  const marchState = getMarchingOrderState();
  const ledger = getOperationsLedger();
  const injuryRecovery = getInjuryRecoveryState();
  const operations = buildOperationsContext();
  const formation = normalizeMarchingFormation(marchState.formation ?? "default");
  const doctrineEffects = getDoctrineEffects(formation);
  const rankByActorId = {};
  for (const rank of ["front", "middle", "rear"]) {
    for (const actorId of marchState.ranks?.[rank] ?? []) {
      if (actorId && !rankByActorId[actorId]) rankByActorId[actorId] = rank;
    }
  }
  const watchSlotsByActorId = {};
  for (const slot of restState.slots ?? []) {
    for (const entry of slot.entries ?? []) {
      if (!entry?.actorId) continue;
      if (!watchSlotsByActorId[entry.actorId]) watchSlotsByActorId[entry.actorId] = [];
      watchSlotsByActorId[entry.actorId].push(slot.id);
    }
    if (slot.actorId) {
      if (!watchSlotsByActorId[slot.actorId]) watchSlotsByActorId[slot.actorId] = [];
      watchSlotsByActorId[slot.actorId].push(slot.id);
    }
  }
  const rolesByActorId = {};
  for (const [roleKey, actorId] of Object.entries(ledger.roles ?? {})) {
    if (!actorId) continue;
    if (!rolesByActorId[actorId]) rolesByActorId[actorId] = [];
    rolesByActorId[actorId].push(roleKey);
  }

  return {
    syncedAt: Date.now(),
    restState,
    marchState,
    ledger,
    injuryRecovery,
    operations,
    formation,
    doctrineEffects,
    rankByActorId,
    watchSlotsByActorId,
    rolesByActorId
  };
}

function buildActorIntegrationPayload(actorId, globalContext, options = {}) {
  const isNonParty = Boolean(options?.nonParty);
  const includeWorldGlobal = isNonParty ? options?.includeWorldGlobal !== false : false;
  const forceEnvironmentApply = Boolean(options?.forceEnvironmentApply);
  const injury = globalContext.injuryRecovery.injuries?.[actorId] ?? null;
  const roleKeys = globalContext.rolesByActorId[actorId] ?? [];
  const watchSlots = globalContext.watchSlotsByActorId[actorId] ?? [];
  const communicationReadiness = globalContext.operations.communication?.readiness ?? { ready: false, enabledCount: 0 };
  const reputationSummary = globalContext.operations.reputation?.summary ?? { hostileCount: 0, highStandingCount: 0 };
  const baseSummary = globalContext.operations.baseOperations ?? { maintenancePressure: 0, readiness: false, activeSites: 0 };
  const environment = globalContext.operations.environment ?? { presetKey: "none", movementDc: 12, appliedActorIds: [], preset: null };
  const environmentPreset = environment.preset ?? getEnvironmentPresetByKey(environment.presetKey);
  const environmentApplies = forceEnvironmentApply || (Array.isArray(environment.appliedActorIds) && environment.appliedActorIds.includes(actorId));
  const environmentCheck = getEnvironmentCheckMeta(environmentPreset);
  const summaryEffects = globalContext.operations.summary?.effects ?? {};
  const globalModifiers = isNonParty && includeWorldGlobal
    ? (summaryEffects.worldGlobalModifiers ?? {})
    : (summaryEffects.globalModifiers ?? {});
  const customDaeChanges = isNonParty
    ? (includeWorldGlobal
      ? (Array.isArray(summaryEffects.worldDaeChanges) ? summaryEffects.worldDaeChanges : [])
      : [])
    : (Array.isArray(summaryEffects.customDaeChanges) ? summaryEffects.customDaeChanges : []);

  return {
    syncedAt: globalContext.syncedAt,
    moduleVersion: game.modules.get(MODULE_ID)?.version ?? "unknown",
    operations: {
      prepEdge: Boolean(globalContext.operations.summary?.effects?.prepEdge),
      riskTier: globalContext.operations.summary?.effects?.riskTier ?? "moderate",
      roleCoverage: Number(globalContext.operations.summary?.roleCoverage ?? 0),
      roleTotal: Number(globalContext.operations.summary?.roleTotal ?? 0),
      activeSops: Number(globalContext.operations.summary?.activeSops ?? 0),
      sopTotal: Number(globalContext.operations.summary?.sopTotal ?? 0),
      communicationReady: Boolean(communicationReadiness.ready),
      communicationToggleCount: Number(communicationReadiness.enabledCount ?? 0),
      hostileFactions: Number(reputationSummary.hostileCount ?? 0),
      highStandingFactions: Number(reputationSummary.highStandingCount ?? 0),
      supplyPressure: Number(baseSummary.maintenancePressure ?? 0),
      supplyReadiness: Boolean(baseSummary.readiness),
      baseSites: Number(baseSummary.activeSites ?? 0),
      baseMaintenancePressure: Number(baseSummary.maintenancePressure ?? 0),
      baseReadiness: Boolean(baseSummary.readiness),
      minorInitiativeBonus: Number(globalModifiers.initiative ?? 0),
      minorAbilityCheckBonus: Number(globalModifiers.abilityChecks ?? 0),
      minorPerceptionBonus: Number(globalModifiers.perceptionChecks ?? 0),
      minorSavingThrowBonus: Number(globalModifiers.savingThrows ?? 0),
      customDaeChanges
    },
    doctrine: {
      formation: globalContext.formation,
      surprise: globalContext.doctrineEffects.surprise,
      ambush: globalContext.doctrineEffects.ambush
    },
    assignment: {
      watch: {
        assigned: watchSlots.length > 0,
        slots: watchSlots
      },
      marchingRank: globalContext.rankByActorId[actorId] ?? "unassigned",
      roles: roleKeys
    },
    injury: {
      active: Boolean(injury),
      name: String(injury?.injuryName ?? ""),
      effect: String(injury?.effect ?? ""),
      notes: String(injury?.notes ?? ""),
      stabilized: Boolean(injury?.stabilized),
      permanent: Boolean(injury?.permanent),
      severity: Number(injury?.severity ?? 0),
      recoveryDays: Number(injury?.recoveryDays ?? 0)
    },
    environment: {
      active: Boolean(environmentApplies && environmentPreset && environmentPreset.key !== "none"),
      presetKey: String(environmentPreset?.key ?? "none"),
      label: String(environmentPreset?.label ?? "None"),
      movementCheck: Boolean(environmentPreset?.movementCheck),
      checkType: environmentCheck.checkType,
      checkKey: environmentCheck.checkKey,
      checkSkill: environmentCheck.checkType === "skill" ? environmentCheck.checkKey : "",
      checkLabel: environmentCheck.checkLabel,
      movementDc: Math.max(1, Math.floor(Number(environment.movementDc ?? 12) || 12)),
      appliesToActor: Boolean(environmentApplies)
    },
    resources: {
      campfire: Boolean(globalContext.restState.campfire),
      foodDays: Number(globalContext.ledger.resources?.food ?? 0),
      waterDays: Number(globalContext.ledger.resources?.water ?? 0)
    }
  };
}

function getIntegrationEffect(actor) {
  return actor.effects.find((effect) => {
    if (effect.origin === INTEGRATION_EFFECT_ORIGIN) return true;
    if (effect.name === INTEGRATION_EFFECT_NAME && effect.getFlag(MODULE_ID, "integration") === true) return true;
    return false;
  });
}

function getInjuryStatusEffect(actor) {
  return actor.effects.find((effect) => {
    if (effect.origin === INJURY_EFFECT_ORIGIN) return true;
    if (effect.getFlag(MODULE_ID, "injuryStatus") === true) return true;
    return String(effect.name ?? "").startsWith(`${INJURY_EFFECT_NAME_PREFIX} `);
  });
}

function getEnvironmentStatusEffect(actor) {
  return actor.effects.find((effect) => {
    if (effect.origin === ENVIRONMENT_EFFECT_ORIGIN) return true;
    if (effect.getFlag(MODULE_ID, "environmentStatus") === true) return true;
    return String(effect.name ?? "").startsWith(`${ENVIRONMENT_EFFECT_NAME_PREFIX} `);
  });
}

function getEnvironmentPresetByKey(key) {
  return ENVIRONMENT_PRESETS.find((preset) => preset.key === key) ?? ENVIRONMENT_PRESETS[0];
}

function getEnvironmentCheckMeta(source = {}) {
  const checkType = String(source.checkType ?? "skill").toLowerCase() === "save" ? "save" : "skill";
  const fallbackKey = checkType === "save" ? "con" : "ath";
  const rawKey = String(source.checkKey ?? source.checkSkill ?? "").trim().toLowerCase();
  const movementCheck = Boolean(source.movementCheck);
  const checkKey = rawKey || (movementCheck ? fallbackKey : "");
  const defaultLabel = checkKey
    ? (checkType === "save" ? `${checkKey.toUpperCase()} Save` : checkKey.toUpperCase())
    : "";
  const checkLabel = String(source.checkLabel ?? defaultLabel).trim();
  return {
    checkType,
    checkKey,
    checkLabel
  };
}

function getStatusLabelById(statusId) {
  const id = String(statusId ?? "").trim();
  if (!id) return "";
  const match = CONFIG.statusEffects?.find((entry) => String(entry?.id ?? "") === id);
  return String(match?.name ?? id);
}

function getActiveEffectModeLabel(mode) {
  const numericMode = Math.floor(Number(mode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  const entry = Object.entries(CONST.ACTIVE_EFFECT_MODES ?? {}).find(([, value]) => Number(value) === numericMode);
  return entry ? entry[0] : "ADD";
}

const FRIENDLY_DAE_KEYS = [
  { key: "system.attributes.movement.walk", label: "Movement Speed (Walk)", hint: "Changes base walking speed." },
  { key: "system.attributes.movement.fly", label: "Movement Speed (Fly)", hint: "Changes base flying speed." },
  { key: "system.attributes.movement.swim", label: "Movement Speed (Swim)", hint: "Changes base swimming speed." },
  { key: "system.attributes.ac.value", label: "Armor Class", hint: "Changes AC value." },
  { key: "system.attributes.hp.value", label: "Current HP", hint: "Directly changes current HP." },
  { key: "system.attributes.hp.max", label: "Max HP", hint: "Changes maximum HP." },
  { key: "system.attributes.hp.temp", label: "Temporary HP", hint: "Adds or sets temporary HP." },
  { key: "system.attributes.init.bonus", label: "Initiative Bonus", hint: "Adds to initiative rolls." },
  { key: "system.bonuses.abilities.check", label: "All Ability Checks", hint: "Global bonus/penalty for ability checks." },
  { key: "system.bonuses.abilities.save", label: "All Saving Throws", hint: "Global bonus/penalty for saves." },
  { key: "system.bonuses.mwak.attack", label: "Melee Weapon Attacks", hint: "Bonus/penalty to melee weapon attacks." },
  { key: "system.bonuses.rwak.attack", label: "Ranged Weapon Attacks", hint: "Bonus/penalty to ranged weapon attacks." },
  { key: "system.bonuses.msak.attack", label: "Melee Spell Attacks", hint: "Bonus/penalty to melee spell attacks." },
  { key: "system.bonuses.rsak.attack", label: "Ranged Spell Attacks", hint: "Bonus/penalty to ranged spell attacks." },
  { key: "system.skills.ath.bonuses.check", label: "Athletics Checks", hint: "Bonus/penalty to Athletics checks." },
  { key: "system.skills.acr.bonuses.check", label: "Acrobatics Checks", hint: "Bonus/penalty to Acrobatics checks." },
  { key: "system.skills.prc.bonuses.check", label: "Perception Checks", hint: "Bonus/penalty to Perception checks." },
  { key: "system.skills.ste.bonuses.check", label: "Stealth Checks", hint: "Bonus/penalty to Stealth checks." }
];

let daeModifierCatalogCache = null;

function humanizeDaeKey(key) {
  return String(key ?? "")
    .split(".")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " "))
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function collectObjectPaths(source, prefix = "", output = new Set(), depth = 0) {
  if (!source || typeof source !== "object" || depth > 8) return output;
  for (const [rawKey, value] of Object.entries(source)) {
    const key = String(rawKey ?? "").trim();
    if (!key) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (path.startsWith("system.")) output.add(path);
    if (value && typeof value === "object") collectObjectPaths(value, path, output, depth + 1);
  }
  return output;
}

function buildDaeModifierCatalog() {
  const map = new Map();
  for (const entry of FRIENDLY_DAE_KEYS) {
    map.set(entry.key, { key: entry.key, label: entry.label, hint: entry.hint });
  }

  for (const preset of ENVIRONMENT_PRESETS) {
    for (const change of preset.effectChanges ?? []) {
      const key = String(change?.key ?? "").trim();
      if (!key || map.has(key)) continue;
      map.set(key, { key, label: humanizeDaeKey(key), hint: `System field: ${key}` });
    }
  }

  const model = game.system?.model?.Actor ?? {};
  const discovered = new Set();
  for (const value of Object.values(model)) {
    collectObjectPaths(value, "system", discovered);
  }
  for (const key of discovered) {
    if (map.has(key)) continue;
    map.set(key, { key, label: humanizeDaeKey(key), hint: `System field: ${key}` });
  }

  return Array.from(map.values()).sort((a, b) => {
    const labelCompare = String(a.label).localeCompare(String(b.label));
    if (labelCompare !== 0) return labelCompare;
    return String(a.key).localeCompare(String(b.key));
  });
}

function getDaeModifierCatalog() {
  if (!daeModifierCatalogCache) daeModifierCatalogCache = buildDaeModifierCatalog();
  return daeModifierCatalogCache;
}

function buildEnvironmentDaeChangeKeyCatalog() {
  return getDaeModifierCatalog();
}

function buildDamageTypeOptions(selected = "") {
  const selectedValue = String(selected ?? "").trim().toLowerCase();
  const rawDamageTypes = CONFIG?.DND5E?.damageTypes ?? CONFIG?.damageTypes ?? {};
  const options = [
    { value: "", label: "None", selected: selectedValue === "" }
  ];

  const resolveDamageTypeLabel = (raw, fallback) => {
    if (typeof raw === "string") {
      return raw.includes(".") ? (game.i18n?.localize?.(raw) ?? raw) : raw;
    }
    if (raw && typeof raw === "object") {
      const candidate = String(raw.label ?? raw.name ?? raw.value ?? "").trim();
      if (candidate) return candidate.includes(".") ? (game.i18n?.localize?.(candidate) ?? candidate) : candidate;
    }
    return fallback;
  };

  for (const [valueRaw, labelRaw] of Object.entries(rawDamageTypes)) {
    const value = String(valueRaw ?? "").trim();
    if (!value) continue;
    const localized = resolveDamageTypeLabel(labelRaw, value);
    options.push({
      value,
      label: localized,
      selected: value.toLowerCase() === selectedValue
    });
  }

  if (selectedValue && !options.some((entry) => String(entry.value).toLowerCase() === selectedValue)) {
    options.push({ value: selectedValue, label: selectedValue, selected: true });
  }

  return options;
}

function buildPartyHealthModifierKeyCatalog() {
  return getDaeModifierCatalog();
}

function buildEnvironmentOutcomeSummary(preset) {
  const statusLabel = getStatusLabelById(preset?.failStatusId);
  const failParts = [];
  if (statusLabel) failParts.push(`Apply ${statusLabel}`);
  const failSlideFeet = Math.max(0, Number(preset?.failSlideFeet ?? 0) || 0);
  if (failSlideFeet > 0) failParts.push(`Slide ${failSlideFeet} ft`);
  const failSpeedZeroTurns = Math.max(0, Number(preset?.failSpeedZeroTurns ?? 0) || 0);
  if (failSpeedZeroTurns > 0) {
    const turnLabel = failSpeedZeroTurns === 1 ? "turn" : "turns";
    failParts.push(`Speed 0 for ${failSpeedZeroTurns} ${turnLabel}`);
  }
  const failDamageFormula = String(preset?.failDamageFormula ?? "").trim();
  const failDamageType = String(preset?.failDamageType ?? "").trim();
  if (failDamageFormula) failParts.push(`${failDamageFormula} ${failDamageType || "damage"}`.trim());
  const failExhaustion = Math.max(0, Number(preset?.failExhaustion ?? 0) || 0);
  if (failExhaustion > 0) {
    const levelLabel = failExhaustion === 1 ? "level" : "levels";
    failParts.push(`+${failExhaustion} exhaustion ${levelLabel}`);
  }

  const failBy5StatusLabel = getStatusLabelById(preset?.failBy5StatusId);
  const failBy5Parts = [];
  if (failBy5StatusLabel) failBy5Parts.push(`Apply ${failBy5StatusLabel}`);
  const failBy5SlideFeet = Math.max(0, Number(preset?.failBy5SlideFeet ?? 0) || 0);
  if (failBy5SlideFeet > 0) failBy5Parts.push(`Slide ${failBy5SlideFeet} ft`);
  const failBy5DamageFormula = String(preset?.failBy5DamageFormula ?? "").trim();
  const failBy5DamageType = String(preset?.failBy5DamageType ?? "").trim();
  if (failBy5DamageFormula) failBy5Parts.push(`${failBy5DamageFormula} ${failBy5DamageType || "damage"}`.trim());
  const failBy5MaxHpReductionFormula = String(preset?.failBy5MaxHpReductionFormula ?? "").trim();
  if (failBy5MaxHpReductionFormula) failBy5Parts.push(`Reduce max HP by ${failBy5MaxHpReductionFormula} (temporary effect)`);

  const successiveFailParts = [];
  const successiveFailStatusLabel = getStatusLabelById(preset?.successiveFailStatusId);
  if (successiveFailStatusLabel) successiveFailParts.push(`Apply ${successiveFailStatusLabel}`);
  const successiveFailSlideFeet = Math.max(0, Number(preset?.successiveFailSlideFeet ?? 0) || 0);
  if (successiveFailSlideFeet > 0) successiveFailParts.push(`Slide ${successiveFailSlideFeet} ft`);
  const successiveFailExhaustion = Math.max(0, Number(preset?.successiveFailExhaustion ?? (preset?.movementCheck ? 1 : 0)) || 0);
  if (successiveFailExhaustion > 0) {
    const levelLabel = successiveFailExhaustion === 1 ? "level" : "levels";
    successiveFailParts.push(`+${successiveFailExhaustion} exhaustion ${levelLabel}`);
  }
  const successiveFailDamageFormula = String(preset?.successiveFailDamageFormula ?? "").trim();
  const successiveFailDamageType = String(preset?.successiveFailDamageType ?? "").trim();
  if (successiveFailDamageFormula) {
    successiveFailParts.push(`${successiveFailDamageFormula} ${successiveFailDamageType || "damage"}`.trim());
  }
  const successiveFailMaxHpReductionFormula = String(preset?.successiveFailMaxHpReductionFormula ?? "").trim();
  if (successiveFailMaxHpReductionFormula) {
    successiveFailParts.push(`Reduce max HP by ${successiveFailMaxHpReductionFormula} (temporary effect)`);
  }
  const successiveFailDaeChangeKey = String(preset?.successiveFailDaeChangeKey ?? "").trim();
  const successiveFailDaeChangeValue = String(preset?.successiveFailDaeChangeValue ?? "").trim();
  const successiveFailDaeChangeMode = Math.floor(Number(preset?.successiveFailDaeChangeMode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  if (successiveFailDaeChangeKey && successiveFailDaeChangeValue) {
    const modeLabel = getActiveEffectModeLabel(successiveFailDaeChangeMode);
    successiveFailParts.push(`DAE Change ${successiveFailDaeChangeKey} (${modeLabel}) = ${successiveFailDaeChangeValue}`);
  }

  const alwaysStatusLabel = getStatusLabelById(preset?.alwaysStatusId);

  return {
    onSuccess: preset?.movementCheck
      ? "No failure consequences are applied."
      : "No movement check required.",
    onFail: failParts.length > 0 ? failParts.join("; ") : "No additional failure consequence.",
    onFailBy5: failBy5Parts.length > 0 ? failBy5Parts.join("; ") : "No additional fail-by-5 consequence.",
    onSuccessiveFail: successiveFailParts.length > 0
      ? `On 2+ consecutive failures: ${successiveFailParts.join("; ")}`
      : "No additional consecutive-failure consequence.",
    alwaysOn: alwaysStatusLabel || "None"
  };
}

function getEnvironmentSuccessiveDefaults(preset) {
  return {
    statusId: String(preset?.successiveFailStatusId ?? "").trim(),
    slideFeet: Math.max(0, Number(preset?.successiveFailSlideFeet ?? 0) || 0),
    exhaustion: Math.max(0, Number(preset?.successiveFailExhaustion ?? (preset?.movementCheck ? 1 : 0)) || 0),
    damageFormula: String(preset?.successiveFailDamageFormula ?? "").trim(),
    damageType: String(preset?.successiveFailDamageType ?? "").trim(),
    maxHpReductionFormula: String(preset?.successiveFailMaxHpReductionFormula ?? "").trim(),
    daeChangeKey: String(preset?.successiveFailDaeChangeKey ?? "").trim(),
    daeChangeMode: Math.floor(Number(preset?.successiveFailDaeChangeMode ?? CONST.ACTIVE_EFFECT_MODES.ADD)),
    daeChangeValue: String(preset?.successiveFailDaeChangeValue ?? "").trim()
  };
}

function normalizeEnvironmentSuccessiveOverride(raw = {}) {
  const rawMode = Math.floor(Number(raw?.daeChangeMode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((value) => Number(value)));
  return {
    statusId: String(raw?.statusId ?? "").trim(),
    slideFeet: Math.max(0, Math.min(500, Math.floor(Number(raw?.slideFeet ?? 0) || 0))),
    exhaustion: Math.max(0, Math.min(6, Math.floor(Number(raw?.exhaustion ?? 0) || 0))),
    damageFormula: String(raw?.damageFormula ?? "").trim(),
    damageType: String(raw?.damageType ?? "").trim(),
    maxHpReductionFormula: String(raw?.maxHpReductionFormula ?? "").trim(),
    daeChangeKey: String(raw?.daeChangeKey ?? "").trim(),
    daeChangeMode: validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD),
    daeChangeValue: String(raw?.daeChangeValue ?? "").trim()
  };
}

function getEnvironmentSuccessiveConfig(environmentState, preset) {
  const defaults = getEnvironmentSuccessiveDefaults(preset);
  const presetKey = String(preset?.key ?? "none");
  const rawOverride = environmentState?.successiveByPreset?.[presetKey] ?? null;
  if (!rawOverride || typeof rawOverride !== "object") return defaults;
  const override = normalizeEnvironmentSuccessiveOverride(rawOverride);
  return {
    statusId: override.statusId,
    slideFeet: override.slideFeet,
    exhaustion: override.exhaustion,
    damageFormula: override.damageFormula,
    damageType: override.damageType,
    maxHpReductionFormula: override.maxHpReductionFormula,
    daeChangeKey: override.daeChangeKey,
    daeChangeMode: override.daeChangeMode,
    daeChangeValue: override.daeChangeValue
  };
}

function applyEnvironmentSuccessiveConfigToPreset(preset, environmentState) {
  if (!preset || typeof preset !== "object") return preset;
  const config = getEnvironmentSuccessiveConfig(environmentState, preset);
  return {
    ...preset,
    successiveFailStatusId: config.statusId,
    successiveFailSlideFeet: config.slideFeet,
    successiveFailExhaustion: config.exhaustion,
    successiveFailDamageFormula: config.damageFormula,
    successiveFailDamageType: config.damageType,
    successiveFailMaxHpReductionFormula: config.maxHpReductionFormula,
    successiveFailDaeChangeKey: config.daeChangeKey,
    successiveFailDaeChangeMode: config.daeChangeMode,
    successiveFailDaeChangeValue: config.daeChangeValue
  };
}

function ensureEnvironmentState(ledger) {
  if (!ledger.environment || typeof ledger.environment !== "object") {
    ledger.environment = {
      presetKey: "none",
      movementDc: 12,
      appliedActorIds: [],
      syncToSceneNonParty: true,
      note: "",
      logs: [],
      failureStreaks: {},
      checkResults: [],
      successiveByPreset: {}
    };
  }
  ledger.environment.presetKey = getEnvironmentPresetByKey(String(ledger.environment.presetKey ?? "none")).key;
  const dc = Number(ledger.environment.movementDc ?? 12);
  ledger.environment.movementDc = Number.isFinite(dc) ? Math.max(1, Math.min(30, Math.floor(dc))) : 12;
  if (!Array.isArray(ledger.environment.appliedActorIds)) ledger.environment.appliedActorIds = [];
  ledger.environment.appliedActorIds = ledger.environment.appliedActorIds
    .map((actorId) => String(actorId ?? "").trim())
    .filter((actorId, index, arr) => actorId && arr.indexOf(actorId) === index);
  ledger.environment.syncToSceneNonParty = ledger.environment.syncToSceneNonParty !== false;
  ledger.environment.note = String(ledger.environment.note ?? "");
  if (!ledger.environment.failureStreaks || typeof ledger.environment.failureStreaks !== "object") {
    ledger.environment.failureStreaks = {};
  }
  const normalizedFailureStreaks = {};
  for (const [actorIdRaw, streakRaw] of Object.entries(ledger.environment.failureStreaks)) {
    const actorId = String(actorIdRaw ?? "").trim();
    const streak = Number(streakRaw ?? 0);
    if (!actorId) continue;
    if (!Number.isFinite(streak) || streak <= 0) continue;
    normalizedFailureStreaks[actorId] = Math.max(1, Math.min(99, Math.floor(streak)));
  }
  ledger.environment.failureStreaks = normalizedFailureStreaks;
  if (!ledger.environment.successiveByPreset || typeof ledger.environment.successiveByPreset !== "object") {
    ledger.environment.successiveByPreset = {};
  }
  const normalizedSuccessiveByPreset = {};
  for (const [presetKeyRaw, overrideRaw] of Object.entries(ledger.environment.successiveByPreset)) {
    const presetKey = getEnvironmentPresetByKey(String(presetKeyRaw ?? "none")).key;
    if (presetKey === "none") continue;
    normalizedSuccessiveByPreset[presetKey] = normalizeEnvironmentSuccessiveOverride(overrideRaw);
  }
  ledger.environment.successiveByPreset = normalizedSuccessiveByPreset;
  if (!Array.isArray(ledger.environment.logs)) ledger.environment.logs = [];
  ledger.environment.logs = ledger.environment.logs
    .map((entry) => {
      const logType = String(entry?.logType ?? "environment").trim().toLowerCase() === "weather"
        ? "weather"
        : "environment";
      const createdAt = Number(entry?.createdAt ?? Date.now());
      if (logType === "weather") {
        return {
          id: String(entry?.id ?? foundry.utils.randomID()),
          logType,
          label: String(entry?.label ?? "Weather").trim() || "Weather",
          weatherId: String(entry?.weatherId ?? "").trim(),
          darkness: Number.isFinite(Number(entry?.darkness)) ? Math.max(0, Math.min(1, Number(entry.darkness))) : 0,
          visibilityModifier: Number.isFinite(Number(entry?.visibilityModifier)) ? Math.max(-5, Math.min(5, Math.floor(Number(entry.visibilityModifier)))) : 0,
          note: String(entry?.note ?? ""),
          daeChanges: Array.isArray(entry?.daeChanges)
            ? entry.daeChanges.map((change) => normalizeWeatherDaeChange(change)).filter((change) => change.key && change.value)
            : [],
          createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
          createdBy: String(entry?.createdBy ?? "GM")
        };
      }
      const actorIds = Array.isArray(entry?.actorIds)
        ? entry.actorIds.map((actorId) => String(actorId ?? "").trim()).filter((actorId, index, arr) => actorId && arr.indexOf(actorId) === index)
        : [];
      const checkMeta = getEnvironmentCheckMeta(entry);
      return {
        id: String(entry?.id ?? foundry.utils.randomID()),
        logType,
        presetKey: getEnvironmentPresetByKey(String(entry?.presetKey ?? "none")).key,
        movementDc: Math.max(1, Math.min(30, Math.floor(Number(entry?.movementDc ?? 12) || 12))),
        actorIds,
        syncToSceneNonParty: entry?.syncToSceneNonParty !== false,
        note: String(entry?.note ?? ""),
        checkType: checkMeta.checkType,
        checkKey: checkMeta.checkKey,
        checkLabel: checkMeta.checkLabel,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        createdBy: String(entry?.createdBy ?? "GM")
      };
    })
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index);
  if (!Array.isArray(ledger.environment.checkResults)) ledger.environment.checkResults = [];
  ledger.environment.checkResults = ledger.environment.checkResults
    .map((entry) => {
      const createdAt = Number(entry?.createdAt ?? Date.now());
      const rollTotalRaw = Number(entry?.rollTotal);
      const dcRaw = Number(entry?.dc);
      const streakRaw = Number(entry?.streak ?? 0);
      const resultValue = String(entry?.result ?? "").toLowerCase() === "fail" ? "fail" : "pass";
      const outcomeSummary = String(entry?.outcomeSummary ?? "").trim();
      return {
        id: String(entry?.id ?? foundry.utils.randomID()),
        actorId: String(entry?.actorId ?? "").trim(),
        actorName: String(entry?.actorName ?? "").trim(),
        presetKey: getEnvironmentPresetByKey(String(entry?.presetKey ?? "none")).key,
        result: resultValue,
        rollTotal: Number.isFinite(rollTotalRaw) ? Math.floor(rollTotalRaw) : null,
        dc: Number.isFinite(dcRaw) ? Math.floor(dcRaw) : null,
        streak: Number.isFinite(streakRaw) ? Math.max(0, Math.min(99, Math.floor(streakRaw))) : 0,
        outcomeSummary,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        createdBy: String(entry?.createdBy ?? "GM")
      };
    })
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index)
    .slice(0, 100);
  return ledger.environment;
}

function formatSignedModifier(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return "0";
  return numeric > 0 ? `+${Math.floor(numeric)}` : String(Math.floor(numeric));
}

function buildInjuryStatusSummary(injury = {}) {
  const notes = String(injury.notes ?? "").trim();
  const effectText = String(injury.effect ?? "").trim();
  const stabilized = Boolean(injury.stabilized);
  const permanent = Boolean(injury.permanent);
  const recoveryDays = Math.max(0, Number(injury.recoveryDays ?? 0));
  const stateLabel = permanent ? "Permanent" : (stabilized ? "Stabilized" : "Unstable");
  const recoveryLabel = permanent ? "Permanent" : `${recoveryDays} day(s) remaining`;
  const summary = [effectText, `State: ${stateLabel}`, `Recovery: ${recoveryLabel}`, notes ? `Notes: ${notes}` : ""]
    .filter(Boolean)
    .join(" | ");
  return {
    effectText,
    notes,
    stateLabel,
    recoveryLabel,
    summary
  };
}

function isParsableUuid(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  const parser = foundry?.utils?.parseUuid;
  if (typeof parser === "function") {
    try {
      parser(text);
      return true;
    } catch {
      return false;
    }
  }
  return !text.startsWith("module.") && text.includes(".");
}

function getEffectOriginForActor(actor) {
  const uuid = String(actor?.uuid ?? "").trim();
  return uuid && isParsableUuid(uuid) ? uuid : "";
}

async function safeDeleteActiveEffect(actor, effect, contextLabel = "sync") {
  if (!actor || !effect?.id) return false;
  const currentOrigin = String(effect.origin ?? "").trim();
  const actorOrigin = getEffectOriginForActor(actor);
  if (actorOrigin && currentOrigin && !isParsableUuid(currentOrigin)) {
    try {
      await effect.update({ origin: actorOrigin });
    } catch {
      // Continue with best-effort deletion.
    }
  }
  try {
    await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
    return true;
  } catch (error) {
    try {
      await effect.delete();
      return true;
    } catch {
      console.warn(`${MODULE_ID}: failed to delete ${contextLabel} effect ${effect.id}`, error);
      return false;
    }
  }
}

function buildIntegrationEffectData(payload, actor = null) {
  const mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
  const addMode = CONST.ACTIVE_EFFECT_MODES.ADD;
  const priority = 20;
  const initiativeBonus = Number(payload.operations?.minorInitiativeBonus ?? 0);
  const abilityCheckBonus = Number(payload.operations?.minorAbilityCheckBonus ?? 0);
  const perceptionBonus = Number(payload.operations?.minorPerceptionBonus ?? 0);
  const saveBonus = Number(payload.operations?.minorSavingThrowBonus ?? 0);

  const changes = [
    {
      key: `flags.${MODULE_ID}.ae.prepEdge`,
      mode,
      value: payload.operations.prepEdge ? "1" : "0",
      priority
    },
    {
      key: `flags.${MODULE_ID}.ae.riskTier`,
      mode,
      value: String(payload.operations.riskTier ?? "moderate"),
      priority
    },
    {
      key: `flags.${MODULE_ID}.ae.formation`,
      mode,
      value: String(payload.doctrine.formation ?? "default"),
      priority
    },
    {
      key: `flags.${MODULE_ID}.ae.marchingRank`,
      mode,
      value: String(payload.assignment.marchingRank ?? "unassigned"),
      priority
    },
    {
      key: `flags.${MODULE_ID}.ae.injured`,
      mode,
      value: payload.injury.active ? "1" : "0",
      priority
    }
  ];

  if (initiativeBonus !== 0) {
    changes.push({ key: "system.attributes.init.bonus", mode: addMode, value: formatSignedModifier(initiativeBonus), priority });
  }
  if (abilityCheckBonus !== 0) {
    changes.push({ key: "system.bonuses.abilities.check", mode: addMode, value: formatSignedModifier(abilityCheckBonus), priority });
  }
  if (perceptionBonus !== 0) {
    changes.push({ key: "system.skills.prc.bonuses.check", mode: addMode, value: formatSignedModifier(perceptionBonus), priority });
  }
  if (saveBonus !== 0) {
    changes.push({ key: "system.bonuses.abilities.save", mode: addMode, value: formatSignedModifier(saveBonus), priority });
  }

  const customDaeChanges = Array.isArray(payload.operations?.customDaeChanges)
    ? payload.operations.customDaeChanges
    : [];
  for (const entry of customDaeChanges) {
    const key = String(entry?.key ?? "").trim();
    const value = String(entry?.value ?? "").trim();
    if (!key || !value) continue;
    const rawMode = Math.floor(Number(entry?.mode ?? addMode));
    const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((modeValue) => Number(modeValue)));
    const mode = validModes.has(rawMode) ? rawMode : addMode;
    changes.push({ key, mode, value, priority });
  }

  const data = {
    name: INTEGRATION_EFFECT_NAME,
    img: "icons/svg/aura.svg",
    disabled: false,
    transfer: false,
    duration: {
      startTime: game.time?.worldTime ?? 0
    },
    changes,
    flags: {
      [MODULE_ID]: {
        integration: true,
        syncedAt: payload.syncedAt
      }
    }
  };
  const origin = getEffectOriginForActor(actor);
  if (origin) data.origin = origin;
  return data;
}

function buildInjuryStatusEffectData(payload, actor = null) {
  const mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
  const priority = 20;
  const injury = payload?.injury ?? {};
  const injuryName = String(injury.name ?? "Injury").trim() || "Injury";
  const status = buildInjuryStatusSummary(injury);
  const notes = status.notes;
  const effectText = status.effectText;
  const stabilized = Boolean(injury.stabilized);
  const permanent = Boolean(injury.permanent);
  const recoveryDays = Math.max(0, Number(injury.recoveryDays ?? 0));
  const stateLabel = status.stateLabel;
  const recoveryLabel = status.recoveryLabel;
  const icon = permanent
    ? "icons/svg/skull.svg"
    : (stabilized ? "icons/svg/regen.svg" : "icons/svg/hazard.svg");

  const data = {
    name: `${INJURY_EFFECT_NAME_PREFIX} ${injuryName}`,
    img: icon,
    disabled: false,
    transfer: false,
    description: status.summary,
    duration: {
      startTime: game.time?.worldTime ?? 0
    },
    changes: [
      {
        key: `flags.${MODULE_ID}.ae.injuryName`,
        mode,
        value: injuryName,
        priority
      },
      {
        key: `flags.${MODULE_ID}.ae.injuryState`,
        mode,
        value: stateLabel,
        priority
      },
      {
        key: `flags.${MODULE_ID}.ae.injuryRecovery`,
        mode,
        value: recoveryLabel,
        priority
      }
    ],
    flags: {
      [MODULE_ID]: {
        injuryStatus: true,
        syncedAt: payload.syncedAt,
        injury: {
          name: injuryName,
          effect: effectText,
          notes,
          stabilized,
          permanent,
          recoveryDays
        }
      }
    }
  };
  const origin = getEffectOriginForActor(actor);
  if (origin) data.origin = origin;
  return data;
}

function buildEnvironmentStatusEffectData(payload, actor = null) {
  const mode = CONST.ACTIVE_EFFECT_MODES.OVERRIDE;
  const addMode = CONST.ACTIVE_EFFECT_MODES.ADD;
  const priority = 20;
  const environment = payload?.environment ?? {};
  const label = String(environment.label ?? "Environment").trim() || "Environment";
  const icon = String(getEnvironmentPresetByKey(environment.presetKey).icon ?? "icons/svg/hazard.svg");
  const movementCheck = Boolean(environment.movementCheck);
  const check = getEnvironmentCheckMeta(environment);
  const description = movementCheck
    ? `${label} active. Movement checks required (${check.checkLabel || "check"}).`
    : `${label} active.`;

  const changes = [
    {
      key: `flags.${MODULE_ID}.ae.environmentPreset`,
      mode,
      value: String(environment.presetKey ?? "none"),
      priority
    },
    {
      key: `flags.${MODULE_ID}.ae.environmentActive`,
      mode,
      value: "1",
      priority
    }
  ];

  const preset = getEnvironmentPresetByKey(environment.presetKey);
  const alwaysStatusId = String(preset.alwaysStatusId ?? "").trim();
  for (const effectChange of preset.effectChanges ?? []) {
    if (!effectChange?.key || effectChange?.value === undefined || effectChange?.value === null) continue;
    changes.push({
      key: effectChange.key,
      mode: addMode,
      value: String(effectChange.value),
      priority
    });
  }

  const data = {
    name: `${ENVIRONMENT_EFFECT_NAME_PREFIX} ${label}`,
    img: icon,
    disabled: false,
    transfer: false,
    description,
    duration: {
      startTime: game.time?.worldTime ?? 0
    },
    statuses: alwaysStatusId ? [alwaysStatusId] : [],
    changes,
    flags: {
      [MODULE_ID]: {
        environmentStatus: true,
        syncedAt: payload.syncedAt,
        environment: {
          presetKey: String(environment.presetKey ?? "none"),
          label,
          movementCheck,
          alwaysStatusId,
          checkType: check.checkType,
          checkKey: check.checkKey,
          checkSkill: check.checkType === "skill" ? check.checkKey : "",
          checkLabel: check.checkLabel
        }
      }
    }
  };
  const origin = getEffectOriginForActor(actor);
  if (origin) data.origin = origin;
  return data;
}

async function upsertIntegrationEffect(actor, payload) {
  const existing = getIntegrationEffect(actor);
  const data = buildIntegrationEffectData(payload, actor);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeIntegrationEffect(actor) {
  const existing = getIntegrationEffect(actor);
  if (!existing) return;
  await safeDeleteActiveEffect(actor, existing, "integration");
}

async function upsertInjuryStatusEffect(actor, payload) {
  const existing = getInjuryStatusEffect(actor);
  const injuryActive = Boolean(payload?.injury?.active);
  if (!injuryActive) {
    if (existing) await safeDeleteActiveEffect(actor, existing, "injury");
    return;
  }
  const data = buildInjuryStatusEffectData(payload, actor);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeInjuryStatusEffect(actor) {
  const existing = getInjuryStatusEffect(actor);
  if (!existing) return;
  await safeDeleteActiveEffect(actor, existing, "injury");
}

async function upsertEnvironmentStatusEffect(actor, payload) {
  const existing = getEnvironmentStatusEffect(actor);
  const active = Boolean(payload?.environment?.active);
  if (!active) {
    if (existing) await safeDeleteActiveEffect(actor, existing, "environment");
    return;
  }
  const data = buildEnvironmentStatusEffectData(payload, actor);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeEnvironmentStatusEffect(actor) {
  const existing = getEnvironmentStatusEffect(actor);
  if (!existing) return;
  await safeDeleteActiveEffect(actor, existing, "environment");
}

async function applyActorIntegrationPayload(actor, payload, resolvedMode) {
  await actor.update({
    [`flags.${MODULE_ID}.sync`]: payload,
    [`flags.${MODULE_ID}.syncMode`]: resolvedMode
  });

  await upsertIntegrationEffect(actor, payload);
  await upsertInjuryStatusEffect(actor, payload);
  await upsertEnvironmentStatusEffect(actor, payload);
}

async function clearActorIntegrationPayload(actor) {
  await removeIntegrationEffect(actor);
  await removeInjuryStatusEffect(actor);
  await removeEnvironmentStatusEffect(actor);
  await actor.update({
    [`flags.${MODULE_ID}.-=sync`]: null,
    [`flags.${MODULE_ID}.-=syncMode`]: null,
    [`flags.${MODULE_ID}.-=ae`]: null,
    [`flags.${MODULE_ID}.-=injury`]: null,
    [`flags.${MODULE_ID}.-=environment`]: null
  });
}

async function syncSceneNonPartyIntegrationActors(globalContext, resolvedMode) {
  if (!game.user.isGM) return { synced: 0, cleared: 0, total: 0, enabled: false };
  const context = globalContext ?? buildIntegrationGlobalContext();
  const partyHealth = context.operations?.partyHealth ?? {};
  const environment = context.operations?.environment ?? {};
  const syncWorldGlobal = Boolean(partyHealth.syncToSceneNonParty);
  const syncEnvironment = Boolean(environment.syncToSceneNonParty && String(environment.presetKey ?? "none") !== "none");
  const enabled = syncWorldGlobal || syncEnvironment;
  const actors = getSceneNonPartyIntegrationActors();
  let synced = 0;
  let cleared = 0;

  for (const actor of actors) {
    if (!enabled || resolvedMode === INTEGRATION_MODES.OFF) {
      const hasSync = Boolean(actor.getFlag(MODULE_ID, "sync"));
      const hasEffect = Boolean(getIntegrationEffect(actor));
      const hasInjuryEffect = Boolean(getInjuryStatusEffect(actor));
      const hasEnvironmentEffect = Boolean(getEnvironmentStatusEffect(actor));
      if (hasSync || hasEffect || hasInjuryEffect || hasEnvironmentEffect) {
        await clearActorIntegrationPayload(actor);
        cleared += 1;
      }
      continue;
    }
    const payload = buildActorIntegrationPayload(actor.id, context, {
      nonParty: true,
      includeWorldGlobal: syncWorldGlobal,
      forceEnvironmentApply: syncEnvironment
    });
    await applyActorIntegrationPayload(actor, payload, resolvedMode);
    synced += 1;
  }

  return { synced, cleared, total: actors.length, enabled };
}

async function syncIntegrationState() {
  if (!game.user.isGM) return;

  const resolvedMode = resolveIntegrationMode();
  const trackedActors = collectIntegrationActorIds();
  const trackedIds = new Set(trackedActors.map((actor) => actor.id));

  if (resolvedMode === INTEGRATION_MODES.OFF) {
    const actorsToClear = game.actors.contents.filter((actor) => {
      if (!isTrackableCharacter(actor)) return false;
      const hasSync = Boolean(actor.getFlag(MODULE_ID, "sync"));
      const hasEffect = Boolean(getIntegrationEffect(actor));
      const hasInjuryEffect = Boolean(getInjuryStatusEffect(actor));
      const hasEnvironmentEffect = Boolean(getEnvironmentStatusEffect(actor));
      return hasSync || hasEffect || hasInjuryEffect || hasEnvironmentEffect;
    });
    for (const actor of actorsToClear) {
      await clearActorIntegrationPayload(actor);
    }
    await syncSceneNonPartyIntegrationActors(null, resolvedMode);
    return;
  }

  const globalContext = buildIntegrationGlobalContext();
  for (const actor of trackedActors) {
    const payload = buildActorIntegrationPayload(actor.id, globalContext);
    await applyActorIntegrationPayload(actor, payload, resolvedMode);
  }

  const staleActors = game.actors.contents.filter((actor) => {
    if (!isTrackableCharacter(actor)) return false;
    if (trackedIds.has(actor.id)) return false;
    const hasSync = Boolean(actor.getFlag(MODULE_ID, "sync"));
    const hasEffect = Boolean(getIntegrationEffect(actor));
    const hasInjuryEffect = Boolean(getInjuryStatusEffect(actor));
    const hasEnvironmentEffect = Boolean(getEnvironmentStatusEffect(actor));
    return hasSync || hasEffect || hasInjuryEffect || hasEnvironmentEffect;
  });

  for (const actor of staleActors) {
    await clearActorIntegrationPayload(actor);
  }

  await syncSceneNonPartyIntegrationActors(globalContext, resolvedMode);
}

function scheduleIntegrationSync(reason = "") {
  if (!game.user.isGM) return;
  if (integrationSyncTimeoutId) clearTimeout(integrationSyncTimeoutId);
  integrationSyncTimeoutId = setTimeout(async () => {
    integrationSyncTimeoutId = null;
    try {
      await syncIntegrationState();
    } catch (error) {
      console.warn(`${MODULE_ID}: integration sync failed (${reason})`, error);
    }
  }, 100);
}

function getGmPanelTabStorageKey() {
  return `po-gm-panel-tab-${game.user?.id ?? "anon"}`;
}

function getActiveGmPanelTab() {
  const stored = sessionStorage.getItem(getGmPanelTabStorageKey());
  return stored === "operations" ? "operations" : "core";
}

function setActiveGmPanelTab(tab) {
  const value = tab === "operations" ? "operations" : "core";
  sessionStorage.setItem(getGmPanelTabStorageKey(), value);
}

function getRestMainTabStorageKey() {
  return `po-rest-main-tab-${game.user?.id ?? "anon"}`;
}

function getActiveRestMainTab() {
  const stored = sessionStorage.getItem(getRestMainTabStorageKey());
  return stored === "operations" ? "operations" : "rest-watch";
}

function setActiveRestMainTab(tab) {
  const value = tab === "operations" ? "operations" : "rest-watch";
  sessionStorage.setItem(getRestMainTabStorageKey(), value);
}

function getOperationsPageStorageKey() {
  return `po-operations-page-${game.user?.id ?? "anon"}`;
}

function getActiveOperationsPage() {
  const allowed = new Set(["planning", "readiness", "comms", "recon", "reputation", "base", "recovery", "gm"]);
  const stored = sessionStorage.getItem(getOperationsPageStorageKey()) ?? "planning";
  if (stored === "supply") return "base";
  if (stored === "gm" && !game.user?.isGM) return "planning";
  return allowed.has(stored) ? stored : "planning";
}

function setActiveOperationsPage(page) {
  if (page === "supply") page = "base";
  const allowed = new Set(["planning", "readiness", "comms", "recon", "reputation", "base", "recovery", "gm"]);
  if (page === "gm" && !game.user?.isGM) page = "planning";
  const value = allowed.has(page) ? page : "planning";
  sessionStorage.setItem(getOperationsPageStorageKey(), value);
}

function getOperationsPlanningTabStorageKey() {
  return `po-operations-planning-tab-${game.user?.id ?? "anon"}`;
}

function getReputationFilterStorageKey() {
  return `po-reputation-filter-${game.user?.id ?? "anon"}`;
}

function getReputationFilterState() {
  const defaults = { keyword: "", standing: "all" };
  const raw = sessionStorage.getItem(getReputationFilterStorageKey());
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    return {
      keyword: String(parsed?.keyword ?? ""),
      standing: String(parsed?.standing ?? "all")
    };
  } catch (_error) {
    return defaults;
  }
}

function setReputationFilterState(patch = {}) {
  const previous = getReputationFilterState();
  const next = {
    keyword: String(patch.keyword ?? previous.keyword ?? ""),
    standing: String(patch.standing ?? previous.standing ?? "all")
  };
  sessionStorage.setItem(getReputationFilterStorageKey(), JSON.stringify(next));
}

function getActiveSyncEffectsTabStorageKey() {
  return `po-active-sync-effects-tab-${game.user?.id ?? "anon"}`;
}

function getActiveSyncEffectsTab() {
  const stored = String(sessionStorage.getItem(getActiveSyncEffectsTabStorageKey()) ?? "active").trim().toLowerCase();
  return stored === "archived" ? "archived" : "active";
}

function setActiveSyncEffectsTab(tab) {
  const value = String(tab ?? "active").trim().toLowerCase() === "archived" ? "archived" : "active";
  sessionStorage.setItem(getActiveSyncEffectsTabStorageKey(), value);
}

function getGmQuickPanelStorageKey() {
  return `po-gm-quick-panel-${game.user?.id ?? "anon"}`;
}

function getGmQuickWeatherDraftStorageKey() {
  return `po-gm-quick-weather-draft-${game.user?.id ?? "anon"}`;
}

function getGmQuickWeatherDraft() {
  const raw = sessionStorage.getItem(getGmQuickWeatherDraftStorageKey());
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      selectedKey: String(parsed.selectedKey ?? "").trim(),
      darkness: Number(parsed.darkness ?? 0),
      visibilityModifier: Number(parsed.visibilityModifier ?? 0),
      note: String(parsed.note ?? ""),
      presetName: String(parsed.presetName ?? ""),
      daeChanges: Array.isArray(parsed.daeChanges) ? parsed.daeChanges : []
    };
  } catch (_error) {
    return null;
  }
}

function setGmQuickWeatherDraft(draft = null) {
  if (!draft || typeof draft !== "object") {
    sessionStorage.removeItem(getGmQuickWeatherDraftStorageKey());
    return;
  }
  sessionStorage.setItem(getGmQuickWeatherDraftStorageKey(), JSON.stringify({
    selectedKey: String(draft.selectedKey ?? "").trim(),
    darkness: Number(draft.darkness ?? 0),
    visibilityModifier: Number(draft.visibilityModifier ?? 0),
    note: String(draft.note ?? ""),
    presetName: String(draft.presetName ?? ""),
    daeChanges: Array.isArray(draft.daeChanges) ? draft.daeChanges : []
  }));
}

function getActiveGmQuickPanel() {
  const stored = String(sessionStorage.getItem(getGmQuickPanelStorageKey()) ?? "none").trim().toLowerCase();
  const allowed = new Set(["none", "faction", "modifier", "weather"]);
  return allowed.has(stored) ? stored : "none";
}

function setActiveGmQuickPanel(panel) {
  const value = String(panel ?? "none").trim().toLowerCase();
  const allowed = new Set(["none", "faction", "modifier", "weather"]);
  sessionStorage.setItem(getGmQuickPanelStorageKey(), allowed.has(value) ? value : "none");
}

function getGmOperationsTabStorageKey() {
  return `po-gm-ops-tab-${game.user?.id ?? "anon"}`;
}

function getActiveGmOperationsTab() {
  const stored = String(sessionStorage.getItem(getGmOperationsTabStorageKey()) ?? "environment").trim().toLowerCase();
  const allowed = new Set(["environment", "logs", "derived", "active-sync", "custom"]);
  return allowed.has(stored) ? stored : "environment";
}

function setActiveGmOperationsTab(tab) {
  const value = String(tab ?? "environment").trim().toLowerCase();
  const allowed = new Set(["environment", "logs", "derived", "active-sync", "custom"]);
  sessionStorage.setItem(getGmOperationsTabStorageKey(), allowed.has(value) ? value : "environment");
}

function getActiveOperationsPlanningTab() {
  const allowed = new Set(["roles", "sops", "resources", "bonuses"]);
  const stored = sessionStorage.getItem(getOperationsPlanningTabStorageKey()) ?? "roles";
  return allowed.has(stored) ? stored : "roles";
}

function setActiveOperationsPlanningTab(tab) {
  const allowed = new Set(["roles", "sops", "resources", "bonuses"]);
  const value = allowed.has(tab) ? tab : "roles";
  sessionStorage.setItem(getOperationsPlanningTabStorageKey(), value);
}

function getMiniVizStorageKey() {
  return `po-mini-viz-collapsed-${game.user?.id ?? "anon"}`;
}

function isMiniVizCollapsed() {
  return sessionStorage.getItem(getMiniVizStorageKey()) === "1";
}

function setMiniVizCollapsed(collapsed) {
  sessionStorage.setItem(getMiniVizStorageKey(), collapsed ? "1" : "0");
}

function getMarchSectionsStorageKey() {
  return `po-march-sections-${game.user?.id ?? "anon"}`;
}

function getMarchSectionState() {
  const raw = sessionStorage.getItem(getMarchSectionsStorageKey());
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function setMarchSectionState(state) {
  sessionStorage.setItem(getMarchSectionsStorageKey(), JSON.stringify(state ?? {}));
}

function isMarchSectionCollapsed(sectionId) {
  if (!sectionId) return false;
  const state = getMarchSectionState();
  return Boolean(state[sectionId]);
}

function setMarchSectionCollapsed(sectionId, collapsed) {
  if (!sectionId) return;
  const state = getMarchSectionState();
  state[sectionId] = Boolean(collapsed);
  setMarchSectionState(state);
}

function buildMarchSectionUi(sectionId) {
  const collapsed = isMarchSectionCollapsed(sectionId);
  return {
    collapsed,
    toggleLabel: collapsed ? "Expand" : "Collapse",
    toggleIcon: collapsed ? "fa-chevron-down" : "fa-chevron-up"
  };
}

function buildMiniVizUiContext() {
  const collapsed = isMiniVizCollapsed();
  return {
    miniVizCollapsed: collapsed,
    miniVizToggleLabel: collapsed ? "Expand" : "Collapse",
    miniVizToggleIcon: collapsed ? "fa-chevron-down" : "fa-chevron-up"
  };
}

function getWatchEntryStateKey(entry) {
  const slotId = entry?.closest(".po-card")?.dataset?.slotId ?? "";
  const actorId = entry?.dataset?.actorId ?? "";
  if (!slotId || !actorId) return "";
  return `${slotId}:${actorId}`;
}

function captureUiState(app) {
  const root = getAppRootElement(app);
  if (!root) return null;

  if (app instanceof RestWatchApp || app instanceof RestWatchPlayerApp) {
    const openNotes = Array.from(root.querySelectorAll(".po-watch-entry .po-notes.is-active"))
      .map((notes) => getWatchEntryStateKey(notes.closest(".po-watch-entry")))
      .filter(Boolean);
    return { type: "rest", openNotes };
  }

  if (app instanceof MarchingOrderApp) {
    return { type: "march" };
  }

  return null;
}

function applyUiState(app, state) {
  if (!state) return;
  const root = getAppRootElement(app);
  if (!root) return;

  if (state.type === "rest") {
    const openSet = new Set(state.openNotes ?? []);
    root.querySelectorAll(".po-watch-entry").forEach((entry) => {
      const key = getWatchEntryStateKey(entry);
      const notes = entry.querySelector(".po-notes");
      if (!notes) return;
      notes.classList.toggle("is-active", Boolean(key && openSet.has(key)));
    });
    return;
  }

  if (state.type === "march") {
    return;
  }
}

function restorePendingUiState(app) {
  const state = pendingUiRestore.get(app);
  if (!state) return;
  pendingUiRestore.delete(app);
  applyUiState(app, state);
}

function captureScrollState(app) {
  const root = getAppRootElement(app);
  if (!root) return [];
  const states = [];

  const collectNodes = (selector) => {
    const matched = Array.from(root.querySelectorAll(selector));
    if (root.matches?.(selector)) matched.unshift(root);
    return matched;
  };

  for (const selector of SCROLL_STATE_SELECTORS) {
    const nodes = collectNodes(selector);
    nodes.forEach((node, index) => {
      const canScrollY = node.scrollHeight > node.clientHeight;
      const canScrollX = node.scrollWidth > node.clientWidth;
      if (!canScrollY && !canScrollX) return;
      states.push({ selector, index, top: node.scrollTop, left: node.scrollLeft });
    });
  }
  return states;
}

function applyScrollState(root, states) {
  if (!root || !Array.isArray(states)) return;
  const collectNodes = (selector) => {
    const matched = Array.from(root.querySelectorAll(selector));
    if (root.matches?.(selector)) matched.unshift(root);
    return matched;
  };

  for (const state of states) {
    const nodes = collectNodes(state.selector);
    const node = nodes?.[state.index];
    if (!node) continue;
    node.scrollTop = state.top ?? 0;
    node.scrollLeft = state.left ?? 0;
  }
}

function restorePendingScrollState(app) {
  const states = pendingScrollRestore.get(app);
  if (!states?.length) return;
  pendingScrollRestore.delete(app);
  const root = getAppRootElement(app);
  if (!root) return;
  requestAnimationFrame(() => {
    applyScrollState(root, states);
    requestAnimationFrame(() => applyScrollState(root, states));
  });
}

function captureWindowState(app) {
  const pos = app?.position;
  if (!pos) return null;
  return {
    left: Number(pos.left ?? 0),
    top: Number(pos.top ?? 0),
    width: Number(pos.width ?? 0),
    height: Number(pos.height ?? 0)
  };
}

function restorePendingWindowState(app) {
  const state = pendingWindowRestore.get(app);
  if (!state) return;
  pendingWindowRestore.delete(app);
  app.setPosition({
    left: Number.isFinite(state.left) ? state.left : undefined,
    top: Number.isFinite(state.top) ? state.top : undefined,
    width: Number.isFinite(state.width) && state.width > 100 ? state.width : undefined,
    height: Number.isFinite(state.height) && state.height > 100 ? state.height : undefined
  });
}

function emitOpenForPlayers(app) {
  if (!game.user.isGM) return;
  const requestId = foundry.utils.randomID();
  const label = app === "march" ? "Marching Order" : "Rest Watch";
  const timeoutId = setTimeout(() => {
    if (!openShareState.has(requestId)) return;
    openShareState.delete(requestId);
    ui.notifications?.warn(`${label} share failed: no player acknowledged.`);
  }, OPEN_SHARE_TIMEOUT_MS);

  openShareState.set(requestId, { app, timeoutId });
  ui.notifications?.info(`Sharing ${label} with players...`);
  game.socket.emit(SOCKET_CHANNEL, {
    type: "open",
    app,
    requestId,
    fromUserId: game.user.id
  });
}

function handleOpenAck(message) {
  if (!game.user.isGM) return;
  const entry = openShareState.get(message.requestId);
  if (!entry) return;
  clearTimeout(entry.timeoutId);
  openShareState.delete(message.requestId);
  const label = entry.app === "march" ? "Marching Order" : "Rest Watch";
  const userName = game.users.get(message.userId)?.name ?? "Player";
  ui.notifications?.info(`${label} shared with ${userName}.`);
}

export class RestWatchApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "rest-watch-app",
    classes: ["party-operations"],
    window: { title: "Party Operations - Rest Watch" },
    position: { width: 1020, height: 820 },
    resizable: true
  });

  static PARTS = {
    main: { template: "modules/party-operations/templates/rest-watch.hbs" }
  };

  async _prepareContext() {
    const isGM = game.user.isGM;
    const state = getRestWatchState();
    const visibility = state.visibility ?? "names-passives";
    const slots = buildWatchSlotsView(state, isGM, visibility);
    const lockBannerText = state.locked ? (isGM ? "Players locked" : "Locked by GM") : "";
    const lockBannerTooltip = state.locked ? (isGM ? "Players cannot edit while locked." : "Edits are disabled while the GM lock is active.") : "";
    
    // Get player character selector (non-GM only)
    const playerCharacters = isGM ? [] : buildPlayerCharacterSelector(slots);
    const quickNotes = isGM ? buildQuickNotes(state) : [];
    const light = calculateLightSources(state.slots, state.campfire);
    const operations = buildOperationsContext();
    const injuryRecovery = buildInjuryRecoveryContext();
    const mainTab = getActiveRestMainTab();
    const operationsPage = getActiveOperationsPage();
    const operationsPlanningTab = getActiveOperationsPlanningTab();
    const gmOperationsTab = getActiveGmOperationsTab();
    const miniViz = buildMiniVisualizationContext({ visibility });
    const miniVizUi = buildMiniVizUiContext();
    
    return {
      isGM,
      locked: state.locked,
      lockBannerText,
      lockBannerTooltip,
      lockBannerClass: isGM ? "is-gm" : "",
      showPopout: false,
      lastUpdatedAt: state.lastUpdatedAt ?? "-",
      lastUpdatedBy: state.lastUpdatedBy ?? "-",
      visibilityOptions: buildVisibilityOptions(visibility),
      highestPP: isGM ? computeHighestPP(slots) : "-",
      noDarkvision: isGM ? computeNoDarkvision(slots) : "",
      quickNotes,
      hasQuickNotes: quickNotes.length > 0,
      playerCharacters,
      slots,
      campfire: state.campfire ?? false,
      light,
      operations,
      injuryRecovery,
      miniViz,
      ...miniVizUi,
      mainTab,
      mainTabRestWatch: mainTab === "rest-watch",
      mainTabOperations: mainTab === "operations",
      gmPanelTabCore: mainTab === "rest-watch",
      gmPanelTabOperations: mainTab === "operations",
      operationsPagePlanning: operationsPage === "planning",
      operationsPageReadiness: operationsPage === "readiness",
      operationsPageComms: operationsPage === "comms",
      operationsPageRecon: operationsPage === "recon",
      operationsPageReputation: operationsPage === "reputation",
      operationsPageSupply: false,
      operationsPageBase: operationsPage === "base",
      operationsPageRecovery: operationsPage === "recovery",
      operationsPageGm: operationsPage === "gm",
      gmOpsTabEnvironment: gmOperationsTab === "environment",
      gmOpsTabLogs: gmOperationsTab === "logs",
      gmOpsTabDerived: gmOperationsTab === "derived",
      gmOpsTabActiveSync: gmOperationsTab === "active-sync",
      gmOpsTabCustom: gmOperationsTab === "custom",
      operationsPlanningRoles: operationsPlanningTab === "roles",
      operationsPlanningSops: operationsPlanningTab === "sops",
      operationsPlanningResources: operationsPlanningTab === "resources",
      operationsPlanningBonuses: operationsPlanningTab === "bonuses"
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (DEBUG_LOG) console.log("RestWatchApp: _onRender called");
    restWatchAppInstance = this;
    ensurePartyOperationsClass(this);
    
    if (this.element && !this.element.dataset.poBoundRest) {
      this.element.dataset.poBoundRest = "1";

      // Use event delegation on the app element
      this.element.addEventListener("click", (event) => {
        const tab = event.target?.closest(".po-tabs-main .po-tab");
        if (tab) return this.#onTabClick(tab, this.element);

        const actionElement = event.target?.closest("[data-action]");
        if (isFormActionElement(actionElement)) return;
        const action = actionElement?.dataset?.action;
        if (action) this.#onAction(event);
      });
      
      this.element.addEventListener("change", (event) => {
        if (event.target?.matches("select[data-action], input[data-action], textarea[data-action]")) {
          this.#onAction(event);
        } else if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        }
      });

      this.element.addEventListener("input", (event) => {
        if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        }
      });

      this.element.addEventListener("dblclick", (event) => {
        const portrait = event.target?.closest(".po-portrait");
        if (portrait) openActorSheetFromElement(portrait);
      });
    }

    // Update activity UI state
    this.#updateActivityUI();
    this.#applyOperationsHoverHints();
    applyNonGmOperationsReadonly(this);

    // Setup drag-and-drop for rest watch entries
    setupRestWatchDragAndDrop(this.element);
    
    if (game.user.isGM && !this._openedPlayers) {
      emitOpenRestPlayers();
      this._openedPlayers = true;
    }

    restorePendingWindowState(this);
    restorePendingUiState(this);
    restorePendingScrollState(this);

    if (DEBUG_LOG) console.log("RestWatchApp: event delegation attached", this.element);
  }

  #updateActivityUI() {
    const root = getAppRootElement(this);
    if (!root) return;
    root.querySelectorAll(".po-exhaustion-controls").forEach((container) => {
      const current = Number(container.dataset.exhaustion ?? 0);
      container.querySelectorAll(".po-exh-btn").forEach((button) => {
        const level = Number(button.dataset.level ?? 0);
        button.classList.toggle("is-active", level === current);
      });
    });
  }

  #applyOperationsHoverHints() {
    const root = getAppRootElement(this);
    if (!root || root.dataset.mainTab !== "operations") return;

    root.querySelectorAll(".po-gm-panel label.po-resource-row").forEach((label) => {
      const hintText = label.querySelector("span")?.textContent?.trim();
      if (hintText && !label.getAttribute("title")) {
        label.setAttribute("title", `${hintText}: configure this operations setting.`);
      }
      label.querySelectorAll("input, select, textarea").forEach((control) => {
        if (control.getAttribute("title") || !hintText) return;
        control.setAttribute("title", hintText);
      });
    });

    root.querySelectorAll(".po-gm-panel .po-btn, .po-gm-panel .po-switch").forEach((element) => {
      if (element.getAttribute("title")) return;
      const text = element.textContent?.trim().replace(/\s+/g, " ");
      if (!text) return;
      element.setAttribute("title", text);
    });
  }

  #renderWithPreservedState(renderOptions = { force: true, parts: ["main"] }) {
    const uiState = captureUiState(this);
    if (uiState) pendingUiRestore.set(this, uiState);
    const scrollState = captureScrollState(this);
    if (scrollState.length > 0) pendingScrollRestore.set(this, scrollState);
    this.render(renderOptions);
  }


  #onTabClick(tabElement, html) {
    const tabName = tabElement?.dataset?.tab;
    if (tabName === "marching-order") {
      new MarchingOrderApp().render({ force: true });
      this.close();
      return;
    }
    if (tabName === "operations") {
      setActiveRestMainTab("operations");
      this.#renderWithPreservedState({ force: true, parts: ["main"] });
      return;
    }
    if (tabName === "rest-watch") {
      setActiveRestMainTab("rest-watch");
      this.#renderWithPreservedState({ force: true, parts: ["main"] });
    }
  }

  async #onAction(event) {
    const element = event.target?.closest("[data-action]");
    const action = element?.dataset?.action;
    if (DEBUG_LOG) console.log("RestWatchApp #onAction:", { action, element, event });
    if (!action) return;
    if (element?.tagName === "SELECT" && event?.type !== "change") return;

    switch (action) {
      case "refresh":
        emitSocketRefresh();
        break;
      case "open-for-players":
        emitOpenForPlayers("rest");
        break;
      case "popout":
        this.render({ force: true, popOut: true });
        break;
      case "assign":
        await assignSlotByPicker(element);
        break;
      case "assign-me":
        await assignSlotToMe(element);
        break;
      case "clear":
        await clearSlotEntry(element);
        break;
      case "swap":
        await swapSlots(element);
        break;
      case "toggle-lock":
        await toggleRestLock(element);
        break;
      case "toggle-notes":
        toggleCardNotes(element);
        break;
      case "visibility":
        await updateVisibility(element);
        break;
      case "autofill-party":
        await autofillFromParty();
        break;
      case "autofill-last":
        await restoreRestCommitted();
        break;
      case "commit-plan":
        await commitRestWatchState();
        break;
      case "copy-text":
        await copyRestWatchText(false);
        break;
      case "copy-md":
        await copyRestWatchText(true);
        break;
      case "clear-all":
        await clearRestWatchAll();
        break;
      case "ping":
        await pingActorFromElement(element);
        break;
      case "time-range":
        await updateTimeRange(element);
        break;
      case "switch-character":
        await switchActiveCharacter(element);
        break;
      case "set-exhaustion":
        await updateExhaustion(element);
        break;
      case "set-activity":
        await updateActivity(element, { skipLocalRefresh: true });
        break;
      case "reset-activities":
        await resetAllActivities();
        break;
      case "toggle-campfire":
        await toggleCampfire(element);
        break;
      case "toggle-mini-viz":
        setMiniVizCollapsed(!isMiniVizCollapsed());
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-panel-tab":
        setActiveGmPanelTab(element?.dataset?.tab);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "operations-page":
        setActiveOperationsPage(element?.dataset?.page);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "operations-planning-tab":
        setActiveOperationsPlanningTab(element?.dataset?.planningTab);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-ops-tab":
        setActiveGmOperationsTab(element?.dataset?.gmTab);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "set-role":
        await setOperationalRole(element);
        break;
      case "clear-role":
        await clearOperationalRole(element);
        break;
      case "toggle-sop":
        await toggleOperationalSOP(element, { skipLocalRefresh: true });
        break;
      case "set-sop-note":
        await setOperationalSopNote(element);
        break;
      case "set-resource":
        await setOperationalResource(element);
        break;
      case "set-party-health-modifier":
        await setPartyHealthModifier(element);
        break;
      case "set-environment-preset":
        await setOperationalEnvironmentPreset(element);
        break;
      case "set-environment-dc":
        await setOperationalEnvironmentDc(element);
        break;
      case "set-environment-note":
        await setOperationalEnvironmentNote(element);
        break;
      case "set-environment-sync-non-party":
        await setOperationalEnvironmentSyncNonParty(element);
        break;
      case "set-environment-successive":
        await setOperationalEnvironmentSuccessive(element);
        break;
      case "reset-environment-successive-defaults":
        await resetOperationalEnvironmentSuccessiveDefaults();
        break;
      case "toggle-environment-actor":
        await toggleOperationalEnvironmentActor(element);
        break;
      case "add-environment-log":
        await addOperationalEnvironmentLog();
        break;
      case "edit-environment-log":
        await editOperationalEnvironmentLog(element);
        break;
      case "remove-environment-log":
        await removeOperationalEnvironmentLog(element);
        break;
      case "clear-environment-effects":
        await clearOperationalEnvironmentEffects();
        break;
      case "show-environment-brief":
        await showOperationalEnvironmentBrief();
        break;
      case "apply-upkeep":
        await applyOperationalUpkeep();
        break;
      case "gather-resource-check":
        await runGatherResourceCheck();
        break;
      case "show-operational-brief":
        await showOperationalBrief();
        break;
      case "set-comm-toggle":
        await setCommunicationToggle(element);
        break;
      case "set-comm-text":
        await setCommunicationText(element);
        break;
      case "set-recon-field":
        await setReconField(element);
        break;
      case "run-recon-check":
        await runReconCheck();
        break;
      case "show-recon-brief":
        await showReconBrief();
        break;
      case "show-communication-brief":
        await showCommunicationBrief();
        break;
      case "set-reputation-score":
        await setReputationScore(element);
        break;
      case "adjust-reputation-score":
        await adjustReputationScore(element);
        break;
      case "set-reputation-note":
        await setReputationNote(element);
        break;
      case "log-reputation-note":
        await logReputationNote(element);
        break;
      case "load-reputation-note-log":
        await loadReputationNoteLog(element);
        break;
      case "set-reputation-label":
        await setReputationLabel(element);
        break;
      case "add-reputation-faction":
        await addReputationFaction(element);
        break;
      case "remove-reputation-faction":
        await removeReputationFaction(element);
        break;
      case "set-reputation-filter-keyword":
        setReputationFilterState({ keyword: String(element?.value ?? "") });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "set-reputation-filter-standing":
        setReputationFilterState({ standing: String(element?.value ?? "all") });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "clear-reputation-filters":
        setReputationFilterState({ keyword: "", standing: "all" });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "show-reputation-brief":
        await showReputationBrief();
        break;
      case "set-party-health-custom-field":
        await setPartyHealthCustomField(element);
        break;
      case "set-party-health-sync-non-party":
        await setPartyHealthSyncNonParty(element);
        break;
      case "add-party-health-custom":
        await addPartyHealthCustomModifier(element);
        break;
      case "remove-party-health-custom":
        await removePartyHealthCustomModifier(element);
        break;
      case "remove-active-sync-effect":
        await removeActiveSyncEffect(element);
        break;
      case "archive-active-sync-effect":
        await archiveActiveSyncEffect(element);
        break;
      case "restore-archived-sync-effect":
        await restoreArchivedSyncEffect(element);
        break;
      case "remove-archived-sync-effect":
        await removeArchivedSyncEffect(element);
        break;
      case "set-archived-sync-field":
        await setArchivedSyncField(element);
        break;
      case "set-active-sync-effects-tab":
        setActiveSyncEffectsTab(String(element?.dataset?.tab ?? "active"));
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-add-faction":
        await gmQuickAddFaction();
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-add-modifier":
        await gmQuickAddModifier();
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-cancel-panel":
        setActiveGmQuickPanel("none");
        setGmQuickWeatherDraft(null);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-submit-faction":
        await gmQuickSubmitFaction(element);
        break;
      case "gm-quick-submit-modifier":
        await gmQuickSubmitModifier(element);
        break;
      case "gm-quick-sync-integrations":
        scheduleIntegrationSync("gm-quick-action");
        ui.notifications?.info("Party Operations integration sync queued.");
        break;
      case "gm-quick-session-autopilot":
        await runSessionAutopilot();
        break;
      case "gm-quick-undo-autopilot":
        await undoLastSessionAutopilot();
        break;
      case "gm-quick-log-weather":
        await gmQuickLogCurrentWeather();
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-submit-weather":
        await gmQuickSubmitWeather(element);
        break;
      case "gm-quick-weather-select":
        await gmQuickSelectWeatherPreset(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-weather-set":
        gmQuickUpdateWeatherDraftField(element);
        break;
      case "gm-quick-weather-add-dae":
        await gmQuickAddWeatherDaeChange(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-weather-remove-dae":
        await gmQuickRemoveWeatherDaeChange(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-weather-save-preset":
        await gmQuickSaveWeatherPreset(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "gm-quick-weather-delete-preset":
        await gmQuickDeleteWeatherPreset(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "show-gm-logs-manager":
        await showOperationalLogsManager();
        break;
      case "edit-global-log":
        await editGlobalLog(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "remove-global-log":
        await removeGlobalLog(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "set-base-ops-config":
        await setBaseOperationsConfig(element);
        break;
      case "upsert-base-site":
        await upsertBaseOperationsSite(element);
        break;
      case "clear-base-site":
        await clearBaseOperationsSite(element);
        break;
      case "open-base-site-storage":
        await showBaseSiteStorageManager(element);
        break;
      case "show-base-ops-brief":
        await showBaseOperationsBrief();
        break;
      case "set-injury-config":
        await setInjuryRecoveryConfig(element);
        break;
      case "upsert-injury":
        await upsertInjuryEntry(element);
        break;
      case "roll-injury-table":
        await rollInjuryTableForEditor(element);
        break;
      case "set-injury-result":
        syncInjuryEditorFromSelection(element);
        break;
      case "stabilize-injury":
        await stabilizeInjuryEntry(element);
        break;
      case "clear-injury":
        await clearInjuryEntry(element);
        break;
      case "show-injury-table":
        await showInjuryTable();
        break;
      case "apply-recovery-cycle":
        await applyRecoveryCycle();
        break;
      case "show-recovery-brief":
        await showRecoveryBrief();
        break;
      default:
        break;
    }
  }

  async #onNotesChange(event) {
    const state = getRestWatchState();
    if (isLockedForUser(state, game.user.isGM)) {
      ui.notifications?.warn("Rest watch is locked by the GM.");
      return;
    }
    const slotId = event.target?.closest(".po-card")?.dataset?.slotId;
    if (!slotId) return;
    const text = event.target.value ?? "";

    if (!game.user.isGM) {
      const actor = getActiveActorForUser();
      if (!actor) return;
      await updateRestWatchState({ op: "setEntryNotes", slotId, actorId: actor.id, text });
      return;
    }

    await updateRestWatchState((state) => {
      const slot = state.slots.find((entry) => entry.id === slotId);
      if (slot) slot.notes = text;
    });
  }
}

export class RestWatchPlayerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "rest-watch-player-app",
    classes: ["party-operations"],
    window: { title: "Party Operations - Rest Watch" },
    position: { width: 760, height: 620 },
    resizable: true
  });

  static PARTS = {
    main: { template: "modules/party-operations/templates/rest-watch-player.hbs" }
  };

  async _prepareContext() {
    const state = getRestWatchState();
    const visibility = state.visibility ?? "names-passives";
    const slots = buildWatchSlotsView(state, false, visibility);
    const lockBannerText = state.locked ? "Locked by GM" : "";
    const lockBannerTooltip = state.locked ? "Edits are disabled while the GM lock is active." : "";
    const miniViz = buildMiniVisualizationContext({ visibility });
    const miniVizUi = buildMiniVizUiContext();
    return {
      isGM: false,
      locked: state.locked,
      lockBannerText,
      lockBannerTooltip,
      lockBannerClass: "",
      showPopout: false,
      lastUpdatedAt: state.lastUpdatedAt ?? "-",
      lastUpdatedBy: state.lastUpdatedBy ?? "-",
      slots,
      miniViz,
      ...miniVizUi
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    restWatchPlayerAppInstance = this;
    ensurePartyOperationsClass(this);

    if (this.element && !this.element.dataset.poBoundRestPlayer) {
      this.element.dataset.poBoundRestPlayer = "1";

      this.element.addEventListener("click", (event) => {
        const actionElement = event.target?.closest("[data-action]");
        if (isFormActionElement(actionElement)) return;
        const action = actionElement?.dataset?.action;
        if (action) this.#onAction(event);
      });

      this.element.addEventListener("change", (event) => {
        if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        }
      });

      this.element.addEventListener("input", (event) => {
        if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        }
      });

      this.element.addEventListener("dblclick", (event) => {
        const portrait = event.target?.closest(".po-portrait");
        if (portrait) openActorSheetFromElement(portrait);
      });
    }

    this.#updateActivityUI();
    restorePendingWindowState(this);
    restorePendingUiState(this);
    restorePendingScrollState(this);
  }

  #updateActivityUI() {
    const root = getAppRootElement(this);
    if (!root) return;
    root.querySelectorAll(".po-exhaustion-controls").forEach((container) => {
      const current = Number(container.dataset.exhaustion ?? 0);
      container.querySelectorAll(".po-exh-btn").forEach((button) => {
        const level = Number(button.dataset.level ?? 0);
        button.classList.toggle("is-active", level === current);
      });
    });
  }

  async #onAction(event) {
    const element = event.target?.closest("[data-action]");
    const action = element?.dataset?.action;
    if (!action) return;
    if (element?.tagName === "SELECT" && event?.type !== "change") return;

    switch (action) {
      case "refresh":
        emitSocketRefresh();
        break;
      case "toggle-mini-viz":
        setMiniVizCollapsed(!isMiniVizCollapsed());
        this.render({ force: true, parts: ["main"] });
        break;
      case "assign-me":
        await assignSlotToUser(element);
        break;
      case "set-activity":
        await updateActivity(element, { skipLocalRefresh: true });
        break;
      case "clear":
        await clearSlotAssignment(element);
        break;
      case "toggle-notes":
        toggleCardNotes(element);
        break;
      case "ping":
        await pingActorFromElement(element);
        break;
      default:
        break;
    }
  }

  async #onNotesChange(event) {
    const state = getRestWatchState();
    if (isLockedForUser(state, game.user.isGM)) {
      ui.notifications?.warn("Rest watch is locked by the GM.");
      return;
    }
    const slotId = event.target?.closest(".po-card")?.dataset?.slotId;
    if (!slotId) return;
    const text = event.target.value ?? "";
    const actor = getActiveActorForUser();
    if (actor) {
      await updateRestWatchState({ op: "setEntryNotes", slotId, actorId: actor.id, text });
    }
  }
}

export class MarchingOrderApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "marching-order-app",
    classes: ["party-operations"],
    window: { title: "Party Operations - Marching Order" },
    position: { width: 1320, height: 920 },
    resizable: true
  });

  static PARTS = {
    main: { template: "modules/party-operations/templates/marching-order.hbs" }
  };

  async _prepareContext() {
    const isGM = game.user.isGM;
    const state = getMarchingOrderState();
    const ranks = buildRanksView(state, isGM);
    const usageUi = buildMarchSectionUi("usage");
    const gmShareUi = buildMarchSectionUi("gm-share");
    const gmHelpUi = buildMarchSectionUi("gm-help");
    const gmLockUi = buildMarchSectionUi("gm-lock");
    const gmFormationsUi = buildMarchSectionUi("gm-formations");
    const gmLightUi = buildMarchSectionUi("gm-light");
    const gmExportUi = buildMarchSectionUi("gm-export");
    const gmSnapshotUi = buildMarchSectionUi("gm-snapshot");
    const gmClearUi = buildMarchSectionUi("gm-clear");
    const gmNotesUi = buildMarchSectionUi("gm-notes");
    const lockBannerText = state.locked ? (isGM ? "Players locked" : "Locked by GM") : "";
    const lockBannerTooltip = state.locked ? (isGM ? "Players cannot edit while locked." : "Edits are disabled while the GM lock is active.") : "";
    const formation = normalizeMarchingFormation(state.formation ?? "default");
    const formationLabels = {
      default: "Default Formation (2 front, 3 middle)",
      "combat-ready": "Combat-Ready Formation (2 front, 2 middle)",
      "tight-corridor": "Tight Corridor Formation (2 front, 2 middle)",
      "low-visibility": "Low-Visibility Formation (1 front, 1 middle)"
    };
    const doctrineEffects = getDoctrineEffects(formation);
    const tracker = ensureDoctrineTracker(state);
    const miniViz = buildMiniVisualizationContext({ visibility: "names-passives" });
    const miniVizUi = buildMiniVizUiContext();
    return {
      isGM,
      locked: state.locked,
      lockBannerText,
      lockBannerTooltip,
      lockBannerClass: isGM ? "is-gm" : "",
      showPopout: false,
      lastUpdatedAt: state.lastUpdatedAt ?? "-",
      lastUpdatedBy: state.lastUpdatedBy ?? "-",
      usageCollapsed: usageUi.collapsed,
      usageToggleLabel: usageUi.toggleLabel,
      usageToggleIcon: usageUi.toggleIcon,
      ranks,
      gmNotes: state.gmNotes ?? "",
      lightToggles: buildLightToggles(state, ranks, isGM),
      gmSections: {
        shareCollapsed: gmShareUi.collapsed,
        shareToggleLabel: gmShareUi.toggleLabel,
        shareToggleIcon: gmShareUi.toggleIcon,
        helpCollapsed: gmHelpUi.collapsed,
        helpToggleLabel: gmHelpUi.toggleLabel,
        helpToggleIcon: gmHelpUi.toggleIcon,
        lockCollapsed: gmLockUi.collapsed,
        lockToggleLabel: gmLockUi.toggleLabel,
        lockToggleIcon: gmLockUi.toggleIcon,
        formationsCollapsed: gmFormationsUi.collapsed,
        formationsToggleLabel: gmFormationsUi.toggleLabel,
        formationsToggleIcon: gmFormationsUi.toggleIcon,
        lightCollapsed: gmLightUi.collapsed,
        lightToggleLabel: gmLightUi.toggleLabel,
        lightToggleIcon: gmLightUi.toggleIcon,
        exportCollapsed: gmExportUi.collapsed,
        exportToggleLabel: gmExportUi.toggleLabel,
        exportToggleIcon: gmExportUi.toggleIcon,
        snapshotCollapsed: gmSnapshotUi.collapsed,
        snapshotToggleLabel: gmSnapshotUi.toggleLabel,
        snapshotToggleIcon: gmSnapshotUi.toggleIcon,
        clearCollapsed: gmClearUi.collapsed,
        clearToggleLabel: gmClearUi.toggleLabel,
        clearToggleIcon: gmClearUi.toggleIcon,
        gmNotesCollapsed: gmNotesUi.collapsed,
        gmNotesToggleLabel: gmNotesUi.toggleLabel,
        gmNotesToggleIcon: gmNotesUi.toggleIcon
      },
      formation,
      formationLabel: formationLabels[formation] ?? formationLabels.default,
      doctrineEffects,
      doctrineTracker: {
        lastCheckAt: tracker.lastCheckAt ?? "-",
        lastCheckNote: tracker.lastCheckNote ?? "-"
      },
      miniViz,
      ...miniVizUi,
      activateFormation: {
        default: formation === "default",
        combatReady: formation === "combat-ready",
        tightCorridor: formation === "tight-corridor",
        lowVisibility: formation === "low-visibility"
      }
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    marchingOrderAppInstance = this;
    if (DEBUG_LOG) console.log("MarchingOrderApp: _onRender called");
    ensurePartyOperationsClass(this);
    
    if (this.element && !this.element.dataset.poBoundMarch) {
      this.element.dataset.poBoundMarch = "1";

      // Use event delegation on the app element
      this.element.addEventListener("click", (event) => {
        const tab = event.target?.closest(".po-tab");
        if (tab) return this.#onTabClick(tab, this.element);

        const actionElement = event.target?.closest("[data-action]");
        if (isFormActionElement(actionElement)) return;
        const action = actionElement?.dataset?.action;
        if (action) this.#onAction(event);
      });
      
      this.element.addEventListener("change", (event) => {
        if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        } else if (event.target?.matches("textarea.po-gm-notes")) {
          this.#onGMNotesChange(event);
        }
      });

      this.element.addEventListener("dblclick", (event) => {
        const portrait = event.target?.closest(".po-portrait");
        if (portrait) openActorSheetFromElement(portrait);
      });

      this.element.addEventListener("input", (event) => {
        if (event.target?.matches("textarea.po-notes-input")) {
          this.#onNotesChange(event);
        } else if (event.target?.matches("textarea.po-gm-notes")) {
          this.#onGMNotesChange(event);
        }
      });
    }
    
    setupMarchingDragAndDrop(this.element);
    restorePendingWindowState(this);
    restorePendingUiState(this);
    restorePendingScrollState(this);
    
    if (DEBUG_LOG) console.log("MarchingOrderApp: event delegation attached", this.element);
  }

  #onTabClick(tabElement, html) {
    const tabName = tabElement?.dataset?.tab;
    if (tabName === "rest-watch") {
      setActiveRestMainTab("rest-watch");
      new RestWatchApp().render({ force: true });
      this.close();
      return;
    }
    if (tabName === "operations") {
      setActiveRestMainTab("operations");
      new RestWatchApp().render({ force: true });
      this.close();
    }
  }

  async #onAction(event) {
    const element = event.target?.closest("[data-action]");
    const action = element?.dataset?.action;
    if (DEBUG_LOG) console.log("MarchingOrderApp #onAction:", { action, element, event });
    if (!action) return;

    switch (action) {
      case "refresh":
        emitSocketRefresh();
        break;
      case "open-for-players":
        emitOpenForPlayers("march");
        break;
      case "help":
        showMarchingHelp();
        break;
      case "popout":
        this.render({ force: true, popOut: true });
        break;
      case "toggle-mini-viz":
        setMiniVizCollapsed(!isMiniVizCollapsed());
        this.render({ force: true, parts: ["main"] });
        break;
      case "toggle-section": {
        const sectionId = element?.dataset?.sectionId;
        if (!sectionId) break;
        setMarchSectionCollapsed(sectionId, !isMarchSectionCollapsed(sectionId));
        this.render({ force: true, parts: ["main"] });
        break;
      }
      case "assign-rank":
        await assignActorToRank(element);
        break;
      case "remove-from-rank":
        await removeActorFromRanks(element);
        break;
      case "toggle-lock":
        await toggleMarchLock(element);
        break;
      case "toggle-light":
        await toggleLight(element);
        break;
      case "copy-text":
        await copyMarchingText(false);
        break;
      case "copy-md":
        await copyMarchingText(true);
        break;
      case "commit-plan":
        await commitMarchingOrderState();
        break;
      case "clear-all":
        await clearMarchingAll();
        break;
      case "ping":
        await pingActorFromElement(element);
        break;
      case "formation-standard":
        await applyMarchingFormation({ front: 2, middle: 3, type: "default" });
        break;
      case "formation-combat-ready":
        await applyMarchingFormation({ front: 2, middle: 2, type: "combat-ready" });
        break;
      case "formation-tight-corridor":
        await applyMarchingFormation({ front: 2, middle: 2, type: "tight-corridor" });
        break;
      case "formation-low-visibility":
        await applyMarchingFormation({ front: 1, middle: 1, type: "low-visibility" });
        break;
      case "doctrine-check":
        await runDoctrineCheckPrompt();
        break;
      case "toggle-notes":
          toggleNotesDrawer(element);
        break;
      default:
        break;
    }
  }

  async #onNotesChange(event) {
    const state = getMarchingOrderState();
    if (isLockedForUser(state, game.user.isGM)) {
      ui.notifications?.warn("Marching order is locked by the GM.");
      return;
    }
    const text = event.target.value ?? "";

    // Players: only allowed to edit notes for characters they own
    if (!game.user.isGM) {
      const actorId = event.target?.closest("[data-actor-id]")?.dataset?.actorId || getActiveActorForUser()?.id;
      if (!actorId) return;
      const actor = game.actors.get(actorId);
      if (!actor || !userOwnsActor(actor)) return;
      await updateMarchingOrderState({ op: "setNote", actorId, text });
      return;
    }

    // GM: apply per-actor notes directly
    const actorId = event.target?.closest("[data-actor-id]")?.dataset?.actorId;
    if (!actorId) return;
    await updateMarchingOrderState((state) => {
      if (!state.notes) state.notes = {};
      state.notes[actorId] = text;
    });
  }

  async #onGMNotesChange(event) {
    const state = getMarchingOrderState();
    if (isLockedForUser(state, game.user.isGM)) {
      ui.notifications?.warn("Marching order is locked by the GM.");
      return;
    }
    if (!game.user.isGM) return; // GM notes are GM-only
    const text = event.target.value ?? "";
    await updateMarchingOrderState((state) => {
      state.gmNotes = text;
    });
  }
}

function buildEmptyWatchSlots(isGM) {
  return [1, 2, 3, 4].map((index) => ({
    id: `watch-${index}`,
    label: `Watch ${index}`,
    timeRange: "",
    actor: null,
    notes: "",
    canAssign: isGM,
    canAssignMe: !isGM,
    canClear: false,
    canEditNotes: isGM
  }));
}

function buildEmptyRanks(isGM) {
  return [
    { id: "front", label: "Front Rank", entries: [], capacity: null, canJoin: false },
    { id: "middle", label: "Middle Rank", entries: [], capacity: null, canJoin: false },
    { id: "rear", label: "Rear Rank", entries: [], capacity: null, canJoin: false }
  ];
}

function buildStoredWatchSlots() {
  return [1, 2, 3, 4].map((index) => ({
    id: `watch-${index}`,
    timeRange: "",
    entries: [] // each entry: { actorId, notes }
  }));
}

function buildDefaultRestWatchState() {
  return {
    locked: false,
    lockedBy: "",
    visibility: "names-passives",
    campfire: false,
    lastUpdatedAt: "-",
    lastUpdatedBy: "-",
    slots: buildStoredWatchSlots()
  };
}

function buildDefaultActivityState() {
  return {
    dateCreated: new Date().toDateString(),
    activities: {} // actorId => { exhaustion, activity, spellSlots: {...}, hitDice: {...} }
  };
}

function buildDefaultOperationsLedger() {
  return {
    roles: {
      quartermaster: "",
      cartographer: "",
      chronicler: "",
      steward: ""
    },
    sops: {
      campSetup: false,
      watchRotation: false,
      dungeonBreach: false,
      urbanEntry: false,
      prisonerHandling: false,
      retreatProtocol: false
    },
    sopNotes: {
      campSetup: "",
      watchRotation: "",
      dungeonBreach: "",
      urbanEntry: "",
      prisonerHandling: "",
      retreatProtocol: ""
    },
    communication: {
      silentSignals: "",
      codePhrase: "",
      signalFlare: false,
      signalBell: false,
      preCombatPlan: false
    },
    reputation: {
      factions: getDefaultReputationFactions()
    },
    supplyLines: {
      resupplyRisk: "moderate",
      caravanEscortPlanned: false,
      caches: [],
      safehouses: []
    },
    recon: {
      objective: "",
      region: "",
      intelSource: "",
      heatLevel: "moderate",
      network: "limited",
      rumorReliability: 50,
      bribeBudget: 0,
      spySlots: 0,
      recentFindings: "",
      lastBriefAt: "-",
      lastBriefBy: "-"
    },
    baseOperations: {
      maintenanceRisk: "moderate",
      sites: []
    },
    environment: {
      presetKey: "none",
      movementDc: 12,
      appliedActorIds: [],
      syncToSceneNonParty: true,
      note: "",
      logs: [],
      failureStreaks: {},
      checkResults: [],
      successiveByPreset: {}
    },
    weather: {
      current: null,
      logs: []
    },
    partyHealth: {
      modifierEnabled: {},
      customModifiers: [],
      archivedSyncEffects: [],
      syncToSceneNonParty: true
    },
    resources: {
      food: 14,
      partyFoodRations: 28,
      partyWaterRations: 0,
      water: 14,
      torches: 6,
      upkeepLastAppliedTs: null,
      gather: {
        weatherMods: {
          clear: 0,
          "light-rain": 2,
          "heavy-rain": 5,
          wind: 2,
          fog: 3,
          extreme: 5
        },
        foodCoverageDueKey: null,
        waterCoverageDueKey: null
      },
      encumbrance: "light",
      upkeep: {
        partySize: 4,
        foodPerMember: 1,
        waterPerMember: 1,
        foodMultiplier: 1,
        waterMultiplier: 1,
        torchPerRest: 0
      }
    }
  };
}

function getUpkeepDueCount(timestamp = getCurrentWorldTimestamp()) {
  const worldTs = Number(timestamp);
  if (!Number.isFinite(worldTs)) return 0;
  const duskOffsetSeconds = UPKEEP_DUSK_MINUTES * 60;
  return Math.floor((worldTs - duskOffsetSeconds) / 86400);
}

function getNextUpkeepDueKey(timestamp = getCurrentWorldTimestamp()) {
  return getUpkeepDueCount(timestamp) + 1;
}

function getUpkeepDaysFromCalendar(lastAppliedTimestamp, currentTimestamp = getCurrentWorldTimestamp()) {
  const now = Number(currentTimestamp);
  const last = Number(lastAppliedTimestamp);
  if (!Number.isFinite(now)) return 0;
  if (!Number.isFinite(last)) return 0;
  const nowDue = getUpkeepDueCount(now);
  const lastDue = getUpkeepDueCount(last);
  return Math.max(0, nowDue - lastDue);
}

function getOperationsLedger() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.OPS_LEDGER);
  return foundry.utils.mergeObject(buildDefaultOperationsLedger(), stored ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });
}

async function updateOperationsLedger(mutator, options = {}) {
  if (typeof mutator !== "function") return;
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update operations data.");
    return;
  }
  const ledger = getOperationsLedger();
  mutator(ledger);

  if (options.skipLocalRefresh) suppressNextSettingRefresh(`${MODULE_ID}.${SETTINGS.OPS_LEDGER}`);
  await game.settings.set(MODULE_ID, SETTINGS.OPS_LEDGER, ledger);
  scheduleIntegrationSync("operations-ledger");
  if (!options.skipLocalRefresh) refreshOpenApps();
  emitSocketRefresh();
}

function buildRoleActorOptions(selectedActorId) {
  return game.actors.contents
    .filter((actor) => actor.type === "character" || actor.hasPlayerOwner)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((actor) => ({
      id: actor.id,
      name: actor.name,
      selected: actor.id === selectedActorId
    }));
}

function getOwnedPcActors() {
  const fromParty = Array.isArray(game.party?.members) ? game.party.members : [];
  const unique = new Map();
  for (const actor of fromParty) {
    if (!actor || actor.type !== "character" || !actor.hasPlayerOwner) continue;
    unique.set(actor.id, actor);
  }
  if (unique.size === 0) {
    for (const actor of game.actors.contents) {
      if (!actor || actor.type !== "character" || !actor.hasPlayerOwner) continue;
      unique.set(actor.id, actor);
    }
  }
  return Array.from(unique.values());
}

function getPartyMemberActorIds() {
  const ids = new Set();
  for (const actor of Array.isArray(game.party?.members) ? game.party.members : []) {
    if (!actor?.id) continue;
    ids.add(String(actor.id));
  }
  for (const actor of getOwnedPcActors()) {
    if (!actor?.id) continue;
    ids.add(String(actor.id));
  }
  return ids;
}

function getSceneNonPartyIntegrationActors() {
  const scene = game.scenes?.current;
  if (!scene) return [];
  const partyActorIds = getPartyMemberActorIds();
  const unique = new Map();
  for (const tokenDoc of scene.tokens?.contents ?? []) {
    const actor = tokenDoc?.actor;
    if (!actor) continue;
    const actorId = String(actor.id ?? tokenDoc.actorId ?? "").trim();
    if (actorId && partyActorIds.has(actorId)) continue;
    if (actor.hasPlayerOwner) continue;
    const key = String(actor.uuid ?? `${scene.id}:${tokenDoc.id}:${actorId || tokenDoc.id}`);
    if (!key || unique.has(key)) continue;
    unique.set(key, actor);
  }
  return Array.from(unique.values());
}

function getResourceOwnerActors() {
  return game.actors.contents
    .filter((actor) => actor && actor.hasPlayerOwner)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function getResourceInventoryItems(actor) {
  if (!actor?.items?.contents) return [];
  return actor.items.contents
    .filter((item) => item && item.type === "consumable" && (item.system?.quantity !== undefined || item.system?.uses?.value !== undefined))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function buildResourceSelectionContext(resourcesState, resourceKey) {
  const selectedActorId = String(resourcesState?.itemSelections?.[resourceKey]?.actorId ?? "");
  const selectedItemId = String(resourcesState?.itemSelections?.[resourceKey]?.itemId ?? "");
  const actors = getResourceOwnerActors();
  const actorOptions = [
    { id: "", name: "None", selected: !selectedActorId },
    ...actors.map((actor) => ({ id: actor.id, name: actor.name, selected: actor.id === selectedActorId }))
  ];

  const selectedActor = selectedActorId ? game.actors.get(selectedActorId) : null;
  const itemOptions = [{ id: "", name: "None", selected: !selectedItemId }];
  if (selectedActor) {
    const items = getResourceInventoryItems(selectedActor);
    for (const item of items) {
      const qty = Math.max(0, Math.floor(getItemTrackedQuantity(item)));
      itemOptions.push({
        id: item.id,
        name: `${item.name} (${qty})`,
        selected: item.id === selectedItemId
      });
    }
  }

  return {
    selectedActorId,
    selectedItemId,
    actorOptions,
    itemOptions,
    hasActor: Boolean(selectedActor)
  };
}

function getSelectedResourceItemQuantity(resourcesState, resourceKey) {
  const actorId = String(resourcesState?.itemSelections?.[resourceKey]?.actorId ?? "");
  const itemId = String(resourcesState?.itemSelections?.[resourceKey]?.itemId ?? "");
  if (!actorId || !itemId) return 0;
  const actor = game.actors.get(actorId);
  const item = actor?.items?.get(itemId);
  if (!item) return 0;
  return Math.max(0, Math.floor(getItemTrackedQuantity(item)));
}

function buildOperationsContext() {
  const ledger = getOperationsLedger();
  const roleMeta = [
    {
      key: "quartermaster",
      label: "Quartermaster",
      bonus: "+Supply discipline",
      penalty: "Missed ration/ammo tracking",
      hint: "Assign this role to keep supply usage, load tracking, and upkeep consistent."
    },
    {
      key: "cartographer",
      label: "Cartographer",
      bonus: "+Route clarity",
      penalty: "Navigation uncertainty",
      hint: "Assign this role to maintain route notes, landmarks, and navigation prep."
    },
    {
      key: "chronicler",
      label: "Chronicler",
      bonus: "+Operational recall",
      penalty: "Lost session intel",
      hint: "Assign this role to track key discoveries, risks, and mission outcomes."
    },
    {
      key: "steward",
      label: "Steward",
      bonus: "+Financial control",
      penalty: "Debt/coin drift",
      hint: "Assign this role to manage coin flow, contracts, and downtime costs."
    }
  ];

  const roles = roleMeta.map((role) => {
    const actorId = ledger.roles?.[role.key] ?? "";
    const actor = actorId ? game.actors.get(actorId) : null;
    return {
      key: role.key,
      label: role.label,
      actorId,
      actorName: actor?.name ?? "Unassigned",
      hasActor: Boolean(actor),
      bonus: role.bonus,
      penalty: role.penalty,
      hint: role.hint,
      actorOptions: buildRoleActorOptions(actorId)
    };
  });

  const sopMeta = [
    { key: "campSetup", label: "Camp setup" },
    { key: "watchRotation", label: "Watch rotation" },
    { key: "dungeonBreach", label: "Dungeon breach protocol" },
    { key: "urbanEntry", label: "Urban entry protocol" },
    { key: "prisonerHandling", label: "Prisoner handling" },
    { key: "retreatProtocol", label: "Retreat protocol" }
  ];

  const sops = sopMeta.map((sop) => ({
    key: sop.key,
    label: sop.label,
    active: Boolean(ledger.sops?.[sop.key]),
    note: String(ledger.sopNotes?.[sop.key] ?? "")
  }));

  const roleCoverage = roles.filter((role) => role.hasActor).length;
  const missingRoles = Math.max(0, roles.length - roleCoverage);
  const activeSops = sops.filter((sop) => sop.active).length;
  const disorderRisk = missingRoles + Math.max(0, 3 - activeSops);
  const effects = getOperationalEffects(ledger, roles, sops);
  const communication = ledger.communication ?? {};
  const communicationReadiness = getCommunicationReadiness(communication);
  const reconState = ensureReconState(ledger);
  const recon = buildReconContext(reconState);
  const reputationState = ensureReputationState(ledger);
  const reputationFilters = getReputationFilterState();
  const reputation = buildReputationContext(reputationState, reputationFilters);
  const partyHealthState = ensurePartyHealthState(ledger);
  const baseOperations = buildBaseOperationsContext(ledger.baseOperations ?? {});
  const environmentState = ensureEnvironmentState(ledger);
  const weatherState = ensureWeatherState(ledger);
  const environmentPresetBase = getEnvironmentPresetByKey(environmentState.presetKey);
  const environmentPreset = applyEnvironmentSuccessiveConfigToPreset(environmentPresetBase, environmentState);
  const environmentOutcomes = buildEnvironmentOutcomeSummary(environmentPreset);
  const environmentSuccessiveConfig = getEnvironmentSuccessiveConfig(environmentState, environmentPresetBase);
  const daeAvailable = isDaeAvailable();
  const partyModifierKeyCatalog = buildPartyHealthModifierKeyCatalog();
  const partyModifierKeyOptions = partyModifierKeyCatalog.map((entry) => ({
    value: entry.key,
    label: entry.label,
    hint: entry.hint
  }));
  const partyModifierModeOptions = Object.entries(CONST.ACTIVE_EFFECT_MODES ?? {})
    .map(([label, value]) => ({ label, value: Number(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const daeModeOptions = Object.entries(CONST.ACTIVE_EFFECT_MODES ?? {})
    .map(([label, value]) => ({
      value: Number(value),
      label,
      selected: Number(value) === Number(environmentSuccessiveConfig.daeChangeMode)
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const daeKeyOptions = buildEnvironmentDaeChangeKeyCatalog().map((entry) => ({
    value: entry.key,
    label: entry.label,
    hint: entry.hint,
    selected: entry.key === environmentSuccessiveConfig.daeChangeKey
  }));
  const selectedEnvDaeHint = daeKeyOptions.find((entry) => entry.selected)?.hint ?? "Select a system field to change on successive failure.";
  const statusEffectOptions = [
    { value: "", label: "None", selected: !environmentSuccessiveConfig.statusId },
    ...(CONFIG.statusEffects ?? []).map((entry) => {
      const value = String(entry?.id ?? "").trim();
      return {
        value,
        label: String((entry?.name ?? value) || "Status").trim(),
        selected: value && value === environmentSuccessiveConfig.statusId
      };
    }).filter((option) => option.value)
  ];
  const damageTypeOptions = buildDamageTypeOptions(environmentSuccessiveConfig.damageType);
  const gmQuickPanel = getActiveGmQuickPanel();
  const environmentTargets = getOwnedPcActors()
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((actor) => ({
      actorId: actor.id,
      actorName: actor.name,
      selected: environmentState.appliedActorIds.includes(actor.id),
      failureStreak: Math.max(0, Number(environmentState.failureStreaks?.[actor.id] ?? 0) || 0)
    }));
  const environmentActorNames = new Map(environmentTargets.map((target) => [target.actorId, target.actorName]));
  const environmentLogs = (environmentState.logs ?? [])
    .filter((entry) => String(entry?.logType ?? "environment").trim().toLowerCase() !== "weather")
    .map((entry) => {
      const preset = getEnvironmentPresetByKey(entry.presetKey);
      const check = getEnvironmentCheckMeta({
        checkType: entry.checkType ?? preset.checkType,
        checkKey: entry.checkKey ?? preset.checkKey,
        checkLabel: entry.checkLabel ?? preset.checkLabel
      });
      const actorNames = (entry.actorIds ?? []).map((actorId) => environmentActorNames.get(actorId) ?? (game.actors.get(actorId)?.name ?? `Actor ${actorId}`));
      const createdAtDate = new Date(Number(entry.createdAt ?? Date.now()));
      return {
        id: entry.id,
        presetKey: entry.presetKey,
        presetLabel: preset.label,
        checkLabel: check.checkLabel,
        movementDc: Math.max(1, Math.floor(Number(entry.movementDc ?? 12) || 12)),
        actorNames,
        actorNamesText: actorNames.length > 0 ? actorNames.join(", ") : "No actors assigned",
        syncToSceneNonParty: entry.syncToSceneNonParty !== false,
        note: String(entry.note ?? ""),
        hasNote: String(entry.note ?? "").trim().length > 0,
        createdBy: String(entry.createdBy ?? "GM"),
        createdAtLabel: Number.isFinite(createdAtDate.getTime()) ? createdAtDate.toLocaleString() : "Unknown"
      };
    });
  const environmentCheckResults = (environmentState.checkResults ?? [])
    .map((entry) => {
      const preset = getEnvironmentPresetByKey(entry.presetKey);
      const actorName = String(entry.actorName ?? "").trim()
        || (entry.actorId ? String(game.actors.get(entry.actorId)?.name ?? `Actor ${entry.actorId}`) : "Unknown Actor");
      const createdAtDate = new Date(Number(entry.createdAt ?? Date.now()));
      const rollValue = Number(entry.rollTotal);
      const dcValue = Number(entry.dc);
      const rollLabel = Number.isFinite(rollValue) ? String(Math.floor(rollValue)) : "-";
      const dcLabel = Number.isFinite(dcValue) ? String(Math.floor(dcValue)) : "-";
      return {
        id: entry.id,
        actorName,
        presetLabel: preset.label,
        resultLabel: entry.result === "fail" ? "Fail" : "Pass",
        isFail: entry.result === "fail",
        rollVsDc: `${rollLabel} vs ${dcLabel}`,
        streak: Math.max(0, Number(entry.streak ?? 0) || 0),
        outcomeSummary: String(entry.outcomeSummary ?? ""),
        hasOutcomeSummary: String(entry.outcomeSummary ?? "").trim().length > 0,
        createdBy: String(entry.createdBy ?? "GM"),
        createdAtLabel: Number.isFinite(createdAtDate.getTime()) ? createdAtDate.toLocaleString() : "Unknown"
      };
    })
    .slice(0, 20);

  const upkeep = {
    partySize: Number(ledger.resources?.upkeep?.partySize ?? 4),
    foodPerMember: Number(ledger.resources?.upkeep?.foodPerMember ?? 1),
    waterPerMember: Number(ledger.resources?.upkeep?.waterPerMember ?? 1),
    foodMultiplier: Number(ledger.resources?.upkeep?.foodMultiplier ?? 1),
    waterMultiplier: Number(ledger.resources?.upkeep?.waterMultiplier ?? 1),
    torchPerRest: Number(ledger.resources?.upkeep?.torchPerRest ?? 0)
  };

  const resourcesState = foundry.utils.deepClone(ledger.resources ?? {});
  ensureOperationalResourceConfig(resourcesState);
  const gatherWeatherOptions = getGatherWeatherOptions(resourcesState);
  const foodDrainPerDay = Math.max(0, Math.ceil(upkeep.partySize * upkeep.foodPerMember * upkeep.foodMultiplier));
  const waterDrainPerDay = Math.max(0, Math.ceil(upkeep.partySize * upkeep.waterPerMember * upkeep.waterMultiplier));
  const torchDrainPerDay = Math.max(0, Math.ceil(upkeep.torchPerRest));
  const upkeepDaysPending = getUpkeepDaysFromCalendar(resourcesState.upkeepLastAppliedTs, getCurrentWorldTimestamp());
  const resourcesNumeric = {
    food: Number(resourcesState.food ?? 0),
    partyFoodRations: Number(resourcesState.partyFoodRations ?? 0),
    partyWaterRations: Number(resourcesState.partyWaterRations ?? 0),
    water: Number(resourcesState.water ?? 0),
    torches: Number(resourcesState.torches ?? 0)
  };
  const linkedFoodStock = getSelectedResourceItemQuantity(resourcesState, "food");
  const totalFoodReserve = Math.max(0, resourcesNumeric.partyFoodRations) + linkedFoodStock;
  const totalWaterReserve = Math.max(0, resourcesNumeric.partyWaterRations);

  const formatCyclesLeft = (stock, drain) => {
    if (drain <= 0) return "∞";
    return (Math.max(0, stock) / drain).toFixed(1);
  };

  const selectedBindingCount = RESOURCE_TRACK_KEYS.filter((key) => {
    const selected = resourcesState.itemSelections?.[key] ?? {};
    return Boolean(String(selected.actorId ?? "").trim() && String(selected.itemId ?? "").trim());
  }).length;

  const nextDueKey = getNextUpkeepDueKey(getCurrentWorldTimestamp());
  const gatherFoodCoveredNextUpkeep = Number(resourcesState.gather?.foodCoverageDueKey) === nextDueKey;
  const gatherWaterCoveredNextUpkeep = Number(resourcesState.gather?.waterCoverageDueKey) === nextDueKey;
  const archivedSyncActorIds = new Set(
    (partyHealthState.archivedSyncEffects ?? [])
      .map((entry) => String(entry?.actorId ?? "").trim())
      .filter(Boolean)
  );
  const activeSyncEffects = getOwnedPcActors()
    .map((actor) => {
      const effect = getIntegrationEffect(actor);
      if (!effect) return null;
      return {
        actorId: actor.id,
        actorName: actor.name,
        effectId: effect.id,
        effectName: String(effect.name ?? INTEGRATION_EFFECT_NAME)
      };
    })
    .filter((entry) => entry && !archivedSyncActorIds.has(String(entry.actorId ?? "").trim()));
  const currentWeather = weatherState.current ?? null;
  const weatherLogs = (weatherState.logs ?? []).map((entry) => {
    const loggedAtDate = new Date(Number(entry.loggedAt ?? Date.now()));
    return {
      ...entry,
      loggedAtLabel: Number.isFinite(loggedAtDate.getTime()) ? loggedAtDate.toLocaleString() : "Unknown"
    };
  });
  const weatherSceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const weatherQuickOptions = buildWeatherSelectionCatalog(weatherState, weatherSceneSnapshot);
  const storedWeatherDraft = getGmQuickWeatherDraft();
  const fallbackWeatherOption = weatherQuickOptions[0] ?? null;
  const selectedWeatherKey = String(storedWeatherDraft?.selectedKey ?? fallbackWeatherOption?.key ?? "").trim();
  const selectedWeatherOption = weatherQuickOptions.find((entry) => entry.key === selectedWeatherKey) ?? fallbackWeatherOption;
  const weatherQuickDraft = {
    selectedKey: String(selectedWeatherOption?.key ?? ""),
    darkness: Number.isFinite(Number(storedWeatherDraft?.darkness))
      ? Math.max(0, Math.min(1, Number(storedWeatherDraft.darkness)))
      : Math.max(0, Math.min(1, Number(selectedWeatherOption?.darkness ?? weatherSceneSnapshot.darkness ?? 0))),
    visibilityModifier: Number.isFinite(Number(storedWeatherDraft?.visibilityModifier))
      ? Math.max(-5, Math.min(5, Math.floor(Number(storedWeatherDraft.visibilityModifier))))
      : Math.max(-5, Math.min(5, Math.floor(Number(selectedWeatherOption?.visibilityModifier ?? 0) || 0))),
    note: String(storedWeatherDraft?.note ?? ""),
    presetName: String(storedWeatherDraft?.presetName ?? ""),
    daeChanges: Array.isArray(storedWeatherDraft?.daeChanges)
      ? storedWeatherDraft.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
      : (Array.isArray(selectedWeatherOption?.daeChanges)
        ? selectedWeatherOption.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
        : [])
  };
  const globalLogs = (environmentState.logs ?? [])
    .map((entry) => {
      const createdAt = Number(entry?.createdAt ?? Date.now());
      const createdAtLabel = Number.isFinite(createdAt) ? new Date(createdAt).toLocaleString() : "Unknown";
      const logType = String(entry?.logType ?? "environment").trim().toLowerCase() === "weather" ? "weather" : "environment";
      if (logType === "weather") {
        return {
          id: `weather:${entry.id}`,
          sourceId: entry.id,
          logType,
          logTypeLabel: "Weather",
          title: String(entry.label ?? "Weather").trim() || "Weather",
          summary: `Visibility ${formatSignedModifier(Number(entry.visibilityModifier ?? 0)) || "0"} · Darkness ${Number(entry.darkness ?? 0).toFixed(2)}`,
          details: `${getWeatherEffectSummary(Number(entry.visibilityModifier ?? 0))} · ${describeWeatherDaeChanges(entry.daeChanges ?? [])}`,
          note: String(entry.note ?? ""),
          hasNote: String(entry.note ?? "").trim().length > 0,
          createdBy: String(entry.createdBy ?? "GM"),
          createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
          createdAtLabel
        };
      }
      const preset = getEnvironmentPresetByKey(entry.presetKey);
      const check = getEnvironmentCheckMeta(entry);
      const actorNames = (entry.actorIds ?? []).map((actorId) => environmentActorNames.get(actorId) ?? (game.actors.get(actorId)?.name ?? `Actor ${actorId}`));
      return {
        id: `env:${entry.id}`,
        sourceId: entry.id,
        logType,
        logTypeLabel: "Environment",
        title: preset.label,
        summary: `${check.checkLabel} · DC ${Math.max(1, Math.floor(Number(entry.movementDc ?? 12) || 12))}`,
        details: `Affected: ${actorNames.length > 0 ? actorNames.join(", ") : "No actors assigned"}${entry.syncToSceneNonParty !== false ? " · + non-party scene actors" : ""}`,
        note: String(entry.note ?? ""),
        hasNote: String(entry.note ?? "").trim().length > 0,
        createdBy: String(entry.createdBy ?? "GM"),
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        createdAtLabel
      };
    })
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
  const activeSyncEffectsTab = getActiveSyncEffectsTab();
  const archivedSyncEffects = (partyHealthState.archivedSyncEffects ?? [])
    .map((entry) => {
      const archivedAtDate = new Date(Number(entry.archivedAt ?? Date.now()));
      return {
        id: entry.id,
        actorId: entry.actorId,
        actorName: entry.actorName,
        effectName: entry.effectName,
        label: entry.label,
        note: entry.note,
        archivedBy: entry.archivedBy,
        archivedAt: Number(entry.archivedAt ?? 0) || 0,
        archivedAtLabel: Number.isFinite(archivedAtDate.getTime()) ? archivedAtDate.toLocaleString() : "Unknown"
      };
    })
    .sort((a, b) => Number(b.archivedAt ?? 0) - Number(a.archivedAt ?? 0));

  return {
    roles,
    sops,
    resources: {
      food: resourcesNumeric.food,
      linkedFoodStock,
      partyFoodRations: resourcesNumeric.partyFoodRations,
      partyWaterRations: resourcesNumeric.partyWaterRations,
      water: resourcesNumeric.water,
      torches: resourcesNumeric.torches,
      itemSelections: {
        food: buildResourceSelectionContext(resourcesState, "food"),
        water: buildResourceSelectionContext(resourcesState, "water"),
        torches: buildResourceSelectionContext(resourcesState, "torches")
      },
      gatherWeatherOptions,
      gatherFoodCoveredNextUpkeep,
      gatherWaterCoveredNextUpkeep,
      summary: {
        foodDrainPerDay,
        waterDrainPerDay,
        torchDrainPerDay,
        upkeepDaysPending,
        foodDrainPending: foodDrainPerDay * upkeepDaysPending,
        waterDrainPending: waterDrainPerDay * upkeepDaysPending,
        foodCyclesLeft: formatCyclesLeft(totalFoodReserve, foodDrainPerDay),
        foodRationCyclesLeft: formatCyclesLeft(resourcesNumeric.partyFoodRations, foodDrainPerDay),
        waterCyclesLeft: formatCyclesLeft(totalWaterReserve, waterDrainPerDay),
        waterRationCyclesLeft: formatCyclesLeft(resourcesNumeric.partyWaterRations, waterDrainPerDay),
        selectedBindingCount
      },
      upkeep,
      encumbranceOptions: [
        { value: "light", label: "Light", selected: (resourcesState.encumbrance ?? "light") === "light" },
        { value: "moderate", label: "Moderate", selected: (resourcesState.encumbrance ?? "light") === "moderate" },
        { value: "heavy", label: "Heavy", selected: (resourcesState.encumbrance ?? "light") === "heavy" },
        { value: "overloaded", label: "Overloaded", selected: (resourcesState.encumbrance ?? "light") === "overloaded" }
      ]
    },
    communication: {
      silentSignals: communication.silentSignals ?? "",
      codePhrase: communication.codePhrase ?? "",
      signalFlare: Boolean(communication.signalFlare),
      signalBell: Boolean(communication.signalBell),
      preCombatPlan: Boolean(communication.preCombatPlan),
      readiness: communicationReadiness
    },
    recon,
    partyHealth: {
      customModifiers: partyHealthState.customModifiers.map((entry) => ({
        ...entry,
        modeLabel: getActiveEffectModeLabel(entry.mode),
        keyHint: partyModifierKeyOptions.find((option) => option.value === entry.key)?.hint ?? "",
        modeOptions: partyModifierModeOptions.map((option) => ({
          ...option,
          selected: Number(option.value) === Number(entry.mode)
        })),
        keyOptions: partyModifierKeyOptions
      })),
      modifierModeOptions: partyModifierModeOptions,
      modifierKeyOptions: partyModifierKeyOptions,
      activeSyncEffects,
      hasActiveSyncEffects: activeSyncEffects.length > 0,
      activeSyncEffectsTab,
      activeSyncEffectsTabActive: activeSyncEffectsTab === "active",
      activeSyncEffectsTabArchived: activeSyncEffectsTab === "archived",
      activeSyncEffectsCount: activeSyncEffects.length,
      archivedSyncEffects,
      hasArchivedSyncEffects: archivedSyncEffects.length > 0,
      archivedSyncEffectsCount: archivedSyncEffects.length,
      daeAvailable,
      syncToSceneNonParty: Boolean(partyHealthState.syncToSceneNonParty)
    },
    environment: {
      presetKey: environmentState.presetKey,
      preset: environmentPreset,
      checkLabel: getEnvironmentCheckMeta(environmentPreset).checkLabel,
      movementDc: environmentState.movementDc,
      note: environmentState.note,
      syncToSceneNonParty: Boolean(environmentState.syncToSceneNonParty),
      movementCheckActive: Boolean(environmentPreset.movementCheck),
      outcomes: environmentOutcomes,
      successiveConfig: {
        ...environmentSuccessiveConfig,
        daeAvailable,
        statusOptions: statusEffectOptions,
        damageTypeOptions,
        daeModeOptions,
        daeKeyOptions,
        daeKeyHint: selectedEnvDaeHint
      },
      targetCount: environmentTargets.filter((target) => target.selected).length,
      appliedActorIds: [...environmentState.appliedActorIds],
      targets: environmentTargets,
      logs: environmentLogs,
      hasLogs: environmentLogs.length > 0,
      checkResults: environmentCheckResults,
      hasCheckResults: environmentCheckResults.length > 0,
      presetOptions: ENVIRONMENT_PRESETS.map((preset) => ({
        key: preset.key,
        label: preset.label,
        selected: preset.key === environmentState.presetKey
      }))
    },
    weather: {
      current: currentWeather,
      hasCurrent: Boolean(currentWeather),
      currentLabel: String(currentWeather?.label ?? "Not logged"),
      currentVisibilityModifier: Number(currentWeather?.visibilityModifier ?? 0),
      currentDarkness: Number(currentWeather?.darkness ?? 0),
      logs: weatherLogs,
      hasLogs: weatherLogs.length > 0
    },
    gmQuickTools: {
      activePanel: gmQuickPanel,
      showFactionPanel: gmQuickPanel === "faction",
      showModifierPanel: gmQuickPanel === "modifier",
      showWeatherPanel: gmQuickPanel === "weather",
      modifierModeOptions: partyModifierModeOptions,
      modifierKeyOptions: partyModifierKeyOptions,
      weatherSceneSnapshot,
      weatherOptions: weatherQuickOptions.map((option) => ({
        key: option.key,
        label: option.label,
        weatherId: option.weatherId,
        isBuiltIn: Boolean(option.isBuiltIn),
        visibilityModifier: Number(option.visibilityModifier ?? 0),
        visibilityLabel: formatSignedModifier(Number(option.visibilityModifier ?? 0)) || "0",
        effectSummary: getWeatherEffectSummary(Number(option.visibilityModifier ?? 0)),
        daeSummary: describeWeatherDaeChanges(option.daeChanges ?? []),
        selected: option.key === weatherQuickDraft.selectedKey
      })),
      weatherDaeModeOptions: Object.entries(CONST.ACTIVE_EFFECT_MODES ?? {})
        .map(([label, value]) => ({ label, value: Number(value) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      weatherDraft: weatherQuickDraft
    },
    globalLogs: {
      entries: globalLogs,
      hasEntries: globalLogs.length > 0
    },
    reputation,
    baseOperations,
    summary: {
      roleCoverage,
      roleTotal: roles.length,
      activeSops,
      sopTotal: sops.length,
      prepEdge: roleCoverage >= 3 && activeSops >= 3,
      disorderRisk,
      reconReadiness: recon.readinessLabel,
      maintenancePressure: baseOperations.maintenancePressure,
      effects
    },
    diagnostics: {
      missingRoles: roles.filter((role) => !role.hasActor).map((role) => role.label),
      inactiveSops: sops.filter((sop) => !sop.active).map((sop) => sop.label)
    }
  };
}

function getOperationalEffects(ledger, roles, sops) {
  const roleCoverage = roles.filter((role) => role.hasActor).length;
  const activeSops = sops.filter((sop) => sop.active).length;
  const hasQuartermaster = Boolean(ledger.roles?.quartermaster);
  const hasCartographer = Boolean(ledger.roles?.cartographer);
  const hasChronicler = Boolean(ledger.roles?.chronicler);
  const hasSteward = Boolean(ledger.roles?.steward);
  const communication = ledger.communication ?? {};
  const comms = getCommunicationReadiness(communication);
  const recon = buildReconContext(ensureReconState(ledger));
  const reputation = buildReputationContext(ensureReputationState(ledger));
  const baseOperations = buildBaseOperationsContext(ledger.baseOperations ?? {});
  const weatherState = ensureWeatherState(ledger);
  const weatherVisibilityModifier = Number(weatherState.current?.visibilityModifier ?? 0);
  const weatherLabel = String(weatherState.current?.label ?? "Weather");
  const weatherDaeChanges = Array.isArray(weatherState.current?.daeChanges)
    ? weatherState.current.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
    : [];
  const prepEdge = roleCoverage >= 3 && activeSops >= 3;

  const bonuses = [];
  const globalMinorBonuses = [];
  const risks = [];
  const partyHealth = ensurePartyHealthState(ledger);
  const globalModifiers = {
    initiative: 0,
    abilityChecks: 0,
    perceptionChecks: 0,
    savingThrows: 0
  };
  const worldGlobalModifiers = {
    initiative: 0,
    abilityChecks: 0,
    perceptionChecks: 0,
    savingThrows: 0
  };
  const globalModifierRows = [];

  const addGlobalModifier = (modifierId, key, amount, label, appliesTo, options = {}) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value === 0) return { enabled: true, value: 0 };
    const source = String(options.source ?? "derived");
    const note = String(options.note ?? "");
    const enabled = source === "custom"
      ? options.enabled !== false
      : partyHealth.modifierEnabled?.[modifierId] !== false;
    if (enabled) globalModifiers[key] = Number(globalModifiers[key] ?? 0) + value;
    globalModifierRows.push({
      modifierId,
      enabled,
      source,
      key,
      appliesTo,
      value,
      label,
      note,
      isPositive: value > 0,
      isNegative: value < 0,
      formatted: value > 0 ? `+${value}` : String(value),
      effectiveFormatted: enabled ? (value > 0 ? `+${value}` : String(value)) : "0"
    });
    return { enabled, value };
  };
  const addWorldModifier = (key, amount) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value === 0) return;
    worldGlobalModifiers[key] = Number(worldGlobalModifiers[key] ?? 0) + value;
  };

  if (prepEdge) bonuses.push("Preparation edge active: grant advantage on one operational check this session.");
  if (hasQuartermaster && ledger.sops?.campSetup) bonuses.push("Supply discipline active: reduce one supply-tracking error this rest cycle.");
  if (hasCartographer && ledger.sops?.urbanEntry) bonuses.push("Route discipline active: reduce one navigation uncertainty this session.");
  if (hasChronicler) bonuses.push("Operational recall active: clarify one unknown clue or timeline detail once per session.");
  if (hasSteward) bonuses.push("Stewardship active: reduce one lifestyle/logistics cost friction once per session.");
  if (comms.ready) bonuses.push("Communication discipline active: improve one coordinated response roll by a minor margin.");
  if (recon.tier === "ready") bonuses.push("Recon posture ready: reveal one mission unknown before first contact.");
  if (reputation.highStandingCount >= 2) bonuses.push("Faction leverage active: ease one access or social gate this session.");
  if (baseOperations.readiness) bonuses.push("Base network stability active: soften one shelter or maintenance complication this cycle.");

  if (roleCoverage >= 2) {
    const modifier = addGlobalModifier("team-rhythm", "initiative", 1, "Team rhythm (2+ roles)", "Initiative rolls");
    if (modifier.enabled) globalMinorBonuses.push("Team rhythm: all player actors gain +1 initiative while 2+ operations roles are assigned.");
  }
  if (activeSops >= 2) {
    const modifier = addGlobalModifier("briefed-procedures", "abilityChecks", 1, "Briefed procedures (2+ SOPs)", "All ability checks");
    if (modifier.enabled) globalMinorBonuses.push("Briefed procedures: all player actors gain +1 to ability checks while 2+ SOPs are active.");
  }
  if (comms.ready) {
    const modifier = addGlobalModifier("signal-discipline", "perceptionChecks", 1, "Signal discipline (comms ready)", "Perception checks");
    if (modifier.enabled) globalMinorBonuses.push("Signal discipline: all player actors gain +1 to Perception checks while communication readiness is active.");
  }
  if (recon.initiativeEdge !== 0) {
    const modifier = addGlobalModifier("recon-briefing", "initiative", recon.initiativeEdge, "Recon briefing posture", "Initiative rolls", {
      note: `Recon tier: ${recon.readinessLabel}`
    });
    if (modifier.enabled && recon.initiativeEdge > 0) {
      globalMinorBonuses.push("Recon briefing: all player actors gain +1 initiative while recon posture is ready.");
    }
  }
  if (baseOperations.readiness) {
    const modifier = addGlobalModifier("operational-sheltering", "savingThrows", 1, "Operational sheltering (base ready)", "All saving throws");
    if (modifier.enabled) globalMinorBonuses.push("Operational sheltering: all player actors gain +1 to saving throws while base readiness is stable.");
  }
  if (weatherVisibilityModifier !== 0) {
    const modifier = addGlobalModifier(
      "weather-visibility",
      "perceptionChecks",
      weatherVisibilityModifier,
      `Weather visibility (${weatherLabel})`,
      "Perception checks",
      { note: `Logged weather visibility modifier ${weatherVisibilityModifier > 0 ? "+" : ""}${weatherVisibilityModifier}.` }
    );
    if (modifier.enabled) {
      addWorldModifier("perceptionChecks", weatherVisibilityModifier);
      if (weatherVisibilityModifier > 0) {
        globalMinorBonuses.push(`Weather visibility (${weatherLabel}): perception improves by ${weatherVisibilityModifier > 0 ? "+" : ""}${weatherVisibilityModifier}.`);
      } else {
        risks.push(`Weather visibility (${weatherLabel}): apply ${weatherVisibilityModifier} to perception checks.`);
      }
    }
  }
  if (weatherDaeChanges.length > 0) {
    bonuses.push(`Weather profile (${weatherLabel}) applies ${weatherDaeChanges.length} global DAE change(s).`);
  }

  if (!ledger.roles?.quartermaster) risks.push("No Quartermaster: increase supply error risk this rest cycle.");
  if (!ledger.sops?.retreatProtocol) risks.push("No retreat protocol: escalate retreat complication by one step.");
  if (activeSops <= 2) risks.push("Low SOP coverage: apply disadvantage on one unplanned operation check.");
  if (!comms.ready) risks.push("Communication gaps: increase misread signal risk during first contact.");
  if (recon.tier === "blind") risks.push("Recon gaps: increase first-contact uncertainty by one step.");
  if (reputation.hostileCount >= 1) risks.push("Faction pressure: increase social or legal complication risk by one step.");
  if (baseOperations.maintenancePressure >= 3) risks.push("Base maintenance pressure: increase safehouse compromise/discovery risk by one step.");

  if (roleCoverage <= 1) addGlobalModifier("poor-role-coverage", "initiative", -1, "Poor role coverage", "Initiative rolls");
  if (activeSops <= 1) addGlobalModifier("insufficient-sop-coverage", "abilityChecks", -1, "Insufficient SOP coverage", "All ability checks");
  if (!comms.ready) addGlobalModifier("communication-gaps", "perceptionChecks", -1, "Communication gaps", "Perception checks");
  if (baseOperations.maintenancePressure >= 3) addGlobalModifier("base-maintenance-pressure", "savingThrows", -1, "Base maintenance pressure", "All saving throws");

  const customDaeChanges = [];
  const worldDaeChanges = [];
  for (const [index, weatherChange] of weatherDaeChanges.entries()) {
    const normalized = {
      modifierId: `weather:${index}`,
      label: `Weather (${weatherLabel})`,
      note: String(weatherChange.note ?? ""),
      key: weatherChange.key,
      mode: weatherChange.mode,
      value: weatherChange.value
    };
    customDaeChanges.push(normalized);
    worldDaeChanges.push(foundry.utils.deepClone(normalized));
  }
  for (const custom of partyHealth.customModifiers ?? []) {
    const key = String(custom?.key ?? "").trim();
    const value = String(custom?.value ?? "").trim();
    const enabled = custom?.enabled !== false;
    const label = String(custom?.label ?? "Custom Modifier").trim() || "Custom Modifier";
    const note = String(custom?.note ?? "");
    const mode = Math.floor(Number(custom?.mode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
    const appliesTo = "All player actors";

    const mappedSummaryKey = {
      "system.attributes.init.bonus": "initiative",
      "system.bonuses.abilities.check": "abilityChecks",
      "system.skills.prc.bonuses.check": "perceptionChecks",
      "system.bonuses.abilities.save": "savingThrows"
    }[key];

    const numericValue = Number(value);
    if (mappedSummaryKey && Number.isFinite(numericValue)) {
      addGlobalModifier(`custom:${custom.id}`, mappedSummaryKey, numericValue, label, appliesTo, {
        source: "custom",
        enabled,
        note
      });
      if (enabled) addWorldModifier(mappedSummaryKey, numericValue);
    } else {
      globalModifierRows.push({
        modifierId: `custom:${custom.id}`,
        enabled,
        source: "custom",
        key,
        appliesTo,
        value,
        label,
        note,
        isPositive: false,
        isNegative: false,
        formatted: value || "-",
        effectiveFormatted: enabled ? (value || "-") : "Off",
        modeLabel: getActiveEffectModeLabel(mode)
      });
    }

    if (enabled && key && value) {
      const normalized = {
        modifierId: `custom:${custom.id}`,
        label,
        note,
        key,
        mode,
        value
      };
      customDaeChanges.push(normalized);
      worldDaeChanges.push(foundry.utils.deepClone(normalized));
    }
  }

  const pressurePenalty = baseOperations.maintenancePressure >= 4 ? 2 : baseOperations.maintenancePressure >= 3 ? 1 : 0;
  const riskScore = roleCoverage + activeSops - pressurePenalty;
  const riskTier = riskScore >= 8 ? "low" : riskScore >= 5 ? "moderate" : "high";

  return {
    prepEdge,
    riskTier,
    bonuses,
    globalMinorBonuses,
    globalModifiers,
    worldGlobalModifiers,
    globalModifierRows,
    derivedModifierRows: globalModifierRows.filter((row) => row.source !== "custom"),
    customModifierRows: globalModifierRows.filter((row) => row.source === "custom"),
    hasGlobalModifiers: globalModifierRows.length > 0,
    hasCustomModifiers: globalModifierRows.some((row) => row.source === "custom"),
    customDaeChanges,
    worldDaeChanges,
    hasGlobalMinorBonuses: globalMinorBonuses.length > 0,
    hasRisks: risks.length > 0,
    risks
  };
}

function getCommunicationReadiness(communication) {
  const hasSignals = (communication.silentSignals ?? "").trim().length > 0;
  const hasCodePhrase = (communication.codePhrase ?? "").trim().length > 0;
  const toggles = [Boolean(communication.signalFlare), Boolean(communication.signalBell), Boolean(communication.preCombatPlan)];
  const enabledCount = toggles.filter(Boolean).length;
  const ready = hasSignals && hasCodePhrase && enabledCount >= 2;
  return {
    hasSignals,
    hasCodePhrase,
    enabledCount,
    ready,
    statusText: ready ? "Ready" : "At Risk"
  };
}

function getDefaultReputationFactions() {
  return [
    { id: "religious", label: "Religious Authority", score: 0, note: "", noteLogs: [], isCore: true },
    { id: "nobility", label: "Nobility", score: 0, note: "", noteLogs: [], isCore: true },
    { id: "criminal", label: "Criminal Factions", score: 0, note: "", noteLogs: [], isCore: true },
    { id: "commoners", label: "Common Populace", score: 0, note: "", noteLogs: [], isCore: true }
  ];
}

function normalizeReputationNoteLog(entry = {}) {
  const loggedAt = Number(entry?.loggedAt ?? Date.now());
  return {
    id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    note: String(entry?.note ?? "").trim(),
    score: Math.max(-5, Math.min(5, Math.floor(Number(entry?.score ?? 0) || 0))),
    loggedAt: Number.isFinite(loggedAt) ? loggedAt : Date.now(),
    loggedBy: String(entry?.loggedBy ?? "GM").trim() || "GM",
    dayLabel: String(entry?.dayLabel ?? "").trim(),
    clockLabel: String(entry?.clockLabel ?? "").trim(),
    calendarEntryId: String(entry?.calendarEntryId ?? "").trim()
  };
}

function normalizeReputationFaction(entry = {}) {
  const noteLogs = Array.isArray(entry?.noteLogs)
    ? entry.noteLogs
      .map((row) => normalizeReputationNoteLog(row))
      .filter((row) => row.note)
      .sort((a, b) => Number(b.loggedAt ?? 0) - Number(a.loggedAt ?? 0))
      .slice(0, 100)
    : [];
  return {
    id: String(entry.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    label: String(entry.label ?? "Faction").trim() || "Faction",
    score: Math.max(-5, Math.min(5, Math.floor(Number(entry.score ?? 0) || 0))),
    note: String(entry.note ?? ""),
    noteLogs,
    isCore: Boolean(entry.isCore)
  };
}

function ensureReputationState(ledger) {
  if (!ledger.reputation || typeof ledger.reputation !== "object") ledger.reputation = {};
  if (!Array.isArray(ledger.reputation.factions)) {
    const defaults = getDefaultReputationFactions();
    const legacyLookup = {
      religious: ledger.reputation.religious,
      nobility: ledger.reputation.nobility,
      criminal: ledger.reputation.criminal,
      commoners: ledger.reputation.commoners
    };
    ledger.reputation.factions = defaults.map((row) => {
      const legacy = legacyLookup[row.id] ?? {};
      return normalizeReputationFaction({
        ...row,
        score: Number(legacy?.score ?? row.score),
        note: String(legacy?.note ?? row.note),
        noteLogs: Array.isArray(legacy?.noteLogs) ? legacy.noteLogs : []
      });
    });
  }
  ledger.reputation.factions = ledger.reputation.factions
    .map((entry) => normalizeReputationFaction(entry))
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index);
  return ledger.reputation;
}

function getReputationBand(score) {
  const value = Number(score ?? 0);
  if (value <= -3) return "hostile";
  if (value <= -1) return "cold";
  if (value >= 3) return "trusted";
  if (value >= 1) return "favorable";
  return "neutral";
}

function getReputationAccessLabel(score) {
  const value = Math.max(-5, Math.min(5, Math.floor(Number(score ?? 0) || 0)));
  const map = {
    "-5": "Nemesis",
    "-4": "Hated",
    "-3": "Hostile",
    "-2": "Distrusted",
    "-1": "Cold",
    "0": "Neutral",
    "1": "Noticed",
    "2": "Friendly",
    "3": "Favored",
    "4": "Allied",
    "5": "Exalted"
  };
  return map[String(value)] ?? "Neutral";
}

function buildReputationContext(reputationState, filters = {}) {
  const rawFactions = Array.isArray(reputationState?.factions)
    ? reputationState.factions.map((entry) => normalizeReputationFaction(entry))
    : getDefaultReputationFactions().map((entry) => normalizeReputationFaction(entry));
  const factions = rawFactions.map((faction) => {
    const band = getReputationBand(faction.score);
    const noteLogs = Array.isArray(faction.noteLogs)
      ? faction.noteLogs.map((row) => normalizeReputationNoteLog(row)).sort((a, b) => Number(b.loggedAt ?? 0) - Number(a.loggedAt ?? 0))
      : [];
    const noteLogOptions = noteLogs.slice(0, 50).map((row) => {
      const signedScore = row.score > 0 ? `+${row.score}` : String(row.score);
      const stamp = row.dayLabel || formatRecoveryDueLabel(Number(row.loggedAt ?? Date.now()));
      const summary = row.note.length > 64 ? `${row.note.slice(0, 61)}...` : row.note;
      return {
        value: row.id,
        label: `${stamp} · Rep ${signedScore} · ${summary}`,
        note: row.note
      };
    });
    return {
      ...faction,
      key: faction.id,
      band,
      access: getReputationAccessLabel(faction.score),
      noteLogs,
      noteLogOptions,
      hasNoteLogs: noteLogOptions.length > 0,
      noteLogCount: noteLogOptions.length
    };
  });

  const filterKeyword = String(filters?.keyword ?? "").trim().toLowerCase();
  const filterStanding = String(filters?.standing ?? "all").trim().toLowerCase();
  const filteredFactions = factions.filter((faction) => {
    const numericStanding = Number(filterStanding);
    const filterAsExactScore = Number.isFinite(numericStanding) && String(Math.floor(numericStanding)) === filterStanding;
    const standingMatch = filterStanding === "all"
      || (filterAsExactScore && faction.score === Math.floor(numericStanding))
      || faction.band === filterStanding;
    if (!standingMatch) return false;
    if (!filterKeyword) return true;
    const historical = (faction.noteLogs ?? []).map((row) => String(row.note ?? "")).join(" ");
    const haystack = `${faction.label} ${faction.note} ${historical} ${faction.band} ${faction.access} ${faction.score}`.toLowerCase();
    return haystack.includes(filterKeyword);
  });

  const columns = [[], []];
  for (let index = 0; index < filteredFactions.length; index += 1) {
    columns[index % 2].push(filteredFactions[index]);
  }
  return {
    factions,
    filteredFactions,
    leftColumn: columns[0],
    rightColumn: columns[1],
    coreCount: factions.filter((faction) => faction.isCore).length,
    customCount: factions.filter((faction) => !faction.isCore).length,
    totalCount: factions.length,
    visibleCount: filteredFactions.length,
    filters: {
      keyword: String(filters?.keyword ?? ""),
      standing: filterStanding || "all",
      standingOptions: [
        { value: "all", label: "All Standing", selected: (filterStanding || "all") === "all" },
        { value: "5", label: "+5 Exalted", selected: filterStanding === "5" },
        { value: "4", label: "+4 Allied", selected: filterStanding === "4" },
        { value: "3", label: "+3 Favored", selected: filterStanding === "3" },
        { value: "2", label: "+2 Friendly", selected: filterStanding === "2" },
        { value: "1", label: "+1 Noticed", selected: filterStanding === "1" },
        { value: "0", label: "0 Neutral", selected: filterStanding === "0" },
        { value: "-1", label: "-1 Cold", selected: filterStanding === "-1" },
        { value: "-2", label: "-2 Distrusted", selected: filterStanding === "-2" },
        { value: "-3", label: "-3 Hostile", selected: filterStanding === "-3" },
        { value: "-4", label: "-4 Hated", selected: filterStanding === "-4" },
        { value: "-5", label: "-5 Nemesis", selected: filterStanding === "-5" }
      ]
    },
    highStandingCount: factions.filter((faction) => ["favorable", "trusted"].includes(faction.band)).length,
    hostileCount: factions.filter((faction) => faction.band === "hostile").length
  };
}

function getBaseSiteTypeLabel(type) {
  const map = {
    safehouse: "Safehouse",
    chapel: "Chapel",
    watchtower: "Watchtower",
    cell: "Underground Cell",
    "storage-cache": "Storage Cache"
  };
  return map[type] ?? "Site";
}

function getBaseSiteStatusLabel(status) {
  const map = {
    secure: "Secure",
    contested: "Contested",
    compromised: "Compromised",
    abandoned: "Abandoned"
  };
  return map[status] ?? "Secure";
}

function getItemWeightValue(itemLike) {
  const direct = Number(itemLike?.weight);
  if (Number.isFinite(direct)) return direct;
  const systemWeight = Number(itemLike?.system?.weight?.value);
  if (Number.isFinite(systemWeight)) return systemWeight;
  const flatWeight = Number(itemLike?.system?.weight);
  if (Number.isFinite(flatWeight)) return flatWeight;
  const bulk = Number(itemLike?.system?.bulk);
  if (Number.isFinite(bulk)) return bulk;
  return 0;
}

function normalizeBaseSiteStorageItem(entry = {}) {
  const quantityRaw = Number(entry?.quantity ?? 1);
  const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.floor(quantityRaw)) : 1;
  const weightRaw = Number(entry?.weight ?? 0);
  const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
  return {
    id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    name: String(entry?.name ?? "Stored Item").trim() || "Stored Item",
    type: String(entry?.type ?? "item").trim() || "item",
    quantity,
    weight,
    note: String(entry?.note ?? ""),
    img: String(entry?.img ?? "icons/svg/item-bag.svg"),
    uuid: String(entry?.uuid ?? "")
  };
}

function normalizeBaseSiteEntry(site = {}, index = 0) {
  const storageRaw = site?.storage && typeof site.storage === "object" ? site.storage : {};
  const maxWeightRaw = Number(storageRaw?.maxWeight ?? site?.maxWeight ?? 0);
  const maxSpaceRaw = Number(storageRaw?.maxSpace ?? site?.maxSpace ?? 0);
  const maxWeight = Number.isFinite(maxWeightRaw) ? Math.max(0, maxWeightRaw) : 0;
  const maxSpace = Number.isFinite(maxSpaceRaw) ? Math.max(0, Math.floor(maxSpaceRaw)) : 0;
  const items = Array.isArray(storageRaw?.items)
    ? storageRaw.items.map((entry) => normalizeBaseSiteStorageItem(entry))
    : [];
  return {
    id: site.id ?? `legacy-base-site-${index}`,
    type: String(site.type ?? "safehouse"),
    name: String(site.name ?? "Unnamed Site"),
    status: String(site.status ?? "secure"),
    risk: String(site.risk ?? "moderate"),
    pressure: Math.max(0, Number(site.pressure ?? 0) || 0),
    note: String(site.note ?? ""),
    storage: {
      maxWeight,
      maxSpace,
      items
    }
  };
}

function buildBaseOperationsContext(baseState) {
  const sites = Array.isArray(baseState?.sites)
    ? baseState.sites.map((site, index) => {
      const normalizedSite = normalizeBaseSiteEntry(site, index);
      const type = normalizedSite.type;
      const status = normalizedSite.status;
      const risk = normalizedSite.risk;
      const pressure = normalizedSite.pressure;
      const storageItems = normalizedSite.storage.items;
      const storageItemCount = storageItems.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity ?? 0) || 0), 0);
      const storageWeightUsed = storageItems.reduce((sum, entry) => {
        const quantity = Math.max(0, Number(entry.quantity ?? 0) || 0);
        const weight = Math.max(0, Number(entry.weight ?? 0) || 0);
        return sum + (quantity * weight);
      }, 0);
      const maxWeight = Math.max(0, Number(normalizedSite.storage.maxWeight ?? 0) || 0);
      const maxSpace = Math.max(0, Number(normalizedSite.storage.maxSpace ?? 0) || 0);
      return {
        id: normalizedSite.id,
        type,
        typeLabel: getBaseSiteTypeLabel(type),
        name: normalizedSite.name,
        status,
        statusLabel: getBaseSiteStatusLabel(status),
        risk,
        pressure,
        note: normalizedSite.note,
        storageMaxWeight: maxWeight,
        storageMaxSpace: maxSpace,
        storageWeightUsed,
        storageSpaceUsed: storageItemCount,
        storageItemCount,
        hasStorageCapacity: maxWeight > 0 || maxSpace > 0,
        storageWeightSummary: maxWeight > 0 ? `${storageWeightUsed.toFixed(1)} / ${maxWeight.toFixed(1)}` : `${storageWeightUsed.toFixed(1)} / ∞`,
        storageSpaceSummary: maxSpace > 0 ? `${storageItemCount} / ${maxSpace}` : `${storageItemCount} / ∞`
      };
    })
    : [];

  const activeSites = sites.filter((site) => site.status !== "abandoned").length;
  const contestedSites = sites.filter((site) => ["contested", "compromised"].includes(site.status)).length;
  const pressureSum = sites.reduce((sum, site) => sum + Number(site.pressure ?? 0), 0);
  const maintenanceRisk = String(baseState?.maintenanceRisk ?? "moderate");
  const riskBase = maintenanceRisk === "high" ? 2 : maintenanceRisk === "low" ? 0 : 1;
  const maintenancePressure = riskBase + (activeSites === 0 ? 2 : Math.max(0, activeSites - 2)) + Math.floor(pressureSum / 5) + contestedSites;
  const readiness = activeSites >= 2 && maintenancePressure <= 3;

  return {
    sites,
    maintenanceRisk,
    maintenancePressure,
    activeSites,
    contestedSites,
    readiness,
    pressureSum,
    riskOptions: [
      { value: "low", label: "Low", selected: maintenanceRisk === "low" },
      { value: "moderate", label: "Moderate", selected: maintenanceRisk === "moderate" },
      { value: "high", label: "High", selected: maintenanceRisk === "high" }
    ],
    siteTypeOptions: [
      { value: "safehouse", label: "Safehouse", selected: true },
      { value: "chapel", label: "Chapel", selected: false },
      { value: "watchtower", label: "Watchtower", selected: false },
      { value: "cell", label: "Underground Cell", selected: false },
      { value: "storage-cache", label: "Storage Cache", selected: false }
    ],
    statusOptions: [
      { value: "secure", label: "Secure", selected: true },
      { value: "contested", label: "Contested", selected: false },
      { value: "compromised", label: "Compromised", selected: false },
      { value: "abandoned", label: "Abandoned", selected: false }
    ],
    siteRiskOptions: [
      { value: "low", label: "Low", selected: false },
      { value: "moderate", label: "Moderate", selected: true },
      { value: "high", label: "High", selected: false }
    ]
  };
}

function ensureBaseOperationsState(ledger) {
  if (!ledger.baseOperations) {
    ledger.baseOperations = {
      maintenanceRisk: "moderate",
      sites: []
    };
  }
  if (!Array.isArray(ledger.baseOperations.sites)) ledger.baseOperations.sites = [];
  ledger.baseOperations.sites = ledger.baseOperations.sites.map((site, index) => normalizeBaseSiteEntry(site, index));
  if (!ledger.baseOperations.maintenanceRisk) ledger.baseOperations.maintenanceRisk = "moderate";
  return ledger.baseOperations;
}

function ensureReconState(ledger) {
  if (!ledger.recon || typeof ledger.recon !== "object") {
    ledger.recon = {};
  }
  const recon = ledger.recon;
  const toText = (value) => String(value ?? "");
  recon.objective = toText(recon.objective);
  recon.region = toText(recon.region);
  recon.intelSource = toText(recon.intelSource);
  recon.recentFindings = toText(recon.recentFindings);
  recon.lastBriefAt = toText(recon.lastBriefAt || "-");
  recon.lastBriefBy = toText(recon.lastBriefBy || "-");

  const heat = String(recon.heatLevel ?? "moderate").trim().toLowerCase();
  recon.heatLevel = ["low", "moderate", "high"].includes(heat) ? heat : "moderate";

  const network = String(recon.network ?? "limited").trim().toLowerCase();
  recon.network = ["limited", "established", "deep"].includes(network) ? network : "limited";

  const reliability = Number(recon.rumorReliability ?? 50);
  recon.rumorReliability = Number.isFinite(reliability)
    ? Math.max(0, Math.min(100, Math.floor(reliability)))
    : 50;

  const bribeBudget = Number(recon.bribeBudget ?? 0);
  recon.bribeBudget = Number.isFinite(bribeBudget)
    ? Math.max(0, Math.floor(bribeBudget))
    : 0;

  const spySlots = Number(recon.spySlots ?? 0);
  recon.spySlots = Number.isFinite(spySlots)
    ? Math.max(0, Math.floor(spySlots))
    : 0;

  return recon;
}

function buildReconContext(reconState = {}) {
  const objective = String(reconState.objective ?? "").trim();
  const region = String(reconState.region ?? "").trim();
  const intelSource = String(reconState.intelSource ?? "").trim();
  const recentFindings = String(reconState.recentFindings ?? "").trim();
  const heatLevel = String(reconState.heatLevel ?? "moderate").trim().toLowerCase();
  const network = String(reconState.network ?? "limited").trim().toLowerCase();
  const rumorReliability = Math.max(0, Math.min(100, Math.floor(Number(reconState.rumorReliability ?? 50) || 0)));
  const bribeBudget = Math.max(0, Math.floor(Number(reconState.bribeBudget ?? 0) || 0));
  const spySlots = Math.max(0, Math.floor(Number(reconState.spySlots ?? 0) || 0));
  const intelCoverage = [objective, region, intelSource, recentFindings].filter((entry) => entry.length > 0).length;

  const heatPenalty = heatLevel === "high" ? 2 : heatLevel === "low" ? 0 : 1;
  const networkScore = network === "deep" ? 2 : network === "established" ? 1 : 0;
  const reliabilityScore = rumorReliability >= 70 ? 2 : rumorReliability >= 50 ? 1 : 0;
  const budgetScore = bribeBudget >= 100 ? 2 : bribeBudget >= 25 ? 1 : 0;
  const spyScore = spySlots >= 2 ? 2 : spySlots >= 1 ? 1 : 0;

  const readinessScore = intelCoverage + networkScore + reliabilityScore + budgetScore + spyScore - heatPenalty;
  const tier = readinessScore >= 6 ? "ready" : readinessScore >= 3 ? "contested" : "blind";
  const readinessLabel = tier === "ready" ? "Ready" : tier === "contested" ? "Contested" : "Blind";
  const initiativeEdge = tier === "ready" ? 1 : tier === "blind" ? -1 : 0;
  const suggestedDc = Math.max(
    8,
    Math.min(
      22,
      10
      + (heatLevel === "high" ? 4 : heatLevel === "moderate" ? 2 : 0)
      + (network === "limited" ? 2 : 0)
      - (network === "deep" ? 1 : 0)
      - (rumorReliability >= 70 ? 1 : 0)
    )
  );

  const recommendations = [];
  if (!objective) recommendations.push("Define a concrete mission objective before the next recon pass.");
  if (!region) recommendations.push("Set target region to tighten scouting scope.");
  if (rumorReliability < 50) recommendations.push("Corroborate rumor channels before acting on intel.");
  if (network === "limited") recommendations.push("Expand local network contacts to reduce blind approaches.");
  if (spySlots <= 0) recommendations.push("Allocate at least one spy slot for forward observation.");
  if (heatLevel === "high") recommendations.push("High heat: expect counter-surveillance and misinformation.");
  if (recommendations.length === 0) recommendations.push("Recon posture is stable. Maintain cadence and refresh leads after major events.");

  return {
    objective,
    region,
    intelSource,
    recentFindings,
    heatLevel,
    network,
    rumorReliability,
    bribeBudget,
    spySlots,
    intelCoverage,
    readinessScore,
    tier,
    readinessLabel,
    initiativeEdge,
    suggestedDc,
    recommendations,
    hasRecentFindings: recentFindings.length > 0,
    hasObjective: objective.length > 0,
    hasRegion: region.length > 0,
    hasIntelSource: intelSource.length > 0,
    lastBriefAt: String(reconState.lastBriefAt ?? "-"),
    lastBriefBy: String(reconState.lastBriefBy ?? "-"),
    heatOptions: [
      { value: "low", label: "Low", selected: heatLevel === "low" },
      { value: "moderate", label: "Moderate", selected: heatLevel === "moderate" },
      { value: "high", label: "High", selected: heatLevel === "high" }
    ],
    networkOptions: [
      { value: "limited", label: "Limited", selected: network === "limited" },
      { value: "established", label: "Established", selected: network === "established" },
      { value: "deep", label: "Deep", selected: network === "deep" }
    ]
  };
}

const WEATHER_PRESET_DEFINITIONS = [
  { id: "clear", label: "Clear", visibilityModifier: 0, darkness: 0.1, note: "Clear skies and stable visibility." },
  { id: "cloudy", label: "Cloudy", visibilityModifier: -1, darkness: 0.3, note: "Low cloud cover and muted light." },
  { id: "rainy", label: "Rainy", visibilityModifier: -1, darkness: 0.4, note: "Rain interferes with spotting and footing." },
  { id: "stormy", label: "Stormy", visibilityModifier: -3, darkness: 0.65, note: "Thunderstorm conditions reduce awareness." },
  { id: "snowy", label: "Snowy", visibilityModifier: -2, darkness: 0.45, note: "Snowfall obscures distance and tracks." },
  { id: "hail", label: "Hail", visibilityModifier: -2, darkness: 0.5, note: "Hail disrupts movement and ranged visibility." }
];

function normalizeWeatherDaeChange(entry = {}) {
  const rawMode = Math.floor(Number(entry?.mode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((value) => Number(value)));
  return {
    id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    key: String(entry?.key ?? "").trim(),
    mode: validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD),
    value: String(entry?.value ?? "").trim(),
    label: String(entry?.label ?? "Weather Effect").trim() || "Weather Effect",
    note: String(entry?.note ?? "")
  };
}

function normalizeWeatherPreset(entry = {}, defaults = {}) {
  const daeChanges = Array.isArray(entry?.daeChanges)
    ? entry.daeChanges.map((change) => normalizeWeatherDaeChange(change)).filter((change) => change.key && change.value)
    : [];
  return {
    id: String(entry?.id ?? defaults?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    label: String(entry?.label ?? defaults?.label ?? "Custom Weather").trim() || "Custom Weather",
    visibilityModifier: Number.isFinite(Number(entry?.visibilityModifier))
      ? Math.max(-5, Math.min(5, Math.floor(Number(entry.visibilityModifier))))
      : Math.max(-5, Math.min(5, Math.floor(Number(defaults?.visibilityModifier ?? 0)))),
    darkness: Number.isFinite(Number(entry?.darkness))
      ? Math.max(0, Math.min(1, Number(entry.darkness)))
      : Math.max(0, Math.min(1, Number(defaults?.darkness ?? 0))),
    note: String(entry?.note ?? defaults?.note ?? ""),
    isBuiltIn: Boolean(entry?.isBuiltIn ?? defaults?.isBuiltIn),
    daeChanges
  };
}

function getBuiltInWeatherPresets() {
  return WEATHER_PRESET_DEFINITIONS.map((entry) => normalizeWeatherPreset({
    ...entry,
    isBuiltIn: true,
    daeChanges: []
  }, entry));
}

function getWeatherPresetCatalog(weatherState = {}) {
  const builtIns = getBuiltInWeatherPresets();
  const customPresets = Array.isArray(weatherState?.customPresets)
    ? weatherState.customPresets
      .map((entry) => normalizeWeatherPreset(entry, { isBuiltIn: false }))
      .filter((entry) => !entry.isBuiltIn)
    : [];
  const seen = new Set();
  return [...builtIns, ...customPresets].filter((entry) => {
    const id = String(entry.id ?? "").trim().toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function describeWeatherDaeChanges(changes = []) {
  const rows = Array.isArray(changes) ? changes : [];
  if (!rows.length) return "No additional global DAE changes.";
  return rows
    .map((entry) => `${entry.label || entry.key}: ${entry.value} (${getActiveEffectModeLabel(entry.mode)})`)
    .join("; ");
}

function ensureWeatherState(ledger) {
  if (!ledger.weather || typeof ledger.weather !== "object") {
    ledger.weather = { current: null, logs: [], customPresets: [] };
  }
  if (!Array.isArray(ledger.weather.customPresets)) ledger.weather.customPresets = [];
  ledger.weather.customPresets = ledger.weather.customPresets
    .map((entry) => normalizeWeatherPreset(entry, { isBuiltIn: false }))
    .filter((entry, index, arr) => {
      const id = String(entry.id ?? "").trim();
      if (!id || entry.isBuiltIn) return false;
      return arr.findIndex((candidate) => String(candidate.id ?? "").trim() === id) === index;
    });
  if (!Array.isArray(ledger.weather.logs)) ledger.weather.logs = [];
  ledger.weather.logs = ledger.weather.logs
    .map((entry) => ({
      id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
      label: String(entry?.label ?? "Unknown Weather").trim() || "Unknown Weather",
      weatherId: String(entry?.weatherId ?? "").trim(),
      darkness: Number.isFinite(Number(entry?.darkness)) ? Math.max(0, Math.min(1, Number(entry.darkness))) : 0,
      visibilityModifier: Number.isFinite(Number(entry?.visibilityModifier)) ? Math.max(-5, Math.min(5, Math.floor(Number(entry.visibilityModifier)))) : 0,
      note: String(entry?.note ?? ""),
      daeChanges: Array.isArray(entry?.daeChanges)
        ? entry.daeChanges.map((change) => normalizeWeatherDaeChange(change)).filter((change) => change.key && change.value)
        : [],
      loggedAt: Number.isFinite(Number(entry?.loggedAt)) ? Number(entry.loggedAt) : Date.now(),
      loggedBy: String(entry?.loggedBy ?? "GM")
    }))
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index)
    .slice(0, 100);

  const current = ledger.weather.current;
  if (current && typeof current === "object") {
    ledger.weather.current = {
      id: String(current?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
      label: String(current?.label ?? "Unknown Weather").trim() || "Unknown Weather",
      weatherId: String(current?.weatherId ?? "").trim(),
      darkness: Number.isFinite(Number(current?.darkness)) ? Math.max(0, Math.min(1, Number(current.darkness))) : 0,
      visibilityModifier: Number.isFinite(Number(current?.visibilityModifier)) ? Math.max(-5, Math.min(5, Math.floor(Number(current.visibilityModifier)))) : 0,
      note: String(current?.note ?? ""),
      daeChanges: Array.isArray(current?.daeChanges)
        ? current.daeChanges.map((change) => normalizeWeatherDaeChange(change)).filter((change) => change.key && change.value)
        : [],
      loggedAt: Number.isFinite(Number(current?.loggedAt)) ? Number(current.loggedAt) : Date.now(),
      loggedBy: String(current?.loggedBy ?? "GM")
    };
  } else {
    ledger.weather.current = null;
  }

  return ledger.weather;
}

function computeWeatherVisibilityModifier({ label = "", weatherId = "", darkness = 0 } = {}) {
  const normalizedLabel = String(label ?? "").toLowerCase();
  const normalizedId = String(weatherId ?? "").toLowerCase();
  const normalizedDarkness = Number.isFinite(Number(darkness)) ? Math.max(0, Math.min(1, Number(darkness))) : 0;

  const text = `${normalizedLabel} ${normalizedId}`;
  let visibilityModifier = 0;
  if (!normalizedId || text.includes("clear") || text.includes("sun")) visibilityModifier += 0;
  if (text.includes("rain") || text.includes("wind") || text.includes("cloud")) visibilityModifier -= 1;
  if (text.includes("heavy") || text.includes("storm") || text.includes("fog") || text.includes("mist") || text.includes("blizzard") || text.includes("smoke") || text.includes("snow")) {
    visibilityModifier -= 2;
  }

  if (normalizedDarkness >= 0.75) visibilityModifier -= 2;
  else if (normalizedDarkness >= 0.4) visibilityModifier -= 1;
  else if (normalizedDarkness <= 0.15 && (!normalizedId || text.includes("clear"))) visibilityModifier += 1;

  return Math.max(-5, Math.min(5, Math.floor(visibilityModifier)));
}

function getWeatherEffectSummary(visibilityModifier) {
  const value = Math.max(-5, Math.min(5, Math.floor(Number(visibilityModifier) || 0)));
  if (value > 0) return `Perception checks gain +${value}.`;
  if (value < 0) return `Perception checks suffer ${value}.`;
  return "No perception modifier from weather.";
}

function buildWeatherSelectionCatalog(weatherState = {}, sceneSnapshot = null) {
  const sceneDarkness = Number.isFinite(Number(sceneSnapshot?.darkness))
    ? Math.max(0, Math.min(1, Number(sceneSnapshot.darkness)))
    : null;
  return getWeatherPresetCatalog(weatherState)
    .map((preset) => ({
      key: String(preset.id ?? "").trim(),
      label: String(preset.label ?? "Weather").trim() || "Weather",
      weatherId: String(preset.id ?? "").trim(),
      darkness: sceneDarkness ?? Math.max(0, Math.min(1, Number(preset.darkness ?? 0))),
      visibilityModifier: Math.max(-5, Math.min(5, Math.floor(Number(preset.visibilityModifier ?? 0) || 0))),
      note: String(preset.note ?? ""),
      daeChanges: Array.isArray(preset.daeChanges) ? preset.daeChanges : [],
      isBuiltIn: Boolean(preset.isBuiltIn)
    }))
    .filter((entry) => entry.key);
}

function resolveWeatherFxEffectIdForPreset(preset = {}) {
  const presetKey = String(preset?.key ?? preset?.weatherId ?? "").trim().toLowerCase();
  const presetLabel = String(preset?.label ?? "").trim().toLowerCase();
  if (!presetKey || presetKey.includes("clear") || presetLabel.includes("clear")) return "";

  const effects = Object.entries(CONFIG.weatherEffects ?? {})
    .map(([id, cfg]) => ({
      id: String(id ?? "").trim(),
      text: `${String(id ?? "")} ${String(cfg?.label ?? cfg?.name ?? "")}`.toLowerCase()
    }))
    .filter((entry) => entry.id);
  if (!effects.length) return "";

  const keywordMap = {
    rainy: ["rain", "drizzle", "shower"],
    stormy: ["storm", "thunder", "lightning", "tempest"],
    snowy: ["snow", "blizzard", "flurry"],
    cloudy: ["cloud", "overcast", "fog", "mist"],
    hail: ["hail", "sleet", "ice"]
  };
  const targetWords = keywordMap[presetKey]
    ?? keywordMap[String(presetLabel).split(" ")[0]]
    ?? Object.values(keywordMap).find((words) => words.some((word) => presetLabel.includes(word)))
    ?? [];
  if (!targetWords.length) return "";
  const match = effects.find((entry) => targetWords.some((word) => entry.text.includes(word)));
  return String(match?.id ?? "").trim();
}

async function applyWeatherSceneFxForPreset(preset = {}) {
  if (!game.user.isGM) return;
  const scene = game.scenes?.current;
  if (!scene) return;
  const presetKey = String(preset?.key ?? preset?.weatherId ?? "").trim().toLowerCase();
  const effectId = resolveWeatherFxEffectIdForPreset(preset);
  const nextWeatherId = (presetKey.includes("clear") || !effectId) ? "" : effectId;
  const currentWeatherId = String(scene.weather ?? "").trim();
  if (nextWeatherId === currentWeatherId) return;
  await scene.update({ weather: nextWeatherId });
}

function resolveCurrentSceneWeatherSnapshot() {
  const scene = game.scenes?.current;
  const rawId = String(scene?.weather ?? "").trim();
  const weatherId = rawId;
  const weatherCfg = weatherId ? CONFIG.weatherEffects?.[weatherId] : null;
  const label = String(weatherCfg?.label ?? weatherCfg?.name ?? (weatherId ? weatherId : "Clear")).trim() || "Clear";
  const darknessLevel = scene?.environment?.darknessLevel;
  const darkness = Number.isFinite(Number(darknessLevel)) ? Math.max(0, Math.min(1, Number(darknessLevel))) : 0;
  const visibilityModifier = computeWeatherVisibilityModifier({ label, weatherId, darkness });

  return {
    id: foundry.utils.randomID(),
    label,
    weatherId,
    darkness,
    visibilityModifier,
    note: `Scene weather${weatherId ? ` (${weatherId})` : ""} | darkness ${darkness.toFixed(2)}`,
    loggedAt: Date.now(),
    loggedBy: String(game.user?.name ?? "GM")
  };
}

function ensurePartyHealthState(ledger) {
  if (!ledger.partyHealth || typeof ledger.partyHealth !== "object") {
    ledger.partyHealth = { modifierEnabled: {}, customModifiers: [], archivedSyncEffects: [], syncToSceneNonParty: true };
  }
  if (!ledger.partyHealth.modifierEnabled || typeof ledger.partyHealth.modifierEnabled !== "object") {
    ledger.partyHealth.modifierEnabled = {};
  }
  if (!Array.isArray(ledger.partyHealth.customModifiers)) ledger.partyHealth.customModifiers = [];
  if (!Array.isArray(ledger.partyHealth.archivedSyncEffects)) ledger.partyHealth.archivedSyncEffects = [];
  ledger.partyHealth.syncToSceneNonParty = ledger.partyHealth.syncToSceneNonParty !== false;
  ledger.partyHealth.customModifiers = ledger.partyHealth.customModifiers
    .map((entry) => {
      const rawMode = Math.floor(Number(entry?.mode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
      const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((value) => Number(value)));
      return {
        id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
        label: String(entry?.label ?? "Custom Modifier").trim() || "Custom Modifier",
        key: String(entry?.key ?? "").trim(),
        mode: validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD),
        value: String(entry?.value ?? "").trim(),
        note: String(entry?.note ?? ""),
        enabled: entry?.enabled !== false
      };
    })
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index);
  ledger.partyHealth.archivedSyncEffects = ledger.partyHealth.archivedSyncEffects
    .map((entry) => {
      const effectData = entry?.effectData && typeof entry.effectData === "object"
        ? foundry.utils.deepClone(entry.effectData)
        : {};
      if (effectData && typeof effectData === "object" && Object.prototype.hasOwnProperty.call(effectData, "_id")) delete effectData._id;
      return {
        id: String(entry?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
        actorId: String(entry?.actorId ?? "").trim(),
        actorName: String(entry?.actorName ?? "Unknown Actor").trim() || "Unknown Actor",
        effectName: String(entry?.effectName ?? INTEGRATION_EFFECT_NAME).trim() || INTEGRATION_EFFECT_NAME,
        label: String(entry?.label ?? entry?.effectName ?? "Archived Sync Effect").trim() || "Archived Sync Effect",
        note: String(entry?.note ?? ""),
        archivedAt: Number.isFinite(Number(entry?.archivedAt)) ? Number(entry.archivedAt) : Date.now(),
        archivedBy: String(entry?.archivedBy ?? game.user?.name ?? "GM"),
        effectData
      };
    })
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index);
  return ledger.partyHealth;
}

function ensureSopNotesState(ledger) {
  if (!ledger.sopNotes || typeof ledger.sopNotes !== "object") ledger.sopNotes = {};
  for (const key of SOP_KEYS) {
    if (typeof ledger.sopNotes[key] !== "string") ledger.sopNotes[key] = "";
  }
  return ledger.sopNotes;
}

async function setOperationalRole(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can assign operational roles.");
    return;
  }
  const roleKey = element?.dataset?.role;
  const actorId = element?.value ?? "";
  if (!roleKey) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.roles) ledger.roles = {};
    ledger.roles[roleKey] = actorId;
  });
}

async function clearOperationalRole(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can assign operational roles.");
    return;
  }
  const roleKey = element?.dataset?.role;
  if (!roleKey) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.roles) ledger.roles = {};
    ledger.roles[roleKey] = "";
  });
}

async function toggleOperationalSOP(element, options = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update SOP status.");
    return;
  }
  const sopKey = element?.dataset?.sop;
  if (!sopKey || !SOP_KEYS.includes(String(sopKey))) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.sops) ledger.sops = {};
    ledger.sops[sopKey] = Boolean(element?.checked);
  }, options);
}

async function setOperationalResource(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit resources.");
    return;
  }
  const resourceKey = element?.dataset?.resource;
  if (!resourceKey) return;
  const upkeepNumericKeys = new Set([
    "partySize",
    "foodPerMember",
    "waterPerMember",
    "foodMultiplier",
    "waterMultiplier",
    "torchPerRest"
  ]);

  await updateOperationsLedger((ledger) => {
    if (!ledger.resources) ledger.resources = {};
    ensureOperationalResourceConfig(ledger.resources);
    if (resourceKey === "encumbrance") {
      ledger.resources.encumbrance = element?.value ?? "light";
      return;
    }
    const itemLinkKeys = new Set(RESOURCE_TRACK_KEYS);
    if (resourceKey.startsWith("itemSelectionActor:")) {
      const selectionKey = resourceKey.split(":")[1] ?? "";
      if (!itemLinkKeys.has(selectionKey)) return;
      const actorId = String(element?.value ?? "");
      ledger.resources.itemSelections[selectionKey].actorId = actorId;
      if (!actorId) ledger.resources.itemSelections[selectionKey].itemId = "";
      else {
        const actor = game.actors.get(actorId);
        const itemId = ledger.resources.itemSelections[selectionKey].itemId;
        if (!itemId || !actor?.items?.get(itemId)) ledger.resources.itemSelections[selectionKey].itemId = "";
      }
      return;
    }
    if (resourceKey.startsWith("itemSelectionItem:")) {
      const selectionKey = resourceKey.split(":")[1] ?? "";
      if (!itemLinkKeys.has(selectionKey)) return;
      ledger.resources.itemSelections[selectionKey].itemId = String(element?.value ?? "");
      return;
    }
    if (resourceKey.startsWith("weatherMod:")) {
      const weatherKey = resourceKey.split(":")[1] ?? "";
      const validWeatherKeys = new Set(["clear", "light-rain", "heavy-rain", "wind", "fog", "extreme"]);
      if (!validWeatherKeys.has(weatherKey)) return;
      const raw = Number(element?.value ?? 0);
      const value = Number.isFinite(raw) ? Math.max(-10, Math.min(20, Math.floor(raw))) : 0;
      ledger.resources.gather.weatherMods[weatherKey] = value;
      return;
    }
    if (upkeepNumericKeys.has(resourceKey)) {
      const raw = Number(element?.value ?? 0);
      const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
      ledger.resources.upkeep[resourceKey] = value;
      return;
    }
    const value = Number(element?.value ?? 0);
    ledger.resources[resourceKey] = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  });
}

async function setPartyHealthModifier(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can toggle Party Health modifiers.");
    return;
  }
  const modifierId = String(element?.dataset?.modifierId ?? "").trim();
  if (!modifierId) return;
  const enabled = Boolean(element?.checked);
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.modifierEnabled[modifierId] = enabled;
  });
}

async function setPartyHealthSyncNonParty(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const enabled = Boolean(element?.checked);
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.syncToSceneNonParty = enabled;
  });
}

async function setOperationalSopNote(element) {
  const sopKey = String(element?.dataset?.sop ?? "").trim();
  if (!sopKey || !SOP_KEYS.includes(sopKey)) return;
  const note = String(element?.value ?? "");
  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "ops:setSopNote",
      userId: game.user.id,
      sopKey,
      note
    });
    return;
  }
  await updateOperationsLedger((ledger) => {
    const sopNotes = ensureSopNotesState(ledger);
    sopNotes[sopKey] = note;
  });
}

async function setOperationalEnvironmentPreset(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  const presetKey = getEnvironmentPresetByKey(String(element?.value ?? "none")).key;
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const preset = getEnvironmentPresetByKey(presetKey);
    environment.presetKey = presetKey;
    const defaultDc = Number(preset.defaultDc ?? 12);
    if (Number.isFinite(defaultDc) && defaultDc > 0) {
      environment.movementDc = Math.max(1, Math.min(30, Math.floor(defaultDc)));
    }
    if (presetKey === "none") environment.appliedActorIds = [];
  });
}

async function setOperationalEnvironmentDc(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  const raw = Number(element?.value ?? 12);
  const dc = Number.isFinite(raw) ? Math.max(1, Math.min(30, Math.floor(raw))) : 12;
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    environment.movementDc = dc;
  });
}

async function setOperationalEnvironmentNote(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  const note = String(element?.value ?? "");
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    environment.note = note;
  });
}

async function setOperationalEnvironmentSyncNonParty(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  const enabled = Boolean(element?.checked);
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    environment.syncToSceneNonParty = enabled;
  });
}

async function setOperationalEnvironmentSuccessive(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  const field = String(element?.dataset?.field ?? "").trim();
  if (!field) return;

  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const preset = getEnvironmentPresetByKey(environment.presetKey);
    if (preset.key === "none") return;
    if (!environment.successiveByPreset || typeof environment.successiveByPreset !== "object") {
      environment.successiveByPreset = {};
    }
    const existing = normalizeEnvironmentSuccessiveOverride(environment.successiveByPreset[preset.key] ?? {});

    if (field === "statusId") {
      existing.statusId = String(element?.value ?? "").trim();
    } else if (field === "slideFeet") {
      const value = Number(element?.value ?? 0);
      existing.slideFeet = Number.isFinite(value) ? Math.max(0, Math.min(500, Math.floor(value))) : 0;
    } else if (field === "exhaustion") {
      const value = Number(element?.value ?? 0);
      existing.exhaustion = Number.isFinite(value) ? Math.max(0, Math.min(6, Math.floor(value))) : 0;
    } else if (field === "damageFormula") {
      existing.damageFormula = String(element?.value ?? "").trim();
    } else if (field === "damageType") {
      existing.damageType = String(element?.value ?? "").trim();
    } else if (field === "maxHpReductionFormula") {
      existing.maxHpReductionFormula = String(element?.value ?? "").trim();
    } else if (field === "daeChangeKey") {
      existing.daeChangeKey = String(element?.value ?? "").trim();
    } else if (field === "daeChangeMode") {
      const rawMode = Math.floor(Number(element?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD));
      const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((value) => Number(value)));
      existing.daeChangeMode = validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD);
    } else if (field === "daeChangeValue") {
      existing.daeChangeValue = String(element?.value ?? "").trim();
    } else {
      return;
    }

    environment.successiveByPreset[preset.key] = existing;
  });
}

async function resetOperationalEnvironmentSuccessiveDefaults() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can change environment controls.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const preset = getEnvironmentPresetByKey(environment.presetKey);
    if (preset.key === "none") return;
    if (!environment.successiveByPreset || typeof environment.successiveByPreset !== "object") {
      environment.successiveByPreset = {};
    }
    delete environment.successiveByPreset[preset.key];
  });
}

async function toggleOperationalEnvironmentActor(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can assign environment effects.");
    return;
  }
  const actorId = String(element?.dataset?.actorId ?? "").trim();
  if (!actorId) return;
  const checked = Boolean(element?.checked);
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const set = new Set(environment.appliedActorIds ?? []);
    if (checked) set.add(actorId);
    else set.delete(actorId);
    environment.appliedActorIds = Array.from(set);
  });
}

async function addOperationalEnvironmentLog() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can log environment presets.");
    return;
  }

  const current = buildOperationsContext().environment;
  if (current.presetKey === "none") {
    ui.notifications?.warn("Select an environment preset before logging.");
    return;
  }

  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const preset = getEnvironmentPresetByKey(environment.presetKey);
    const check = getEnvironmentCheckMeta(preset);
    environment.logs.unshift({
      id: foundry.utils.randomID(),
      logType: "environment",
      presetKey: environment.presetKey,
      movementDc: environment.movementDc,
      actorIds: [...environment.appliedActorIds],
      syncToSceneNonParty: Boolean(environment.syncToSceneNonParty),
      note: String(environment.note ?? ""),
      checkType: check.checkType,
      checkKey: check.checkKey,
      checkLabel: check.checkLabel,
      createdAt: Date.now(),
      createdBy: String(game.user?.name ?? "GM")
    });
    if (environment.logs.length > 100) environment.logs = environment.logs.slice(0, 100);
  });

  ui.notifications?.info("Environment preset logged.");
}

async function editOperationalEnvironmentLog(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit environment logs.");
    return;
  }
  const logId = String(element?.dataset?.logId ?? "").trim();
  if (!logId) return;

  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const entry = environment.logs.find((candidate) => candidate.id === logId && String(candidate.logType ?? "environment") !== "weather");
    if (!entry) return;
    environment.presetKey = getEnvironmentPresetByKey(entry.presetKey).key;
    environment.movementDc = Math.max(1, Math.min(30, Math.floor(Number(entry.movementDc ?? 12) || 12)));
    environment.appliedActorIds = [...(entry.actorIds ?? [])];
    environment.syncToSceneNonParty = entry.syncToSceneNonParty !== false;
    environment.note = String(entry.note ?? "");
  });

  ui.notifications?.info("Loaded environment log into current controls.");
}

async function editOperationalEnvironmentLogById(logId) {
  const id = String(logId ?? "").trim();
  if (!id) return false;
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const entry = environment.logs.find((candidate) => candidate.id === id && String(candidate.logType ?? "environment") !== "weather");
    if (!entry) return;
    environment.presetKey = getEnvironmentPresetByKey(entry.presetKey).key;
    environment.movementDc = Math.max(1, Math.min(30, Math.floor(Number(entry.movementDc ?? 12) || 12)));
    environment.appliedActorIds = [...(entry.actorIds ?? [])];
    environment.syncToSceneNonParty = entry.syncToSceneNonParty !== false;
    environment.note = String(entry.note ?? "");
  });
  return true;
}

async function removeOperationalEnvironmentLog(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit environment logs.");
    return;
  }
  const logId = String(element?.dataset?.logId ?? "").trim();
  if (!logId) return;

  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    environment.logs = environment.logs.filter((entry) => !(entry.id === logId && String(entry.logType ?? "environment") !== "weather"));
  });
}

async function removeOperationalEnvironmentLogById(logId) {
  const id = String(logId ?? "").trim();
  if (!id) return false;
  let removed = false;
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const before = environment.logs.length;
    environment.logs = environment.logs.filter((entry) => !(entry.id === id && String(entry.logType ?? "environment") !== "weather"));
    removed = environment.logs.length < before;
  });
  return removed;
}

async function clearOperationalEnvironmentEffects() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can clear environment effects.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    environment.presetKey = "none";
    environment.appliedActorIds = [];
  });
  ui.notifications?.info("Active environment effects cleared.");
}

async function showOperationalEnvironmentBrief() {
  const environment = buildOperationsContext().environment;
  const selected = environment.targets.filter((target) => target.selected).map((target) => target.actorName);
  const alwaysStatusId = String(environment.preset?.alwaysStatusId ?? "").trim();
  const alwaysStatusLabel = alwaysStatusId ? getStatusLabelById(alwaysStatusId) : "-";
  const outcomes = environment.outcomes ?? {};
  const content = `
    <div class="po-help">
      <p><strong>Environment:</strong> ${environment.preset.label}</p>
      <p><strong>Description:</strong> ${environment.preset.description}</p>
      <p><strong>Movement Check:</strong> ${environment.preset.movementCheck ? "Enabled" : "Off"}</p>
      <p><strong>Check:</strong> ${environment.preset.movementCheck ? (environment.checkLabel || "-") : "-"}</p>
      <p><strong>On Success:</strong> ${String(outcomes.onSuccess ?? "-")}</p>
      <p><strong>On Fail:</strong> ${String(outcomes.onFail ?? "-")}</p>
      <p><strong>On Fail by 5+:</strong> ${String(outcomes.onFailBy5 ?? "-")}</p>
      <p><strong>On Successive Fail:</strong> ${String(outcomes.onSuccessiveFail ?? "-")}</p>
      <p><strong>Always-On Status:</strong> ${alwaysStatusLabel}</p>
      <p><strong>Movement DC (GM):</strong> ${environment.movementDc}</p>
      <p><strong>Scene Non-Party Sync:</strong> ${environment.syncToSceneNonParty ? "Enabled" : "Disabled"}</p>
      <p><strong>Applies To:</strong> ${selected.length > 0 ? selected.join(", ") : "No actors selected."}</p>
    </div>
  `;

  await Dialog.prompt({
    title: "Environment Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

function getDaeKeyLabel(key) {
  const target = String(key ?? "").trim();
  if (!target) return "";
  const match = getDaeModifierCatalog().find((entry) => entry.key === target);
  return String(match?.label ?? "").trim();
}

function getResourceSyncActors() {
  return getOwnedPcActors();
}

function getItemTrackedQuantity(item) {
  const quantity = Number(item.system?.quantity);
  if (Number.isFinite(quantity)) return quantity;
  const uses = Number(item.system?.uses?.value);
  if (Number.isFinite(uses)) return uses;
  return 0;
}

async function setItemTrackedQuantity(item, value) {
  const next = Math.max(0, Math.floor(Number(value) || 0));
  if (item.system?.quantity !== undefined) {
    await item.update({ "system.quantity": next });
    return;
  }
  if (item.system?.uses?.value !== undefined) {
    await item.update({ "system.uses.value": next });
  }
}

function isMonksTokenBarActive() {
  return Boolean(game.modules.get("monks-tokenbar")?.active);
}

function getMonksTokenBarApi() {
  return game.MonksTokenBar ?? globalThis.MonksTokenBar ?? game.modules.get("monks-tokenbar")?.api ?? null;
}

function extractRollTotalFromMonksResult(result, actorId) {
  if (!result) return null;
  const candidates = [];

  if (Array.isArray(result)) candidates.push(...result);
  if (Array.isArray(result?.results)) candidates.push(...result.results);
  if (Array.isArray(result?.rolls)) candidates.push(...result.rolls);
  candidates.push(result);

  for (const entry of candidates) {
    if (!entry) continue;
    const entryActorId = entry.actorId ?? entry.id ?? entry.actor?.id ?? entry.token?.actor?.id;
    if (actorId && entryActorId && entryActorId !== actorId) continue;
    const total = Number(entry.total ?? entry.result ?? entry.roll?.total ?? entry.rollTotal);
    if (Number.isFinite(total)) return total;
  }
  return null;
}

async function requestMonksActorCheck(actor, request, dc, flavor, options = {}) {
  if (!actor || !isMonksTokenBarActive()) return null;
  const api = getMonksTokenBarApi();
  if (!api || typeof api.requestRoll !== "function") return null;

  const requestType = String(request ?? "skill:sur").trim() || "skill:sur";
  const showDc = Boolean(options.showDc);
  const requestOptions = {
    request: requestType,
    dc,
    flavor,
    silent: false,
    fastForward: false,
    showdc: showDc,
    showDC: showDc,
    rollmode: "roll",
    rollMode: "roll"
  };

  const actorTargets = [actor];
  const tokenTargets = actor.getActiveTokens?.(true, true) ?? [];
  const firstToken = tokenTargets[0] ?? null;

  const extractCallbackResult = (result) => {
    const tokenResults = Array.isArray(result?.tokenresults) ? result.tokenresults : [];
    const fallbackEntry = tokenResults[0] ?? null;
    const entry = tokenResults.find((tokenResult) => {
      const resultActorId = tokenResult?.actor?.id ?? tokenResult?.actorId ?? tokenResult?.actorid;
      return String(resultActorId ?? "") === actor.id;
    }) ?? fallbackEntry;
    if (!entry) return null;

    const total = Number(entry?.roll?.total ?? entry?.total);
    let passed = entry?.passed;
    if (passed === "success") passed = true;
    if (passed === "failed") passed = false;
    if (typeof passed !== "boolean" && Number.isFinite(total)) passed = total >= dc;

    return {
      total: Number.isFinite(total) ? total : null,
      passed: typeof passed === "boolean" ? passed : null,
      result
    };
  };

  return await new Promise(async (resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    requestOptions.callback = (result) => {
      const parsed = extractCallbackResult(result);
      if (parsed) {
        settle({ total: parsed.total, passed: parsed.passed, source: "monks", response: parsed.result });
        return;
      }
      settle({ total: null, passed: null, source: "monks", response: result });
    };

    const attempts = [
      () => api.requestRoll(actorTargets, requestOptions),
      () => api.requestRoll(firstToken ? [firstToken] : actorTargets, requestOptions),
      () => api.requestRoll(actorTargets, requestType, requestOptions)
    ];

    for (const attempt of attempts) {
      try {
        const response = await attempt();
        const total = extractRollTotalFromMonksResult(response, actor.id);
        if (Number.isFinite(total)) {
          settle({ total, passed: total >= dc, source: "monks", response });
          return;
        }
        if (response !== undefined) {
          setTimeout(() => {
            if (!settled) settle({ total: null, passed: null, source: "monks", response });
          }, 180000);
          return;
        }
      } catch (error) {
        console.warn("party-operations: monks-tokenbar requestRoll attempt failed", error);
      }
    }

    settle(null);
  });
}

async function requestMonksSurvivalRoll(actor, dc, flavor) {
  return requestMonksActorCheck(actor, "skill:sur", dc, flavor, { showDc: true });
}

async function consumeSelectedInventoryItem(selection, amount) {
  const needed = Math.max(0, Math.floor(Number(amount) || 0));
  const actorId = String(selection?.actorId ?? "");
  const itemId = String(selection?.itemId ?? "");
  if (needed <= 0) return { needed, consumed: 0, missing: 0, source: "" };
  if (!actorId || !itemId) return { needed, consumed: 0, missing: needed, source: "" };

  const actor = game.actors.get(actorId);
  const item = actor?.items?.get(itemId);
  if (!actor || !item) return { needed, consumed: 0, missing: needed, source: "" };

  const current = Math.max(0, Math.floor(getItemTrackedQuantity(item)));
  const consumed = Math.min(current, needed);
  if (consumed > 0) await setItemTrackedQuantity(item, current - consumed);

  return {
    needed,
    consumed,
    missing: Math.max(0, needed - consumed),
    source: `${actor.name} · ${item.name}`
  };
}

async function addToSelectedInventoryItem(selection, amount) {
  const gained = Math.max(0, Math.floor(Number(amount) || 0));
  const actorId = String(selection?.actorId ?? "");
  const itemId = String(selection?.itemId ?? "");
  if (gained <= 0) return { gained, added: 0, source: "" };
  if (!actorId || !itemId) return { gained, added: 0, source: "" };

  const actor = game.actors.get(actorId);
  const item = actor?.items?.get(itemId);
  if (!actor || !item) return { gained, added: 0, source: "" };

  const current = Math.max(0, Math.floor(getItemTrackedQuantity(item)));
  await setItemTrackedQuantity(item, current + gained);

  return {
    gained,
    added: gained,
    source: `${actor.name} · ${item.name}`
  };
}

async function depleteLinkedResourceItems(drains, itemSelections) {
  const results = [];
  const rows = [
    { key: "food", drain: Number(drains.foodDrain ?? 0) },
    { key: "water", drain: Number(drains.waterDrain ?? 0) },
    { key: "torches", drain: Number(drains.torchDrain ?? 0) }
  ];

  for (const row of rows) {
    const selectedResult = await consumeSelectedInventoryItem(itemSelections?.[row.key], row.drain);
    results.push({
      key: row.key,
      name: selectedResult.source || row.key,
      needed: row.drain,
      consumed: selectedResult.consumed,
      missing: Math.max(0, row.drain - selectedResult.consumed)
    });
  }

  return results;
}

function getGatherWeatherOptions(resourcesState = null) {
  const weatherMods = resourcesState?.gather?.weatherMods ?? {};
  const rows = [
    { value: "clear", label: "Clear / Calm", fallback: 0 },
    { value: "light-rain", label: "Light Rain or Snow", fallback: 2 },
    { value: "heavy-rain", label: "Heavy Rain or Snow", fallback: 5 },
    { value: "wind", label: "Strong Wind", fallback: 2 },
    { value: "fog", label: "Heavy Fog", fallback: 3 },
    { value: "extreme", label: "Extreme Heat or Cold", fallback: 5 }
  ];
  return rows.map((row) => {
    const configured = Number(weatherMods[row.value]);
    return {
      value: row.value,
      label: row.label,
      dcMod: Number.isFinite(configured) ? configured : row.fallback
    };
  });
}

function wireGatherDcPreview(dialog, weatherOptions) {
  Hooks.once("renderDialog", (app, html) => {
    if (app !== dialog) return;
    const root = html;
    const baseDcInput = root.find("input[name=hiddenDc]");
    const weatherSelect = root.find("select[name=weather]");
    const previewTarget = root.find("[data-gather-dc-preview]");

    const refresh = () => {
      const hiddenDcRaw = Number(baseDcInput.val() ?? 15);
      const hiddenBaseDc = Number.isFinite(hiddenDcRaw) ? Math.max(1, Math.floor(hiddenDcRaw)) : 15;
      const weatherKey = String(weatherSelect.val() ?? "clear");
      const weather = weatherOptions.find((entry) => entry.value === weatherKey) ?? weatherOptions[0];
      const finalDc = hiddenBaseDc + Number(weather?.dcMod ?? 0);
      previewTarget.text(`${hiddenBaseDc} + ${Number(weather?.dcMod ?? 0)} = ${finalDc}`);
    };

    baseDcInput.on("input change", refresh);
    weatherSelect.on("change", refresh);
    refresh();
  });
}

async function rollWisdomSurvival(actor, options = {}) {
  const dc = Number(options?.dc);
  const flavor = String(options?.flavor ?? "Wisdom (Survival)");
  const rollMode = String(options?.rollMode ?? "prefer-monks");
  const canUseMonks = Number.isFinite(dc) && isMonksTokenBarActive();

  if ((rollMode === "prefer-monks" || rollMode === "monks-only") && canUseMonks) {
    const monksResult = await requestMonksSurvivalRoll(actor, dc, flavor);
    if (monksResult && Number.isFinite(monksResult.total)) {
      return { total: Number(monksResult.total), source: "monks", roll: monksResult.response };
    }
    if (monksResult) {
      ui.notifications?.warn("Monk's TokenBar roll request sent, but no roll total was returned to Party Operations. Falling back to direct roll.");
    }
    if (rollMode === "monks-only") {
      throw new Error("Monk's TokenBar did not return a usable roll total for this request.");
    }
  }

  if (rollMode === "monks-only" && !canUseMonks) {
    throw new Error("Monk's TokenBar is not available for a DC roll request.");
  }

  if (actor && typeof actor.rollSkill === "function") {
    try {
      const rollResult = await actor.rollSkill("sur", { fastForward: true, chatMessage: false });
      const total = Number(rollResult?.total ?? rollResult?.roll?.total);
      if (Number.isFinite(total)) return { total, source: "native", roll: rollResult };
    } catch (error) {
      console.warn("party-operations: rollSkill(sur) failed, using fallback roll", error);
    }
  }

  const wisMod = Number(actor?.system?.abilities?.wis?.mod ?? 0);
  const roll = await (new Roll("1d20 + @mod", { mod: wisMod })).evaluate();
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });
  return { total: Number(roll.total ?? 0), source: "native", roll };
}

function getActorEnvironmentAssignment(actorId) {
  const ledger = getOperationsLedger();
  const environment = ensureEnvironmentState(ledger);
  const presetBase = getEnvironmentPresetByKey(environment.presetKey);
  const preset = applyEnvironmentSuccessiveConfigToPreset(presetBase, environment);
  const applies = preset.key !== "none" && environment.appliedActorIds.includes(String(actorId ?? ""));
  if (!applies) return null;
  return {
    preset,
    movementDc: Number(environment.movementDc ?? 12),
    failStatusId: String(preset.failStatusId ?? "").trim(),
    failBy5StatusId: String(preset.failBy5StatusId ?? "").trim(),
    failSlideFeet: Math.max(0, Number(preset.failSlideFeet ?? 0) || 0),
    failBy5SlideFeet: Math.max(0, Number(preset.failBy5SlideFeet ?? 0) || 0),
    failSpeedZeroTurns: Math.max(0, Number(preset.failSpeedZeroTurns ?? 0) || 0),
    failDamageFormula: String(preset.failDamageFormula ?? "").trim(),
    failDamageType: String(preset.failDamageType ?? "").trim(),
    failBy5DamageFormula: String(preset.failBy5DamageFormula ?? "").trim(),
    failBy5DamageType: String(preset.failBy5DamageType ?? "").trim(),
    failExhaustion: Math.max(0, Number(preset.failExhaustion ?? 0) || 0),
    failBy5MaxHpReductionFormula: String(preset.failBy5MaxHpReductionFormula ?? "").trim(),
    successiveFailStatusId: String(preset.successiveFailStatusId ?? "").trim(),
    successiveFailSlideFeet: Math.max(0, Number(preset.successiveFailSlideFeet ?? 0) || 0),
    successiveFailExhaustion: Math.max(0, Number(preset.successiveFailExhaustion ?? (preset.movementCheck ? 1 : 0)) || 0),
    successiveFailDamageFormula: String(preset.successiveFailDamageFormula ?? "").trim(),
    successiveFailDamageType: String(preset.successiveFailDamageType ?? "").trim(),
    successiveFailMaxHpReductionFormula: String(preset.successiveFailMaxHpReductionFormula ?? "").trim(),
    successiveFailDaeChangeKey: String(preset.successiveFailDaeChangeKey ?? "").trim(),
    successiveFailDaeChangeMode: Math.floor(Number(preset.successiveFailDaeChangeMode ?? CONST.ACTIVE_EFFECT_MODES.ADD)),
    successiveFailDaeChangeValue: String(preset.successiveFailDaeChangeValue ?? "").trim()
  };
}

async function recordEnvironmentCheckResult(actor, assignment, movementContext = {}) {
  const actorId = String(actor?.id ?? "").trim();
  if (!actorId) return { previous: 0, next: 0 };

  const failed = Boolean(movementContext?.failed);
  const rollTotalRaw = Number(movementContext?.rollTotal);
  const dcRaw = Number(movementContext?.dc);
  const rollTotal = Number.isFinite(rollTotalRaw) ? Math.floor(rollTotalRaw) : null;
  const dc = Number.isFinite(dcRaw) ? Math.floor(dcRaw) : null;
  const outcomeSummary = String(movementContext?.outcomeSummary ?? "").trim();
  const presetKey = getEnvironmentPresetByKey(String(assignment?.preset?.key ?? "none")).key;

  let previous = 0;
  let next = 0;
  await updateOperationsLedger((ledger) => {
    const environment = ensureEnvironmentState(ledger);
    const current = Math.max(0, Number(environment.failureStreaks?.[actorId] ?? 0) || 0);
    previous = current;
    next = failed ? Math.max(1, Math.min(99, current + 1)) : 0;

    if (next > 0) environment.failureStreaks[actorId] = next;
    else delete environment.failureStreaks[actorId];

    environment.checkResults.unshift({
      id: foundry.utils.randomID(),
      actorId,
      actorName: String(actor?.name ?? "").trim(),
      presetKey,
      result: failed ? "fail" : "pass",
      rollTotal,
      dc,
      streak: next,
      outcomeSummary,
      createdAt: Date.now(),
      createdBy: String(game.user?.name ?? "GM")
    });
    if (environment.checkResults.length > 100) {
      environment.checkResults = environment.checkResults.slice(0, 100);
    }
  });

  return { previous, next };
}

async function applyEnvironmentFailureConsequences(tokenDoc, assignment, movementContext = null) {
  if (!game.user.isGM || !tokenDoc || !assignment) return { summary: "" };

  const rollTotal = Number(movementContext?.rollTotal ?? NaN);
  const dc = Number(movementContext?.dc ?? NaN);
  const failedBy = Number.isFinite(rollTotal) && Number.isFinite(dc) ? Math.max(0, dc - rollTotal) : 0;
  const failedByFive = failedBy >= 5;
  const failStreak = Math.max(0, Number(movementContext?.failStreak ?? 0) || 0);
  const successiveFailure = failStreak >= 2;
  const summaryParts = [];

  const getStatusEffectById = (statusId) => CONFIG.statusEffects?.find((entry) => String(entry?.id ?? "") === statusId) ?? statusId;

  const toggleStatusOn = async (statusId) => {
    const id = String(statusId ?? "").trim();
    if (!id) return;
    try {
      if (typeof tokenDoc.actor?.toggleStatusEffect === "function") {
        await tokenDoc.actor.toggleStatusEffect(id, { active: true, overlay: false });
      } else if (tokenDoc.object && typeof tokenDoc.object.toggleEffect === "function") {
        await tokenDoc.object.toggleEffect(getStatusEffectById(id), { active: true });
      }
      const statusLabel = getStatusLabelById(id);
      summaryParts.push(`Status: ${statusLabel || id}`);
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to apply environment status '${id}'`, error);
    }
  };

  const getFeetToPixels = (feet) => {
    const gridSize = Number(canvas?.scene?.grid?.size ?? canvas?.grid?.size ?? 0);
    const gridDistance = Number(canvas?.scene?.grid?.distance ?? canvas?.grid?.distance ?? 5);
    if (!Number.isFinite(gridSize) || gridSize <= 0) return 0;
    if (!Number.isFinite(gridDistance) || gridDistance <= 0) return gridSize;
    return (Number(feet || 0) / gridDistance) * gridSize;
  };

  const slideTokenByFeet = async (feet) => {
    const distancePixels = getFeetToPixels(feet);
    if (!Number.isFinite(distancePixels) || distancePixels <= 0) return;
    const origin = movementContext?.origin;
    const destination = movementContext?.destination;
    if (!origin || !destination) return;

    const dx = Number(destination.x ?? 0) - Number(origin.x ?? 0);
    const dy = Number(destination.y ?? 0) - Number(origin.y ?? 0);
    const magnitude = Math.hypot(dx, dy);
    if (!Number.isFinite(magnitude) || magnitude <= 0) return;

    const ux = dx / magnitude;
    const uy = dy / magnitude;
    const nextX = Math.round(Number(destination.x ?? 0) + (ux * distancePixels));
    const nextY = Math.round(Number(destination.y ?? 0) + (uy * distancePixels));
    await tokenDoc.update({ x: nextX, y: nextY }, { poEnvironmentClamp: true });
  };

  const applyDamageFormula = async (formula, damageType = "") => {
    const text = String(formula ?? "").trim();
    if (!text) return null;
    try {
      const roll = await (new Roll(text)).evaluate();
      const amount = Math.max(0, Math.floor(Number(roll.total ?? 0)));
      if (amount <= 0) return { amount: 0 };
      const hpPath = "system.attributes.hp.value";
      const hpValue = Number(foundry.utils.getProperty(tokenDoc.actor, hpPath) ?? 0);
      if (Number.isFinite(hpValue)) {
        await tokenDoc.actor.update({ [hpPath]: Math.max(0, hpValue - amount) });
      }
      return { amount, damageType: String(damageType ?? "").trim() };
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to evaluate damage formula '${text}'`, error);
      return null;
    }
  };

  const applyExhaustionLevels = async (levels) => {
    const amount = Math.max(0, Math.floor(Number(levels ?? 0)));
    if (amount <= 0) return;
    const path = "system.attributes.exhaustion";
    const current = Number(foundry.utils.getProperty(tokenDoc.actor, path) ?? 0);
    if (!Number.isFinite(current)) return;
    await tokenDoc.actor.update({ [path]: Math.max(0, Math.min(6, current + amount)) });
  };

  const applyTemporarySpeedZero = async (turns = 1) => {
    const durationRounds = Math.max(1, Math.floor(Number(turns ?? 1) || 1));
    const combat = game.combat;
    const duration = combat
      ? { rounds: durationRounds, startRound: Number(combat.round ?? 0), startTurn: Number(combat.turn ?? 0) }
      : { seconds: 6 * durationRounds, startTime: Number(game.time?.worldTime ?? 0) };
    const effectData = {
      name: "Environment: Unstable Footing (Speed 0)",
      img: assignment?.preset?.icon ?? "icons/svg/hazard.svg",
      origin: `${ENVIRONMENT_EFFECT_ORIGIN}.failure`,
      disabled: false,
      transfer: false,
      duration,
      changes: [
        {
          key: "system.attributes.movement.walk",
          mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
          value: "0",
          priority: 20
        }
      ],
      flags: {
        [MODULE_ID]: {
          environmentFailure: true,
          speedZero: true
        }
      }
    };
    await tokenDoc.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  };

  const applyMaxHpReductionFormula = async (formula) => {
    const text = String(formula ?? "").trim();
    if (!text) return null;
    try {
      const roll = await (new Roll(text)).evaluate();
      const reduction = Math.max(0, Math.floor(Number(roll.total ?? 0)));
      if (reduction <= 0) return { reduction: 0 };
      const effectData = {
        name: "Environment: Max HP Reduction",
        img: assignment?.preset?.icon ?? "icons/svg/skull.svg",
        origin: `${ENVIRONMENT_EFFECT_ORIGIN}.failure`,
        disabled: false,
        transfer: false,
        duration: {
          seconds: 86400,
          startTime: Number(game.time?.worldTime ?? 0)
        },
        changes: [
          {
            key: "system.attributes.hp.max",
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: String(-reduction),
            priority: 20
          }
        ],
        flags: {
          [MODULE_ID]: {
            environmentFailure: true,
            maxHpReduction: reduction
          }
        }
      };
      await tokenDoc.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
      return { reduction };
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to apply max HP reduction formula '${text}'`, error);
      return null;
    }
  };

  const applyCustomDaeChange = async (changeKey, changeMode, changeValue) => {
    const key = String(changeKey ?? "").trim();
    const value = String(changeValue ?? "").trim();
    if (!key || !value) return;
    const rawMode = Math.floor(Number(changeMode ?? CONST.ACTIVE_EFFECT_MODES.ADD));
    const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((entry) => Number(entry)));
    const mode = validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD);
    const effectData = {
      name: "Environment: Successive Failure DAE",
      img: assignment?.preset?.icon ?? "icons/svg/aura.svg",
      origin: `${ENVIRONMENT_EFFECT_ORIGIN}.successive`,
      disabled: false,
      transfer: false,
      duration: {
        seconds: 86400,
        startTime: Number(game.time?.worldTime ?? 0)
      },
      changes: [
        {
          key,
          mode,
          value,
          priority: 20
        }
      ],
      flags: {
        [MODULE_ID]: {
          environmentFailure: true,
          successiveFailure: true,
          daeChange: true
        }
      }
    };
    await tokenDoc.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  };

  const statusId = String(assignment.failStatusId ?? "").trim();
  if (statusId) await toggleStatusOn(statusId);
  if (failedByFive) {
    const failBy5StatusId = String(assignment.failBy5StatusId ?? "").trim();
    if (failBy5StatusId) await toggleStatusOn(failBy5StatusId);
  }

  const slideFeet = failedByFive
    ? Math.max(0, Number(assignment.failBy5SlideFeet ?? assignment.failSlideFeet ?? 0) || 0)
    : Math.max(0, Number(assignment.failSlideFeet ?? 0) || 0);
  if (slideFeet > 0) await slideTokenByFeet(slideFeet);
  if (slideFeet > 0) summaryParts.push(`Slide ${slideFeet} ft`);

  const speedZeroTurns = Math.max(0, Number(assignment.failSpeedZeroTurns ?? 0) || 0);
  if (speedZeroTurns > 0) await applyTemporarySpeedZero(speedZeroTurns);
  if (speedZeroTurns > 0) summaryParts.push(`Speed 0 for ${speedZeroTurns} turn(s)`);

  await applyExhaustionLevels(Number(assignment.failExhaustion ?? 0));
  if (Number(assignment.failExhaustion ?? 0) > 0) summaryParts.push(`Exhaustion +${Number(assignment.failExhaustion ?? 0)}`);

  const damageFormula = failedByFive
    ? String(assignment.failBy5DamageFormula ?? assignment.failDamageFormula ?? "")
    : String(assignment.failDamageFormula ?? "");
  const damageType = failedByFive
    ? String(assignment.failBy5DamageType ?? assignment.failDamageType ?? "")
    : String(assignment.failDamageType ?? "");
  const damageResult = await applyDamageFormula(damageFormula, damageType);

  if (failedByFive) {
    await applyMaxHpReductionFormula(String(assignment.failBy5MaxHpReductionFormula ?? ""));
    if (String(assignment.failBy5MaxHpReductionFormula ?? "").trim()) {
      summaryParts.push(`Max HP reduction: ${String(assignment.failBy5MaxHpReductionFormula ?? "").trim()}`);
    }
  }

  if (successiveFailure) {
    const successiveFailStatusId = String(assignment.successiveFailStatusId ?? "").trim();
    if (successiveFailStatusId) await toggleStatusOn(successiveFailStatusId);

    const successiveSlideFeet = Math.max(0, Number(assignment.successiveFailSlideFeet ?? 0) || 0);
    if (successiveSlideFeet > 0) await slideTokenByFeet(successiveSlideFeet);
    if (successiveSlideFeet > 0) summaryParts.push(`Successive slide ${successiveSlideFeet} ft`);

    await applyExhaustionLevels(Number(assignment.successiveFailExhaustion ?? 0));
    if (Number(assignment.successiveFailExhaustion ?? 0) > 0) {
      summaryParts.push(`Successive exhaustion +${Number(assignment.successiveFailExhaustion ?? 0)}`);
    }

    const successiveDamageResult = await applyDamageFormula(
      String(assignment.successiveFailDamageFormula ?? ""),
      String(assignment.successiveFailDamageType ?? "")
    );
    if (successiveDamageResult?.amount > 0) {
      const gmIds = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
      const typed = successiveDamageResult.damageType ? ` ${successiveDamageResult.damageType}` : "";
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
        whisper: gmIds,
        content: `<p><strong>${tokenDoc.actor?.name ?? "Actor"}</strong> suffers ${successiveDamageResult.amount}${typed} damage from successive ${assignment?.preset?.label ?? "environment"} failure (streak ${failStreak}).</p>`
      });
    }

    await applyMaxHpReductionFormula(String(assignment.successiveFailMaxHpReductionFormula ?? ""));
    if (String(assignment.successiveFailMaxHpReductionFormula ?? "").trim()) {
      summaryParts.push(`Successive max HP reduction: ${String(assignment.successiveFailMaxHpReductionFormula ?? "").trim()}`);
    }
    await applyCustomDaeChange(
      assignment.successiveFailDaeChangeKey,
      assignment.successiveFailDaeChangeMode,
      assignment.successiveFailDaeChangeValue
    );
    if (String(assignment.successiveFailDaeChangeKey ?? "").trim() && String(assignment.successiveFailDaeChangeValue ?? "").trim()) {
      summaryParts.push(`DAE ${String(assignment.successiveFailDaeChangeKey ?? "").trim()} ${getActiveEffectModeLabel(assignment.successiveFailDaeChangeMode)} ${String(assignment.successiveFailDaeChangeValue ?? "").trim()}`);
    }
  }

  if (damageResult?.amount > 0) {
    const gmIds = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
    const typed = damageResult.damageType ? ` ${damageResult.damageType}` : "";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
      whisper: gmIds,
      content: `<p><strong>${tokenDoc.actor?.name ?? "Actor"}</strong> suffers ${damageResult.amount}${typed} damage from ${assignment?.preset?.label ?? "environment"}.</p>`
    });
    summaryParts.push(`Damage ${damageResult.amount}${damageResult.damageType ? ` ${damageResult.damageType}` : ""}`);
  }

  return { summary: summaryParts.join(" · ") };
}

async function promptEnvironmentMovementCheck(tokenDoc, actor, assignment, movementContext = null) {
  if (!game.user.isGM || !actor || !assignment?.preset?.movementCheck) return;
  const preset = assignment.preset;
  const dc = Math.max(1, Math.floor(Number(assignment.movementDc ?? 12) || 12));
  const check = getEnvironmentCheckMeta(preset);
  const request = `${check.checkType}:${check.checkKey}`;
  const flavor = `${preset.label} movement ${check.checkType === "save" ? "save" : "check"} (${check.checkLabel})`;

  let total = null;
  let passed = null;

  if (isMonksTokenBarActive()) {
    try {
      const monksResult = await requestMonksActorCheck(actor, request, dc, flavor, { showDc: false });
      total = Number(monksResult?.total);
      if (Number.isFinite(total)) passed = total >= dc;
      else if (typeof monksResult?.passed === "boolean") passed = monksResult.passed;
    } catch (error) {
      console.warn(`${MODULE_ID}: monks movement check request failed`, error);
    }
  }

  if (!Number.isFinite(total) && check.checkType === "save" && typeof actor.rollAbilitySave === "function") {
    try {
      const roll = await actor.rollAbilitySave(check.checkKey, { fastForward: true, chatMessage: false });
      total = Number(roll?.total ?? roll?.roll?.total);
      if (Number.isFinite(total)) passed = total >= dc;
    } catch (error) {
      console.warn(`${MODULE_ID}: native movement save failed`, error);
    }
  } else if (!Number.isFinite(total) && typeof actor.rollSkill === "function") {
    try {
      const roll = await actor.rollSkill(check.checkKey, { fastForward: true, chatMessage: false });
      total = Number(roll?.total ?? roll?.roll?.total);
      if (Number.isFinite(total)) passed = total >= dc;
    } catch (error) {
      console.warn(`${MODULE_ID}: native movement check failed`, error);
    }
  }

  if (!Number.isFinite(total) && typeof passed !== "boolean") return;
  const failed = typeof passed === "boolean" ? !passed : (Number.isFinite(total) ? total < dc : false);

  let failureSummary = "";
  let predictedStreak = 0;
  if (failed) {
    const ledger = getOperationsLedger();
    const environment = ensureEnvironmentState(ledger);
    predictedStreak = Math.max(1, Math.max(0, Number(environment.failureStreaks?.[actor.id] ?? 0) || 0) + 1);
    const consequence = await applyEnvironmentFailureConsequences(tokenDoc, assignment, {
      ...(movementContext ?? {}),
      rollTotal: Number.isFinite(total) ? total : null,
      dc,
      failStreak: predictedStreak
    });
    failureSummary = String(consequence?.summary ?? "").trim();
  }

  const streakState = await recordEnvironmentCheckResult(actor, assignment, {
    failed,
    rollTotal: Number.isFinite(total) ? total : null,
    dc,
    outcomeSummary: failed ? (failureSummary || `Failed by ${Math.max(0, dc - Number(total || 0))}`) : "Success"
  });

  const gmIds = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const resultText = failed ? "Fail" : "Success";
  const totalText = Number.isFinite(total) ? ` (${total})` : "";
  const streakText = failed
    ? ` · Fail Streak ${streakState.next}`
    : (streakState.previous > 0 ? " · Fail Streak Reset" : "");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    whisper: gmIds,
    content: `<p><strong>${actor.name}</strong> ${flavor}: ${resultText}${totalText}${streakText}</p>`
  });
}

async function maybePromptEnvironmentMovementCheck(tokenDoc, changed, options = {}) {
  if (!game.user.isGM) return;
  if (options?.poEnvironmentClamp) return;
  if (!changed || (changed.x === undefined && changed.y === undefined)) return;
  const actor = tokenDoc?.actor;
  if (!actor) return;

  const assignment = getActorEnvironmentAssignment(actor.id);
  if (!assignment?.preset?.movementCheck) return;

  const now = Date.now();
  const last = Number(environmentMovePromptByActor.get(actor.id) ?? 0);
  if (now - last < ENVIRONMENT_MOVE_PROMPT_COOLDOWN_MS) return;
  environmentMovePromptByActor.set(actor.id, now);

  const origin = environmentMoveOriginByToken.get(tokenDoc.id) ?? { x: Number(tokenDoc.x ?? 0), y: Number(tokenDoc.y ?? 0) };
  environmentMoveOriginByToken.delete(tokenDoc.id);
  const destination = {
    x: Number(changed.x ?? tokenDoc.x ?? 0),
    y: Number(changed.y ?? tokenDoc.y ?? 0)
  };

  await promptEnvironmentMovementCheck(tokenDoc, actor, assignment, { origin, destination });
}

async function runGatherResourceCheck() {
  const actors = getResourceSyncActors().sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  if (actors.length === 0) {
    ui.notifications?.warn("No eligible party actors found for gather checks.");
    return;
  }

  const ledger = getOperationsLedger();
  const resources = foundry.utils.deepClone(ledger.resources ?? {});
  ensureOperationalResourceConfig(resources);
  const weatherOptions = getGatherWeatherOptions(resources);
  const rollMode = getGatherRollModeSetting();
  const actorOptions = actors.map((actor) => `<option value="${actor.id}">${actor.name}</option>`).join("");
  const weatherHtml = weatherOptions.map((entry) => `<option value="${entry.value}">${entry.label} (DC +${entry.dcMod})</option>`).join("");

  const content = `
    <div class="form-group">
      <label>Gathering Actor</label>
      <select name="actorId">${actorOptions}</select>
    </div>
    <div class="form-group">
      <label>Gather Target</label>
      <select name="gatherType">
        <option value="food">Food</option>
        <option value="water">Water</option>
        <option value="both" selected>Food + Water</option>
      </select>
    </div>
    <div class="form-group">
      <label>Base DC</label>
      <input type="number" name="hiddenDc" value="15" min="1" step="1" />
    </div>
    <div class="form-group">
      <label>Weather (D&D 5e modifier)</label>
      <select name="weather">${weatherHtml}</select>
    </div>
    <div class="form-group">
      <label>Effective DC Preview</label>
      <div><strong data-gather-dc-preview>15 + 0 = 15</strong></div>
    </div>
  `;

  const dialog = new Dialog({
    title: "Gather Resources Check",
    content,
    buttons: {
      roll: {
        label: "Roll Wisdom (Survival)",
        callback: async (html) => {
          const actorId = String(html.find("select[name=actorId]").val() ?? "");
          const gatherType = String(html.find("select[name=gatherType]").val() ?? "both");
          const hiddenDcRaw = Number(html.find("input[name=hiddenDc]").val() ?? 15);
          const hiddenBaseDc = Number.isFinite(hiddenDcRaw) ? Math.max(1, Math.floor(hiddenDcRaw)) : 15;
          const weatherKey = String(html.find("select[name=weather]").val() ?? "clear");

          const actor = game.actors.get(actorId);
          if (!actor) {
            ui.notifications?.warn("Select a valid actor for the gather check.");
            return;
          }

          const weather = weatherOptions.find((entry) => entry.value === weatherKey) ?? weatherOptions[0];
          const targetDc = hiddenBaseDc + weather.dcMod;
          let survival;
          try {
            survival = await rollWisdomSurvival(actor, {
              dc: targetDc,
              flavor: "Gathering Check: Wisdom (Survival)",
              rollMode
            });
          } catch (error) {
            ui.notifications?.warn(error?.message ?? "Gather check roll could not be resolved.");
            return;
          }
          const success = typeof survival.passed === "boolean"
            ? survival.passed
            : Number(survival.total ?? 0) >= targetDc;
          const wisMod = Number(actor.system?.abilities?.wis?.mod ?? 0);

          let gainedFood = 0;
          let gainedWater = 0;
          let appliedGatherGain = false;
          let foodInventoryGainSource = "";
          let waterInventoryGainSource = "";

          if (success) {
            const coverageDueKey = getNextUpkeepDueKey(getCurrentWorldTimestamp());
            if (gatherType === "food" || gatherType === "both") {
              const foodRoll = await (new Roll("1d6 + @mod", { mod: wisMod })).evaluate();
              gainedFood = Math.max(0, Math.floor(Number(foodRoll.total ?? 0)));
            }
            if (gatherType === "water" || gatherType === "both") {
              const waterRoll = await (new Roll("1d6 + @mod", { mod: wisMod })).evaluate();
              gainedWater = Math.max(0, Math.floor(Number(waterRoll.total ?? 0)));
            }

            const applyGain = game.user.isGM
              ? await Dialog.confirm({
                title: "Approve Gather Recovery",
                content: `<p><strong>Actor:</strong> ${actor.name}</p><p><strong>Result:</strong> Success (${survival.total} vs DC ${targetDc})</p><p><strong>Gather Gain:</strong> Food +${gainedFood}, Water +${gainedWater}</p><p>Apply these gains to Party Food/Water pools and linked inventory selections?</p>`,
                yes: () => true,
                no: () => false,
                defaultYes: true
              })
              : false;

            if (!game.user.isGM) {
              ui.notifications?.warn("Gather gains require GM approval before applying resources.");
            }

            if (applyGain) {
              const foodItemGain = await addToSelectedInventoryItem(resources.itemSelections?.food, gainedFood);
              const waterItemGain = await addToSelectedInventoryItem(resources.itemSelections?.water, gainedWater);
              foodInventoryGainSource = foodItemGain.source;
              waterInventoryGainSource = waterItemGain.source;

              await updateOperationsLedger((ledger) => {
                if (!ledger.resources) ledger.resources = {};
                ensureOperationalResourceConfig(ledger.resources);
                if (gainedFood > 0) {
                  ledger.resources.partyFoodRations = Math.max(0, Number(ledger.resources.partyFoodRations ?? 0) + gainedFood);
                }
                if (gainedWater > 0) {
                  ledger.resources.partyWaterRations = Math.max(0, Number(ledger.resources.partyWaterRations ?? 0) + gainedWater);
                }
                if (gatherType === "food" || gatherType === "both") {
                  ledger.resources.gather.foodCoverageDueKey = coverageDueKey;
                  ledger.resources.gather.foodCoveredNextUpkeep = true;
                }
                if (gatherType === "water" || gatherType === "both") {
                  ledger.resources.gather.waterCoverageDueKey = coverageDueKey;
                }
              });
              appliedGatherGain = true;
            }
          }

          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
            content: `<p><strong>Gathering Check</strong></p><p><strong>Actor:</strong> ${actor.name}</p><p><strong>Check:</strong> Wisdom (Survival) = ${survival.total}</p><p><strong>Roll Source:</strong> ${survival.source === "monks" ? "Monk's TokenBar" : "Foundry"}</p><p><strong>Weather:</strong> ${weather.label}</p><p><strong>Result:</strong> ${success ? "Success" : "Failure"}</p>${success ? `<p><strong>Resources Gained:</strong> Food Rations +${gainedFood}, Water Rations +${gainedWater}${appliedGatherGain ? " (Approved)" : " (Not Applied)"}</p>${foodInventoryGainSource ? `<p><strong>Food Inventory Increased:</strong> ${foodInventoryGainSource} +${gainedFood}</p>` : ""}${waterInventoryGainSource ? `<p><strong>Water Inventory Increased:</strong> ${waterInventoryGainSource} +${gainedWater}</p>` : ""}<p><strong>Usage Reduction:</strong> ${(gatherType === "both") ? "Food and water" : (gatherType === "food" ? "Food" : "Water")} usage will be reduced for the next upkeep day.</p>` : ""}`
          });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "roll"
  });
  wireGatherDcPreview(dialog, weatherOptions);
  dialog.render(true);
}

async function setReconField(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update recon planning.");
    return;
  }
  const field = String(element?.dataset?.reconField ?? "").trim();
  if (!field) return;

  await updateOperationsLedger((ledger) => {
    const recon = ensureReconState(ledger);
    if (field === "objective" || field === "region" || field === "intelSource" || field === "recentFindings") {
      recon[field] = String(element?.value ?? "");
      return;
    }
    if (field === "heatLevel") {
      const value = String(element?.value ?? "moderate").trim().toLowerCase();
      recon.heatLevel = ["low", "moderate", "high"].includes(value) ? value : "moderate";
      return;
    }
    if (field === "network") {
      const value = String(element?.value ?? "limited").trim().toLowerCase();
      recon.network = ["limited", "established", "deep"].includes(value) ? value : "limited";
      return;
    }
    if (field === "rumorReliability") {
      const value = Number(element?.value ?? 50);
      recon.rumorReliability = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 50;
      return;
    }
    if (field === "bribeBudget") {
      const value = Number(element?.value ?? 0);
      recon.bribeBudget = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      return;
    }
    if (field === "spySlots") {
      const value = Number(element?.value ?? 0);
      recon.spySlots = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    }
  });
}

async function runReconCheck() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can run recon checks.");
    return;
  }

  const ledger = getOperationsLedger();
  const recon = buildReconContext(ensureReconState(ledger));
  const fallbackActor = getOwnedPcActors()
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))[0];
  const reconActor = game.actors.get(String(ledger.roles?.cartographer ?? "")) ?? fallbackActor;
  if (!reconActor) {
    ui.notifications?.warn("No eligible actor found for recon check.");
    return;
  }

  const dc = recon.suggestedDc;
  let total = 0;
  try {
    if (typeof reconActor.rollSkill === "function") {
      const roll = await reconActor.rollSkill("inv", { fastForward: true, chatMessage: false });
      total = Number(roll?.total ?? roll?.roll?.total ?? 0);
    } else {
      const intMod = Number(reconActor.system?.abilities?.int?.mod ?? 0);
      const roll = await (new Roll("1d20 + @mod", { mod: intMod })).evaluate();
      total = Number(roll.total ?? 0);
    }
  } catch (error) {
    console.warn(`${MODULE_ID}: recon check failed`, error);
    ui.notifications?.warn("Recon check failed to resolve.");
    return;
  }

  const passed = Number.isFinite(total) && total >= dc;
  const summary = `${reconActor.name}: ${passed ? "Success" : "Fail"} (${Math.floor(Number(total) || 0)} vs DC ${dc})`;
  const insight = passed
    ? "Recon success: lower entry uncertainty and improve first-contact posture."
    : "Recon miss: proceed with increased unknowns and tighter fallback planning.";
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  await updateOperationsLedger((nextLedger) => {
    const nextRecon = ensureReconState(nextLedger);
    const nextFindings = `${stamp} ${summary}`;
    nextRecon.recentFindings = nextFindings;
    nextRecon.lastBriefAt = stamp;
    nextRecon.lastBriefBy = String(game.user?.name ?? "GM");
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Recon Check</strong></p><p><strong>Actor:</strong> ${foundry.utils.escapeHTML(reconActor.name)}</p><p><strong>Result:</strong> ${passed ? "Success" : "Failure"} (${Math.floor(Number(total) || 0)} vs DC ${dc})</p><p>${foundry.utils.escapeHTML(insight)}</p>`
  });
}

async function showReconBrief() {
  const recon = buildOperationsContext().recon;
  const recommendationRows = recon.recommendations.map((entry) => `<li>${foundry.utils.escapeHTML(entry)}</li>`).join("");
  const content = `
    <div class="po-help">
      <p><strong>Readiness:</strong> ${foundry.utils.escapeHTML(recon.readinessLabel)} (score ${recon.readinessScore})</p>
      <p><strong>Suggested Recon DC:</strong> ${recon.suggestedDc}</p>
      <p><strong>Objective:</strong> ${foundry.utils.escapeHTML(recon.objective || "-")}</p>
      <p><strong>Region:</strong> ${foundry.utils.escapeHTML(recon.region || "-")}</p>
      <p><strong>Source:</strong> ${foundry.utils.escapeHTML(recon.intelSource || "-")}</p>
      <p><strong>Recent Findings:</strong> ${foundry.utils.escapeHTML(recon.recentFindings || "-")}</p>
      <ul>${recommendationRows || "<li>No recommendations.</li>"}</ul>
    </div>
  `;
  await Dialog.prompt({
    title: "Recon Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

async function setCommunicationToggle(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update communication discipline.");
    return;
  }
  const key = element?.dataset?.comm;
  if (!key) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.communication) ledger.communication = {};
    ledger.communication[key] = Boolean(element?.checked);
  });
}

async function setCommunicationText(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update communication discipline.");
    return;
  }
  const key = element?.dataset?.commText;
  if (!key) return;
  const value = String(element?.value ?? "").trim();
  await updateOperationsLedger((ledger) => {
    if (!ledger.communication) ledger.communication = {};
    ledger.communication[key] = value;
  });
}

async function showCommunicationBrief() {
  const context = buildOperationsContext();
  const comm = context.communication;
  const readiness = comm.readiness;
  const content = `
    <div class="po-help">
      <p><strong>Communication Discipline:</strong> ${readiness.statusText}</p>
      <p><strong>Silent Signals:</strong> ${readiness.hasSignals ? "Set" : "Missing"}</p>
      <p><strong>Code Phrase:</strong> ${readiness.hasCodePhrase ? "Set" : "Missing"}</p>
      <p><strong>Alert Channels:</strong> ${readiness.enabledCount} enabled</p>
      <p><strong>Flare Plan:</strong> ${comm.signalFlare ? "Enabled" : "Off"}</p>
      <p><strong>Bell Plan:</strong> ${comm.signalBell ? "Enabled" : "Off"}</p>
      <p><strong>Pre-Combat Plan:</strong> ${comm.preCombatPlan ? "Enabled" : "Off"}</p>
      <p><strong>Signal Set:</strong> ${comm.silentSignals || "-"}</p>
      <p><strong>Code Phrase:</strong> ${comm.codePhrase || "-"}</p>
    </div>
  `;
  await Dialog.prompt({
    title: "Communication Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

async function setReputationScore(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const faction = String(element?.dataset?.faction ?? "").trim();
  if (!faction) return;
  const raw = Number(element?.value ?? 0);
  const score = Number.isFinite(raw) ? Math.max(-5, Math.min(5, Math.floor(raw))) : 0;
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === faction);
    if (!entry) return;
    entry.score = score;
  });
}

async function adjustReputationScore(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const faction = String(element?.dataset?.faction ?? "").trim();
  if (!faction) return;
  const deltaRaw = Number(element?.dataset?.delta ?? 0);
  const delta = Number.isFinite(deltaRaw) ? Math.floor(deltaRaw) : 0;
  if (!delta) return;
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === faction);
    if (!entry) return;
    entry.score = Math.max(-5, Math.min(5, Number(entry.score ?? 0) + delta));
  });
}

async function setReputationNote(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const faction = String(element?.dataset?.faction ?? "").trim();
  if (!faction) return;
  const note = String(element?.value ?? "");
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === faction);
    if (!entry) return;
    entry.note = note;
  });
}

function buildReputationCalendarPayload(faction, logEntry) {
  const now = Number(logEntry?.loggedAt ?? getCurrentWorldTimestamp());
  const score = Number(logEntry?.score ?? 0);
  const signedScore = score > 0 ? `+${score}` : String(score);
  const title = `Reputation Update: ${String(faction?.label ?? "Faction")}`;
  const body = [
    `<p><strong>Faction:</strong> ${foundry.utils.escapeHTML(String(faction?.label ?? "Faction"))}</p>`,
    `<p><strong>Reputation:</strong> ${signedScore} (${foundry.utils.escapeHTML(getReputationAccessLabel(score))})</p>`,
    `<p><strong>Logged:</strong> ${foundry.utils.escapeHTML(String(logEntry?.dayLabel ?? formatRecoveryDueLabel(now)))}</p>`,
    `<p><strong>Note:</strong> ${foundry.utils.escapeHTML(String(logEntry?.note ?? ""))}</p>`
  ].join("");
  return {
    title,
    name: title,
    description: body,
    content: body,
    startTime: now,
    endTime: now + 60,
    timestamp: now,
    allDay: false,
    playerVisible: true,
    public: true
  };
}

async function syncReputationLogToSimpleCalendar(faction, logEntry) {
  if (!game.user.isGM || !isSimpleCalendarActive()) return "";
  const api = getSimpleCalendarMutationApi();
  if (!api) return "";
  const created = await createSimpleCalendarEntry(api, buildReputationCalendarPayload(faction, logEntry));
  return created?.success ? String(created.id ?? "") : "";
}

async function logReputationNote(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const factionId = String(element?.dataset?.faction ?? "").trim();
  if (!factionId) return;
  const root = element?.closest("[data-faction]") ?? element?.closest(".po-op-role-row");
  const note = String(root?.querySelector("textarea[data-action='set-reputation-note']")?.value ?? "").trim();
  if (!note) {
    ui.notifications?.warn("Add a note before logging reputation history.");
    return;
  }

  const loggedAt = Date.now();
  const dayLabel = formatRecoveryDueLabel(loggedAt);
  const clock = getClockContext();
  let createdLog = null;
  let factionLabel = "Faction";

  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === factionId);
    if (!entry) return;
    factionLabel = String(entry.label ?? "Faction");
    if (!Array.isArray(entry.noteLogs)) entry.noteLogs = [];
    const logEntry = normalizeReputationNoteLog({
      id: foundry.utils.randomID(),
      note,
      score: Number(entry.score ?? 0),
      loggedAt,
      loggedBy: String(game.user?.name ?? "GM"),
      dayLabel,
      clockLabel: String(clock?.label ?? "")
    });
    entry.noteLogs.unshift(logEntry);
    if (entry.noteLogs.length > 100) entry.noteLogs = entry.noteLogs.slice(0, 100);
    createdLog = logEntry;
  });

  if (!createdLog) return;
  const calendarEntryId = await syncReputationLogToSimpleCalendar({ label: factionLabel }, createdLog);
  if (calendarEntryId) {
    await updateOperationsLedger((ledger) => {
      const reputation = ensureReputationState(ledger);
      const entry = reputation.factions.find((row) => row.id === factionId);
      if (!entry || !Array.isArray(entry.noteLogs)) return;
      const logRow = entry.noteLogs.find((row) => String(row.id ?? "") === String(createdLog.id ?? ""));
      if (!logRow) return;
      logRow.calendarEntryId = String(calendarEntryId);
    });
  }

  ui.notifications?.info(`Logged reputation note for ${factionLabel}.`);
  const signedScore = Number(createdLog.score ?? 0) > 0 ? `+${Number(createdLog.score)}` : String(Number(createdLog.score ?? 0));
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Reputation Log:</strong> ${foundry.utils.escapeHTML(factionLabel)} · ${signedScore}</p><p>${foundry.utils.escapeHTML(String(createdLog.dayLabel ?? ""))}</p><p>${foundry.utils.escapeHTML(String(createdLog.note ?? ""))}</p>`
  });
}

async function loadReputationNoteLog(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const factionId = String(element?.dataset?.faction ?? "").trim();
  const logId = String(element?.value ?? "").trim();
  if (!factionId || !logId) return;

  let loaded = false;
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === factionId);
    if (!entry || !Array.isArray(entry.noteLogs)) return;
    const logRow = entry.noteLogs.find((row) => String(row.id ?? "") === logId);
    if (!logRow) return;
    entry.note = String(logRow.note ?? "");
    loaded = true;
  });
  if (loaded) ui.notifications?.info("Loaded historical reputation note into editor.");
}

async function setReputationLabel(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const faction = String(element?.dataset?.faction ?? "").trim();
  if (!faction) return;
  const label = String(element?.value ?? "").trim();
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === faction);
    if (!entry || entry.isCore) return;
    entry.label = label || "Faction";
  });
}

async function addReputationFaction(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const root = element?.closest(".po-reputation-gm-tools") ?? element?.closest(".po-gm-section");
  const label = String(root?.querySelector("input[name='repFactionName']")?.value ?? "").trim();
  if (!label) {
    ui.notifications?.warn("Faction name is required.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    reputation.factions.push(normalizeReputationFaction({
      id: foundry.utils.randomID(),
      label,
      score: 0,
      note: "",
      noteLogs: [],
      isCore: false
    }));
  });
}

async function removeReputationFaction(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const faction = String(element?.dataset?.faction ?? "").trim();
  if (!faction) return;
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    const entry = reputation.factions.find((row) => row.id === faction);
    if (!entry || entry.isCore) return;
    reputation.factions = reputation.factions.filter((row) => row.id !== faction);
  });
}

async function showReputationBrief() {
  const reputation = buildOperationsContext().reputation;
  const rows = reputation.factions
    .map((faction) => `<li>${faction.label}: ${faction.score} (${faction.band}) · Access ${faction.access}${faction.note ? ` · ${faction.note}` : ""}</li>`)
    .join("");

  const content = `
    <div class="po-help">
      <p><strong>High Standing Factions:</strong> ${reputation.highStandingCount}</p>
      <p><strong>Hostile Factions:</strong> ${reputation.hostileCount}</p>
      <ul>${rows || "<li>No faction data.</li>"}</ul>
    </div>
  `;
  await Dialog.prompt({
    title: "Reputation & Faction Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

async function setPartyHealthCustomField(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const modifierId = String(element?.dataset?.modifierId ?? "").trim();
  const field = String(element?.dataset?.field ?? "").trim();
  if (!modifierId || !field) return;

  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    const entry = partyHealth.customModifiers.find((row) => row.id === modifierId);
    if (!entry) return;
    if (field === "label") entry.label = String(element?.value ?? "").trim() || "Custom Modifier";
    else if (field === "key") entry.key = String(element?.value ?? "").trim();
    else if (field === "mode") {
      const rawMode = Math.floor(Number(element?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD));
      const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((value) => Number(value)));
      entry.mode = validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD);
    } else if (field === "value") entry.value = String(element?.value ?? "").trim();
    else if (field === "note") entry.note = String(element?.value ?? "");
    else if (field === "enabled") entry.enabled = Boolean(element?.checked);
  });
}

async function addPartyHealthCustomModifier(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const root = element?.closest(".po-party-health-manager") ?? element?.closest(".po-gm-section");
  const label = String(root?.querySelector("input[name='customModifierLabel']")?.value ?? "").trim() || "Custom Modifier";
  const inputKey = String(root?.querySelector("input[name='customModifierKey']")?.value ?? "").trim();
  const selectedKey = String(root?.querySelector("select[name='customModifierKeySelect']")?.value ?? "").trim();
  const key = inputKey || selectedKey;
  const value = String(root?.querySelector("input[name='customModifierValue']")?.value ?? "").trim();
  const note = String(root?.querySelector("textarea[name='customModifierNote']")?.value ?? "");
  const rawMode = Math.floor(Number(root?.querySelector("select[name='customModifierMode']")?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((entry) => Number(entry)));
  const mode = validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD);
  if (!key || !value) {
    ui.notifications?.warn("Custom modifier requires both a key and value.");
    return;
  }

  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.customModifiers.push({
      id: foundry.utils.randomID(),
      label,
      key,
      mode,
      value,
      note,
      enabled: true
    });
  });
}

async function removeActiveSyncEffect(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can remove synced effects.");
    return;
  }
  const actorId = String(element?.dataset?.actorId ?? "").trim();
  const effectId = String(element?.dataset?.effectId ?? "").trim();
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications?.warn("Actor not found.");
    return;
  }

  if (effectId) {
    const effect = actor.effects.get(effectId);
    if (effect) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
      ui.notifications?.info(`Removed synced effect from ${actor.name}.`);
      return;
    }
  }

  await removeIntegrationEffect(actor);
  ui.notifications?.info(`Removed synced effect from ${actor.name}.`);
}

async function archiveActiveSyncEffect(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can archive synced effects.");
    return;
  }
  const actorId = String(element?.dataset?.actorId ?? "").trim();
  const effectId = String(element?.dataset?.effectId ?? "").trim();
  if (!actorId || !effectId) return;

  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications?.warn("Actor not found.");
    return;
  }
  const effect = actor.effects.get(effectId);
  if (!effect) {
    ui.notifications?.warn("Synced effect not found.");
    return;
  }

  const effectData = foundry.utils.deepClone(effect.toObject());
  if (Object.prototype.hasOwnProperty.call(effectData, "_id")) delete effectData._id;

  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.archivedSyncEffects = partyHealth.archivedSyncEffects.filter((entry) => String(entry?.actorId ?? "").trim() !== actor.id);
    partyHealth.archivedSyncEffects.push({
      id: foundry.utils.randomID(),
      actorId: actor.id,
      actorName: String(actor.name ?? "Unknown Actor"),
      effectName: String(effect.name ?? INTEGRATION_EFFECT_NAME),
      label: String(effect.name ?? "Archived Sync Effect"),
      note: "",
      archivedAt: Date.now(),
      archivedBy: String(game.user?.name ?? "GM"),
      effectData
    });
  });

  await actor.deleteEmbeddedDocuments("ActiveEffect", [effect.id]);
  ui.notifications?.info(`Archived synced effect from ${actor.name}.`);
}

async function restoreArchivedSyncEffect(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can restore archived synced effects.");
    return;
  }
  const archiveId = String(element?.dataset?.archiveId ?? "").trim();
  if (!archiveId) return;

  const ledger = getOperationsLedger();
  const partyHealth = ensurePartyHealthState(ledger);
  const archived = partyHealth.archivedSyncEffects.find((entry) => entry.id === archiveId);
  if (!archived) {
    ui.notifications?.warn("Archived effect not found.");
    return;
  }

  const actor = game.actors.get(String(archived.actorId ?? "").trim());
  if (!actor) {
    ui.notifications?.warn("Target actor for archived effect not found.");
    return;
  }

  const effectData = foundry.utils.deepClone(archived.effectData ?? {});
  if (!effectData || typeof effectData !== "object") {
    ui.notifications?.warn("Archived effect data is invalid.");
    return;
  }
  if (Object.prototype.hasOwnProperty.call(effectData, "_id")) delete effectData._id;
  if (!String(effectData.name ?? "").trim()) {
    effectData.name = String(archived.effectName ?? archived.label ?? INTEGRATION_EFFECT_NAME);
  }

  await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  await updateOperationsLedger((nextLedger) => {
    const nextPartyHealth = ensurePartyHealthState(nextLedger);
    nextPartyHealth.archivedSyncEffects = nextPartyHealth.archivedSyncEffects.filter((entry) => entry.id !== archiveId);
  });
  ui.notifications?.info(`Restored archived effect to ${actor.name}.`);
}

async function removeArchivedSyncEffect(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can remove archived synced effects.");
    return;
  }
  const archiveId = String(element?.dataset?.archiveId ?? "").trim();
  if (!archiveId) return;
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.archivedSyncEffects = partyHealth.archivedSyncEffects.filter((entry) => entry.id !== archiveId);
  });
}

async function setArchivedSyncField(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit archived synced effects.");
    return;
  }
  const archiveId = String(element?.dataset?.archiveId ?? "").trim();
  const field = String(element?.dataset?.field ?? "").trim();
  if (!archiveId || !field) return;
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    const row = partyHealth.archivedSyncEffects.find((entry) => entry.id === archiveId);
    if (!row) return;
    if (field === "label") row.label = String(element?.value ?? "").trim() || "Archived Sync Effect";
    else if (field === "note") row.note = String(element?.value ?? "");
  });
}

async function showOperationalLogsManager() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage global logs.");
    return;
  }

  const context = buildOperationsContext();
  const logs = Array.isArray(context?.globalLogs?.entries) ? context.globalLogs.entries : [];
  const escape = foundry.utils.escapeHTML ?? ((value) => String(value ?? ""));

  const rows = logs
    .map((entry) => {
      const noteLabel = entry.hasNote ? `<div class="po-op-summary">Note: ${escape(entry.note)}</div>` : "";
      return `
      <div class="po-log-manager-row" data-log-id="${escape(entry.sourceId)}" data-log-type="${escape(entry.logType)}" data-search="${escape(`${entry.logTypeLabel} ${entry.title} ${entry.summary} ${entry.details} ${entry.note} ${entry.createdBy}`.toLowerCase())}">
        <div><strong>${escape(entry.logTypeLabel)}</strong> · ${escape(entry.title)}</div>
        <div class="po-op-summary">${escape(entry.summary)}${entry.details ? ` · ${escape(entry.details)}` : ""}</div>
        ${noteLabel}
        <div class="po-op-summary">${escape(entry.createdAtLabel)} by ${escape(entry.createdBy)}</div>
        <div class="po-op-action-row">
          <button type="button" class="po-btn po-btn-sm" data-log-action="load" data-log-id="${escape(entry.sourceId)}" data-log-type="${escape(entry.logType)}">Load</button>
          <button type="button" class="po-btn po-btn-sm is-danger" data-log-action="remove" data-log-id="${escape(entry.sourceId)}" data-log-type="${escape(entry.logType)}">Remove</button>
        </div>
      </div>`;
    })
    .join("");

  const content = `
    <div class="po-help po-log-manager">
      <label class="po-resource-row">
        <span>Filter logs</span>
        <input type="text" class="po-input" data-log-filter placeholder="Search type, title, summary, note" />
      </label>
      <div class="po-op-summary">${logs.length} total global log entries.</div>
      <div class="po-log-manager-list" data-log-list>
        ${rows || '<div class="po-op-summary">No global logs available.</div>'}
      </div>
    </div>
  `;

  const dialog = new Dialog({
    title: "Global Logs Manager",
    content,
    buttons: {
      close: {
        label: "Close"
      }
    },
    render: (html) => {
      const root = html?.[0];
      if (!root) return;
      const filterInput = root.querySelector("[data-log-filter]");
      const list = root.querySelector("[data-log-list]");

      const applyFilter = () => {
        const query = String(filterInput?.value ?? "").trim().toLowerCase();
        for (const row of list?.querySelectorAll(".po-log-manager-row") ?? []) {
          const haystack = String(row?.dataset?.search ?? "");
          row.style.display = !query || haystack.includes(query) ? "" : "none";
        }
      };

      filterInput?.addEventListener("input", applyFilter);
      list?.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-log-action]");
        if (!button) return;
        const action = String(button.dataset.logAction ?? "").trim();
        const logId = String(button.dataset.logId ?? "").trim();
        const logType = String(button.dataset.logType ?? "").trim();
        if (!logId || !logType) return;
        if (action === "load") {
          let loaded = false;
          if (logType === "environment") loaded = await editOperationalEnvironmentLogById(logId);
          if (logType === "weather") loaded = await loadWeatherLogToQuickPanel(logId);
          if (loaded) {
            ui.notifications?.info(`Loaded ${logType} log into controls.`);
            dialog.close();
          }
          return;
        }
        if (action === "remove") {
          let removed = false;
          if (logType === "environment") removed = await removeOperationalEnvironmentLogById(logId);
          if (logType === "weather") removed = await removeWeatherLogById(logId);
          if (!removed) return;
          const row = list.querySelector(`.po-log-manager-row[data-log-id=\"${CSS.escape(logId)}\"][data-log-type=\"${CSS.escape(logType)}\"]`);
          row?.remove();
        }
      });
    }
  });

  dialog.render(true);
}

async function removePartyHealthCustomModifier(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const modifierId = String(element?.dataset?.modifierId ?? "").trim();
  if (!modifierId) return;
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.customModifiers = partyHealth.customModifiers.filter((row) => row.id !== modifierId);
  });
}

async function gmQuickAddFaction() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const current = getActiveGmQuickPanel();
  setActiveGmQuickPanel(current === "faction" ? "none" : "faction");
}

async function gmQuickSubmitFaction(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const label = String(root?.querySelector("input[name='quickFactionName']")?.value ?? "").trim();
  if (!label) {
    ui.notifications?.warn("Faction name is required.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const reputation = ensureReputationState(ledger);
    reputation.factions.push(normalizeReputationFaction({
      id: foundry.utils.randomID(),
      label,
      score: 0,
      note: "",
      isCore: false
    }));
  });
  setActiveGmQuickPanel("none");
}

function getDaeModifierCategoryOptions() {
  return [
    { value: "all", label: "All Modifiers", test: () => true },
    { value: "movement", label: "Movement", test: (key) => key.includes("movement") },
    { value: "defense", label: "Defense (AC/HP)", test: (key) => key.includes("ac") || key.includes("hp") },
    { value: "initiative", label: "Initiative", test: (key) => key.includes("init") },
    { value: "checks", label: "Ability Checks", test: (key) => key.includes("abilities.check") },
    { value: "saves", label: "Saving Throws", test: (key) => key.includes("abilities.save") || key.includes(".save") },
    { value: "attacks", label: "Attacks", test: (key) => key.includes(".attack") },
    { value: "skills", label: "Skills", test: (key) => key.includes("skills.") },
    { value: "other", label: "Other", test: (key) => !(
      key.includes("movement")
      || key.includes("ac")
      || key.includes("hp")
      || key.includes("init")
      || key.includes("abilities.check")
      || key.includes("abilities.save")
      || key.includes(".save")
      || key.includes(".attack")
      || key.includes("skills.")
    ) }
  ];
}

async function gmQuickAddModifier() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const current = getActiveGmQuickPanel();
  setActiveGmQuickPanel(current === "modifier" ? "none" : "modifier");
}

async function gmQuickSubmitModifier(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const label = String(root?.querySelector("input[name='quickGlobalModifierLabel']")?.value ?? "").trim() || "Custom Modifier";
  const keyInput = String(root?.querySelector("input[name='quickGlobalModifierKeyInput']")?.value ?? "").trim();
  const keySelect = String(root?.querySelector("select[name='quickGlobalModifierKey']")?.value ?? "").trim();
  const key = keyInput || keySelect;
  const value = String(root?.querySelector("input[name='quickGlobalModifierValue']")?.value ?? "").trim();
  const note = String(root?.querySelector("textarea[name='quickGlobalModifierNote']")?.value ?? "");
  const rawMode = Math.floor(Number(root?.querySelector("select[name='quickGlobalModifierMode']")?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  const validModes = new Set(Object.values(CONST.ACTIVE_EFFECT_MODES ?? {}).map((entry) => Number(entry)));
  const mode = validModes.has(rawMode) ? rawMode : Number(CONST.ACTIVE_EFFECT_MODES.ADD);

  if (!key || !value) {
    ui.notifications?.warn("Global modifier requires both a key and value.");
    return;
  }

  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.customModifiers.push({
      id: foundry.utils.randomID(),
      label,
      key,
      mode,
      value,
      note,
      enabled: true
    });
  });
  setActiveGmQuickPanel("none");
}

function buildWeatherDraftFromPreset(preset, sceneSnapshot, previousDraft = {}) {
  const presetChanges = Array.isArray(preset?.daeChanges)
    ? preset.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
    : [];
  const previousChanges = Array.isArray(previousDraft?.daeChanges)
    ? previousDraft.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
    : null;
  return {
    selectedKey: String(preset?.key ?? ""),
    darkness: Number.isFinite(Number(previousDraft?.darkness))
      ? Math.max(0, Math.min(1, Number(previousDraft.darkness)))
      : Math.max(0, Math.min(1, Number(preset?.darkness ?? sceneSnapshot?.darkness ?? 0))),
    visibilityModifier: Number.isFinite(Number(previousDraft?.visibilityModifier))
      ? Math.max(-5, Math.min(5, Math.floor(Number(previousDraft.visibilityModifier))))
      : Math.max(-5, Math.min(5, Math.floor(Number(preset?.visibilityModifier ?? 0) || 0))),
    note: String(previousDraft?.note ?? preset?.note ?? sceneSnapshot?.note ?? ""),
    presetName: String(previousDraft?.presetName ?? preset?.label ?? ""),
    daeChanges: previousChanges ?? presetChanges
  };
}

function getWeatherPresetByKey(weatherState, sceneSnapshot, key) {
  const options = buildWeatherSelectionCatalog(weatherState, sceneSnapshot);
  const selectedKey = String(key ?? "").trim();
  return options.find((entry) => entry.key === selectedKey) ?? options[0] ?? null;
}

async function gmQuickLogCurrentWeather() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can log weather.");
    return;
  }
  const ledger = getOperationsLedger();
  const weatherState = ensureWeatherState(ledger);
  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const defaultPreset = getWeatherPresetByKey(weatherState, sceneSnapshot, "clear")
    ?? buildWeatherSelectionCatalog(weatherState, sceneSnapshot)[0]
    ?? null;
  setGmQuickWeatherDraft(buildWeatherDraftFromPreset(defaultPreset, sceneSnapshot));
  const current = getActiveGmQuickPanel();
  setActiveGmQuickPanel(current === "weather" ? "none" : "weather");
}

async function gmQuickSelectWeatherPreset(element) {
  const selectedKey = String(element?.value ?? "").trim();
  const ledger = getOperationsLedger();
  const weatherState = ensureWeatherState(ledger);
  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const selectedPreset = getWeatherPresetByKey(weatherState, sceneSnapshot, selectedKey);
  if (!selectedPreset) return;
  setGmQuickWeatherDraft(buildWeatherDraftFromPreset(selectedPreset, sceneSnapshot, { selectedKey }));
}

function gmQuickUpdateWeatherDraftField(element) {
  const field = String(element?.dataset?.field ?? "").trim();
  if (!field) return;
  const draft = getGmQuickWeatherDraft() ?? {};
  if (field === "darkness") {
    const value = Number(element?.value ?? 0);
    draft.darkness = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  } else if (field === "visibilityModifier") {
    const value = Number(element?.value ?? 0);
    draft.visibilityModifier = Number.isFinite(value) ? Math.max(-5, Math.min(5, Math.floor(value))) : 0;
  } else if (field === "note") {
    draft.note = String(element?.value ?? "");
  } else if (field === "presetName") {
    draft.presetName = String(element?.value ?? "");
  }
  setGmQuickWeatherDraft(draft);
}

async function gmQuickAddWeatherDaeChange(element) {
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const key = String(root?.querySelector("input[name='quickWeatherDaeKeyInput']")?.value ?? root?.querySelector("select[name='quickWeatherDaeKey']")?.value ?? "").trim();
  const value = String(root?.querySelector("input[name='quickWeatherDaeValue']")?.value ?? "").trim();
  const note = String(root?.querySelector("input[name='quickWeatherDaeNote']")?.value ?? "").trim();
  const rawMode = Math.floor(Number(root?.querySelector("select[name='quickWeatherDaeMode']")?.value ?? CONST.ACTIVE_EFFECT_MODES.ADD));
  if (!key || !value) {
    ui.notifications?.warn("DAE change requires key and value.");
    return;
  }
  const draft = getGmQuickWeatherDraft() ?? {};
  draft.daeChanges = [
    ...(Array.isArray(draft.daeChanges) ? draft.daeChanges : []),
    normalizeWeatherDaeChange({
      id: foundry.utils.randomID(),
      key,
      mode: rawMode,
      value,
      label: getDaeKeyLabel(key),
      note
    })
  ];
  setGmQuickWeatherDraft(draft);
}

async function gmQuickRemoveWeatherDaeChange(element) {
  const changeId = String(element?.dataset?.changeId ?? "").trim();
  if (!changeId) return;
  const draft = getGmQuickWeatherDraft() ?? {};
  draft.daeChanges = (Array.isArray(draft.daeChanges) ? draft.daeChanges : []).filter((entry) => String(entry?.id ?? "") !== changeId);
  setGmQuickWeatherDraft(draft);
}

async function gmQuickSaveWeatherPreset(element) {
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const draft = getGmQuickWeatherDraft() ?? {};
  const presetName = String(root?.querySelector("input[name='quickWeatherPresetName']")?.value ?? draft.presetName ?? "").trim();
  if (!presetName) {
    ui.notifications?.warn("Custom preset name is required.");
    return;
  }
  const presetId = `custom-${foundry.utils.randomID()}`;
  await updateOperationsLedger((ledger) => {
    const weather = ensureWeatherState(ledger);
    weather.customPresets.push(normalizeWeatherPreset({
      id: presetId,
      label: presetName,
      visibilityModifier: Number(draft.visibilityModifier ?? 0),
      darkness: Number(draft.darkness ?? 0),
      note: String(draft.note ?? ""),
      daeChanges: Array.isArray(draft.daeChanges) ? draft.daeChanges : [],
      isBuiltIn: false
    }));
  });
  setGmQuickWeatherDraft({
    ...draft,
    selectedKey: presetId,
    presetName
  });
  ui.notifications?.info(`Saved custom weather preset: ${presetName}.`);
}

async function gmQuickDeleteWeatherPreset(element) {
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const selectedKey = String(root?.querySelector("select[name='quickWeatherProfile']")?.value ?? getGmQuickWeatherDraft()?.selectedKey ?? "").trim();
  if (!selectedKey.startsWith("custom-")) {
    ui.notifications?.warn("Only custom presets can be removed.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const weather = ensureWeatherState(ledger);
    weather.customPresets = weather.customPresets.filter((entry) => String(entry?.id ?? "") !== selectedKey);
  });
  const ledger = getOperationsLedger();
  const weatherState = ensureWeatherState(ledger);
  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const fallbackPreset = getWeatherPresetByKey(weatherState, sceneSnapshot, "clear");
  setGmQuickWeatherDraft(buildWeatherDraftFromPreset(fallbackPreset, sceneSnapshot));
  ui.notifications?.info("Removed custom weather preset.");
}

async function commitWeatherSnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const silent = Boolean(options?.silent);
  const suppressChat = Boolean(options?.suppressChat);
  await updateOperationsLedger((ledger) => {
    const weather = ensureWeatherState(ledger);
    const environment = ensureEnvironmentState(ledger);
    weather.current = snapshot;
    weather.logs.unshift(snapshot);
    if (weather.logs.length > 100) weather.logs = weather.logs.slice(0, 100);
    environment.logs.unshift({
      id: snapshot.id,
      logType: "weather",
      label: snapshot.label,
      weatherId: snapshot.weatherId,
      darkness: snapshot.darkness,
      visibilityModifier: snapshot.visibilityModifier,
      note: snapshot.note,
      daeChanges: snapshot.daeChanges,
      createdAt: snapshot.loggedAt,
      createdBy: snapshot.loggedBy
    });
    if (environment.logs.length > 100) environment.logs = environment.logs.slice(0, 100);
  });

  if (options?.preset) await applyWeatherSceneFxForPreset(options.preset);

  const signedModifier = Number(snapshot.visibilityModifier ?? 0) > 0
    ? `+${Number(snapshot.visibilityModifier ?? 0)}`
    : String(Number(snapshot.visibilityModifier ?? 0));
  if (!silent) {
    ui.notifications?.info(`Weather logged: ${snapshot.label} (visibility modifier ${signedModifier}).`);
  }
  if (!suppressChat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
      content: `<p><strong>Weather Logged:</strong> ${foundry.utils.escapeHTML(snapshot.label)}</p><p><strong>Visibility Modifier:</strong> ${signedModifier}</p><p><strong>Effect:</strong> ${foundry.utils.escapeHTML(getWeatherEffectSummary(snapshot.visibilityModifier))}</p><p><strong>DAE Changes:</strong> ${foundry.utils.escapeHTML(describeWeatherDaeChanges(snapshot.daeChanges))}</p><p><strong>Darkness:</strong> ${snapshot.darkness.toFixed(2)}</p>`
    });
  }
  return {
    logged: true,
    label: String(snapshot.label ?? "Weather"),
    visibilityModifier: Number(snapshot.visibilityModifier ?? 0),
    darkness: Number(snapshot.darkness ?? 0)
  };
}

async function gmQuickSubmitWeather(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can log weather.");
    return;
  }
  const root = element?.closest(".po-gm-quick-actions") ?? element?.closest(".po-gm-section");
  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const ledger = getOperationsLedger();
  const weatherState = ensureWeatherState(ledger);
  const selectedKey = String(root?.querySelector("select[name='quickWeatherProfile']")?.value ?? "").trim();
  const selectedPreset = getWeatherPresetByKey(weatherState, sceneSnapshot, selectedKey) ?? {
    key: "clear",
    label: "Clear",
    weatherId: "clear",
    darkness: sceneSnapshot.darkness,
    visibilityModifier: sceneSnapshot.visibilityModifier,
    daeChanges: []
  };
  const draft = getGmQuickWeatherDraft() ?? buildWeatherDraftFromPreset(selectedPreset, sceneSnapshot);
  const rawDarkness = Number(root?.querySelector("input[name='quickWeatherDarkness']")?.value ?? draft.darkness ?? selectedPreset.darkness ?? sceneSnapshot.darkness ?? 0);
  const darkness = Number.isFinite(rawDarkness) ? Math.max(0, Math.min(1, rawDarkness)) : 0;
  const rawVisibility = Number(root?.querySelector("input[name='quickWeatherVisibility']")?.value ?? draft.visibilityModifier ?? selectedPreset.visibilityModifier ?? 0);
  const visibilityModifier = Number.isFinite(rawVisibility) ? Math.max(-5, Math.min(5, Math.floor(rawVisibility))) : 0;
  const note = String(root?.querySelector("textarea[name='quickWeatherNote']")?.value ?? draft.note ?? "").trim();
  const daeChanges = (Array.isArray(draft.daeChanges) ? draft.daeChanges : selectedPreset.daeChanges ?? [])
    .map((entry) => normalizeWeatherDaeChange(entry))
    .filter((entry) => entry.key && entry.value);

  const snapshot = {
    id: foundry.utils.randomID(),
    label: String(selectedPreset.label ?? "Weather").trim() || "Weather",
    weatherId: String(selectedPreset.weatherId ?? selectedPreset.key ?? "").trim(),
    darkness,
    visibilityModifier,
    note: note || `Weather profile logged · darkness ${darkness.toFixed(2)}`,
    daeChanges,
    loggedAt: Date.now(),
    loggedBy: String(game.user?.name ?? "GM")
  };

  await commitWeatherSnapshot(snapshot, { preset: selectedPreset });

  setGmQuickWeatherDraft({
    selectedKey,
    darkness,
    visibilityModifier,
    note,
    presetName: String(selectedPreset.label ?? ""),
    daeChanges
  });
  setActiveGmQuickPanel("none");
}

async function loadWeatherLogToQuickPanel(logId) {
  const id = String(logId ?? "").trim();
  if (!id) return false;
  const ledger = getOperationsLedger();
  const weather = ensureWeatherState(ledger);
  const entry = weather.logs.find((row) => String(row?.id ?? "") === id);
  if (!entry) return false;

  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const selectedPreset = getWeatherPresetByKey(weather, sceneSnapshot, entry.weatherId);
  setGmQuickWeatherDraft({
    ...buildWeatherDraftFromPreset(selectedPreset, sceneSnapshot),
    selectedKey: String(selectedPreset?.key ?? entry.weatherId ?? ""),
    darkness: Number(entry.darkness ?? 0),
    visibilityModifier: Number(entry.visibilityModifier ?? 0),
    note: String(entry.note ?? ""),
    daeChanges: Array.isArray(entry.daeChanges) ? entry.daeChanges : []
  });
  setActiveGmQuickPanel("weather");
  return true;
}

async function removeWeatherLogById(logId) {
  const id = String(logId ?? "").trim();
  if (!id) return false;
  let removed = false;
  await updateOperationsLedger((ledger) => {
    const weather = ensureWeatherState(ledger);
    const environment = ensureEnvironmentState(ledger);
    const before = weather.logs.length;
    weather.logs = weather.logs.filter((entry) => String(entry?.id ?? "") !== id);
    environment.logs = environment.logs.filter((entry) => !(String(entry?.id ?? "") === id && String(entry?.logType ?? "") === "weather"));
    if (weather.current && String(weather.current.id ?? "") === id) {
      weather.current = weather.logs[0] ?? null;
    }
    removed = weather.logs.length < before;
  });
  return removed;
}

async function editGlobalLog(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit global logs.");
    return;
  }
  const logType = String(element?.dataset?.logType ?? "").trim();
  const logId = String(element?.dataset?.logId ?? "").trim();
  if (!logType || !logId) return;

  if (logType === "environment") {
    const loaded = await editOperationalEnvironmentLogById(logId);
    if (loaded) ui.notifications?.info("Loaded environment log into current controls.");
    return;
  }
  if (logType === "weather") {
    const loaded = await loadWeatherLogToQuickPanel(logId);
    if (loaded) ui.notifications?.info("Loaded weather log into quick weather panel.");
  }
}

async function removeGlobalLog(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can remove global logs.");
    return;
  }
  const logType = String(element?.dataset?.logType ?? "").trim();
  const logId = String(element?.dataset?.logId ?? "").trim();
  if (!logType || !logId) return;

  if (logType === "environment") {
    await removeOperationalEnvironmentLogById(logId);
    return;
  }
  if (logType === "weather") {
    await removeWeatherLogById(logId);
  }
}

async function setBaseOperationsConfig(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage base operations.");
    return;
  }
  const key = element?.dataset?.baseConfig;
  if (!key) return;
  await updateOperationsLedger((ledger) => {
    const baseOperations = ensureBaseOperationsState(ledger);
    if (key === "maintenanceRisk") {
      baseOperations.maintenanceRisk = String(element?.value ?? "moderate");
    }
  });
}

async function upsertBaseOperationsSite(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage base operations.");
    return;
  }
  const root = element?.closest(".po-base-site-editor");
  if (!root) return;
  const type = String(root.querySelector("select[name='baseSiteType']")?.value ?? "safehouse");
  const name = String(root.querySelector("input[name='baseSiteName']")?.value ?? "").trim();
  const status = String(root.querySelector("select[name='baseSiteStatus']")?.value ?? "secure");
  const pressureRaw = Number(root.querySelector("input[name='baseSitePressure']")?.value ?? 0);
  const risk = String(root.querySelector("select[name='baseSiteRisk']")?.value ?? "moderate");
  const note = String(root.querySelector("input[name='baseSiteNote']")?.value ?? "").trim();
  const maxWeightRaw = Number(root.querySelector("input[name='baseSiteMaxWeight']")?.value ?? 0);
  const maxSpaceRaw = Number(root.querySelector("input[name='baseSiteMaxSpace']")?.value ?? 0);
  if (!name) {
    ui.notifications?.warn("Base site name is required.");
    return;
  }
  const pressure = Number.isFinite(pressureRaw) ? Math.max(0, Math.floor(pressureRaw)) : 0;
  const maxWeight = Number.isFinite(maxWeightRaw) ? Math.max(0, maxWeightRaw) : 0;
  const maxSpace = Number.isFinite(maxSpaceRaw) ? Math.max(0, Math.floor(maxSpaceRaw)) : 0;

  await updateOperationsLedger((ledger) => {
    const baseOperations = ensureBaseOperationsState(ledger);
    const existing = baseOperations.sites.find((site) => {
      const siteName = String(site?.name ?? "").trim().toLowerCase();
      const siteType = String(site?.type ?? "").trim().toLowerCase();
      return siteName === name.toLowerCase() && siteType === type.toLowerCase();
    });
    if (existing) {
      existing.status = status;
      existing.pressure = pressure;
      existing.risk = risk;
      existing.note = note;
      if (!existing.storage || typeof existing.storage !== "object") existing.storage = { maxWeight: 0, maxSpace: 0, items: [] };
      existing.storage.maxWeight = maxWeight;
      existing.storage.maxSpace = maxSpace;
      if (!Array.isArray(existing.storage.items)) existing.storage.items = [];
      if (!existing.id) existing.id = foundry.utils.randomID();
      return;
    }
    baseOperations.sites.push({
      id: foundry.utils.randomID(),
      type,
      name,
      status,
      pressure,
      risk,
      note,
      storage: {
        maxWeight,
        maxSpace,
        items: []
      }
    });
  });
}

async function clearBaseOperationsSite(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage base operations.");
    return;
  }
  const id = element?.dataset?.baseSiteId;
  if (!id) return;
  await updateOperationsLedger((ledger) => {
    const baseOperations = ensureBaseOperationsState(ledger);
    if (id.startsWith("legacy-base-site-")) {
      const index = Number(id.replace("legacy-base-site-", ""));
      if (Number.isInteger(index) && index >= 0 && index < baseOperations.sites.length) {
        baseOperations.sites.splice(index, 1);
      }
      return;
    }
    baseOperations.sites = baseOperations.sites.filter((site) => site.id !== id);
  });
}

function buildBaseSiteStorageDialogContent(site) {
  const storage = site?.storage ?? { maxWeight: 0, maxSpace: 0, items: [] };
  const items = Array.isArray(storage.items) ? storage.items : [];
  const weightUsed = items.reduce((sum, entry) => {
    const quantity = Math.max(0, Number(entry.quantity ?? 0) || 0);
    const weight = Math.max(0, Number(entry.weight ?? 0) || 0);
    return sum + (quantity * weight);
  }, 0);
  const spaceUsed = items.reduce((sum, entry) => sum + Math.max(0, Number(entry.quantity ?? 0) || 0), 0);

  const itemRows = items.map((entry) => {
    const icon = foundry.utils.escapeHTML(String(entry.img ?? "icons/svg/item-bag.svg"));
    const name = foundry.utils.escapeHTML(String(entry.name ?? "Stored Item"));
    const note = foundry.utils.escapeHTML(String(entry.note ?? ""));
    const qty = Math.max(1, Number(entry.quantity ?? 1) || 1);
    const weight = Math.max(0, Number(entry.weight ?? 0) || 0);
    return `
      <div class="po-op-role-row" data-storage-item-id="${foundry.utils.escapeHTML(entry.id)}">
        <div class="po-op-role-head">
          <div class="po-op-role-name"><img src="${icon}" width="18" height="18" /> ${name}</div>
          <div class="po-op-role-status">Qty ${qty} · ${weight.toFixed(1)} wt each</div>
        </div>
        ${note ? `<div class="po-op-summary">${note}</div>` : ""}
        <div class="po-op-action-row">
          <button type="button" class="po-btn po-btn-sm" data-storage-action="dec" data-item-id="${foundry.utils.escapeHTML(entry.id)}">-1</button>
          <button type="button" class="po-btn po-btn-sm" data-storage-action="inc" data-item-id="${foundry.utils.escapeHTML(entry.id)}">+1</button>
          <button type="button" class="po-btn po-btn-sm is-danger" data-storage-action="remove" data-item-id="${foundry.utils.escapeHTML(entry.id)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="po-help po-base-storage-dialog">
      <div class="po-op-summary"><strong>${foundry.utils.escapeHTML(String(site.name ?? "Storage Site"))}</strong> · ${foundry.utils.escapeHTML(getBaseSiteTypeLabel(String(site.type ?? "safehouse")))}</div>
      <div class="po-op-summary">Weight: ${weightUsed.toFixed(1)} / ${Math.max(0, Number(storage.maxWeight ?? 0) || 0).toFixed(1)} · Space: ${spaceUsed} / ${Math.max(0, Number(storage.maxSpace ?? 0) || 0)}</div>

      <label class="po-resource-row">
        <span>Max Weight Capacity</span>
        <input type="number" min="0" step="0.1" class="po-input" data-storage-config="maxWeight" value="${Math.max(0, Number(storage.maxWeight ?? 0) || 0)}" />
      </label>
      <label class="po-resource-row">
        <span>Max Space Capacity</span>
        <input type="number" min="0" step="1" class="po-input" data-storage-config="maxSpace" value="${Math.max(0, Number(storage.maxSpace ?? 0) || 0)}" />
      </label>

      <div class="po-op-divider"></div>
      <div class="po-section-title">Add Item</div>
      <div class="po-hint">Drag and drop an Item onto this window or add manually below.</div>
      <div class="po-op-role-row">
        <label class="po-resource-row"><span>Name</span><input type="text" class="po-input" data-storage-add="name" placeholder="e.g. Healing Potion" /></label>
        <label class="po-resource-row"><span>Qty</span><input type="number" min="1" step="1" class="po-input" data-storage-add="quantity" value="1" /></label>
        <label class="po-resource-row"><span>Weight Each</span><input type="number" min="0" step="0.1" class="po-input" data-storage-add="weight" value="0" /></label>
        <label class="po-resource-row"><span>Notes</span><input type="text" class="po-input" data-storage-add="note" placeholder="optional" /></label>
        <button type="button" class="po-btn po-btn-sm" data-storage-action="add-manual">Add Item</button>
      </div>

      <div class="po-op-divider"></div>
      <div class="po-section-title">Stored Inventory</div>
      <div class="po-storage-drop-zone" data-storage-drop-zone>
        ${itemRows || '<div class="po-op-summary">No stored items yet.</div>'}
      </div>
    </div>
  `;
}

async function updateBaseSiteStorage(siteId, mutator) {
  const id = String(siteId ?? "").trim();
  if (!id || typeof mutator !== "function") return;
  await updateOperationsLedger((ledger) => {
    const baseOperations = ensureBaseOperationsState(ledger);
    const site = baseOperations.sites.find((entry) => entry.id === id);
    if (!site) return;
    if (!site.storage || typeof site.storage !== "object") site.storage = { maxWeight: 0, maxSpace: 0, items: [] };
    if (!Array.isArray(site.storage.items)) site.storage.items = [];
    mutator(site);
    site.storage.items = site.storage.items.map((entry) => normalizeBaseSiteStorageItem(entry));
  });
}

function buildStorageItemFromDocument(itemDoc, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const weight = Math.max(0, Number(getItemWeightValue(itemDoc) || 0));
  return {
    id: foundry.utils.randomID(),
    name: String(itemDoc?.name ?? "Stored Item").trim() || "Stored Item",
    type: String(itemDoc?.type ?? "item").trim() || "item",
    quantity: qty,
    weight,
    note: "",
    img: String(itemDoc?.img ?? "icons/svg/item-bag.svg"),
    uuid: String(itemDoc?.uuid ?? "")
  };
}

async function showBaseSiteStorageManager(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage base site storage.");
    return;
  }
  const siteId = String(element?.dataset?.baseSiteId ?? "").trim();
  if (!siteId) return;

  const getCurrentSite = () => {
    const ledger = getOperationsLedger();
    const baseOperations = ensureBaseOperationsState(ledger);
    return baseOperations.sites.find((site) => site.id === siteId) ?? null;
  };

  let site = getCurrentSite();
  if (!site) {
    ui.notifications?.warn("Base site not found.");
    return;
  }

  const dialog = new Dialog({
    title: `Storage Inventory · ${String(site.name ?? "Site")}`,
    content: buildBaseSiteStorageDialogContent(site),
    buttons: {
      close: {
        label: "Close"
      }
    },
    render: (html) => {
      const root = html?.[0] ?? html;
      if (!root) return;

      const rerenderStorage = () => {
        site = getCurrentSite();
        if (!site) return;
        const contentRoot = root.querySelector(".po-base-storage-dialog");
        if (!contentRoot) return;
        contentRoot.outerHTML = buildBaseSiteStorageDialogContent(site);
      };

      const onStorageClick = async (event) => {
        const actionEl = event.target.closest("[data-storage-action]");
        if (!actionEl) return;
        const action = String(actionEl.dataset.storageAction ?? "").trim();
        const itemId = String(actionEl.dataset.itemId ?? "").trim();

        if (action === "add-manual") {
          const name = String(root.querySelector("[data-storage-add='name']")?.value ?? "").trim();
          const quantityRaw = Number(root.querySelector("[data-storage-add='quantity']")?.value ?? 1);
          const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.floor(quantityRaw)) : 1;
          const weightRaw = Number(root.querySelector("[data-storage-add='weight']")?.value ?? 0);
          const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
          const note = String(root.querySelector("[data-storage-add='note']")?.value ?? "");
          if (!name) {
            ui.notifications?.warn("Item name is required.");
            return;
          }
          await updateBaseSiteStorage(siteId, (targetSite) => {
            targetSite.storage.items.push(normalizeBaseSiteStorageItem({
              id: foundry.utils.randomID(),
              name,
              quantity,
              weight,
              note,
              img: "icons/svg/item-bag.svg",
              type: "item"
            }));
          });
          rerenderStorage();
          return;
        }

        if (!itemId) return;
        if (action === "remove") {
          await updateBaseSiteStorage(siteId, (targetSite) => {
            targetSite.storage.items = targetSite.storage.items.filter((entry) => entry.id !== itemId);
          });
          rerenderStorage();
          return;
        }

        if (action === "inc" || action === "dec") {
          await updateBaseSiteStorage(siteId, (targetSite) => {
            const row = targetSite.storage.items.find((entry) => entry.id === itemId);
            if (!row) return;
            const delta = action === "inc" ? 1 : -1;
            row.quantity = Math.max(0, Math.floor(Number(row.quantity ?? 0) || 0) + delta);
            if (row.quantity <= 0) {
              targetSite.storage.items = targetSite.storage.items.filter((entry) => entry.id !== itemId);
            }
          });
          rerenderStorage();
        }
      };

      const onStorageChange = async (event) => {
        const configEl = event.target.closest("[data-storage-config]");
        if (!configEl) return;
        const configKey = String(configEl.dataset.storageConfig ?? "").trim();
        if (!configKey) return;
        await updateBaseSiteStorage(siteId, (targetSite) => {
          if (configKey === "maxWeight") {
            const raw = Number(configEl.value ?? 0);
            targetSite.storage.maxWeight = Number.isFinite(raw) ? Math.max(0, raw) : 0;
          }
          if (configKey === "maxSpace") {
            const raw = Number(configEl.value ?? 0);
            targetSite.storage.maxSpace = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
          }
        });
        rerenderStorage();
      };

      const onStorageDrop = async (event) => {
        const dropZone = event.target.closest("[data-storage-drop-zone]");
        if (!dropZone) return;
        event.preventDefault();

        let itemDoc = null;
        const data = TextEditor.getDragEventData(event);
        if (data?.uuid && typeof fromUuid === "function") {
          itemDoc = await fromUuid(data.uuid);
        } else if (data?.type === "Item" && data?.data) {
          itemDoc = data.data;
        }

        if (!itemDoc) {
          ui.notifications?.warn("Could not read dropped item data.");
          return;
        }

        const nextItem = buildStorageItemFromDocument(itemDoc, 1);
        await updateBaseSiteStorage(siteId, (targetSite) => {
          const same = targetSite.storage.items.find((entry) => {
            const entryUuid = String(entry.uuid ?? "").trim();
            const nextUuid = String(nextItem.uuid ?? "").trim();
            if (entryUuid && nextUuid) return entryUuid === nextUuid;
            return String(entry.name ?? "").trim().toLowerCase() === String(nextItem.name ?? "").trim().toLowerCase()
              && Number(entry.weight ?? 0) === Number(nextItem.weight ?? 0);
          });
          if (same) same.quantity = Math.max(1, Math.floor(Number(same.quantity ?? 0) || 0) + 1);
          else targetSite.storage.items.push(normalizeBaseSiteStorageItem(nextItem));
        });
        rerenderStorage();
      };

      root.addEventListener("click", onStorageClick);
      root.addEventListener("change", onStorageChange);
      root.addEventListener("drop", onStorageDrop);
      root.addEventListener("dragover", (event) => {
        if (event.target.closest("[data-storage-drop-zone]")) event.preventDefault();
      });
    }
  });

  dialog.render(true);
}

async function showBaseOperationsBrief() {
  const baseOperations = buildOperationsContext().baseOperations;
  const sites = baseOperations.sites
    .map((site) => `<li>${site.typeLabel}: ${site.name} · ${site.statusLabel} · Pressure ${site.pressure} · Risk ${site.risk} · Storage ${site.storageItemCount} items (${site.storageWeightSummary} wt, ${site.storageSpaceSummary} space)${site.note ? ` · ${site.note}` : ""}</li>`)
    .join("");

  const content = `
    <div class="po-help">
      <p><strong>Maintenance Risk:</strong> ${baseOperations.maintenanceRisk}</p>
      <p><strong>Active Sites:</strong> ${baseOperations.activeSites}</p>
      <p><strong>Contested Sites:</strong> ${baseOperations.contestedSites}</p>
      <p><strong>Pressure Pool:</strong> ${baseOperations.pressureSum}</p>
      <p><strong>Maintenance Pressure:</strong> ${baseOperations.maintenancePressure}</p>
      <p><strong>Network Readiness:</strong> ${baseOperations.readiness ? "Stable" : "At Risk"}</p>
      <p><strong>Sites</strong></p>
      <ul>${sites || "<li>No base sites tracked.</li>"}</ul>
    </div>
  `;

  await Dialog.prompt({
    title: "Base of Operations Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

async function applyOperationalUpkeep(options = {}) {
  const before = getOperationsLedger();
  const currentTimestamp = getCurrentWorldTimestamp();
  const upkeep = before.resources?.upkeep ?? {};
  const isAutomatic = Boolean(options?.automatic);
  const silent = Boolean(options?.silent);
  const suppressChat = Boolean(options?.suppressChat);

  if (isAutomatic && !Number.isFinite(Number(before.resources?.upkeepLastAppliedTs))) {
    await updateOperationsLedger((ledger) => {
      if (!ledger.resources) ledger.resources = {};
      ensureOperationalResourceConfig(ledger.resources);
      ledger.resources.upkeepLastAppliedTs = currentTimestamp;
    }, { skipLocalRefresh: true });
    return { applied: false, initializedClock: true, upkeepDays: 0, summary: "Initialized upkeep clock." };
  }

  const partySize = Math.max(0, Number(upkeep.partySize ?? 0));
  const foodPerMember = Math.max(0, Number(upkeep.foodPerMember ?? 0));
  const waterPerMember = Math.max(0, Number(upkeep.waterPerMember ?? 0));
  const foodMultiplier = Math.max(0, Number(upkeep.foodMultiplier ?? 1));
  const waterMultiplier = Math.max(0, Number(upkeep.waterMultiplier ?? 1));
  const torchPerRest = Math.max(0, Number(upkeep.torchPerRest ?? 0));

  const upkeepDays = getUpkeepDaysFromCalendar(before.resources?.upkeepLastAppliedTs, currentTimestamp);
  if (upkeepDays <= 0) {
    if (!isAutomatic && !silent) ui.notifications?.info("No upkeep is due yet (next deduction occurs at 20:00 world time).");
    return { applied: false, upkeepDays: 0, summary: "No upkeep due yet." };
  }

  const foodDrainPerDay = Math.ceil(partySize * foodPerMember * foodMultiplier);
  const waterDrainPerDay = Math.ceil(partySize * waterPerMember * waterMultiplier);
  const torchDrainPerDay = Math.ceil(torchPerRest);
  const foodDrain = foodDrainPerDay * upkeepDays;
  const waterDrain = waterDrainPerDay * upkeepDays;
  const torchDrain = torchDrainPerDay * upkeepDays;

  const lastDueCount = Number.isFinite(Number(before.resources?.upkeepLastAppliedTs))
    ? getUpkeepDueCount(Number(before.resources?.upkeepLastAppliedTs))
    : getUpkeepDueCount(currentTimestamp) - upkeepDays;
  const currentDueCount = getUpkeepDueCount(currentTimestamp);
  const foodCoverageDueKey = Number(before.resources?.gather?.foodCoverageDueKey);
  const waterCoverageDueKey = Number(before.resources?.gather?.waterCoverageDueKey);
  const foodCoveredDays = Number.isFinite(foodCoverageDueKey) && foodCoverageDueKey > lastDueCount && foodCoverageDueKey <= currentDueCount ? 1 : 0;
  const waterCoveredDays = Number.isFinite(waterCoverageDueKey) && waterCoverageDueKey > lastDueCount && waterCoverageDueKey <= currentDueCount ? 1 : 0;
  const effectiveFoodDrain = Math.max(0, foodDrain - (foodCoveredDays * foodDrainPerDay));
  const effectiveWaterDrain = Math.max(0, waterDrain - (waterCoveredDays * waterDrainPerDay));
  const itemSelections = foundry.utils.deepClone(before.resources?.itemSelections ?? {});

  let afterPartyFoodRations = 0;
  let afterWater = 0;
  let afterPartyWaterRations = 0;
  let afterTorches = 0;
  let foodRationUsed = 0;
  let foodTargetedUsed = 0;
  let waterRationUsed = 0;
  let waterStoreUsed = 0;
  let unmetFoodDrain = 0;
  let unmetWaterDrain = 0;

  await updateOperationsLedger((ledger) => {
    if (!ledger.resources) ledger.resources = {};
    ensureOperationalResourceConfig(ledger.resources);
    const currentPartyFoodRations = Math.max(0, Number(ledger.resources.partyFoodRations ?? 0));
    const currentWater = Math.max(0, Number(ledger.resources.water ?? 0));
    const currentPartyWaterRations = Math.max(0, Number(ledger.resources.partyWaterRations ?? 0));
    const currentTorches = Math.max(0, Number(ledger.resources.torches ?? 0));

    let remainingFoodDrain = effectiveFoodDrain;
    foodRationUsed = Math.min(currentPartyFoodRations, remainingFoodDrain);
    remainingFoodDrain -= foodRationUsed;
    unmetFoodDrain = Math.max(0, remainingFoodDrain);

    let remainingWaterDrain = effectiveWaterDrain;
    waterRationUsed = Math.min(currentPartyWaterRations, remainingWaterDrain);
    remainingWaterDrain -= waterRationUsed;
    waterStoreUsed = Math.min(currentWater, remainingWaterDrain);
    remainingWaterDrain -= waterStoreUsed;
    unmetWaterDrain = Math.max(0, remainingWaterDrain);

    afterPartyFoodRations = Math.max(0, currentPartyFoodRations - foodRationUsed);
    afterPartyWaterRations = Math.max(0, currentPartyWaterRations - waterRationUsed);
    afterWater = Math.max(0, currentWater - waterStoreUsed);
    afterTorches = Math.max(0, currentTorches - torchDrain);

    ledger.resources.partyFoodRations = afterPartyFoodRations;
    ledger.resources.partyWaterRations = afterPartyWaterRations;
    ledger.resources.water = afterWater;
    ledger.resources.torches = afterTorches;
    ledger.resources.gather.foodCoveredNextUpkeep = false;
    if (Number.isFinite(foodCoverageDueKey) && foodCoverageDueKey <= currentDueCount) ledger.resources.gather.foodCoverageDueKey = null;
    if (Number.isFinite(waterCoverageDueKey) && waterCoverageDueKey <= currentDueCount) ledger.resources.gather.waterCoverageDueKey = null;
    ledger.resources.upkeepLastAppliedTs = currentTimestamp;
  });

  const itemResults = await depleteLinkedResourceItems({ foodDrain: unmetFoodDrain, waterDrain: effectiveWaterDrain, torchDrain }, itemSelections);
  const foodItemResult = itemResults.find((entry) => entry.key === "food");
  foodTargetedUsed = Math.max(0, Number(foodItemResult?.consumed ?? 0));
  unmetFoodDrain = Math.max(0, unmetFoodDrain - foodTargetedUsed);

  const shortages = [];
  if (unmetFoodDrain > 0) shortages.push(`food short by ${unmetFoodDrain}`);
  if (unmetWaterDrain > 0) shortages.push(`water short by ${unmetWaterDrain}`);
  if (afterTorches === 0 && torchDrain > 0) shortages.push("torches depleted");

  const foodSummary = foodCoveredDays > 0
    ? `Food -${effectiveFoodDrain} (${foodCoveredDays} day covered by successful gather check; Food Rations -${foodRationUsed}, Targeted Food Item -${foodTargetedUsed})`
    : `Food -${effectiveFoodDrain} (Food Rations -${foodRationUsed}, Targeted Food Item -${foodTargetedUsed})`;
  const waterSummary = waterCoveredDays > 0
    ? `Water -${effectiveWaterDrain} (${waterCoveredDays} day covered by successful gather check; Water Rations -${waterRationUsed}, Water Stores -${waterStoreUsed})`
    : `Water -${effectiveWaterDrain} (Water Rations -${waterRationUsed}, Water Stores -${waterStoreUsed})`;
  const summary = `Daily upkeep applied for ${upkeepDays} day(s): ${foodSummary}, ${waterSummary}, Torches -${torchDrain}.`;
  const itemSummary = itemResults
    .filter((entry) => entry.needed > 0)
    .map((entry) => `${entry.name}: ${entry.consumed}/${entry.needed}${entry.missing > 0 ? ` (missing ${entry.missing})` : ""}`)
    .join(" | ");

  if (!silent && shortages.length > 0) {
    ui.notifications?.warn(`${summary} Shortages: ${shortages.join(", ")}.`);
  } else if (!isAutomatic && !silent) {
    ui.notifications?.info(summary);
  }

  const context = buildOperationsContext();
  const effects = context.summary.effects;
  const riskLine = effects.riskTier === "high"
    ? "Operational risk is HIGH: apply one complication roll this cycle."
    : effects.riskTier === "moderate"
      ? "Operational risk is MODERATE: keep one risk trigger in reserve."
      : "Operational risk is LOW.";

  if (!suppressChat && (!isAutomatic || shortages.length > 0)) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
      content: `<p><strong>Daily Upkeep</strong></p><p>${summary}</p>${itemSummary ? `<p><strong>Actor Item Depletion:</strong> ${itemSummary}</p>` : ""}<p>${riskLine}</p>`
    });
  }

  return {
    applied: true,
    upkeepDays,
    summary,
    shortages,
    itemSummary,
    riskLine
  };
}

function getSessionAutopilotSnapshot() {
  const raw = game.settings.get(MODULE_ID, SETTINGS.SESSION_AUTOPILOT_SNAPSHOT);
  return raw && typeof raw === "object" ? raw : {};
}

function buildSessionAutopilotSnapshot() {
  return {
    id: foundry.utils.randomID(),
    createdAt: Date.now(),
    createdBy: String(game.user?.name ?? "GM"),
    restState: foundry.utils.deepClone(getRestWatchState()),
    marchState: foundry.utils.deepClone(getMarchingOrderState()),
    restActivities: foundry.utils.deepClone(getRestActivities()),
    operationsLedger: foundry.utils.deepClone(getOperationsLedger()),
    injuryRecovery: foundry.utils.deepClone(getInjuryRecoveryState())
  };
}

async function logCurrentSceneWeatherSnapshot(options = {}) {
  if (!game.user.isGM) return { logged: false, reason: "gm-only" };
  const sceneSnapshot = resolveCurrentSceneWeatherSnapshot();
  const weatherState = ensureWeatherState(getOperationsLedger());
  const previous = weatherState.current ?? null;
  const previousDae = Array.isArray(previous?.daeChanges)
    ? previous.daeChanges.map((entry) => normalizeWeatherDaeChange(entry)).filter((entry) => entry.key && entry.value)
    : [];
  const snapshot = {
    id: foundry.utils.randomID(),
    label: String(sceneSnapshot.label ?? previous?.label ?? "Weather").trim() || "Weather",
    weatherId: String(sceneSnapshot.weatherId ?? previous?.weatherId ?? "").trim(),
    darkness: Number.isFinite(Number(sceneSnapshot.darkness)) ? Math.max(0, Math.min(1, Number(sceneSnapshot.darkness))) : 0,
    visibilityModifier: Number.isFinite(Number(sceneSnapshot.visibilityModifier)) ? Math.max(-5, Math.min(5, Math.floor(Number(sceneSnapshot.visibilityModifier)))) : 0,
    note: String(sceneSnapshot.note ?? previous?.note ?? "").trim() || `Scene weather snapshot logged at darkness ${Number(sceneSnapshot.darkness ?? 0).toFixed(2)}`,
    daeChanges: previousDae,
    loggedAt: Date.now(),
    loggedBy: String(game.user?.name ?? "GM")
  };
  const selectedPreset = getWeatherPresetByKey(weatherState, sceneSnapshot, snapshot.weatherId);
  return commitWeatherSnapshot(snapshot, {
    preset: selectedPreset,
    silent: Boolean(options?.silent),
    suppressChat: Boolean(options?.suppressChat)
  });
}

async function runSessionAutopilot() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can run session autopilot.");
    return null;
  }

  const snapshot = buildSessionAutopilotSnapshot();
  await game.settings.set(MODULE_ID, SETTINGS.SESSION_AUTOPILOT_SNAPSHOT, snapshot);

  const notes = [];
  const upkeepResult = await applyOperationalUpkeep({ silent: true, suppressChat: true });
  if (upkeepResult?.applied) notes.push(`Upkeep applied (${upkeepResult.upkeepDays} day(s)).`);
  else if (upkeepResult?.upkeepDays === 0) notes.push("Upkeep skipped (not due).");
  else if (upkeepResult?.initializedClock) notes.push("Upkeep clock initialized.");

  const recoveryResult = await applyRecoveryCycle({ silent: true, suppressChat: true });
  if (recoveryResult?.applied) {
    notes.push(`Recovery cycle processed (${recoveryResult.total} tracked injuries, ${recoveryResult.syncedActors} synced).`);
  } else {
    notes.push("Recovery cycle skipped (no tracked injuries).");
  }

  const weatherResult = await logCurrentSceneWeatherSnapshot({ silent: true, suppressChat: true });
  if (weatherResult?.logged) {
    notes.push(`Weather logged (${weatherResult.label}, visibility ${formatSignedModifier(weatherResult.visibilityModifier)}).`);
  }

  await syncIntegrationState();
  notes.push("Integration sync completed.");

  const calendarResult = await syncAllInjuriesToSimpleCalendar();
  notes.push(`Injury calendar sync ${calendarResult.synced}/${calendarResult.total}.`);

  const context = buildOperationsContext();
  const nonPartyGlobal = Boolean(context.partyHealth?.syncToSceneNonParty);
  const nonPartyEnvironment = Boolean(context.environment?.syncToSceneNonParty && String(context.environment?.presetKey ?? "none") !== "none");
  const nonPartyLine = `Non-party scene sync: modifiers ${nonPartyGlobal ? "ON" : "OFF"} | environment ${nonPartyEnvironment ? "ON" : "OFF"}.`;
  notes.push(nonPartyLine);

  const stamp = new Date().toLocaleString();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Session Autopilot</strong></p><p>${notes.map((line) => foundry.utils.escapeHTML(line)).join("<br>")}</p><p><em>${foundry.utils.escapeHTML(stamp)}</em></p>`
  });
  ui.notifications?.info("Session Autopilot complete. Snapshot saved for undo.");
  return {
    ok: true,
    notes,
    snapshotId: snapshot.id
  };
}

async function undoLastSessionAutopilot() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can undo session autopilot.");
    return false;
  }
  const snapshot = getSessionAutopilotSnapshot();
  if (!snapshot || !snapshot.createdAt) {
    ui.notifications?.warn("No saved session autopilot snapshot found.");
    return false;
  }

  const writes = [
    [SETTINGS.REST_STATE, foundry.utils.deepClone(snapshot.restState ?? buildDefaultRestWatchState())],
    [SETTINGS.MARCH_STATE, foundry.utils.deepClone(snapshot.marchState ?? buildDefaultMarchingOrderState())],
    [SETTINGS.REST_ACTIVITIES, foundry.utils.deepClone(snapshot.restActivities ?? buildDefaultActivityState())],
    [SETTINGS.OPS_LEDGER, foundry.utils.deepClone(snapshot.operationsLedger ?? buildDefaultOperationsLedger())],
    [SETTINGS.INJURY_RECOVERY, foundry.utils.deepClone(snapshot.injuryRecovery ?? buildDefaultInjuryRecoveryState())]
  ];

  for (const [settingKey, value] of writes) {
    suppressNextSettingRefresh(`${MODULE_ID}.${settingKey}`);
    await game.settings.set(MODULE_ID, settingKey, value);
  }

  await game.settings.set(MODULE_ID, SETTINGS.SESSION_AUTOPILOT_SNAPSHOT, {
    ...snapshot,
    undoneAt: Date.now(),
    undoneBy: String(game.user?.name ?? "GM")
  });

  scheduleIntegrationSync("session-autopilot-undo");
  refreshOpenApps();
  emitSocketRefresh();
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Session Autopilot Undo</strong></p><p>Restored snapshot from ${foundry.utils.escapeHTML(new Date(Number(snapshot.createdAt)).toLocaleString())}.</p>`
  });
  ui.notifications?.info("Session Autopilot snapshot restored.");
  return true;
}

async function showOperationalBrief() {
  const context = buildOperationsContext();
  const bonusItems = context.summary.effects.bonuses.map((item) => `<li>${item}</li>`).join("");
  const globalMinorBonusItems = context.summary.effects.globalMinorBonuses.map((item) => `<li>${item}</li>`).join("");
  const globalModifierItems = (context.summary.effects.globalModifierRows ?? [])
    .map((item) => `<li>${item.label}: ${item.formatted} · applies to ${item.appliesTo}${item.enabled ? "" : " · OFF"}</li>`)
    .join("");
  const riskItems = context.summary.effects.risks.map((item) => `<li>${item}</li>`).join("");
  const missingRoles = context.diagnostics.missingRoles.length
    ? context.diagnostics.missingRoles.join(", ")
    : "None";
  const inactiveSops = context.diagnostics.inactiveSops.length
    ? context.diagnostics.inactiveSops.join(", ")
    : "None";

  const content = `
    <div class="po-help">
      <p><strong>Preparation Edge:</strong> ${context.summary.effects.prepEdge ? "Active" : "Inactive"}</p>
      <p><strong>Risk Tier:</strong> ${context.summary.effects.riskTier.toUpperCase()}</p>
      <p><strong>Missing Roles:</strong> ${missingRoles}</p>
      <p><strong>Inactive SOPs:</strong> ${inactiveSops}</p>
      <p><strong>Bonuses</strong></p>
      <ul>${bonusItems || "<li>None active.</li>"}</ul>
      <p><strong>Party Health Global Modifiers (DAE Synced)</strong></p>
      <ul>${globalModifierItems || "<li>No active Party Health global modifiers.</li>"}</ul>
      <p><strong>Active Positive Effects</strong></p>
      <ul>${globalMinorBonusItems || "<li>No active global minor bonuses.</li>"}</ul>
      <p><strong>Risks</strong></p>
      <ul>${riskItems || "<li>No immediate penalties.</li>"}</ul>
    </div>
  `;

  await Dialog.prompt({
    title: "Operational Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

const INJURY_TABLE = [
  { key: "lost-limb", min: 1, max: 5, label: "Lost Limb", effect: "Lose an arm or leg (1d4). Limb is unusable. Movement halved if leg, no weapons/shields if arm.", recovery: "Permanent. Only Regenerate or divine magic can restore.", permanent: true, kitCharges: 0 },
  { key: "crippling-injury", min: 6, max: 10, label: "Crippling Injury", effect: "Disadvantage on actions with that limb. Halved speed if leg. Shield bonus halved if arm.", recovery: "1d4 days or 2 kit charges + DC 12 Medicine.", dayMin: 1, dayMax: 4, kitCharges: 2, treatmentDc: 12, treatmentSkill: "med" },
  { key: "concussion", min: 11, max: 15, label: "Concussion", effect: "Disadvantage on INT/WIS checks and saves. -5 Passive Perception.", recovery: "1d4 days or 1 kit charge.", dayMin: 1, dayMax: 4, kitCharges: 1 },
  { key: "broken-arm", min: 16, max: 20, label: "Broken Arm", effect: "Cannot use that arm for weapons, shields, or somatic spells.", recovery: "2d4 days or 2 kit charges to downgrade to Crippling (half days).", dayMin: 2, dayMax: 8, kitCharges: 2, downgradeTo: "crippling-injury", downgradeHalfDays: true },
  { key: "fractured-ribs", min: 21, max: 25, label: "Fractured Ribs", effect: "Disadvantage on DEX saves and CON checks. Dash causes 1d4 damage.", recovery: "1d4+1 days or 2 kit charges.", dayMin: 2, dayMax: 5, kitCharges: 2 },
  { key: "internal-bleeding", min: 26, max: 30, label: "Internal Bleeding", effect: "At start of combat, roll 1d6. On a 1, take 1d4 damage.", recovery: "3 kit charges + DC 15 Medicine or magic healing.", dayMin: 3, dayMax: 3, kitCharges: 3, treatmentDc: 15, treatmentSkill: "med" },
  { key: "deep-cut", min: 31, max: 35, label: "Deep Cut", effect: "Lose 1d6 max HP. Cannot regain until treated.", recovery: "1 kit charge or 1 hour rest + DC 13 Medicine.", dayMin: 1, dayMax: 1, kitCharges: 1, treatmentDc: 13, treatmentSkill: "med" },
  { key: "loss-of-eye", min: 36, max: 40, label: "Loss of Eye", effect: "Disadvantage on Perception and ranged attacks.", recovery: "Permanent unless magically restored.", permanent: true, kitCharges: 0 },
  { key: "loss-of-hearing", min: 41, max: 45, label: "Loss of Hearing", effect: "Disadvantage on sound-based Perception.", recovery: "Permanent unless magically restored.", permanent: true, kitCharges: 0 },
  { key: "shattered-knee", min: 46, max: 50, label: "Shattered Knee", effect: "No Dash. Speed halved. Painful to move.", recovery: "1 week or 3 kit charges. Becomes permanent if untreated.", dayMin: 7, dayMax: 7, kitCharges: 3, canBecomePermanent: true },
  { key: "dislocated-shoulder", min: 51, max: 55, label: "Dislocated Shoulder", effect: "Disadvantage on STR checks and melee attacks.", recovery: "1d6 days of rest.", dayMin: 1, dayMax: 6, kitCharges: 0 },
  { key: "infection", min: 56, max: 60, label: "Infection", effect: "Lose 1 max HP after each long rest. DC 15 CON to resist.", recovery: "2 kit charges.", dayMin: 3, dayMax: 3, kitCharges: 2 },
  { key: "minor-injury", min: 61, max: 70, label: "Minor Injury", effect: "No combat effect. Bloodied, limping, or visibly bruised.", recovery: "1 kit charge or 1d3 days rest.", dayMin: 1, dayMax: 3, kitCharges: 1 },
  { key: "deep-scar", min: 71, max: 80, label: "Deep Scar", effect: "+1 Intimidation, -1 Persuasion (if visible).", recovery: "Permanent.", permanent: true, kitCharges: 0 },
  { key: "psychic-trauma", min: 81, max: 90, label: "Psychic Trauma", effect: "Disadvantage on saves vs fear or charm.", recovery: "1 week or 2 kit charges + DC 13 Insight (once).", dayMin: 7, dayMax: 7, kitCharges: 2, treatmentDc: 13, treatmentSkill: "ins" },
  { key: "nerve-damage", min: 91, max: 95, label: "Nerve Damage", effect: "1 ability score (roll 1d6) suffers -1 temporarily.", recovery: "1 week or 2 kit charges. Permanent on failed DC 13 CON.", dayMin: 7, dayMax: 7, kitCharges: 2, treatmentDc: 13, treatmentSkill: "con", canBecomePermanent: true },
  { key: "nightmares", min: 96, max: 99, label: "Nightmares", effect: "Disadvantage on first initiative roll daily. Long rests do not remove exhaustion.", recovery: "Remove Curse or 4 kit charges to ease mental symptoms.", dayMin: 7, dayMax: 7, kitCharges: 4 },
  { key: "soul-shaken", min: 100, max: 100, label: "Soul-Shaken", effect: "Permanent -1 to Wisdom saves. Shadows cling to your soul.", recovery: "Permanent unless resolved through divine magic or narrative quest.", permanent: true, kitCharges: 0 }
];

function getInjuryDefinitionByKey(key) {
  return INJURY_TABLE.find((entry) => entry.key === key) ?? null;
}

function findInjuryDefinitionByRoll(roll) {
  const value = Math.max(1, Math.min(100, Number(roll) || 1));
  return INJURY_TABLE.find((entry) => value >= entry.min && value <= entry.max) ?? INJURY_TABLE[0];
}

function rollInjuryDefinition() {
  const roll = Math.floor(Math.random() * 100) + 1;
  const injury = findInjuryDefinitionByRoll(roll);
  return { roll, injury };
}

function rollInjuryRecoveryDays(definition, fallback = 3) {
  const min = Number(definition?.dayMin ?? fallback);
  const max = Number(definition?.dayMax ?? min);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return Math.max(1, Math.floor(fallback));
  const low = Math.max(1, Math.floor(Math.min(min, max)));
  const high = Math.max(low, Math.floor(Math.max(min, max)));
  return low + Math.floor(Math.random() * (high - low + 1));
}

function getInjuryRecoveryFormula(definition, fallback = 3) {
  if (definition?.permanent) return "Permanent";
  const min = Number(definition?.dayMin ?? fallback);
  const max = Number(definition?.dayMax ?? min);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return String(Math.max(1, Math.floor(fallback)));
  const low = Math.max(1, Math.floor(Math.min(min, max)));
  const high = Math.max(low, Math.floor(Math.max(min, max)));
  if (low === high) return String(low);
  const span = high - low + 1;
  if (low === 1) return `1d${span}`;
  return `1d${span}+${low - 1}`;
}

function buildInjuryTableHtml() {
  const rows = INJURY_TABLE.map((entry) => `
    <tr>
      <td>${entry.min}-${entry.max}</td>
      <td>${entry.label}</td>
      <td>${entry.effect}</td>
      <td>${entry.recovery}</td>
    </tr>
  `).join("");
  return `
    <div class="po-help">
      <p><strong>Healer's Kit:</strong> 10 charges total. Spend charges per injury severity and required checks.</p>
      <table style="width:100%; border-collapse:collapse;">
        <thead><tr><th style="text-align:left;">d100</th><th style="text-align:left;">Injury</th><th style="text-align:left;">Effect</th><th style="text-align:left;">Recovery</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildDefaultInjuryRecoveryState() {
  return {
    supplies: {
      healersKitCharges: 10
    },
    config: {
      baseRecoveryDays: 3
    },
    injuries: {},
    lastCycleAt: "-",
    lastCycleSummary: "-"
  };
}

function getInjuryRecoveryState() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.INJURY_RECOVERY);
  return foundry.utils.mergeObject(buildDefaultInjuryRecoveryState(), stored ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });
}

async function updateInjuryRecoveryState(mutator) {
  if (typeof mutator !== "function") return;
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update injury recovery.");
    return;
  }
  const state = getInjuryRecoveryState();
  mutator(state);

  await game.settings.set(MODULE_ID, SETTINGS.INJURY_RECOVERY, state);
  scheduleIntegrationSync("injury-recovery");
  refreshOpenApps();
  emitSocketRefresh();
}

function buildInjuryActorOptions(selectedActorId = "") {
  const actorId = selectedActorId || resolveDefaultInjuryActorId();
  return getOwnedPcActors()
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((actor) => ({
      id: actor.id,
      name: actor.name,
      selected: actor.id === actorId
    }));
}

function resolveDefaultInjuryActorId() {
  const activeId = String(getActiveActorForUser()?.id ?? "");
  if (activeId && getOwnedPcActors().some((actor) => actor.id === activeId)) return activeId;
  return String(getOwnedPcActors()[0]?.id ?? "");
}

function buildInjuryRecoveryContext() {
  const state = getInjuryRecoveryState();
  const config = state.config ?? {};
  const defaultActorId = resolveDefaultInjuryActorId();
  const entries = Object.entries(state.injuries ?? {})
    .map(([actorId, entry]) => {
      const actor = game.actors.get(actorId);
      if (!actor) return null;
      const definition = getInjuryDefinitionByKey(entry.injuryKey);
      const isPermanent = Boolean(entry.permanent || definition?.permanent);
      const status = buildInjuryStatusSummary({
        effect: String(entry.effect ?? definition?.effect ?? ""),
        notes: String(entry.notes ?? ""),
        stabilized: Boolean(entry.stabilized),
        permanent: isPermanent,
        recoveryDays: Number(entry.recoveryDays ?? 0)
      });
      return {
        actorId,
        actorName: actor.name,
        injuryKey: String(entry.injuryKey ?? ""),
        injuryName: String(entry.injuryName ?? definition?.label ?? "Injury"),
        effect: status.effectText,
        effectSummary: status.summary,
        statusLabel: status.stateLabel,
        recoveryDetailLabel: status.recoveryLabel,
        recoveryRule: String(entry.recoveryRule ?? definition?.recovery ?? ""),
        injuryRoll: Number(entry.injuryRoll ?? 0),
        permanent: isPermanent,
        stabilized: Boolean(entry.stabilized),
        recoveryDays: Number(entry.recoveryDays ?? 0),
        kitCharges: Math.max(0, Number(entry.kitCharges ?? definition?.kitCharges ?? 0)),
        treatmentDc: Number(entry.treatmentDc ?? definition?.treatmentDc ?? 0),
        treatmentSkill: String(entry.treatmentSkill ?? definition?.treatmentSkill ?? ""),
        notes: entry.notes ?? "",
        recoveryDueLabel: formatRecoveryDueLabel(entry.recoveryDueTs)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.actorName.localeCompare(b.actorName));

  const unstableCount = entries.filter((entry) => !entry.stabilized && !entry.permanent).length;
  const permanentCount = entries.filter((entry) => entry.permanent).length;

  return {
    supplies: {
      healersKitCharges: Number(state.supplies?.healersKitCharges ?? state.supplies?.stabilizationKits ?? 10)
    },
    config: {
      baseRecoveryDays: Number(config.baseRecoveryDays ?? 3)
    },
    actorOptions: buildInjuryActorOptions(defaultActorId),
    defaultActorId,
    injuryOptions: INJURY_TABLE.map((entry) => ({
      key: entry.key,
      value: entry.key,
      label: `${entry.min}-${entry.max} ${entry.label}`,
      selected: entry.key === INJURY_TABLE[0]?.key
    })),
    defaultRecoveryFormula: getInjuryRecoveryFormula(INJURY_TABLE[0], Number(config.baseRecoveryDays ?? 3)),
    entries,
    summary: {
      activeInjuries: entries.length,
      unstableCount,
      permanentCount,
      lastCycleAt: state.lastCycleAt ?? "-",
      lastCycleSummary: state.lastCycleSummary ?? "-"
    }
  };
}

function buildInjuryCalendarPayload(actor, entry) {
  const worldNow = getCurrentWorldTimestamp();
  const recoveryDays = Math.max(0, Number(entry?.recoveryDays ?? 0));
  const rawDueTimestamp = Number(entry?.recoveryDueTs);
  const fallbackDueTimestamp = worldNow + (recoveryDays * 86400);
  const dueTimestamp = Number.isFinite(rawDueTimestamp) ? rawDueTimestamp : fallbackDueTimestamp;
  const startTimestamp = Math.floor(dueTimestamp);
  const endTimestamp = startTimestamp + 60;
  const injuryName = String(entry?.injuryName ?? "Injury");
  const stabilized = Boolean(entry?.stabilized);
  const permanent = Boolean(entry?.permanent);
  const note = String(entry?.notes ?? "").trim();
  const title = permanent
    ? `${injuryName} - Permanent`
    : `${injuryName} - ${recoveryDays} day(s) left`;
  const description = `${actor?.name ?? "Unknown"} | ${injuryName} | ${stabilized ? "Stabilized" : "Unstable"}${permanent ? " | Permanent" : ` | ${recoveryDays} day(s) remaining`}${note ? ` | ${note}` : ""}`;
  return {
    title,
    name: title,
    description,
    content: description,
    startTime: startTimestamp,
    endTime: endTimestamp,
    timestamp: startTimestamp,
    startTimestamp,
    endTimestamp,
    allDay: true,
    playerVisible: true,
    public: true,
    flags: {
      [MODULE_ID]: {
        injuryActorId: actor?.id ?? "",
        gmCreated: true
      }
    }
  };
}

async function persistInjuryCalendarMetadata(actorId, fields) {
  const state = getInjuryRecoveryState();
  if (!state.injuries?.[actorId]) return;
  state.injuries[actorId] = {
    ...state.injuries[actorId],
    ...fields
  };
  await game.settings.set(MODULE_ID, SETTINGS.INJURY_RECOVERY, state);
}

async function syncInjuryWithSimpleCalendar(actorId) {
  if (!game.user.isGM || !isSimpleCalendarActive()) return { synced: false, reason: "Simple Calendar inactive or user is not GM.", entryId: "" };
  const api = getSimpleCalendarMutationApi();
  if (!api) {
    logSimpleCalendarSyncDebug("Simple Calendar API missing during injury sync", { actorId });
    return { synced: false, reason: "Simple Calendar mutation API not found.", entryId: "" };
  }
  const state = getInjuryRecoveryState();
  const entry = state.injuries?.[actorId];
  const actor = game.actors.get(actorId);
  if (!entry || !actor) {
    logSimpleCalendarSyncDebug("Injury sync skipped due to missing actor or entry", {
      actorId,
      hasEntry: Boolean(entry),
      hasActor: Boolean(actor)
    });
    return { synced: false, reason: "Missing actor or injury entry.", entryId: "" };
  }

  const payload = buildInjuryCalendarPayload(actor, entry);
  const existingId = String(entry.calendarEntryId ?? "");
  let syncedId = existingId;
  let synced = false;
  let failureReason = "";

  if (existingId) {
    synced = await updateSimpleCalendarEntry(api, existingId, payload);
    if (!synced) failureReason = `Update failed for calendar entry ${existingId}.`;
  }

  if (!synced) {
    const created = await createSimpleCalendarEntry(api, payload);
    if (created.success) {
      synced = true;
      if (created.id) syncedId = created.id;
    } else {
      failureReason = String(created.reason ?? "Create fallback failed.");
      logSimpleCalendarSyncDebug("Create fallback failed for injury sync", {
        actorId,
        actorName: actor.name,
        reason: String(created.reason ?? "unknown")
      });
    }
  }

  if (syncedId && syncedId !== existingId) {
    await persistInjuryCalendarMetadata(actorId, { calendarEntryId: syncedId });
  }

  if (!synced) {
    logSimpleCalendarSyncDebug("Injury sync failed after update/create attempts", {
      actorId,
      actorName: actor.name,
      existingEntryId: existingId || "(none)",
      reason: failureReason || "unknown"
    });
  }

  return { synced, reason: synced ? "" : (failureReason || "unknown"), entryId: syncedId };
}

async function clearInjuryFromSimpleCalendar(entryId) {
  if (!game.user.isGM || !isSimpleCalendarActive() || !entryId) return false;
  const api = getSimpleCalendarMutationApi();
  if (!api) return false;
  return removeSimpleCalendarEntry(api, entryId);
}

async function syncAllInjuriesToSimpleCalendar() {
  if (!game.user.isGM) return { synced: 0, total: 0 };
  const injuries = Object.keys(getInjuryRecoveryState().injuries ?? {});
  let synced = 0;
  for (const actorId of injuries) {
    if ((await syncInjuryWithSimpleCalendar(actorId)).synced) synced += 1;
  }
  return { synced, total: injuries.length };
}

async function setInjuryRecoveryConfig(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage injury recovery.");
    return;
  }
  const key = element?.dataset?.injuryConfig;
  if (!key) return;
  await updateInjuryRecoveryState((state) => {
    if (!state.config) state.config = {};
    if (!state.supplies) state.supplies = {};
    const raw = Number(element?.value ?? 0);
    const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    if (key === "healersKitCharges" || key === "stabilizationKits") {
      state.supplies.healersKitCharges = Math.floor(value);
      return;
    }
    if (key === "baseRecoveryDays") {
      state.config.baseRecoveryDays = Math.max(1, Math.floor(value));
    }
  });
}

async function showInjuryTable() {
  await Dialog.prompt({
    title: "Injury Table (d100)",
    content: buildInjuryTableHtml(),
    rejectClose: false,
    callback: () => {}
  });
}

async function rollInjuryTableForEditor(element) {
  const root = element?.closest(".po-injury-editor");
  if (!root) return;
  const rollResult = await (new Roll("1d100")).evaluate();
  try {
    if (game.dice3d?.showForRoll) {
      await game.dice3d.showForRoll(rollResult, game.user, true);
    }
  } catch {
    // Dice So Nice is optional.
  }
  await rollResult.toMessage({
    speaker: ChatMessage.getSpeaker({ alias: game.user?.name ?? "Party Operations" }),
    flavor: "Injury Table Roll (d100)"
  });

  const roll = Math.max(1, Math.min(100, Number(rollResult.total ?? 1)));
  const injury = findInjuryDefinitionByRoll(roll);
  const injurySelect = root.querySelector("select[name='injuryKey']");
  if (injurySelect) injurySelect.value = injury.key;
  const rollInput = root.querySelector("input[name='injuryRoll']");
  if (rollInput) rollInput.value = String(roll);
  const formulaTarget = root.querySelector("[data-injury-recovery-formula]");
  if (formulaTarget) {
    formulaTarget.textContent = `Recovery Formula: ${getInjuryRecoveryFormula(injury, Math.max(1, Number(getInjuryRecoveryState().config?.baseRecoveryDays ?? 3)))}`;
  }
  const recoveryInput = root.querySelector("input[name='recoveryDays']");
  if (recoveryInput) recoveryInput.value = String(rollInjuryRecoveryDays(injury, Math.max(1, Number(getInjuryRecoveryState().config?.baseRecoveryDays ?? 3))));
  const notesInput = root.querySelector("input[name='notes']");
  if (notesInput && !String(notesInput.value ?? "").trim()) notesInput.value = injury.effect;
  ui.notifications?.info(`d100 ${roll}: ${injury.label}`);
}

function syncInjuryEditorFromSelection(element) {
  const root = element?.closest(".po-injury-editor");
  if (!root) return;
  const injuryKey = String(root.querySelector("select[name='injuryKey']")?.value ?? "");
  const injury = getInjuryDefinitionByKey(injuryKey);
  if (!injury) return;
  const fallbackDays = Math.max(1, Number(getInjuryRecoveryState().config?.baseRecoveryDays ?? 3));
  const formulaTarget = root.querySelector("[data-injury-recovery-formula]");
  if (formulaTarget) formulaTarget.textContent = `Recovery Formula: ${getInjuryRecoveryFormula(injury, fallbackDays)}`;
  const recoveryInput = root.querySelector("input[name='recoveryDays']");
  if (recoveryInput) recoveryInput.value = String(rollInjuryRecoveryDays(injury, fallbackDays));
}

async function rollTreatmentCheck(injuredActorId, treatmentSkill, dc) {
  const dcValue = Math.max(1, Math.floor(Number(dc) || 0));
  if (!dcValue || !treatmentSkill) return true;

  if (treatmentSkill === "con") {
    const actor = game.actors.get(injuredActorId);
    if (!actor) return false;
    const conMod = Number(actor.system?.abilities?.con?.mod ?? 0);
    const roll = await (new Roll("1d20 + @mod", { mod: conMod })).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `Treatment Check: CON vs DC ${dcValue}`
    });
    return Number(roll.total ?? 0) >= dcValue;
  }

  const options = buildInjuryActorOptions();
  const selectHtml = options.map((opt) => `<option value="${opt.id}">${opt.name}</option>`).join("");
  const healerActorId = await Dialog.wait({
    title: "Select Treating Actor",
    content: `<div class="form-group"><label>Healer</label><select name="healerActorId">${selectHtml}</select></div>`,
    buttons: {
      ok: {
        label: "Roll Check",
        callback: (html) => String(html.find("select[name=healerActorId]").val() ?? "")
      },
      cancel: { label: "Cancel", callback: () => "" }
    },
    default: "ok",
    close: () => ""
  });

  if (!healerActorId) return false;
  const healer = game.actors.get(healerActorId);
  if (!healer) return false;
  const skill = treatmentSkill === "ins" ? "ins" : "med";
  const rollResult = await healer.rollSkill(skill, { fastForward: true, chatMessage: false });
  const total = Number(rollResult?.total ?? rollResult?.roll?.total ?? 0);
  return total >= dcValue;
}

async function upsertInjuryEntry(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage injury recovery.");
    return;
  }
  const root = element?.closest(".po-injury-editor");
  if (!root) return;
  const actorId = root.querySelector("select[name='actorId']")?.value ?? "";
  if (!actorId) {
    ui.notifications?.warn("Select an actor for injury tracking.");
    return;
  }
  const injuryKey = String(root.querySelector("select[name='injuryKey']")?.value ?? "");
  const injuryDef = getInjuryDefinitionByKey(injuryKey);
  if (!injuryDef) {
    ui.notifications?.warn("Select an injury result from the table.");
    return;
  }
  const injuryRollRaw = Number(root.querySelector("input[name='injuryRoll']")?.value ?? 0);
  const injuryRoll = Number.isFinite(injuryRollRaw) ? Math.max(0, Math.floor(injuryRollRaw)) : 0;
  const stabilized = Boolean(root.querySelector("input[name='stabilized']")?.checked);
  const recoveryDaysRaw = Number(root.querySelector("input[name='recoveryDays']")?.value ?? 0);
  const notes = root.querySelector("input[name='notes']")?.value ?? "";
  let savedRecoveryDays = 0;

  await updateInjuryRecoveryState((state) => {
    if (!state.injuries) state.injuries = {};
    const fallbackDays = Math.max(1, Number(state.config?.baseRecoveryDays ?? 3));
    const rolledDays = rollInjuryRecoveryDays(injuryDef, fallbackDays);
    const recoveryDays = injuryDef.permanent
      ? 0
      : (Number.isFinite(recoveryDaysRaw) && recoveryDaysRaw > 0 ? Math.floor(recoveryDaysRaw) : rolledDays);
    savedRecoveryDays = recoveryDays;
    const existing = state.injuries[actorId] ?? {};
    state.injuries[actorId] = {
      ...existing,
      injuryKey: injuryDef.key,
      injuryName: injuryDef.label,
      injuryRoll,
      effect: injuryDef.effect,
      recoveryRule: injuryDef.recovery,
      permanent: Boolean(injuryDef.permanent),
      kitCharges: Math.max(0, Number(injuryDef.kitCharges ?? 0)),
      treatmentDc: Math.max(0, Number(injuryDef.treatmentDc ?? 0)),
      treatmentSkill: String(injuryDef.treatmentSkill ?? ""),
      canBecomePermanent: Boolean(injuryDef.canBecomePermanent),
      downgradeTo: String(injuryDef.downgradeTo ?? ""),
      downgradeHalfDays: Boolean(injuryDef.downgradeHalfDays),
      stabilized,
      recoveryDays,
      notes,
      recoveryDueTs: getCurrentWorldTimestamp() + (recoveryDays * 86400)
    };
  });

  if (game.user.isGM) {
    const hasMutationApi = Boolean(getSimpleCalendarMutationApi());
    const syncResult = await syncInjuryWithSimpleCalendar(actorId);
    if (isSimpleCalendarActive() && hasMutationApi && !syncResult.synced) {
      const reason = String(syncResult.reason ?? "").trim();
      const detail = reason ? ` (${reason.length > 120 ? `${reason.slice(0, 117)}...` : reason})` : "";
      ui.notifications?.warn(`Injury saved, but Simple Calendar sync was unavailable for ${game.actors.get(actorId)?.name ?? "actor"}${detail}.`);
    } else if (isSimpleCalendarActive() && !hasMutationApi) {
      ui.notifications?.info("Injury saved. Simple Calendar API is not currently available in this session.");
    } else if (syncResult.synced) {
      ui.notifications?.info(`Injury saved and scheduled in Simple Calendar (${savedRecoveryDays} day recovery window).`);
    }
  } else {
    ui.notifications?.info("Injury saved. Calendar sync will be applied by the GM session.");
  }
}

function getInjuryReminderDayKey(timestamp = getCurrentWorldTimestamp()) {
  const api = getSimpleCalendarApi();
  if (isSimpleCalendarActive() && api?.timestampToDate) {
    try {
      const date = api.timestampToDate(timestamp);
      return `Y${Number(date?.year ?? 0)}-M${Number(date?.month ?? 0)}-D${Number(date?.day ?? 0)}`;
    } catch {
      // Fall through.
    }
  }
  return `D${Math.floor(Number(timestamp ?? 0) / 86400)}`;
}

async function notifyDailyInjuryReminders() {
  const dayKey = getInjuryReminderDayKey();
  const lastKey = String(game.settings.get(MODULE_ID, SETTINGS.INJURY_REMINDER_DAY) ?? "");
  if (dayKey === lastKey) return;

  const context = buildInjuryRecoveryContext();
  if (context.entries.length > 0) {
    const summary = context.entries
      .slice(0, 4)
      .map((entry) => `${entry.actorName}: ${entry.injuryName}${entry.permanent ? " (Permanent)" : ` (${entry.recoveryDays}d left)`}`)
      .join(" | ");
    const suffix = context.entries.length > 4 ? ` +${context.entries.length - 4} more` : "";
    ui.notifications?.warn(`Injury Reminder: ${summary}${suffix}`);
  }

  await game.settings.set(MODULE_ID, SETTINGS.INJURY_REMINDER_DAY, dayKey);
}

async function stabilizeInjuryEntry(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage injury recovery.");
    return;
  }
  const actorId = element?.dataset?.actorId;
  if (!actorId) return;
  const initial = getInjuryRecoveryState().injuries?.[actorId];
  if (!initial) return;
  if (initial.permanent) {
    ui.notifications?.warn("This injury is permanent and cannot be stabilized by kit treatment.");
    return;
  }

  const requiredCharges = Math.max(0, Number(initial.kitCharges ?? 1));
  const treatmentDc = Math.max(0, Number(initial.treatmentDc ?? 0));
  const treatmentSkill = String(initial.treatmentSkill ?? "");

  let consumedCharges = false;
  let insufficientCharges = false;
  await updateInjuryRecoveryState((state) => {
    if (!state.injuries?.[actorId]) return;
    if (!state.supplies) state.supplies = { healersKitCharges: 10 };
    const charges = Math.max(0, Number(state.supplies.healersKitCharges ?? state.supplies.stabilizationKits ?? 0));
    if (charges < requiredCharges) {
      insufficientCharges = true;
      return;
    }
    state.supplies.healersKitCharges = charges - requiredCharges;
    consumedCharges = true;
  });
  if (insufficientCharges) {
    ui.notifications?.warn("Not enough Healer's Kit charges for this treatment.");
    return;
  }

  const passedCheck = await rollTreatmentCheck(actorId, treatmentSkill, treatmentDc);
  if (!passedCheck) {
    if (consumedCharges) ui.notifications?.warn("Treatment attempt failed after consuming kit charges.");
    await updateInjuryRecoveryState((state) => {
      const entry = state.injuries?.[actorId];
      if (!entry) return;
      if (entry.canBecomePermanent && entry.injuryKey === "nerve-damage") {
        entry.permanent = true;
      }
    });
    await syncInjuryWithSimpleCalendar(actorId);
    return;
  }

  await updateInjuryRecoveryState((state) => {
    const entry = state.injuries?.[actorId];
    if (!entry) return;
    entry.stabilized = true;
    if (entry.injuryKey === "broken-arm" && entry.downgradeTo) {
      const nextDef = getInjuryDefinitionByKey(entry.downgradeTo);
      if (nextDef) {
        entry.injuryKey = nextDef.key;
        entry.injuryName = nextDef.label;
        entry.effect = nextDef.effect;
        entry.recoveryRule = nextDef.recovery;
        entry.kitCharges = Number(nextDef.kitCharges ?? 0);
        entry.treatmentDc = Number(nextDef.treatmentDc ?? 0);
        entry.treatmentSkill = String(nextDef.treatmentSkill ?? "");
      }
      entry.recoveryDays = Math.max(1, Math.ceil(Number(entry.recoveryDays ?? 0) / 2));
    }
  });

  ui.notifications?.info(`Treatment succeeded. ${requiredCharges} Healer's Kit charge(s) consumed.`);
  await syncInjuryWithSimpleCalendar(actorId);
}

async function clearInjuryEntry(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage injury recovery.");
    return;
  }
  const actorId = element?.dataset?.actorId;
  if (!actorId) return;
  const state = getInjuryRecoveryState();
  const calendarEntryId = String(state.injuries?.[actorId]?.calendarEntryId ?? "");
  await updateInjuryRecoveryState((state) => {
    if (!state.injuries) return;
    delete state.injuries[actorId];
  });
  if (calendarEntryId) {
    await clearInjuryFromSimpleCalendar(calendarEntryId);
  }
}

async function applyRecoveryCycle(options = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can manage injury recovery.");
    return { applied: false, total: 0, reason: "gm-only" };
  }
  const silent = Boolean(options?.silent);
  const suppressChat = Boolean(options?.suppressChat);
  const state = getInjuryRecoveryState();

  const entries = Object.entries(state.injuries ?? {});
  if (entries.length === 0) {
    if (!silent) ui.notifications?.info("No tracked injuries to process.");
    return { applied: false, total: 0, reason: "no-entries" };
  }

  const lines = [];
  const actorsToSync = new Set();
  const calendarEntriesToClear = [];

  await updateInjuryRecoveryState((mutable) => {
    if (!mutable.injuries) mutable.injuries = {};
    for (const [actorId, entry] of Object.entries(mutable.injuries)) {
      if (entry.permanent) {
        lines.push(`${game.actors.get(actorId)?.name ?? "Unknown"}: permanent condition`);
        continue;
      }

      const progress = entry.stabilized ? 2 : 1;
      const before = Math.max(0, Number(entry.recoveryDays ?? 0));
      const after = Math.max(0, before - progress);
      entry.recoveryDays = after;
      const actorName = game.actors.get(actorId)?.name ?? "Unknown";
      lines.push(`${actorName}: ${before}→${after} days (progress ${progress})`);

      if (after === 0 && entry.canBecomePermanent && !entry.stabilized) {
        entry.permanent = true;
        lines.push(`${actorName}: untreated condition became permanent.`);
      }

      if (after === 0) {
        if (entry.permanent) {
          entry.recoveryDueTs = getCurrentWorldTimestamp();
          actorsToSync.add(actorId);
          continue;
        }
        const calendarEntryId = String(entry.calendarEntryId ?? "");
        if (calendarEntryId) calendarEntriesToClear.push(calendarEntryId);
        delete mutable.injuries[actorId];
      } else {
        entry.recoveryDueTs = getCurrentWorldTimestamp() + (after * 86400);
        actorsToSync.add(actorId);
      }
    }
    mutable.lastCycleAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    mutable.lastCycleSummary = "Table-based recovery cycle applied";
  });

  const summary = lines.join("<br>");
  if (!suppressChat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
      content: `<p><strong>Recovery Cycle</strong></p><p>${summary}</p>`
    });
  }

  for (const entryId of calendarEntriesToClear) {
    await clearInjuryFromSimpleCalendar(entryId);
  }
  for (const actorId of actorsToSync) {
    await syncInjuryWithSimpleCalendar(actorId);
  }
  return {
    applied: true,
    total: entries.length,
    summary,
    syncedActors: actorsToSync.size,
    clearedCalendarEntries: calendarEntriesToClear.length
  };
}

async function showRecoveryBrief() {
  const context = buildInjuryRecoveryContext();
  const entryLines = context.entries
    .map((entry) => `<li>${entry.actorName}: ${entry.injuryName}${entry.injuryRoll ? ` (d100 ${entry.injuryRoll})` : ""} · ${entry.permanent ? "permanent" : `${entry.recoveryDays} day(s)`} · ${entry.stabilized ? "stabilized" : "unstable"}${entry.treatmentDc ? ` · DC ${entry.treatmentDc} ${entry.treatmentSkill === "ins" ? "Insight" : entry.treatmentSkill === "con" ? "CON" : "Medicine"}` : ""} · due ${entry.recoveryDueLabel}</li>`)
    .join("");
  const content = `
    <div class="po-help">
      <p><strong>Active Injuries:</strong> ${context.summary.activeInjuries}</p>
      <p><strong>Unstable:</strong> ${context.summary.unstableCount}</p>
      <p><strong>Permanent:</strong> ${context.summary.permanentCount}</p>
      <p><strong>Healer's Kit Charges:</strong> ${context.supplies.healersKitCharges}</p>
      <p><strong>Last Cycle:</strong> ${context.summary.lastCycleAt} (${context.summary.lastCycleSummary})</p>
      <ul>${entryLines || "<li>No active injuries.</li>"}</ul>
    </div>
  `;
  await Dialog.prompt({
    title: "Injury & Recovery Brief",
    content,
    rejectClose: false,
    callback: () => {}
  });
}

function getRestActivities() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.REST_ACTIVITIES);
  return foundry.utils.mergeObject(buildDefaultActivityState(), stored ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });
}

function buildActivityView(actor, activityState) {
  if (!activityState) activityState = {};
  const exhaustion = activityState.exhaustion ?? 0;
  const activity = activityState.activity ?? "rested";
  const spellSlots = activityState.spellSlots ?? {};
  const hitDice = activityState.hitDice ?? {};
  const activityOptions = [
    { value: "rested", label: "Rested" },
    { value: "light", label: "Light Activity" },
    { value: "heavy", label: "Heavy Activity" },
    { value: "strenuous", label: "Strenuous" }
  ].map((option) => ({
    ...option,
    selected: option.value === activity
  }));

  return {
    exhaustion,
    exhaustionLabel: getExhaustionLabel(exhaustion),
    activity,
    activityOptions,
    spellSlots,
    hitDice,
    maxExhaustion: 6
  };
}

function getExhaustionLabel(level) {
  const labels = ["Fine", "Disadvantage", "Half Speed", "No Action", "1 Action", "Unconscious"];
  return labels[Math.min(level, 6)] || "Fine";
}

function calculateLightSources(slots, campfire) {
  // Only campfire affects rest-watch visibility.
  if (!campfire) {
    return {
      hasTorch: false,
      hasLantern: false,
      hasCampfire: false,
      brightDistance: 0,
      dimDistance: 0
    };
  }

  return {
    hasTorch: false,
    hasLantern: false,
    hasCampfire: true,
    brightDistance: 20,
    dimDistance: 40
  };
}


function buildDefaultMarchingOrderState() {
  return {
    locked: false,
    lockedBy: "",
    lastUpdatedAt: "-",
    lastUpdatedBy: "-",
    formation: "default",
    ranks: {
      front: [],
      middle: [],
      rear: []
    },
    notes: {},
    gmNotes: "",
    light: {},
    doctrineTracker: {
      lastCheckAt: "-",
      lastCheckNote: "-"
    }
  };
}

function ensureDoctrineTracker(state) {
  if (!state.doctrineTracker || typeof state.doctrineTracker !== "object") {
    state.doctrineTracker = {
      lastCheckAt: "-",
      lastCheckNote: "-"
    };
  }
  if (typeof state.doctrineTracker.lastCheckAt !== "string") {
    state.doctrineTracker.lastCheckAt = "-";
  }
  if (typeof state.doctrineTracker.lastCheckNote !== "string") {
    state.doctrineTracker.lastCheckNote = "-";
  }
  return state.doctrineTracker;
}

function normalizeMarchingFormation(type) {
  const value = type ?? "default";
  const map = {
    standard: "default",
    "two-wide": "tight-corridor",
    "single-file": "low-visibility",
    wedge: "combat-ready",
    default: "default",
    "combat-ready": "combat-ready",
    "tight-corridor": "tight-corridor",
    "low-visibility": "low-visibility"
  };
  return map[value] ?? "default";
}

function getDoctrineEffects(formation) {
  const normalized = normalizeMarchingFormation(formation);
  switch (normalized) {
    case "combat-ready":
      return {
        surprise: "Improved first-contact readiness",
        ambush: "Reduced frontal ambush vulnerability"
      };
    case "tight-corridor":
      return {
        surprise: "Neutral surprise posture",
        ambush: "Reduced flank exposure in confined spaces"
      };
    case "low-visibility":
      return {
        surprise: "Improved stealth approach",
        ambush: "Higher rear compression risk if detected"
      };
    default:
      return {
        surprise: "Balanced readiness",
        ambush: "Balanced vulnerability"
      };
  }
}

function getDoctrineCheckPrompt(formation) {
  const normalized = normalizeMarchingFormation(formation);
  switch (normalized) {
    case "combat-ready":
      return "Combat-ready: grant advantage on first readiness check; reduce frontal ambush impact by one step.";
    case "tight-corridor":
      return "Tight corridor: reduce flank/split ambush exposure by one step in confined spaces.";
    case "low-visibility":
      return "Low-visibility: grant advantage on stealthy approach; if detected, increase rear-pressure risk by one step.";
    default:
      return "Default: no modifier by doctrine alone; resolve surprise and ambush from encounter context.";
  }
}

function getActiveActorForUser() {
  return game.user?.character ?? null;
}

function getOrderedMarchingActors(state) {
  const ordered = [
    ...(state.ranks?.front ?? []),
    ...(state.ranks?.middle ?? []),
    ...(state.ranks?.rear ?? [])
  ];
  return Array.from(new Set(ordered));
}

async function applyMarchingFormation({ front, middle, type }) {
  const state = getMarchingOrderState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Marching order is locked by the GM.");
    return;
  }
  const ordered = getOrderedMarchingActors(state);
  const frontCount = Math.max(0, front ?? 0);
  const middleCount = Math.max(0, middle ?? 0);
  const frontActors = ordered.slice(0, frontCount);
  const middleActors = ordered.slice(frontCount, frontCount + middleCount);
  const rearActors = ordered.slice(frontCount + middleCount);
  const nextFormation = normalizeMarchingFormation(type ?? state.formation ?? "default");

  await updateMarchingOrderState((state) => {
    state.formation = nextFormation;
    state.ranks = {
      front: frontActors,
      middle: middleActors,
      rear: rearActors
    };
  });
}

async function updateRestWatchState(mutatorOrRequest, options = {}) {
  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "rest:mutate",
      userId: game.user.id,
      request: mutatorOrRequest
    });
    // Refresh immediately for player to avoid stale lag
    refreshOpenApps();
    return;
  }
  const state = getRestWatchState();
  if (typeof mutatorOrRequest === "function") {
    mutatorOrRequest(state);
  } else {
    await applyRestRequest(mutatorOrRequest, game.user.id);
    return;
  }
  stampUpdate(state);
  if (options.skipLocalRefresh) suppressNextSettingRefresh(`${MODULE_ID}.${SETTINGS.REST_STATE}`);
  await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, state);
  scheduleIntegrationSync("rest-watch");
  if (!options.skipLocalRefresh) refreshOpenApps();
  emitSocketRefresh();
}

async function updateMarchingOrderState(mutatorOrRequest, options = {}) {
  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "march:mutate",
      userId: game.user.id,
      request: mutatorOrRequest
    });
    // Refresh immediately for player to avoid stale lag
    refreshOpenApps();
    return;
  }
  const state = getMarchingOrderState();
  if (typeof mutatorOrRequest === "function") {
    mutatorOrRequest(state);
  } else {
    await applyMarchRequest(mutatorOrRequest, game.user.id);
    return;
  }
  stampUpdate(state);
  if (options.skipLocalRefresh) suppressNextSettingRefresh(`${MODULE_ID}.${SETTINGS.MARCH_STATE}`);
  await game.settings.set(MODULE_ID, SETTINGS.MARCH_STATE, state);
  scheduleIntegrationSync("marching-order");
  if (!options.skipLocalRefresh) refreshOpenApps();
  emitSocketRefresh();
}

function stampUpdate(state, user = game.user) {
  state.lastUpdatedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  state.lastUpdatedBy = user?.name ?? "-";
}

async function assignSlotToUser(element) {
  const state = getRestWatchState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Rest watch is locked by the GM.");
    return;
  }
  const actor = getActiveActorForUser();
  if (!actor) {
    ui.notifications?.warn("No assigned character for this user.");
    return;
  }
  
  if (!game.user.isGM) {
    const slotId = element?.closest(".po-card")?.dataset?.slotId;
    const clicked = state.slots.find((s) => s.id === slotId);
    const clickedHasEntries = (clicked?.entries?.length ?? 0) > 0 || Boolean(clicked?.actorId);
    const targetSlotId = (clicked && !clickedHasEntries)
      ? clicked.id
      : state.slots.find((s) => (s.entries?.length ?? 0) === 0 && !s.actorId)?.id;
    if (!targetSlotId) {
      ui.notifications?.warn("All rest watch slots are full.");
      return;
    }
    // Warn if we're redirecting from a filled slot
    if (clicked && clickedHasEntries && targetSlotId !== clicked.id) {
      ui.notifications?.info("That slot is already taken; assigning you to the next available slot.");
    }
    await updateRestWatchState({ op: "assignMe", slotId: targetSlotId, actorId: actor.id });
    return;
  }
  const slotId = element?.closest(".po-card")?.dataset?.slotId;
  if (!slotId) return;
  await updateRestWatchState((state) => {
    const slot = state.slots.find((entry) => entry.id === slotId);
    if (!slot) return;
    if (!slot.entries && slot.actorId) {
      slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
      slot.actorId = null;
      slot.notes = "";
    }
    slot.entries = [{ actorId: actor.id, notes: "" }];
    slot.actorId = null;
    slot.notes = "";
  });
}

async function assignSlotByPicker(element) {
  const slotId = element?.closest(".po-card")?.dataset?.slotId;
  if (!slotId) return;
  const actors = game.actors.contents.slice().sort((a, b) => {
    // Priority 1: Character type (PCs)
    const aIsPC = a.type === "character" ? 0 : 1;
    const bIsPC = b.type === "character" ? 0 : 1;
    if (aIsPC !== bIsPC) return aIsPC - bIsPC;
    // Priority 2: Player owner
    const aOwned = a.hasPlayerOwner ? 0 : 1;
    const bOwned = b.hasPlayerOwner ? 0 : 1;
    if (aOwned !== bOwned) return aOwned - bOwned;
    // Priority 3: Name
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
  const options = actors.map((actor) =>
    `<option value="${actor.id}">${actor.name}</option>`
  );
  const content = `<div class="form-group"><label>Actor</label><select name="actorId">${options.join("")}</select></div>`;
  const dialog = new Dialog({
    title: "Assign Actor",
    content,
    buttons: {
      assign: {
        label: "Assign",
        callback: async (html) => {
          const actorId = html.find("select[name=actorId]").val();
          if (!actorId) return;
          await updateRestWatchState((state) => {
            const slot = state.slots.find((entry) => entry.id === slotId);
            if (!slot) return;
            // Migrate old format
            if (!slot.entries && slot.actorId) {
              slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
              slot.actorId = null;
              slot.notes = "";
            }
            if (!slot.entries) slot.entries = [];
            // Add new entry
            slot.entries.push({ actorId, notes: "" });
            slot.actorId = null;
            slot.notes = "";
          });
          if (game.user.isGM) refreshOpenApps();
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "assign"
  });
  dialog.render(true);
}

async function clearSlotEntry(element) {
  const state = getRestWatchState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Rest watch is locked by the GM.");
    return;
  }
  const card = element?.closest(".po-card");
  const slotId = card?.dataset?.slotId;
  const actorId = element?.closest(".po-watch-entry")?.dataset?.actorId;
  if (!slotId || !actorId) return;
  
  if (!game.user.isGM) {
    await updateRestWatchState({ op: "clearEntry", slotId, actorId });
    return;
  }
  
  await updateRestWatchState((state) => {
    const slot = state.slots.find((entry) => entry.id === slotId);
    if (!slot) return;
    // Migrate old format
    if (!slot.entries && slot.actorId) {
      slot.entries = [];
      slot.actorId = null;
      slot.notes = "";
      return;
    }
    if (!slot.entries) slot.entries = [];
    slot.entries = slot.entries.filter((entry) => entry.actorId !== actorId);
    if (slot.entries.length === 0) {
      slot.actorId = null;
      slot.notes = "";
    }
  });
}

async function swapSlots(element) {
  const state = getRestWatchState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Rest watch is locked by the GM.");
    return;
  }
  const slotId = element?.closest(".po-card")?.dataset?.slotId;
  if (!slotId) return;

  const otherOptions = state.slots
    .filter((s) => s.id !== slotId)
    .map((s) => {
      const entryCount = s.entries?.length ?? 0;
      const label = entryCount > 0 ? ` (${entryCount} assigned)` : "";
      return `<option value="${s.id}">Slot ${s.id.replace("watch-", "")}${label}</option>`;
    })
    .join("");

  const content = `<div class="form-group"><label>Swap with:</label><select name="targetSlotId">${otherOptions}</select></div>`;
  const dialog = new Dialog({
    title: "Swap Slots",
    content,
    buttons: {
      swap: {
        label: "Swap",
        callback: async (html) => {
          const targetSlotId = html.find("select[name=targetSlotId]").val();
          if (!targetSlotId) return;
          await updateRestWatchState((state) => {
            const slot1 = state.slots.find((s) => s.id === slotId);
            const slot2 = state.slots.find((s) => s.id === targetSlotId);
            if (!slot1 || !slot2) return;
            // Migrate old format for both slots
            if (!slot1.entries && slot1.actorId) {
              slot1.entries = [{ actorId: slot1.actorId, notes: slot1.notes ?? "" }];
              slot1.actorId = null;
              slot1.notes = "";
            }
            if (!slot2.entries && slot2.actorId) {
              slot2.entries = [{ actorId: slot2.actorId, notes: slot2.notes ?? "" }];
              slot2.actorId = null;
              slot2.notes = "";
            }
            if (!slot1.entries) slot1.entries = [];
            if (!slot2.entries) slot2.entries = [];
            [slot1.entries, slot2.entries] = [slot2.entries, slot1.entries];
          });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "swap"
  });
  dialog.render(true);
}

async function toggleRestLock(element) {
  const checked = element?.checked ?? element?.querySelector?.("input")?.checked;
  await updateRestWatchState((state) => {
    state.locked = Boolean(checked);
    state.lockedBy = state.locked ? (game.user?.name ?? "GM") : "";
  });
}

async function updateVisibility(element) {
  const value = element?.value ?? element?.querySelector?.("select")?.value;
  if (!value) return;
  await updateRestWatchState((state) => {
    state.visibility = value;
  });
}

async function updateTimeRange(element) {
  if (!game.user.isGM) return; // GM only
  const slotId = element?.dataset?.slotId;
  const timeRange = element?.value ?? "";
  if (!slotId) return;
  await updateRestWatchState((state) => {
    const slot = state.slots.find((s) => s.id === slotId);
    if (!slot) return;
    slot.timeRange = timeRange;
  });
}

async function autofillFromParty() {
  const state = getRestWatchState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Rest watch is locked by the GM.");
    return;
  }
  const actors = game.actors.contents.filter((actor) => {
    if (actor.hasPlayerOwner) return true;
    const folderName = actor.folder?.name ?? "";
    return folderName.toLowerCase().includes("hireling");
  });
  await updateRestWatchState((state) => {
    // Distribute actors among slots, one per slot
    state.slots.forEach((slot, index) => {
      // Migrate old format
      if (!slot.entries && slot.actorId) {
        slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
        slot.actorId = null;
        slot.notes = "";
      }
      if (!slot.entries) slot.entries = [];
      // Assign one actor per slot
      if (actors[index]) {
        slot.entries = [{ actorId: actors[index].id, notes: "" }];
      } else {
        slot.entries = [];
      }
    });
  });
}

async function restoreRestCommitted() {
  const committed = game.settings.get(MODULE_ID, SETTINGS.REST_COMMITTED) ?? buildDefaultRestWatchState();
  await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, foundry.utils.deepClone(committed));
  refreshOpenApps();        // ensures local refresh even if socket doesn't echo back
  emitSocketRefresh();
}

async function commitRestWatchState() {
  const state = getRestWatchState();
  await game.settings.set(MODULE_ID, SETTINGS.REST_COMMITTED, foundry.utils.deepClone(state));
  ui.notifications?.info("Rest watch snapshot saved.");
}

async function writeClipboardText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    if (foundry?.utils?.copyToClipboard) {
      foundry.utils.copyToClipboard(text);
      return true;
    }
    throw err;
  }
}

async function copyRestWatchText(asMarkdown) {
  const state = getRestWatchState();
  const isGM = game.user.isGM;
  let text = "";

  if (asMarkdown && isGM) {
    const rows = [];
    state.slots.forEach((slot, index) => {
      const entries = slot.entries ?? [];
      const timeRange = slot.timeRange || "-";
      if (entries.length === 0) {
        rows.push(`| ${index + 1} | (empty) | - | ${timeRange} | - |`);
      } else {
        entries.forEach((entry) => {
          const actor = game.actors.get(entry.actorId);
          const name = actor?.name ?? "(unknown)";
          const pp = actor ? getPassive(actor, "prc") ?? "-" : "-";
          const notes = entry.notes ? `${entry.notes.substring(0, 30)}...` : "-";
          rows.push(`| ${index + 1} | ${name} | ${pp} | ${timeRange} | ${notes} |`);
        });
      }
    });
    text = `| Watch | Actor | PP | Time | Notes |\n| --- | --- | --- | --- | --- |\n${rows.join("\n")}`;
  } else {
    const lines = [];
    state.slots.forEach((slot, index) => {
      const entries = slot.entries ?? [];
      const label = `Watch ${index + 1}`;
      if (entries.length === 0) {
        lines.push(asMarkdown ? `| ${label} | (empty) |` : `${label}: (empty)`);
      } else {
        entries.forEach((entry) => {
          const actor = game.actors.get(entry.actorId);
          const name = actor?.name ?? "(unknown)";
          lines.push(asMarkdown ? `| ${label} | ${name} |` : `${label}: ${name}`);
        });
      }
    });
    text = asMarkdown
      ? `| Slot | Actor |\n| --- | --- |\n${lines.join("\n")}`
      : lines.join("\n");
  }

  try {
    await writeClipboardText(text);
    ui.notifications?.info("Copied to clipboard.");
  } catch (err) {
    console.warn("Clipboard write failed:", err);
    ui.notifications?.warn("Failed to copy to clipboard. Check browser permissions.");
  }
}

async function clearRestWatchAll() {
  const state = getRestWatchState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Rest watch is locked by the GM.");
    return;
  }
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can clear all.");
    return;
  }
  const confirmed = await Dialog.confirm({
    title: "Clear Rest Watch",
    content: "<p>Clear all rest watch slots?</p>"
  });
  if (!confirmed) return;
  await updateRestWatchState((state) => {
    state.slots = buildStoredWatchSlots();
  });
}

function showMarchingHelp() {
  const content = `
  <div class="po-help">
    <p><strong>Purpose:</strong> Defines the party's physical formation while traveling or exploring.</p>
    <p><strong>Authority:</strong> GM assigns and removes actors from ranks. Players can view when opened by the GM.</p>
    <ul>
      <li><strong>Front:</strong> First to encounter threats.</li>
      <li><strong>Middle:</strong> Partially protected support.</li>
      <li><strong>Rear:</strong> Last engaged, rear guard.</li>
      <li><strong>Lock:</strong> Prevents rank changes.</li>
      <li><strong>Formations:</strong> Change how ranks are interpreted.</li>
      <li><strong>Light:</strong> Track visible light sources per rank.</li>
    </ul>
  </div>`;

  new Dialog({
    title: "Party Operations - Marching Order",
    content,
    buttons: { ok: { label: "OK" } },
    default: "ok"
  }).render(true);
}

async function runDoctrineCheckPrompt() {
  if (!game.user.isGM) return;
  const state = getMarchingOrderState();
  const formation = normalizeMarchingFormation(state.formation ?? "default");
  const effects = getDoctrineEffects(formation);
  const note = getDoctrineCheckPrompt(formation);

  await updateMarchingOrderState((state) => {
    const tracker = ensureDoctrineTracker(state);
    tracker.lastCheckAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    tracker.lastCheckNote = note;
  });

  const labelMap = {
    default: "Default Formation",
    "combat-ready": "Combat-Ready Formation",
    "tight-corridor": "Tight Corridor Formation",
    "low-visibility": "Low-Visibility Formation"
  };

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `
      <p><strong>Doctrine Check Prompt</strong></p>
      <p><strong>Formation:</strong> ${labelMap[formation] ?? labelMap.default}</p>
      <p><strong>Surprise Posture:</strong> ${effects.surprise}</p>
      <p><strong>Ambush Exposure:</strong> ${effects.ambush}</p>
      <p><em>${note}</em></p>
    `
  });
}

function refreshSingleAppPreservingView(app) {
  if (!app?.render) return;
  const uiState = captureUiState(app);
  if (uiState) pendingUiRestore.set(app, uiState);
  const scrollState = captureScrollState(app);
  if (scrollState.length > 0) pendingScrollRestore.set(app, scrollState);
  const windowState = captureWindowState(app);
  if (windowState) pendingWindowRestore.set(app, windowState);
  app.render({ force: true, parts: ["main"] });
}

function moveActorEntryToRankDom(rankId, actorId) {
  const root = getAppRootElement(marchingOrderAppInstance);
  if (!root) return false;
  const targetEntries = root.querySelector(`.po-rank-col[data-rank-id="${rankId}"] .po-rank-entries`);
  if (!targetEntries) return false;

  const entry = root.querySelector(`.po-entry[data-actor-id="${actorId}"]`);
  if (!entry) return false;

  targetEntries.appendChild(entry);

  root.querySelectorAll(".po-rank-col .po-rank-entries").forEach((container) => {
    const hasEntries = Boolean(container.querySelector(".po-entry"));
    const emptyState = container.querySelector(".po-rank-empty");
    if (!emptyState) return;
    emptyState.style.display = hasEntries ? "none" : "";
  });

  return true;
}

async function assignActorToRank(element) {
  if (!game.user.isGM) return;
  const state = getMarchingOrderState();
  if (isLockedForUser(state, true)) {
    ui.notifications?.warn("Marching order is locked by the GM.");
    return;
  }
  const rankId = element?.dataset?.rankId;
  if (!rankId) return;

  const actors = game.actors.contents.filter((actor) => actor.hasPlayerOwner);
  const options = actors.map((actor) =>
    `<option value="${actor.id}">${actor.name}</option>`
  );
  const content = `<div class="form-group"><label>Actor</label><select name="actorId">${options.join("")}</select></div>`;
  const dialog = new Dialog({
    title: `Assign Actor - ${rankId}`,
    content,
    buttons: {
      assign: {
        label: "Assign",
        callback: async (html) => {
          const actorId = html.find("select[name=actorId]").val();
          if (!actorId) return;
          await updateMarchingOrderState((state) => {
            for (const key of Object.keys(state.ranks)) {
              state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== actorId);
            }
            if (!state.ranks[rankId]) state.ranks[rankId] = [];
            state.ranks[rankId].push(actorId);
          }, { skipLocalRefresh: true });

          const moved = moveActorEntryToRankDom(rankId, actorId);
          if (!moved) {
            refreshSingleAppPreservingView(marchingOrderAppInstance);
          }
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "assign"
  });
  dialog.render(true);
}

async function removeActorFromRanks(element) {
  if (!game.user.isGM) return;
  const state = getMarchingOrderState();
  if (isLockedForUser(state, true)) {
    ui.notifications?.warn("Marching order is locked by the GM.");
    return;
  }
  const actorId = element?.dataset?.actorId;
  if (!actorId) return;

  await updateMarchingOrderState((state) => {
    for (const key of Object.keys(state.ranks)) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== actorId);
    }
    if (state.notes) delete state.notes[actorId];
    if (state.light) delete state.light[actorId];
  });
}

async function joinRank(element) {
  const state = getMarchingOrderState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Marching order is locked by the GM.");
    return;
  }
  let rankId = element?.closest(".po-rank-col")?.dataset?.rankId;
  
  // If not clicked on a rank, default to middle
  if (!rankId) {
    rankId = "middle";
  }
  
  const actor = getActiveActorForUser();
  if (!actor) {
    ui.notifications?.warn("No assigned character for this user.");
    return;
  }
  
  if (!game.user.isGM) {
    await updateMarchingOrderState({ op: "joinRank", rankId, actorId: actor.id });
    return;
  }
  await updateMarchingOrderState((state) => {
    for (const key of Object.keys(state.ranks)) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== actor.id);
    }
    if (!state.ranks[rankId]) state.ranks[rankId] = [];
    state.ranks[rankId].push(actor.id);
  });
}

async function toggleMarchLock(element) {
  const checked = element?.checked ?? element?.querySelector?.("input")?.checked;
  await updateMarchingOrderState((state) => {
    state.locked = Boolean(checked);
    state.lockedBy = state.locked ? (game.user?.name ?? "GM") : "";
  });
}

async function toggleLight(element) {
  const actorId = element?.closest("[data-actor-id]")?.dataset?.actorId;
  const checked = element?.checked ?? element?.querySelector?.("input")?.checked;
  if (!actorId) return;
  await updateMarchingOrderState((state) => {
    if (!state.light) state.light = {};
    state.light[actorId] = Boolean(checked);
  });
}

async function copyMarchingText(asMarkdown) {
  const state = getMarchingOrderState();
  const lines = Object.entries(state.ranks).map(([rank, actorIds]) => {
    const names = (actorIds ?? []).map((actorId) => game.actors.get(actorId)?.name ?? "(missing)");
    const label = rank.charAt(0).toUpperCase() + rank.slice(1);
    if (asMarkdown) return `| ${label} | ${names.join(", ") || "-"} |`;
    return `${label}: ${names.join(", ") || "-"}`;
  });
  const text = asMarkdown
    ? `| Rank | Actors |\n| --- | --- |\n${lines.join("\n")}`
    : lines.join("\n");
  try {
    await writeClipboardText(text);
    ui.notifications?.info("Copied to clipboard.");
  } catch (err) {
    console.warn("Clipboard write failed:", err);
    ui.notifications?.warn("Failed to copy to clipboard. Check browser permissions.");
  }
}

async function clearMarchingAll() {
  const state = getMarchingOrderState();
  if (isLockedForUser(state, game.user.isGM)) {
    ui.notifications?.warn("Marching order is locked by the GM.");
    return;
  }
  const confirmed = await Dialog.confirm({
    title: "Clear Marching Order",
    content: "<p>Clear all marching order entries?</p>"
  });
  if (!confirmed) return;
  await updateMarchingOrderState((state) => {
    state.ranks = { front: [], middle: [], rear: [] };
    state.notes = {};
    state.light = {};
    state.gmNotes = "";
  });
}

async function commitMarchingOrderState() {
  const state = getMarchingOrderState();
  await game.settings.set(MODULE_ID, SETTINGS.MARCH_COMMITTED, foundry.utils.deepClone(state));
  ui.notifications?.info("Marching order snapshot saved.");
}

function toggleNotesDrawer(element) {
  const root = element?.closest(".po-window");
  const drawer = root?.querySelector(".po-notes-drawer");
  if (!drawer) return;
  const isOpen = drawer.classList.toggle("is-open");
  const actorId = element?.closest(".po-entry")?.dataset?.actorId;
  if (isOpen && actorId) {
    const row = drawer.querySelector(`[data-actor-id="${actorId}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }
}

async function pingActorFromElement(element) {
  const actorId = element?.closest("[data-actor-id], .po-card")?.dataset?.actorId;
  const actor = actorId ? game.actors.get(actorId) : null;
  if (!actor) return;
  const token = actor.getActiveTokens?.(true, true)?.[0];
  if (!token) {
    ui.notifications?.warn(`${actor.name} has no active token on this scene.`);
    return;
  }
  const center = token?.center ?? token?.object?.center;
  if (!center || !canvas?.ping) return;
  canvas.ping(center, { pingType: "pulse" });
}

function canUserOpenActorSheet(actor, user = game.user) {
  if (!actor || !user) return false;
  if (user.isGM) return true;
  return Boolean(actor.testUserPermission?.(user, "OBSERVER") || actor.isOwner);
}

function openActorSheetFromElement(element) {
  const actorId = element?.closest("[data-actor-id], .po-card")?.dataset?.actorId;
  const actor = actorId ? game.actors.get(actorId) : null;
  if (!actor) return;
  if (!canUserOpenActorSheet(actor)) {
    ui.notifications?.warn(`You do not have permission to open ${actor.name}.`);
    return;
  }
  actor.sheet?.render(true);
}

function getRestWatchState() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.REST_STATE);
  return foundry.utils.mergeObject(buildDefaultRestWatchState(), stored ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });
}

function getMarchingOrderState() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.MARCH_STATE);
  return foundry.utils.mergeObject(buildDefaultMarchingOrderState(), stored ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true
  });
}

function buildVisibilityOptions(current) {
  return [
    { value: "names-only", label: "Names only", selected: current === "names-only" },
    {
      value: "names-passives",
      label: "Names + passives",
      selected: current === "names-passives"
    },
    {
      value: "names-passives-notes",
      label: "Names + passives + notes",
      selected: current === "names-passives-notes"
    }
  ];
}

function buildPlayerCharacterSelector(slots) {
  // Find all unique actors in the watch slots that belong to the current player
  const uniqueActorIds = new Set();
  slots.forEach((slot) => {
    (slot.entries ?? []).forEach((entry) => {
      const actor = game.actors.get(entry.actorId);
      if (actor && userOwnsActor(actor)) {
        uniqueActorIds.add(entry.actorId);
      }
    });
  });

  if (uniqueActorIds.size <= 1) return []; // Only show selector if 2+ characters

  const activeActorId = getActiveCharacterId();
  const characters = Array.from(uniqueActorIds)
    .map((actorId) => {
      const actor = game.actors.get(actorId);
      return {
        id: actorId,
        name: actor?.name ?? "Unknown",
        img: actor?.img ?? "",
        isActive: actorId === activeActorId
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return characters;
}

function getActiveCharacterId() {
  // Check if user has a stored active character, otherwise use their current character
  const stored = sessionStorage.getItem(`po-active-char-${game.user.id}`);
  if (stored) return stored;
  return game.user.character?.id ?? null;
}

function setActiveCharacterId(actorId) {
  sessionStorage.setItem(`po-active-char-${game.user.id}`, actorId);
  // Also set as the user's active character
  if (actorId) {
    game.user.update({ character: actorId });
  }
}

async function switchActiveCharacter(element) {
  const actorId = element?.dataset?.actorId;
  if (!actorId) return;
  setActiveCharacterId(actorId);
  // Re-render to update the selector highlight and context
  const apps = Object.values(ui.windows).filter((app) =>
    app instanceof RestWatchApp || app instanceof RestWatchPlayerApp
  );
  for (const app of apps) {
    const uiState = captureUiState(app);
    if (uiState) pendingUiRestore.set(app, uiState);
    const state = captureScrollState(app);
    if (state.length > 0) pendingScrollRestore.set(app, state);
    const windowState = captureWindowState(app);
    if (windowState) pendingWindowRestore.set(app, windowState);
    app.render({ force: true });
  }
}

async function updateExhaustion(element) {
  if (!game.user.isGM) return; // GM only
  const actorId = element?.dataset?.actorId;
  const level = parseInt(element?.dataset?.level) ?? 0;
  if (!actorId) return;

  const activities = getRestActivities();
  if (!activities.activities[actorId]) activities.activities[actorId] = {};
  activities.activities[actorId].exhaustion = level;

  await game.settings.set(MODULE_ID, SETTINGS.REST_ACTIVITIES, activities);
  refreshOpenApps();
  emitSocketRefresh();
}

async function updateActivity(element, options = {}) {
  const actorId = element?.dataset?.actorId;
  const activityType = element?.value ?? element?.dataset?.activity;
  if (!actorId || !activityType) return;

  if (game.user.isGM) {
    // GM updates directly
    const activities = getRestActivities();
    if (!activities.activities[actorId]) activities.activities[actorId] = {};
    activities.activities[actorId].activity = activityType;
    if (options.skipLocalRefresh) suppressNextSettingRefresh(`${MODULE_ID}.${SETTINGS.REST_ACTIVITIES}`);
    await game.settings.set(MODULE_ID, SETTINGS.REST_ACTIVITIES, activities);
    if (!options.skipLocalRefresh) refreshOpenApps();
    emitSocketRefresh();
  } else {
    // Player updates their own activity via socket (non-GMs can't modify world settings)
    game.socket.emit(SOCKET_CHANNEL, {
      type: "activity:update",
      userId: game.user.id,
      actorId,
      activity: activityType
    });
    if (!options.skipLocalRefresh) refreshOpenApps();
  }
}

async function resetAllActivities() {
  if (!game.user.isGM) return; // GM only
  const confirmed = await Dialog.confirm({
    title: "Reset Activities for New Day",
    content: "<p>This will reset all party members' exhaustion levels to 0 and activities to 'Rested'.</p><p><strong>This action cannot be undone.</strong></p>",
    yes: () => true,
    no: () => false
  });
  if (!confirmed) return;
  const state = getRestWatchState();
  const activities = buildDefaultActivityState();
  const actorIds = Array.from(new Set(
    (state.slots ?? []).flatMap((slot) => {
      const entries = slot.entries ?? [];
      const entryIds = entries.map((entry) => entry.actorId);
      return slot.actorId ? entryIds.concat([slot.actorId]) : entryIds;
    })
  ));

  actorIds.forEach((actorId) => {
    activities.activities[actorId] = {
      exhaustion: 0,
      activity: "rested"
    };
  });

  await game.settings.set(MODULE_ID, SETTINGS.REST_ACTIVITIES, activities);

  for (const actorId of actorIds) {
    const actor = game.actors.get(actorId);
    if (!actor) continue;
    try {
      const exhaustion = actor.system?.attributes?.exhaustion;
      if (exhaustion && typeof exhaustion === "object" && "value" in exhaustion) {
        await actor.update({ "system.attributes.exhaustion.value": 0 });
      } else if (exhaustion !== undefined) {
        await actor.update({ "system.attributes.exhaustion": 0 });
      }
    } catch (error) {
      console.warn(`party-operations: failed to reset exhaustion for ${actorId}`, error);
    }
  }

  ui.notifications?.info("Activities reset for new day.");
  refreshOpenApps();
  emitSocketRefresh();
}



function buildWatchSlotsView(state, isGM, visibility) {
  const lockedForUser = isLockedForUser(state, isGM);
  const activeActorId = !isGM ? getActiveCharacterId() : null;
  const activities = getRestActivities();
  
  return state.slots.map((slot, index) => {
    // Migrate old format: if slot has actorId, convert to entries
    let entries = slot.entries ?? [];
    if (slot.actorId && entries.length === 0) {
      entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
    }
    
    const entriesView = entries.map((entry) => {
      const actor = game.actors.get(entry.actorId);
      if (!actor) return null;
      const canEditNotes = isGM || userOwnsActor(actor);
      const activityData = activities.activities[entry.actorId] ?? {};
      return {
        actorId: entry.actorId,
        actor: buildActorView(actor, isGM, visibility),
        notes: entry.notes ?? "",
        canClear: (isGM || userOwnsActor(actor)) && !lockedForUser,
        canEditNotes: canEditNotes && !lockedForUser,
        isActiveCharacter: !isGM && activeActorId === entry.actorId,
        activity: buildActivityView(actor, activityData)
      };
    }).filter(Boolean);

    const slotHighestPP = computeHighestPPForEntries(entriesView);
    const slotNoDarkvision = computeNoDarkvisionForEntries(entriesView);

    return {
      id: slot.id ?? `watch-${index + 1}`,
      label: `Watch ${index + 1}`,
      timeRange: slot.timeRange ?? "",
      entries: entriesView,
      hasEntries: entriesView.length > 0,
      slotHighestPP,
      slotNoDarkvision,
      canAssign: isGM,
      canAssignMe: !isGM && !lockedForUser
    };
  });
}

function buildRanksView(state, isGM) {
  const lockedForUser = isLockedForUser(state, isGM);
  const formation = normalizeMarchingFormation(state.formation ?? "default");
  const defaultLightSpec = "Torch/Light active: Bright 20 ft, Dim 40 ft.";
  
  // Get formation-based capacity
  const getFormationCapacity = (rankId) => {
    switch (formation) {
      case "default":
        return rankId === "front" ? 2 : rankId === "middle" ? 3 : null;
      case "combat-ready":
        return rankId === "front" ? 2 : rankId === "middle" ? 2 : null;
      case "tight-corridor":
        return rankId === "front" ? 2 : rankId === "middle" ? 2 : null;
      case "low-visibility":
        return rankId === "front" ? 1 : rankId === "middle" ? 1 : null;
      default:
        return rankId === "front" ? 2 : rankId === "middle" ? 3 : null;
    }
  };

  const rankConfigs = {
    front: { capacity: getFormationCapacity("front"), desc: "First to engage", icon: "fa-shield" },
    middle: { capacity: getFormationCapacity("middle"), desc: "Support & balance", icon: "fa-users" },
    rear: { capacity: null, desc: "Rear guard", icon: "fa-arrow-turn-up" }
  };

  const base = buildEmptyRanks(isGM).map((rank) => {
    const config = rankConfigs[rank.id];
    const actorIds = state.ranks?.[rank.id] ?? [];
    const entries = actorIds
      .map((actorId) => {
        const actor = game.actors.get(actorId);
        if (!actor) return null;
        const hasLight = Boolean(state.light?.[actorId]);
        const lightTooltip = hasLight
          ? String(state.lightSpec?.[actorId] ?? "").trim() || defaultLightSpec
          : "";
        const canEditNote = (isGM || userOwnsActor(actor)) && !lockedForUser;
        return {
          actorId,
          actor: buildActorView(actor, isGM, "names-passives"),
          hasLight,
          lightTooltip,
          notes: state.notes?.[actorId] ?? "",
          canEditNote
        };
      })
      .filter(Boolean);

    const capacity = config?.capacity;
    const capacityPercent = capacity ? Math.min(100, (entries.length / capacity) * 100) : 0;
    const rankSectionUi = buildMarchSectionUi(`rank-${rank.id}`);

    return {
      ...rank,
      ...config,
      entries,
      capacity,
      capacityPercent,
      collapsed: rankSectionUi.collapsed,
      toggleLabel: rankSectionUi.toggleLabel,
      toggleIcon: rankSectionUi.toggleIcon
    };
  });

  return base;
}

function buildNotesView(state, ranks, isGM) {
  const actorIds = ranks.flatMap((rank) => rank.entries.map((entry) => entry.actorId));
  const uniqueIds = Array.from(new Set(actorIds));
  return uniqueIds
    .map((actorId) => {
      const actor = game.actors.get(actorId);
      if (!actor) return null;
      const canEdit = isGM || userOwnsActor(actor);
      if (!isGM && !canEdit) return null;
      return {
        actorId,
        actorName: actor.name,
        text: state.notes?.[actorId] ?? "",
        canEdit
      };
    })
    .filter(Boolean);
}

function buildLightToggles(state, ranks, isGM) {
  if (!isGM) return [];
  const actorIds = ranks.flatMap((rank) => rank.entries.map((entry) => entry.actorId));
  const uniqueIds = Array.from(new Set(actorIds));
  return uniqueIds
    .map((actorId) => {
      const actor = game.actors.get(actorId);
      if (!actor) return null;
      return {
        actorId,
        actorName: actor.name,
        hasLight: Boolean(state.light?.[actorId])
      };
    })
    .filter(Boolean);
}

function getActorTokenImage(actor) {
  return actor?.prototypeToken?.texture?.src || actor?.img || "icons/svg/mystery-man.svg";
}

function formatClockLabel(hours24, minutes) {
  const hh = String(Math.max(0, Math.min(23, Number(hours24) || 0))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, Number(minutes) || 0))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isSimpleCalendarActive() {
  return Boolean(game.modules.get("foundryvtt-simple-calendar")?.active || game.modules.get("simple-calendar")?.active);
}

function getSimpleCalendarApiCandidates() {
  const moduleApi = game.modules.get("foundryvtt-simple-calendar")?.api ?? game.modules.get("simple-calendar")?.api ?? null;
  const rawCandidates = [
    globalThis.SimpleCalendar?.api,
    globalThis.SimpleCalendar,
    game?.simpleCalendar?.api,
    game?.simpleCalendar,
    moduleApi
  ];
  const unique = [];
  const seen = new Set();
  for (const candidate of rawCandidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    unique.push(candidate);
  }
  return unique;
}

function getSimpleCalendarApi() {
  const candidates = getSimpleCalendarApiCandidates();
  if (!candidates.length) return null;
  return candidates.find((api) => typeof api?.timestampToDate === "function") ?? candidates[0];
}

function hasKnownSimpleCalendarMutationMethods(api) {
  if (!api || typeof api !== "object") return false;
  return [
    api.addEvent,
    api.createEvent,
    api.addNote,
    api.createNote,
    api.addCalendarNote,
    api.updateEvent,
    api.updateNote,
    api.updateEntry,
    api.removeEvent,
    api.deleteEvent,
    api.removeNote,
    api.deleteNote,
    api.removeEntry
  ].some((fn) => typeof fn === "function");
}

function getSimpleCalendarMutationApi() {
  const candidates = getSimpleCalendarApiCandidates();
  if (!candidates.length) return null;
  const known = candidates.find((api) => hasKnownSimpleCalendarMutationMethods(api));
  if (known) return known;
  const discovered = candidates.find((api) => hasSimpleCalendarMutationApi(api));
  return discovered ?? null;
}

function collectSimpleCalendarMethods(source, test, prefix = "api", depth = 0, seen = new Set()) {
  if (!source || typeof source !== "object" || depth > 2) return [];
  const methods = [];
  for (const [key, value] of Object.entries(source)) {
    const path = `${prefix}.${key}`;
    if (typeof value === "function") {
      const token = `${path}:${String(value.name || "anonymous")}`;
      if (!seen.has(token) && test(key, path)) {
        seen.add(token);
        methods.push({ fn: value, ctx: source, name: path });
      }
      continue;
    }
    if (value && typeof value === "object") {
      methods.push(...collectSimpleCalendarMethods(value, test, path, depth + 1, seen));
    }
  }
  return methods;
}

function getSimpleCalendarMutationMethods(api) {
  if (!api) return { updateMethods: [], createMethods: [], removeMethods: [] };
  const isCreateMethod = (key, path) => /(add|create)/i.test(key) && /(note|event|entry)/i.test(path);
  const isUpdateMethod = (key, path) => /(update|edit|set)/i.test(key) && /(note|event|entry)/i.test(path);
  const isRemoveMethod = (key, path) => /(remove|delete)/i.test(key) && /(note|event|entry)/i.test(path);

  const preferredUpdate = [
    { fn: api.updateEvent, ctx: api, name: "api.updateEvent" },
    { fn: api.updateNote, ctx: api, name: "api.updateNote" },
    { fn: api.updateEntry, ctx: api, name: "api.updateEntry" }
  ].filter((entry) => typeof entry.fn === "function");
  const preferredCreate = [
    { fn: api.addEvent, ctx: api, name: "api.addEvent" },
    { fn: api.createEvent, ctx: api, name: "api.createEvent" },
    { fn: api.addNote, ctx: api, name: "api.addNote" },
    { fn: api.createNote, ctx: api, name: "api.createNote" },
    { fn: api.addCalendarNote, ctx: api, name: "api.addCalendarNote" }
  ].filter((entry) => typeof entry.fn === "function");
  const preferredRemove = [
    { fn: api.removeEvent, ctx: api, name: "api.removeEvent" },
    { fn: api.deleteEvent, ctx: api, name: "api.deleteEvent" },
    { fn: api.removeNote, ctx: api, name: "api.removeNote" },
    { fn: api.deleteNote, ctx: api, name: "api.deleteNote" },
    { fn: api.removeEntry, ctx: api, name: "api.removeEntry" }
  ].filter((entry) => typeof entry.fn === "function");

  const discoveredUpdate = collectSimpleCalendarMethods(api, isUpdateMethod).filter((candidate) => !preferredUpdate.some((entry) => entry.fn === candidate.fn));
  const discoveredCreate = collectSimpleCalendarMethods(api, isCreateMethod).filter((candidate) => !preferredCreate.some((entry) => entry.fn === candidate.fn));
  const discoveredRemove = collectSimpleCalendarMethods(api, isRemoveMethod).filter((candidate) => !preferredRemove.some((entry) => entry.fn === candidate.fn));

  const updateMethods = [...preferredUpdate, ...discoveredUpdate];
  const createMethods = [...preferredCreate, ...discoveredCreate];
  const removeMethods = [...preferredRemove, ...discoveredRemove];
  return { updateMethods, createMethods, removeMethods };
}

function hasSimpleCalendarMutationApi(api) {
  const methods = getSimpleCalendarMutationMethods(api);
  return methods.updateMethods.length > 0 || methods.createMethods.length > 0 || methods.removeMethods.length > 0;
}

function getCurrentWorldTimestamp() {
  return Number(game.time?.worldTime ?? 0);
}

function extractCalendarEntryId(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  return String(
    result.id
      ?? result._id
      ?? result.eventId
      ?? result.noteId
      ?? result.event?.id
      ?? result.note?.id
      ?? result.data?.id
      ?? result.data?._id
      ?? ""
  );
}

function isModuleDebugEnabled() {
  try {
    const devModeApi = game.modules.get("_dev-mode")?.api;
    if (typeof devModeApi?.getPackageDebugValue === "function") {
      return Boolean(devModeApi.getPackageDebugValue(MODULE_ID));
    }
  } catch {
    // Fall through to CONFIG debug checks.
  }
  return Boolean(globalThis.CONFIG?.debug?.[MODULE_ID] || globalThis.CONFIG?.debug?.partyOperations);
}

function logSimpleCalendarSyncDebug(message, details = {}) {
  if (!isModuleDebugEnabled()) return;
  try {
    console.debug(`[${MODULE_ID}] ${message}`, details);
  } catch {
    // Never fail user actions because of logging.
  }
}

function toSimpleCalendarDateObject(api, timestamp) {
  const worldTimeSeconds = Number(timestamp ?? getCurrentWorldTimestamp());
  if (!Number.isFinite(worldTimeSeconds)) return null;
  if (typeof api?.timestampToDate === "function") {
    try {
      const date = api.timestampToDate(worldTimeSeconds);
      return {
        year: Number(date?.year ?? 0),
        month: Number(date?.month ?? 0),
        day: Number(date?.day ?? 0),
        hour: Number(date?.hour ?? date?.hours ?? 0),
        minute: Number(date?.minute ?? date?.minutes ?? 0),
        second: Number(date?.second ?? date?.seconds ?? 0)
      };
    } catch {
      // Fallback below
    }
  }
  const day = Math.floor(worldTimeSeconds / 86400);
  const totalMinutes = ((Math.floor(worldTimeSeconds / 60) % 1440) + 1440) % 1440;
  return {
    year: 0,
    month: 1,
    day: day + 1,
    hour: Math.floor(totalMinutes / 60),
    minute: totalMinutes % 60,
    second: 0
  };
}

function buildSimpleCalendarPayloadVariants(api, payload) {
  const base = payload && typeof payload === "object" ? foundry.utils.deepClone(payload) : {};
  const rawStartTs = Number(base.timestamp ?? base.startTimestamp ?? base.startTime ?? getCurrentWorldTimestamp());
  const startTs = Number.isFinite(rawStartTs) ? rawStartTs : getCurrentWorldTimestamp();
  const rawEndTs = Number(base.endTimestamp ?? base.endTime ?? startTs);
  const endTs = Number.isFinite(rawEndTs) ? rawEndTs : (startTs + 60);
  const safeEndTs = endTs >= startTs ? endTs : (startTs + 60);
  const title = String(base.name ?? base.title ?? "Party Operations").trim() || "Party Operations";
  const content = String(base.content ?? base.description ?? "");
  const visible = base.playerVisible ?? base.visibleToPlayers ?? true;
  const allDay = Boolean(base.allDay ?? true);
  const startDate = toSimpleCalendarDateObject(api, startTs) ?? toSimpleCalendarDateObject(null, startTs);
  const endDate = toSimpleCalendarDateObject(api, safeEndTs) ?? toSimpleCalendarDateObject(null, safeEndTs);

  const variants = [
    base,
    {
      ...base,
      name: title,
      title,
      content,
      description: content,
      timestamp: startTs,
      startTime: startTs,
      endTime: safeEndTs,
      startTimestamp: startTs,
      endTimestamp: safeEndTs,
      allDay,
      public: true,
      isPrivate: false,
      playerVisible: visible,
      visibleToPlayers: visible
    }
  ];

  if (startDate) {
    variants.push({
      ...variants[1],
      date: startDate,
      startDate,
      endDate: endDate ?? startDate,
      start: startDate,
      end: endDate ?? startDate
    });
  }

  const unique = [];
  const seen = new Set();
  for (const variant of variants) {
    const token = JSON.stringify(variant);
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(variant);
  }
  return unique;
}

async function updateSimpleCalendarEntry(api, entryId, payload) {
  if (!api || !entryId) return false;
  const candidates = getSimpleCalendarMutationMethods(api).updateMethods;
  const payloadVariants = buildSimpleCalendarPayloadVariants(api, payload);
  let lastError = null;
  for (const candidate of candidates) {
    const fn = candidate?.fn;
    const ctx = candidate?.ctx ?? api;
    const methodName = String(candidate?.name ?? fn?.name ?? "unknownUpdateMethod");
    if (typeof fn !== "function") continue;
    for (const variant of payloadVariants) {
      try {
        await fn.call(ctx, entryId, variant);
        return true;
      } catch (error) {
        lastError = error;
        try {
          await fn.call(ctx, { id: entryId, ...variant });
          return true;
        } catch (nestedError) {
          lastError = nestedError;
          let signatureError = nestedError;
          try {
            await fn.call(ctx, variant, entryId);
            return true;
          } catch (fallbackError) {
            lastError = fallbackError;
            signatureError = fallbackError;
          }
          logSimpleCalendarSyncDebug("Update method signature attempts failed", {
            methodName,
            entryId,
            reason: String(signatureError?.message ?? signatureError ?? "unknown")
          });
          // Try next signature.
        }
      }
    }
  }
  logSimpleCalendarSyncDebug("Unable to update Simple Calendar injury entry", {
    entryId,
    methodsTried: candidates.map((fn) => String(fn.name || "anonymous")),
    reason: String(lastError?.message ?? lastError ?? "unknown")
  });
  return false;
}

async function createSimpleCalendarEntry(api, payload) {
  if (!api) return { success: false, id: "" };
  const candidates = getSimpleCalendarMutationMethods(api).createMethods;
  const payloadVariants = buildSimpleCalendarPayloadVariants(api, payload);
  let lastError = null;
  for (const candidate of candidates) {
    const fn = candidate?.fn;
    const ctx = candidate?.ctx ?? api;
    const methodName = String(candidate?.name ?? fn?.name ?? "unknownCreateMethod");
    if (typeof fn !== "function") continue;
    for (const variant of payloadVariants) {
      try {
        const result = await fn.call(ctx, variant);
        const id = extractCalendarEntryId(result);
        return { success: true, id };
      } catch (error) {
        lastError = error;
        let signatureError = error;
        try {
          const result = await fn.call(ctx, { ...variant });
          const id = extractCalendarEntryId(result);
          return { success: true, id };
        } catch (nestedError) {
          lastError = nestedError;
          signatureError = nestedError;
        }
        const variantDate = variant.startDate ?? variant.date ?? null;
        if (variantDate) {
          try {
            const result = await fn.call(ctx, variantDate, variant);
            const id = extractCalendarEntryId(result);
            return { success: true, id };
          } catch (dateFirstError) {
            lastError = dateFirstError;
            signatureError = dateFirstError;
          }
          try {
            const result = await fn.call(ctx, variant, variantDate);
            const id = extractCalendarEntryId(result);
            return { success: true, id };
          } catch (dateSecondError) {
            lastError = dateSecondError;
            signatureError = dateSecondError;
          }
        }
        logSimpleCalendarSyncDebug("Create method signature attempts failed", {
          methodName,
          reason: String(signatureError?.message ?? signatureError ?? "unknown")
        });
        // Try next signature.
      }
    }
  }
  const reason = String(lastError?.message ?? lastError ?? "unknown");
  logSimpleCalendarSyncDebug("Unable to create Simple Calendar injury entry", {
    methodsTried: candidates.map((fn) => String(fn.name || "anonymous")),
    reason
  });
  return { success: false, id: "", reason };
}

async function removeSimpleCalendarEntry(api, entryId) {
  if (!api || !entryId) return false;
  const candidates = getSimpleCalendarMutationMethods(api).removeMethods;
  for (const candidate of candidates) {
    const fn = candidate?.fn;
    const ctx = candidate?.ctx ?? api;
    if (typeof fn !== "function") continue;
    try {
      await fn.call(ctx, entryId);
      return true;
    } catch {
      // Try next signature.
    }
  }
  return false;
}

function formatRecoveryDueLabel(timestamp) {
  const worldTimeSeconds = Number(timestamp ?? 0);
  if (!Number.isFinite(worldTimeSeconds)) return "-";
  const api = getSimpleCalendarApi();
  if (isSimpleCalendarActive() && api?.timestampToDate) {
    try {
      const date = api.timestampToDate(worldTimeSeconds);
      const year = Number(date?.year ?? 0);
      const month = Number(date?.month ?? 0);
      const day = Number(date?.day ?? 0);
      const hour = Number(date?.hour ?? date?.hours ?? 0);
      const minute = Number(date?.minute ?? date?.minutes ?? 0);
      return `Y${year} M${month} D${day} ${formatClockLabel(hour, minute)}`;
    } catch {
      // Fall through to world-time label.
    }
  }
  const totalMinutes = ((Math.floor(worldTimeSeconds / 60) % 1440) + 1440) % 1440;
  const day = Math.floor(worldTimeSeconds / 86400);
  return `Day ${day} ${formatClockLabel(Math.floor(totalMinutes / 60), totalMinutes % 60)}`;
}

function getClockContext() {
  const worldTimeSeconds = getCurrentWorldTimestamp();
  const totalMinutes = ((Math.floor(worldTimeSeconds / 60) % 1440) + 1440) % 1440;
  const fallbackHours = Math.floor(totalMinutes / 60);
  const fallbackMinutes = totalMinutes % 60;
  const simpleCalendarActive = isSimpleCalendarActive();
  const simpleCalendarApi = getSimpleCalendarApi();

  if (simpleCalendarActive && simpleCalendarApi?.timestampToDate) {
    try {
      const date = simpleCalendarApi.timestampToDate(worldTimeSeconds);
      const hour = Number(date?.hour ?? date?.hours ?? fallbackHours);
      const minute = Number(date?.minute ?? date?.minutes ?? fallbackMinutes);
      const normalizedMinutes = ((Math.floor(hour) * 60 + Math.floor(minute)) % 1440 + 1440) % 1440;
      return {
        totalMinutes: normalizedMinutes,
        label: formatClockLabel(hour, minute),
        source: "Simple Calendar"
      };
    } catch {
      // Fall through to world time fallback.
    }
  }

  return {
    totalMinutes,
    label: formatClockLabel(fallbackHours, fallbackMinutes),
    source: "World Time"
  };
}

function parseClockToken(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1] ?? 0);
  const minute = Number(match[2] ?? 0);
  const suffix = match[3] ?? "";
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (suffix === "am") {
    if (hour === 12) hour = 0;
  } else if (suffix === "pm") {
    if (hour !== 12) hour += 12;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function parseSlotTimeRange(timeRange) {
  if (!timeRange) return null;
  const parts = String(timeRange).split("-");
  if (parts.length !== 2) return null;
  const start = parseClockToken(parts[0]);
  const end = parseClockToken(parts[1]);
  if (start === null || end === null) return null;
  return { start, end };
}

function minuteWithinRange(minute, start, end) {
  if (start === end) return true;
  if (start < end) return minute >= start && minute < end;
  return minute >= start || minute < end;
}

function resolveActiveWatchSlotId(slots, totalMinutes) {
  const ranges = slots
    .map((slot) => ({ id: slot.id, range: parseSlotTimeRange(slot.timeRange) }))
    .filter((entry) => entry.range);

  for (const entry of ranges) {
    if (minuteWithinRange(totalMinutes, entry.range.start, entry.range.end)) return entry.id;
  }

  if (!slots.length) return null;
  const slotMinutes = Math.max(1, Math.floor(1440 / slots.length));
  const index = Math.floor(totalMinutes / slotMinutes) % slots.length;
  return slots[index]?.id ?? null;
}

function buildMiniVisualizationContext({ visibility = "names-passives" } = {}) {
  const restState = getRestWatchState();
  const marchState = getMarchingOrderState();
  const activityState = getRestActivities();
  const clock = getClockContext();
  const activeWatchSlotId = resolveActiveWatchSlotId(restState.slots ?? [], clock.totalMinutes);
  const rankLabel = { front: "Front", middle: "Middle", rear: "Rear" };

  const watchByActorId = {};
  const restSlots = (restState.slots ?? []).map((slot, index) => {
    const entries = slot.entries?.length
      ? slot.entries
      : slot.actorId
        ? [{ actorId: slot.actorId, notes: slot.notes ?? "" }]
        : [];
    const slotId = slot.id ?? `watch-${index + 1}`;
    const isActive = slotId === activeWatchSlotId;
    const actors = entries
      .map((entry) => game.actors.get(entry.actorId))
      .filter(Boolean)
      .map((actor) => {
        if (!watchByActorId[actor.id]) watchByActorId[actor.id] = [];
        watchByActorId[actor.id].push(slotId);
        const activity = activityState.activities?.[actor.id]?.activity ?? "rested";
        const isOnWatch = isActive;
        const isSleeping = !isOnWatch && activity === "rested";
        const isAwake = isOnWatch || activity !== "rested";
        return {
          actorId: actor.id,
          name: actor.name,
          img: getActorTokenImage(actor),
          isOnWatch,
          isSleeping,
          isAwake,
          statusLabel: isOnWatch ? "On Watch" : isSleeping ? "Sleeping" : "Awake"
        };
      });

    return {
      id: slotId,
      label: `Watch ${index + 1}`,
      timeRange: slot.timeRange || "",
      isActive,
      actors,
      hasActors: actors.length > 0
    };
  });

  const rankByActorId = {};
  for (const key of ["front", "middle", "rear"]) {
    for (const actorId of marchState.ranks?.[key] ?? []) {
      if (actorId && !rankByActorId[actorId]) rankByActorId[actorId] = key;
    }
  }

  const orderedIds = getOrderedMarchingActors(marchState);
  const marchingActors = orderedIds
    .map((actorId) => game.actors.get(actorId))
    .filter(Boolean)
    .map((actor) => {
      const role = rankByActorId[actor.id] ?? "rear";
      const activity = activityState.activities?.[actor.id]?.activity ?? "rested";
      const isOnWatch = Boolean((watchByActorId[actor.id] ?? []).includes(activeWatchSlotId));
      const isSleeping = !isOnWatch && activity === "rested";
      const isAwake = isOnWatch || activity !== "rested";
      return {
        actorId: actor.id,
        name: actor.name,
        img: getActorTokenImage(actor),
        rank: rankLabel[role] ?? "Rear",
        watchLabel: (watchByActorId[actor.id] ?? []).join(", "),
        isOnWatch,
        isSleeping,
        isAwake,
        statusLabel: isOnWatch ? "On Watch" : isSleeping ? "Sleeping" : "Awake"
      };
    });

  const restingActors = restSlots.flatMap((slot) => slot.actors);

  return {
    clockLabel: clock.label,
    clockSource: clock.source,
    hasSimpleCalendar: clock.source === "Simple Calendar",
    activeWatchSlotId,
    restSlots,
    marchingActors,
    restingActors,
    hasRestSlots: restSlots.length > 0,
    hasMarchingActors: marchingActors.length > 0,
    visibility
  };
}

function userOwnsActor(actor) {
  return actor?.testUserPermission?.(game.user, "OWNER") ?? false;
}

function canDragEntry(actorId, isGM, locked) {
  if (!isGM) return false;
  if (locked) return false;
  return true;
}

function isLockedForUser(state, isGM) {
  if (isGM) return false;
  return Boolean(state.locked);
}

function buildActorView(actor, isGM, visibility) {
  const data = {
    id: actor.id,
    name: actor.name,
    img: actor.img,
    passivePerception: getPassive(actor, "prc"),
    passiveInsight: getPassive(actor, "ins"),
    passiveInvestigation: getPassive(actor, "inv"),
    darkvision: getDarkvision(actor),
    stealthDisadv: getStealthDisadv(actor),
    ac: getArmorClass(actor),
    languages: getLanguages(actor)
  };

  if (isGM) return data;

  const showPassives = visibility === "names-passives" || visibility === "names-passives-notes";
  return {
    id: data.id,
    name: data.name,
    img: data.img,
    passivePerception: showPassives ? data.passivePerception : null,
    passiveInsight: null,
    passiveInvestigation: null,
    darkvision: null,
    stealthDisadv: null,
    ac: null,
    languages: null
  };
}

function getPassive(actor, skillKey) {
  const passive = actor?.system?.skills?.[skillKey]?.passive;
  if (passive !== undefined && passive !== null) return passive;
  // Fallback: 10 + skill modifier
  const mod = actor?.system?.skills?.[skillKey]?.mod;
  if (mod !== undefined && mod !== null) return 10 + mod;
  return null;
}

function getDarkvision(actor) {
  if (!actor) return null;
  // Check active token on canvas for darkvision/vision
  const token = actor.getActiveTokens?.(true, true)?.[0];
  if (token) {
    // Check if token has vision/darkvision enabled
    const visionConfig = token.document?.sight;
    if (visionConfig?.enabled && visionConfig?.visionRange > 0) {
      return visionConfig.visionRange; // Return the range (e.g., 60)
    }
  }
  // Fallback to actor data
  return actor?.system?.attributes?.senses?.darkvision ?? null;
}

function getStealthDisadv(actor) {
  return actor?.system?.traits?.stealth?.disadv ?? false;
}

function getArmorClass(actor) {
  return actor?.system?.attributes?.ac?.value ?? null;
}

function getLanguages(actor) {
  const languageState = actor?.system?.traits?.languages;
  if (!languageState) return null;

  const rawValue = languageState.value;
  let keys = [];
  if (Array.isArray(rawValue)) {
    keys = rawValue.map((entry) => String(entry ?? "").trim());
  } else if (rawValue instanceof Set) {
    keys = Array.from(rawValue).map((entry) => String(entry ?? "").trim());
  } else if (typeof rawValue === "string") {
    keys = rawValue.split(/[;,]/).map((entry) => String(entry ?? "").trim());
  } else if (rawValue && typeof rawValue === "object") {
    keys = Object.entries(rawValue)
      .filter(([, enabled]) => enabled === true || enabled === 1 || enabled === "1")
      .map(([key]) => String(key ?? "").trim());
    if (keys.length === 0) keys = Object.keys(rawValue).map((key) => String(key ?? "").trim());
  }

  const catalog = CONFIG?.DND5E?.languages ?? CONFIG?.languages ?? {};
  const resolveLabel = (key) => {
    const id = String(key ?? "").trim();
    if (!id || id.toLowerCase() === "undefined") return "";
    const raw = catalog?.[id];
    if (typeof raw === "string") return raw.includes(".") ? (game.i18n?.localize?.(raw) ?? raw) : raw;
    if (raw && typeof raw === "object") {
      const label = String(raw.label ?? raw.name ?? raw.value ?? id).trim();
      return label.includes(".") ? (game.i18n?.localize?.(label) ?? label) : label;
    }
    return id;
  };

  const customRaw = String(languageState.custom ?? languageState.special ?? "").trim();
  const customValues = customRaw
    ? customRaw.split(/[;,]/).map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];

  const labels = [...keys.map((key) => resolveLabel(key)), ...customValues]
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, arr) => entry && entry.toLowerCase() !== "undefined" && arr.indexOf(entry) === index);

  if (labels.length === 0) return null;
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.length} langs`;
}

function computeHighestPP(slots) {
  const values = slots
    .flatMap((slot) => slot.entries ?? [])
    .map((entry) => entry.actor?.passivePerception)
    .filter((value) => typeof value === "number");
  if (values.length === 0) return "-";
  return Math.max(...values);
}

function computeHighestPPForEntries(entries) {
  const values = (entries ?? [])
    .map((entry) => entry.actor?.passivePerception)
    .filter((value) => typeof value === "number");
  if (values.length === 0) return null;
  return Math.max(...values);
}

function computeNoDarkvision(slots) {
  for (const slot of slots) {
    const entries = slot.entries ?? [];
    for (const entry of entries) {
      if (entry.actor && !entry.actor.darkvision) {
        return slot.label;
      }
    }
  }
  return "";
}

function computeNoDarkvisionForEntries(entries) {
  for (const entry of entries ?? []) {
    if (entry.actor && !entry.actor.darkvision) return true;
  }
  return false;
}

function buildQuickNotes(state) {
  const notes = [];
  state.slots.forEach((slot, index) => {
    const entries = slot.entries ?? [];
    entries.forEach((entry) => {
      const actor = game.actors.get(entry.actorId);
      const text = String(entry.notes ?? "").trim();
      if (text.length > 0) {
        notes.push({
          label: `Watch ${index + 1}`,
          actorName: actor?.name ?? "Unknown",
          text
        });
      }
    });
  });
  return notes;
}

function setupMarchingDragAndDrop(html) {
  const state = getMarchingOrderState();
  const isGM = game.user.isGM;
  const locked = state.locked;

  html.querySelectorAll(".po-entry").forEach((entry) => {
    const actorId = entry.dataset.actorId;
    const draggable = canDragEntry(actorId, isGM, locked);
    entry.setAttribute("draggable", draggable ? "true" : "false");
    entry.classList.toggle("is-draggable", draggable);
    if (!draggable) return;
    if (entry.dataset.poDndEntryBound === "1") return;
    entry.dataset.poDndEntryBound = "1";
    entry.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", actorId);
      event.dataTransfer?.setDragImage?.(entry, 20, 20);
    });

    const handle = entry.querySelector(".po-entry-handle");
    if (handle) {
      handle.setAttribute("draggable", "true");
      if (handle.dataset.poDndHandleBound !== "1") {
        handle.dataset.poDndHandleBound = "1";
        handle.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text/plain", actorId);
          event.dataTransfer?.setDragImage?.(entry, 20, 20);
          event.stopPropagation();
        });
      }
    }
  });

  html.querySelectorAll(".po-rank-col").forEach((column) => {
    if (column.dataset.poDndColBound === "1") return;
    column.dataset.poDndColBound = "1";
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      if (!isGM) return;
      const liveState = getMarchingOrderState();
      if (isLockedForUser(liveState, isGM)) {
        ui.notifications?.warn("Marching order is locked by the GM.");
        return;
      }
      const actorId = event.dataTransfer?.getData("text/plain");
      if (!actorId) return;
      const rankId = column.dataset.rankId;
      if (!rankId) return;

      const targetEntry = event.target?.closest(".po-entry");
      const entryList = Array.from(column.querySelectorAll(".po-entry"));
      const insertIndex = targetEntry ? entryList.indexOf(targetEntry) : entryList.length;

      await updateMarchingOrderState((state) => {
        for (const key of Object.keys(state.ranks)) {
          state.ranks[key] = (state.ranks[key] ?? []).filter((id) => id !== actorId);
        }
        if (!state.ranks[rankId]) state.ranks[rankId] = [];
        const target = state.ranks[rankId];
        const safeIndex = Math.max(0, Math.min(insertIndex, target.length));
        target.splice(safeIndex, 0, actorId);
      }, { skipLocalRefresh: true });

      refreshSingleAppPreservingView(marchingOrderAppInstance);
    });
  });
}

function getFloatingLauncherPosition() {
  const fallback = getFloatingLauncherCenteredPosition();
  const stored = game.settings.get(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_POS);
  if (!stored || typeof stored !== "object") return fallback;
  const left = Number(stored.left);
  const top = Number(stored.top);
  return {
    left: Number.isFinite(left) ? left : fallback.left,
    top: Number.isFinite(top) ? top : fallback.top
  };
}

function getFloatingLauncherCenteredPosition() {
  const launcher = document.getElementById("po-floating-launcher");
  const launcherWidth = Math.max(56, Number(launcher?.offsetWidth ?? 56));
  const launcherHeight = Math.max(172, Number(launcher?.offsetHeight ?? 172));
  const viewportWidth = Math.max(240, Number(window.innerWidth ?? 1200));
  const viewportHeight = Math.max(240, Number(window.innerHeight ?? 800));

  return {
    left: Math.max(8, Math.floor((viewportWidth - launcherWidth) / 2)),
    top: Math.max(8, Math.floor((viewportHeight - launcherHeight) / 2))
  };
}

function getFloatingLauncherLeftInset() {
  const controls = document.getElementById("controls");
  if (!controls) return 8;
  const rect = controls.getBoundingClientRect();
  if (!rect || !Number.isFinite(rect.right)) return 8;
  return Math.max(8, Math.floor(rect.right + 12));
}

function isFloatingLauncherLocked() {
  return Boolean(game.settings.get(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_LOCKED));
}

function applyFloatingLauncherLockUi(launcher, locked) {
  if (!launcher) return;
  launcher.classList.toggle("is-locked", Boolean(locked));
  launcher.classList.toggle("is-unlocked", !Boolean(locked));
  const lockBtn = launcher.querySelector(".po-floating-lock");
  const unlockBtn = launcher.querySelector(".po-floating-unlock");
  const handle = launcher.querySelector(".po-floating-handle");
  if (lockBtn) lockBtn.style.display = locked ? "none" : "";
  if (unlockBtn) unlockBtn.style.display = locked ? "" : "none";
  if (handle) {
    handle.setAttribute("title", locked ? "Launcher locked (click unlock to move)" : "Drag to move");
  }
}

async function resetFloatingLauncherPosition() {
  const resetPos = getFloatingLauncherCenteredPosition();
  await game.settings.set(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_POS, resetPos);
  let launcher = document.getElementById("po-floating-launcher");
  if (!launcher) {
    ensureFloatingLauncher();
    launcher = document.getElementById("po-floating-launcher");
  }
  if (launcher) {
    launcher.style.display = "flex";
    launcher.style.visibility = "visible";
    launcher.style.opacity = "1";
    const pos = clampFloatingLauncherPosition(resetPos);
    launcher.style.left = `${pos.left}px`;
    launcher.style.top = `${pos.top}px`;
  }
}

function clampFloatingLauncherPosition(pos, options = {}) {
  const width = Math.max(240, window.innerWidth || 1200);
  const height = Math.max(240, window.innerHeight || 800);
  const launcher = document.getElementById("po-floating-launcher");
  const launcherWidth = Math.max(48, Number(launcher?.offsetWidth ?? 48));
  const launcherHeight = Math.max(140, Number(launcher?.offsetHeight ?? 140));
  const lockAware = options?.lockAware !== false;
  const locked = lockAware ? isFloatingLauncherLocked() : false;
  const minLeft = locked ? 8 : getFloatingLauncherLeftInset();
  return {
    left: Math.max(minLeft, Math.min(width - launcherWidth - 8, Number(pos.left ?? minLeft))),
    top: Math.max(8, Math.min(height - launcherHeight - 8, Number(pos.top ?? 180)))
  };
}

async function saveFloatingLauncherPosition(pos) {
  const clamped = clampFloatingLauncherPosition(pos);
  await game.settings.set(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_POS, clamped);
}

function ensureFloatingLauncher() {
  let launcher = document.getElementById("po-floating-launcher");

  const setLauncherMarkup = (target) => {
    target.innerHTML = `
      <div class="po-floating-handle" title="Drag to move" aria-label="Drag to move"><i class="fas fa-grip-lines-vertical"></i></div>
      <button type="button" class="po-floating-btn" data-action="rest" title="Open Rest Watch" aria-label="Open Rest Watch">
        <i class="fas fa-moon"></i>
      </button>
      <button type="button" class="po-floating-btn" data-action="operations" title="Open Operations" aria-label="Open Operations">
        <i class="fas fa-clipboard-list"></i>
      </button>
      <button type="button" class="po-floating-btn" data-action="march" title="Open Marching Order" aria-label="Open Marching Order"><i class="fas fa-arrow-up"></i></button>
      <button type="button" class="po-floating-btn po-floating-gm" data-action="gm" title="Open GM Section" aria-label="Open GM Section">
        <i class="fas fa-user-shield"></i>
      </button>
      <button type="button" class="po-floating-btn po-floating-lock" data-action="lock" title="Lock launcher" aria-label="Lock launcher">
        <i class="fas fa-lock"></i>
      </button>
      <button type="button" class="po-floating-btn po-floating-unlock" data-action="unlock" title="Unlock launcher" aria-label="Unlock launcher">
        <i class="fas fa-lock-open"></i>
      </button>
    `;
  };

  if (!launcher) {
    launcher = document.createElement("div");
    launcher.id = "po-floating-launcher";
    launcher.classList.add("po-floating-launcher");
    setLauncherMarkup(launcher);
    document.body.appendChild(launcher);

    launcher.addEventListener("click", (event) => {
      const button = event.target?.closest(".po-floating-btn");
      if (!button) return;
      const action = button.dataset.action;
      if (action === "rest") new RestWatchApp().render({ force: true });
      if (action === "operations") {
        setActiveRestMainTab("operations");
        new RestWatchApp().render({ force: true });
      }
      if (action === "march") new MarchingOrderApp().render({ force: true });
      if (action === "gm") {
        if (!game.user?.isGM) {
          ui.notifications?.warn("GM permissions are required for the GM section.");
          return;
        }
        setActiveRestMainTab("operations");
        setActiveOperationsPage("gm");
        new RestWatchApp().render({ force: true });
      }
      if (action === "lock") {
        const current = clampFloatingLauncherPosition({
          left: parseFloat(launcher.style.left || "16"),
          top: parseFloat(launcher.style.top || "180")
        }, { lockAware: false });
        launcher.style.left = `${current.left}px`;
        launcher.style.top = `${current.top}px`;
        saveFloatingLauncherPosition(current);
        game.settings.set(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_LOCKED, true);
      }
      if (action === "unlock") game.settings.set(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_LOCKED, false);
    });

    const handle = launcher.querySelector(".po-floating-handle");
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let lastLockedDragNoticeAt = 0;

    const onMove = (event) => {
      if (!dragging) return;
      const next = clampFloatingLauncherPosition({
        left: originLeft + (event.clientX - startX),
        top: originTop + (event.clientY - startY)
      });
      launcher.style.left = `${next.left}px`;
      launcher.style.top = `${next.top}px`;
    };

    const onUp = async () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      await saveFloatingLauncherPosition({
        left: parseFloat(launcher.style.left || String(getFloatingLauncherLeftInset())),
        top: parseFloat(launcher.style.top || "180")
      });
    };

    const startDrag = (event) => {
      if (isFloatingLauncherLocked()) {
        const now = Date.now();
        if (now - lastLockedDragNoticeAt > 1500) {
          lastLockedDragNoticeAt = now;
          ui.notifications?.info("Launcher position is locked. Click unlock to move it.");
        }
        event.preventDefault();
        return;
      }
      if (event.target?.closest(".po-floating-btn")) return;
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      originLeft = parseFloat(launcher.style.left || String(getFloatingLauncherLeftInset()));
      originTop = parseFloat(launcher.style.top || "180");
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      event.preventDefault();
    };

    handle?.addEventListener("pointerdown", startDrag);
    launcher.addEventListener("pointerdown", startDrag);

    window.addEventListener("resize", () => {
      const clamped = clampFloatingLauncherPosition({
        left: parseFloat(launcher.style.left || String(getFloatingLauncherLeftInset())),
        top: parseFloat(launcher.style.top || "180")
      });
      launcher.style.left = `${clamped.left}px`;
      launcher.style.top = `${clamped.top}px`;
    });
  } else {
    const hasRestBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="rest"]'));
    const hasOperationsBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="operations"]'));
    const hasMarchBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="march"]'));
    const hasGmBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="gm"]'));
    const hasLockBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="lock"]'));
    const hasUnlockBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="unlock"]'));
    if (!hasRestBtn || !hasOperationsBtn || !hasMarchBtn || !hasGmBtn || !hasLockBtn || !hasUnlockBtn) {
      setLauncherMarkup(launcher);
    }
  }

  const gmButton = launcher.querySelector('.po-floating-btn[data-action="gm"]');
  if (gmButton) gmButton.style.display = game.user?.isGM ? "" : "none";

  const pos = clampFloatingLauncherPosition(getFloatingLauncherPosition());
  launcher.style.display = "flex";
  launcher.style.visibility = "visible";
  launcher.style.opacity = "1";
  launcher.style.left = `${pos.left}px`;
  launcher.style.top = `${pos.top}px`;
  applyFloatingLauncherLockUi(launcher, isFloatingLauncherLocked());
}

function getRollValidator() {
  if (globalThis?.Roll?.validate) return globalThis.Roll;
  if (foundry?.dice?.Roll?.validate) return foundry.dice.Roll;
  return null;
}

function isValidRollFormula(formula) {
  if (formula === null || formula === undefined) return true;
  if (typeof formula !== "string") return false;
  const value = formula.trim();
  if (!value) return true;
  const validator = getRollValidator();
  if (validator?.validate) return Boolean(validator.validate(value));
  try {
    new Roll(value);
    return true;
  } catch {
    return false;
  }
}

function isValidAsyncScript(source) {
  if (typeof source !== "string") return true;
  const code = source.trim();
  if (!code) return true;
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    new AsyncFunction(code);
    return true;
  } catch {
    return false;
  }
}

async function diagnoseWorldData(options = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can diagnose world data.");
    return null;
  }

  const repair = Boolean(options.repair);
  const report = {
    scanned: {
      actors: game.actors.size,
      items: game.items.size,
      macros: game.macros.size
    },
    actors: [],
    items: [],
    activities: [],
    macros: [],
    repaired: {
      actors: 0,
      items: 0,
      activities: 0
    }
  };

  for (const actor of game.actors.contents) {
    const formula = actor.system?.attributes?.hp?.formula;
    if (typeof formula !== "string") continue;
    if (isValidRollFormula(formula)) continue;
    report.actors.push({
      id: actor.id,
      name: actor.name,
      formula
    });
    if (repair) {
      try {
        await actor.update({ "system.attributes.hp.formula": "0" });
        report.repaired.actors += 1;
      } catch (error) {
        console.warn(`${MODULE_ID}: failed to repair actor hp formula`, actor.id, error);
      }
    }
  }

  for (const item of game.items.contents) {
    const durationValue = item.system?.duration?.value;
    if (typeof durationValue === "string" && !isValidRollFormula(durationValue)) {
      report.items.push({
        id: item.id,
        name: item.name,
        durationValue
      });
      if (repair) {
        try {
          await item.update({ "system.duration.value": "" });
          report.repaired.items += 1;
        } catch (error) {
          console.warn(`${MODULE_ID}: failed to repair item duration`, item.id, error);
        }
      }
    }

    const activityUpdates = {};
    let activityRepairCount = 0;
    for (const [activityId, activity] of Object.entries(item.system?.activities ?? {})) {
      const parts = activity?.damage?.parts ?? [];
      parts.forEach((part, index) => {
        const formula = part?.custom?.formula;
        if (typeof formula !== "string") return;
        if (isValidRollFormula(formula)) return;
        report.activities.push({
          itemId: item.id,
          itemName: item.name,
          activityId,
          partIndex: index,
          formula
        });
        if (repair) {
          activityUpdates[`system.activities.${activityId}.damage.parts.${index}.custom.formula`] = "";
          activityRepairCount += 1;
        }
      });
    }

    if (repair && Object.keys(activityUpdates).length > 0) {
      try {
        await item.update(activityUpdates);
        report.repaired.activities += activityRepairCount;
      } catch (error) {
        console.warn(`${MODULE_ID}: failed to repair item activities`, item.id, error);
      }
    }
  }

  for (const macro of game.macros.contents) {
    if (isValidAsyncScript(macro.command)) continue;
    report.macros.push({
      id: macro.id,
      name: macro.name,
      type: macro.type,
      commandPreview: String(macro.command ?? "").slice(0, 80)
    });
  }

  const totalIssues = report.actors.length + report.items.length + report.activities.length + report.macros.length;
  const totalRepaired = report.repaired.actors + report.repaired.items + report.repaired.activities;
  if (repair) {
    ui.notifications?.info(`Party Operations repair finished. Issues: ${totalIssues}, repaired: ${totalRepaired}, macro scripts needing manual fix: ${report.macros.length}.`);
  } else {
    ui.notifications?.info(`Party Operations diagnose finished. Issues found: ${totalIssues}.`);
  }
  if (DEBUG_LOG) console.log(`${MODULE_ID}: world data diagnose report`, report);
  return report;
}

function setupPartyOperationsUI() {
  // Keep UI launcher independent from scene controls; remove any legacy injected control.
  Hooks.on("renderSceneControls", (controls, html) => {
    const root = html?.querySelector ? html : html?.[0];
    if (!root?.querySelector) return;
    root.querySelector("[data-control='party-operations']")?.remove();
    ensureFloatingLauncher();
  });
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.REST_STATE, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultRestWatchState()
  });

  game.settings.register(MODULE_ID, SETTINGS.REST_COMMITTED, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultRestWatchState()
  });

  game.settings.register(MODULE_ID, SETTINGS.MARCH_STATE, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultMarchingOrderState()
  });

  game.settings.register(MODULE_ID, SETTINGS.MARCH_COMMITTED, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultMarchingOrderState()
  });

  game.settings.register(MODULE_ID, SETTINGS.REST_ACTIVITIES, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultActivityState()
  });

  game.settings.register(MODULE_ID, SETTINGS.OPS_LEDGER, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultOperationsLedger()
  });

  game.settings.register(MODULE_ID, SETTINGS.INJURY_RECOVERY, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultInjuryRecoveryState()
  });

  game.settings.register(MODULE_ID, SETTINGS.INJURY_REMINDER_DAY, {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.INTEGRATION_MODE, {
    name: "Integration Mode",
    hint: "Choose how Party Operations syncs state for DAE/automation modules.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      auto: "Auto (DAE if active, otherwise flags)",
      off: "Off",
      flags: "Flags Only",
      dae: "DAE + Flags"
    },
    default: "auto"
  });

  game.settings.register(MODULE_ID, SETTINGS.SESSION_AUTOPILOT_SNAPSHOT, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, SETTINGS.GATHER_ROLL_MODE, {
    name: "Gather Roll Mode",
    hint: "Choose how Gather Resource checks request Wisdom (Survival) rolls.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "prefer-monks": "Prefer Monk's TokenBar (fallback to Foundry)",
      "monks-only": "Monk's TokenBar Only",
      "foundry-only": "Foundry Only"
    },
    default: "prefer-monks"
  });

  game.settings.register(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_POS, {
    scope: "client",
    config: false,
    type: Object,
    default: {
      left: 16,
      top: 180
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_LOCKED, {
    name: "Lock Launcher Position",
    hint: "When enabled, the floating Party Operations launcher cannot be dragged.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => ensureFloatingLauncher()
  });

  game.settings.register(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_RESET, {
    name: "Reset Launcher Position",
    hint: "Set to true to reset launcher position, then it auto-clears.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: async (value) => {
      if (!value) return;
      await resetFloatingLauncherPosition();
      await game.settings.set(MODULE_ID, SETTINGS.FLOATING_LAUNCHER_RESET, false);
      ensureFloatingLauncher();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.PLAYER_AUTO_OPEN_REST, {
    name: "Auto-open Rest Watch for Players",
    hint: "When enabled, non-GM users automatically open Rest Watch when Foundry is ready.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.partyOperations = {
    restWatch: () => new RestWatchApp().render({ force: true }),
    marchingOrder: () => new MarchingOrderApp().render({ force: true }),
    refreshAll: () => refreshOpenApps(),
    getOperations: () => foundry.utils.deepClone(getOperationsLedger()),
    applyUpkeep: () => applyOperationalUpkeep(),
    getInjuryRecovery: () => foundry.utils.deepClone(getInjuryRecoveryState()),
    applyRecoveryCycle: () => applyRecoveryCycle(),
    runSessionAutopilot: () => runSessionAutopilot(),
    undoSessionAutopilot: () => undoLastSessionAutopilot(),
    syncInjuryCalendar: () => syncAllInjuriesToSimpleCalendar(),
    syncIntegrations: () => scheduleIntegrationSync("api"),
    diagnoseWorldData: (options) => diagnoseWorldData(options),
    repairWorldData: () => diagnoseWorldData({ repair: true }),
    resetLauncherPosition: () => resetFloatingLauncherPosition()
  };

  game.keybindings.register(MODULE_ID, "openRestWatch", {
    name: "Open Rest Watch",
    editable: [],
    onDown: () => {
      new RestWatchApp().render({ force: true });
      return true;
    }
  });

  game.keybindings.register(MODULE_ID, "openMarchingOrder", {
    name: "Open Marching Order",
    editable: [],
    onDown: () => {
      new MarchingOrderApp().render({ force: true });
      return true;
    }
  });
});

Hooks.once("ready", () => {
  // Setup UI controls for sidebar
  setupPartyOperationsUI();
  ensureFloatingLauncher();
  notifyDailyInjuryReminders();

  // Auto-open player UI for non-GM players
  if (!game.user.isGM) {
    const autoOpenPlayerUi = game.settings.get(MODULE_ID, SETTINGS.PLAYER_AUTO_OPEN_REST) ?? true;
    if (autoOpenPlayerUi) {
      new RestWatchApp().render({ force: true });
    }
  } else {
    scheduleIntegrationSync("ready");
  }

  game.socket.on(SOCKET_CHANNEL, async (message) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "open") {
      if (!game.user.isGM) {
        if (message.app === "rest") new RestWatchApp().render(true);
        if (message.app === "march") new MarchingOrderApp().render(true);
        if (message.requestId) {
          game.socket.emit(SOCKET_CHANNEL, {
            type: "open:ack",
            requestId: message.requestId,
            app: message.app,
            userId: game.user.id
          });
        }
      }
      return;
    }

    if (message.type === "open:ack") {
      handleOpenAck(message);
      return;
    }

    if (message.type === "players:openRest" && !game.user.isGM) {
      new RestWatchApp().render({ force: true });
      return;
    }

    if (message.type === "refresh") {
      if (message.userId && message.userId === game.user.id) return;
      // Small delay helps ensure settings updates have propagated before re-rendering
      setTimeout(() => refreshOpenApps(), 75);
      return;
    }

    if (message.type === "activity:update") {
      // Players can update their own activity
      const requester = game.users.get(message.userId);
      if (!requester) return;
      const requesterActor = requester.character;
      if (!requesterActor || requesterActor.id !== message.actorId) return; // security check
      
      const activities = getRestActivities();
      if (!activities.activities[message.actorId]) activities.activities[message.actorId] = {};
      activities.activities[message.actorId].activity = message.activity;
      await game.settings.set(MODULE_ID, SETTINGS.REST_ACTIVITIES, activities);
      refreshOpenApps();
      emitSocketRefresh();
      return;
    }

    if (!game.user.isGM) return; // only GM applies mutations

    if (message.type === "rest:mutate") {
      await applyRestRequest(message.request, message.userId);
      return;
    }
    if (message.type === "march:mutate") {
      await applyMarchRequest(message.request, message.userId);
      return;
    }
    if (message.type === "ops:setSopNote") {
      await applyPlayerSopNoteRequest(message);
      return;
    }
  });

  Hooks.on("updateWorldTime", async () => {
    refreshOpenApps();
    await notifyDailyInjuryReminders();
    if (!game.user.isGM) return;
    await applyOperationalUpkeep({ automatic: true });
  });

  Hooks.on("preUpdateToken", (tokenDoc, changed, options) => {
    if (options?.poEnvironmentClamp) return;
    if (!changed || (changed.x === undefined && changed.y === undefined)) return;
    environmentMoveOriginByToken.set(tokenDoc.id, {
      x: Number(tokenDoc.x ?? 0),
      y: Number(tokenDoc.y ?? 0)
    });
  });

  Hooks.on("updateToken", async (tokenDoc, changed, options) => {
    await maybePromptEnvironmentMovementCheck(tokenDoc, changed, options ?? {});
  });

  Hooks.on("updateSetting", (setting) => {
    const settingKey = setting?.key ?? "";
    if (!settingKey) return;
    if (consumeSuppressedSettingRefresh(settingKey)) return;
    const restKey = `${MODULE_ID}.${SETTINGS.REST_STATE}`;
    const marchKey = `${MODULE_ID}.${SETTINGS.MARCH_STATE}`;
    const actKey = `${MODULE_ID}.${SETTINGS.REST_ACTIVITIES}`;
    const opsKey = `${MODULE_ID}.${SETTINGS.OPS_LEDGER}`;
    const injuryKey = `${MODULE_ID}.${SETTINGS.INJURY_RECOVERY}`;
    const integrationModeKey = `${MODULE_ID}.${SETTINGS.INTEGRATION_MODE}`;
    if (settingKey === restKey || settingKey === marchKey || settingKey === actKey || settingKey === opsKey || settingKey === injuryKey) {
      refreshOpenApps();
    }
    if (game.user.isGM && (settingKey === restKey || settingKey === marchKey || settingKey === opsKey || settingKey === injuryKey || settingKey === integrationModeKey)) {
      scheduleIntegrationSync("update-setting");
    }
  });

  Hooks.on("canvasReady", () => {
    if (!game.user.isGM) return;
    scheduleIntegrationSync("canvas-ready");
  });
});

async function applyPlayerSopNoteRequest(message) {
  const requester = game.users.get(message?.userId);
  if (!requester || requester.isGM) return;

  const sopKey = String(message?.sopKey ?? "").trim();
  if (!SOP_KEYS.includes(sopKey)) return;
  const note = String(message?.note ?? "");

  await updateOperationsLedger((ledger) => {
    const sopNotes = ensureSopNotesState(ledger);
    sopNotes[sopKey] = note.slice(0, 4000);
  });
}

async function applyRestRequest(request, userId) {
  if (!request || typeof request !== "object") return;
  const state = getRestWatchState();
  const requester = game.users.get(userId);
  if (!requester) return;

  if (state.locked) return;

  // clearAll is not supported via socket (GM clears directly)
  if (request.op === "clearAll") return;

  // assignMe and clearEntry must be requester's character
  const requesterActor = requester.character;
  if (request.op === "assignMe") {
    if (!requesterActor || requesterActor.id !== request.actorId) return; // security check
    const slot = state.slots.find((s) => s.id === request.slotId);
    if (!slot) return;
    // Migrate old format
    if (!slot.entries && slot.actorId) {
      slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
      slot.actorId = null;
      slot.notes = "";
    }
    if (!slot.entries) slot.entries = [];
    // Add new entry
    slot.entries.push({ actorId: request.actorId, notes: "" });
    stampUpdate(state, requester);
    await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }

  if (request.op === "clearEntry") {
    const slot = state.slots.find((s) => s.id === request.slotId);
    if (!slot) return;
    // Migrate old format
    if (!slot.entries && slot.actorId) {
      slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
      slot.actorId = null;
      slot.notes = "";
    }
    if (!slot.entries) slot.entries = [];
    // Only clear own entry
    const entryIndex = slot.entries.findIndex((e) => e.actorId === requesterActor?.id);
    if (entryIndex === -1) return; // not found or not owned
    if (slot.entries[entryIndex].actorId !== request.actorId) return; // security check
    slot.entries.splice(entryIndex, 1);
    stampUpdate(state, requester);
    await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }

  if (request.op === "setEntryNotes") {
    const slot = state.slots.find((s) => s.id === request.slotId);
    if (!slot) return;
    // Migrate old format
    if (!slot.entries && slot.actorId) {
      slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
      slot.actorId = null;
      slot.notes = "";
    }
    if (!slot.entries) slot.entries = [];
    // Only allow notes edits for own entry
    const entry = slot.entries.find((e) => e.actorId === request.actorId);
    if (!entry || !requesterActor || entry.actorId !== requesterActor.id) return;
    entry.notes = String(request.text ?? "");
    stampUpdate(state, requester);
    await game.settings.set(MODULE_ID, SETTINGS.REST_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }
}

async function applyMarchRequest(request, userId) {
  if (!request || typeof request !== "object") return;
  const state = getMarchingOrderState();
  const requester = game.users.get(userId);
  if (!requester) return;
  const requesterActor = requester.character;

  if (state.locked) return;

  // joinRank: must be requester's character
  if (request.op === "joinRank") {
    if (!requesterActor || requesterActor.id !== request.actorId) return; // security check
    for (const key of Object.keys(state.ranks)) {
      state.ranks[key] = (state.ranks[key] ?? []).filter((entryId) => entryId !== request.actorId);
    }
    if (!state.ranks[request.rankId]) state.ranks[request.rankId] = [];
    state.ranks[request.rankId].push(request.actorId);
    stampUpdate(state, requester);
    await game.settings.set(MODULE_ID, SETTINGS.MARCH_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }

  // setActorNote: only for requester's own actor
  if (request.op === "setNote") {
    if (!requesterActor || requesterActor.id !== request.actorId) return;
    if (!state.notes) state.notes = {};
    state.notes[request.actorId] = String(request.text ?? "");
    stampUpdate(state, requester);
    await game.settings.set(MODULE_ID, SETTINGS.MARCH_STATE, state);
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }
}

function toggleCardNotes(element) {
  const entry = element?.closest(".po-watch-entry");
  const notes = entry?.querySelector(".po-notes");
  if (!notes) return;
  notes.classList.toggle("is-active");
}

async function toggleCampfire(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can toggle campfire.");
    return;
  }
  const state = getRestWatchState();
  const newValue = !state.campfire;
  await updateRestWatchState((state) => {
    state.campfire = newValue;
  });
  const status = newValue ? "Campfire lit" : "Campfire extinguished";
  ui.notifications?.info(status);
}

function refreshOpenApps() {
  if (refreshOpenAppsQueued) return;
  refreshOpenAppsQueued = true;
  requestAnimationFrame(() => {
    refreshOpenAppsQueued = false;
  const ids = new Set(["rest-watch-app", "marching-order-app", "rest-watch-player-app"]);
  const knownInstances = [restWatchAppInstance, marchingOrderAppInstance, restWatchPlayerAppInstance]
    .filter((app) => app?.element?.isConnected);
  const apps = Object.values(ui.windows).filter((app) =>
    app instanceof RestWatchApp ||
    app instanceof MarchingOrderApp ||
    app instanceof RestWatchPlayerApp ||
    ids.has(app?.id ?? app?.options?.id)
  );
  const unique = Array.from(new Set([...apps, ...knownInstances]));
  for (const app of unique) {
    // Force re-prepare context and re-render for v12 ApplicationV2
    if (!app?.render) continue;
    const uiState = captureUiState(app);
    if (uiState) pendingUiRestore.set(app, uiState);
    const state = captureScrollState(app);
    if (state.length > 0) {
      pendingScrollRestore.set(app, state);
    }
    const windowState = captureWindowState(app);
    if (windowState) {
      pendingWindowRestore.set(app, windowState);
    }
    app.render({ force: true, parts: ["main"] });
  }
  });
}

function setupRestWatchDragAndDrop(html) {
  const state = getRestWatchState();
  const isGM = game.user.isGM;
  if (!isGM || isLockedForUser(state, isGM)) return;

  html.querySelectorAll(".po-watch-entry").forEach((entry) => {
    const actorId = entry.dataset.actorId;
    if (!actorId) return;
    entry.setAttribute("draggable", "true");
    entry.classList.add("is-draggable");
    if (entry.dataset.poRestDndBound === "1") return;
    entry.dataset.poRestDndBound = "1";
    entry.addEventListener("dragstart", (event) => {
      const slotId = entry.closest(".po-card")?.dataset?.slotId;
      if (!slotId) return;
      const payload = JSON.stringify({ actorId, fromSlotId: slotId });
      event.dataTransfer?.setData("text/plain", payload);
      event.dataTransfer?.setDragImage?.(entry, 20, 20);
    });
  });

  html.querySelectorAll(".po-card").forEach((card) => {
    if (card.dataset.poRestDropBound === "1") return;
    card.dataset.poRestDropBound = "1";

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("is-drop-target");
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-drop-target");
    });

    card.addEventListener("drop", async (event) => {
      event.preventDefault();
      card.classList.remove("is-drop-target");

      const raw = event.dataTransfer?.getData("text/plain") ?? "";
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return;
      }
      const actorId = data?.actorId;
      const fromSlotId = data?.fromSlotId;
      const targetSlotId = card.dataset.slotId;
      if (!actorId || !fromSlotId || !targetSlotId) return;
      if (fromSlotId === targetSlotId) return;

      await updateRestWatchState((state) => {
        const slots = state.slots ?? [];
        slots.forEach((slot) => {
          if (!slot.entries && slot.actorId) {
            slot.entries = [{ actorId: slot.actorId, notes: slot.notes ?? "" }];
            slot.actorId = null;
            slot.notes = "";
          }
          if (!slot.entries) slot.entries = [];
          slot.entries = slot.entries.filter((entry) => entry.actorId !== actorId);
        });

        const target = slots.find((slot) => slot.id === targetSlotId);
        if (!target) return;
        target.entries.push({ actorId, notes: "" });
      }, { skipLocalRefresh: true });

      refreshSingleAppPreservingView(restWatchAppInstance);
    });
  });
}

function openRestWatchPlayerApp() {
  const existing = Object.values(ui.windows).find((app) => app instanceof RestWatchPlayerApp);
  if (existing) {
    existing.bringToTop?.();
    return;
  }
  new RestWatchPlayerApp().render(true);
}

export function emitSocketRefresh() {
  game.socket.emit(SOCKET_CHANNEL, { type: "refresh", userId: game.user.id });
}

function emitOpenRestPlayers() {
  game.socket.emit(SOCKET_CHANNEL, { type: "players:openRest" });
}

