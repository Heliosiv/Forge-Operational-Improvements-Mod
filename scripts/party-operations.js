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
  FLOATING_LAUNCHER_POS: "floatingLauncherPos",
  FLOATING_LAUNCHER_LOCKED: "floatingLauncherLocked",
  FLOATING_LAUNCHER_RESET: "floatingLauncherReset"
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
    key: "climbing-vertical",
    label: "Climbing & Vertical Movement",
    description: "Sheer, slick, or unstable surfaces demand climbing control.",
    icon: "icons/svg/falling.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "jumping-gaps",
    label: "Jumping Gaps",
    description: "Collapsed bridges and rooftop breaks require committed leaps.",
    icon: "icons/svg/falling.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "balancing-narrow",
    label: "Balancing Hazards",
    description: "Narrow beams, rope spans, and frozen crossings threaten footing.",
    icon: "icons/svg/acid.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "acr",
    checkLabel: "Acrobatics",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "slippery-ground",
    label: "Slippery Ground",
    description: "Slick surfaces threaten a fall; failed checks cause prone slips.",
    icon: "icons/svg/falling.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "acr",
    checkLabel: "Acrobatics",
    failStatusId: "prone",
    failHaltSquares: 1,
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "difficult-terrain",
    label: "Difficult Terrain",
    description: "Snow, mud, rubble, and unstable footing tax movement plans.",
    icon: "icons/svg/falling.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "sur",
    checkLabel: "Survival",
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
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "storms",
    label: "Storms",
    description: "Lightning, rain, and blowing grit reduce control and visibility.",
    icon: "icons/svg/lightning.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "sur",
    checkLabel: "Survival",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-1" }]
  },
  {
    key: "high-winds",
    label: "Strong Winds",
    description: "Powerful gusts threaten footing and battlefield control.",
    icon: "icons/svg/windmill.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "str",
    checkLabel: "Strength Save",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-1" }]
  },
  {
    key: "dim-light-obscurement",
    label: "Dim Light / Heavy Obscurement",
    description: "Smoke, night, and fog suppress vision and hazard spotting.",
    icon: "icons/svg/blind.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "prc",
    checkLabel: "Perception",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-5" }]
  },
  {
    key: "temporal-distortion",
    label: "Illusions / Temporal Distortion",
    description: "Shifting architecture and timeline echoes scramble certainty.",
    icon: "icons/svg/ruins.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "arc",
    checkLabel: "Arcana",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "quicksand-bog",
    label: "Quicksand / Bog",
    description: "Marsh hazards trap movement and punish poor route reading.",
    icon: "icons/svg/swirl.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "avalanche-rockslide",
    label: "Avalanche / Rockslide",
    description: "Sudden collapse events demand immediate evasive movement.",
    icon: "icons/svg/mountain.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "dex",
    checkLabel: "Dexterity Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "flash-flood",
    label: "Flash Flood",
    description: "Rapid surges turn routes into violent currents.",
    icon: "icons/svg/water.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "thin-ice",
    label: "Thin Ice",
    description: "Surface fractures can collapse under sudden pressure.",
    icon: "icons/svg/ice-aura.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "dex",
    checkLabel: "Dexterity Save",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "cave-ins",
    label: "Cave-Ins",
    description: "Unstable tunnels and crypt ceilings shed deadly debris.",
    icon: "icons/svg/cave.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "dex",
    checkLabel: "Dexterity Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "rooftop-chase",
    label: "Rooftop Chase",
    description: "Sloped tiles and gaps punish slow or unsteady pursuit.",
    icon: "icons/svg/city.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "acr",
    checkLabel: "Acrobatics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "sewer-navigation",
    label: "Sewer Navigation",
    description: "Slippery channels and hidden drops confound route control.",
    icon: "icons/svg/hazard.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "sur",
    checkLabel: "Survival",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-1" }]
  },
  {
    key: "crowd-movement",
    label: "Crowd Movement",
    description: "Riots and panic flows obstruct movement and timing.",
    icon: "icons/svg/group.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "rough-water-swim",
    label: "Rough Water",
    description: "Currents and surf force repeated swim control checks.",
    icon: "icons/svg/water.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "underwater-exploration",
    label: "Underwater Exploration",
    description: "Breath and visibility constraints punish prolonged action.",
    icon: "icons/svg/bubbles.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "necrotic-zone",
    label: "Necrotic Zone",
    description: "Blighted ground erodes vitality and invites sickness.",
    icon: "icons/svg/skull.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "anti-magic-field",
    label: "Anti-Magic Field",
    description: "Spell flux drops out and magical assumptions fail.",
    icon: "icons/svg/mage-shield.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "arc",
    checkLabel: "Arcana",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "time-warped-area",
    label: "Time-Warped Area",
    description: "Temporal drag/surge introduces reaction desync and confusion.",
    icon: "icons/svg/clockwork.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ins",
    checkLabel: "Insight",
    effectChanges: [{ key: "system.attributes.init.bonus", value: "-1" }]
  },
  {
    key: "haunting-fear-aura",
    label: "Haunting / Fear Aura",
    description: "Oppressive dread weakens resolve in haunted ground.",
    icon: "icons/svg/terror.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "wis",
    checkLabel: "Wisdom Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "foraging-pressure",
    label: "Foraging Pressure",
    description: "Sparse regions increase search strain and time cost.",
    icon: "icons/svg/leaf.svg",
    movementCheck: false,
    checkType: "skill",
    checkKey: "sur",
    checkLabel: "Survival",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "hunting-pressure",
    label: "Hunting Pressure",
    description: "Alert prey and bad cover punish stealthy procurement.",
    icon: "icons/svg/pawprint.svg",
    movementCheck: false,
    checkType: "skill",
    checkKey: "ste",
    checkLabel: "Stealth",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "navigation-pressure",
    label: "Navigation Pressure",
    description: "Trackless routes degrade orientation and route confidence.",
    icon: "icons/svg/compass.svg",
    movementCheck: false,
    checkType: "skill",
    checkKey: "sur",
    checkLabel: "Survival",
    effectChanges: [{ key: "system.skills.prc.bonuses.check", value: "-1" }]
  },
  {
    key: "forced-march",
    label: "Forced March",
    description: "Extended pace increases fatigue and collapse risk.",
    icon: "icons/svg/wingfoot.svg",
    movementCheck: false,
    checkType: "save",
    checkKey: "con",
    checkLabel: "Constitution Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "breaking-barriers",
    label: "Breaking Barriers",
    description: "Rotting beams and locked obstructions require brute force.",
    icon: "icons/svg/door-closed-outline.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "ath",
    checkLabel: "Athletics",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "environmental-traps",
    label: "Environmental Traps",
    description: "Hidden mechanisms and unstable triggers demand careful detection.",
    icon: "icons/svg/trap.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "inv",
    checkLabel: "Investigation",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
  },
  {
    key: "witnessing-horror",
    label: "Witnessing Horror",
    description: "Ritual carnage and mass death strain composure.",
    icon: "icons/svg/terror.svg",
    movementCheck: true,
    checkType: "save",
    checkKey: "wis",
    checkLabel: "Wisdom Save",
    effectChanges: [{ key: "system.bonuses.abilities.save", value: "-1" }]
  },
  {
    key: "soul-marked-manifestation",
    label: "Soul-Marked Manifestation",
    description: "Sigil flares and omen echoes fracture judgment under stress.",
    icon: "icons/svg/eye.svg",
    movementCheck: true,
    checkType: "skill",
    checkKey: "rel",
    checkLabel: "Religion",
    effectChanges: [{ key: "system.bonuses.abilities.check", value: "-1" }]
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

function buildActorIntegrationPayload(actorId, globalContext) {
  const injury = globalContext.injuryRecovery.injuries?.[actorId] ?? null;
  const roleKeys = globalContext.rolesByActorId[actorId] ?? [];
  const watchSlots = globalContext.watchSlotsByActorId[actorId] ?? [];
  const communicationReadiness = globalContext.operations.communication?.readiness ?? { ready: false, enabledCount: 0 };
  const reputationSummary = globalContext.operations.reputation?.summary ?? { hostileCount: 0, highStandingCount: 0 };
  const baseSummary = globalContext.operations.baseOperations ?? { maintenancePressure: 0, readiness: false, activeSites: 0 };
  const environment = globalContext.operations.environment ?? { presetKey: "none", movementDc: 12, appliedActorIds: [], preset: null };
  const environmentPreset = environment.preset ?? getEnvironmentPresetByKey(environment.presetKey);
  const environmentApplies = Array.isArray(environment.appliedActorIds) && environment.appliedActorIds.includes(actorId);
  const environmentCheck = getEnvironmentCheckMeta(environmentPreset);
  const globalModifiers = globalContext.operations.summary?.effects?.globalModifiers ?? {};

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
      minorSavingThrowBonus: Number(globalModifiers.savingThrows ?? 0)
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

function ensureEnvironmentState(ledger) {
  if (!ledger.environment || typeof ledger.environment !== "object") {
    ledger.environment = {
      presetKey: "none",
      movementDc: 12,
      appliedActorIds: [],
      note: "",
      logs: []
    };
  }
  ledger.environment.presetKey = getEnvironmentPresetByKey(String(ledger.environment.presetKey ?? "none")).key;
  const dc = Number(ledger.environment.movementDc ?? 12);
  ledger.environment.movementDc = Number.isFinite(dc) ? Math.max(1, Math.min(30, Math.floor(dc))) : 12;
  if (!Array.isArray(ledger.environment.appliedActorIds)) ledger.environment.appliedActorIds = [];
  ledger.environment.appliedActorIds = ledger.environment.appliedActorIds
    .map((actorId) => String(actorId ?? "").trim())
    .filter((actorId, index, arr) => actorId && arr.indexOf(actorId) === index);
  ledger.environment.note = String(ledger.environment.note ?? "");
  if (!Array.isArray(ledger.environment.logs)) ledger.environment.logs = [];
  ledger.environment.logs = ledger.environment.logs
    .map((entry) => {
      const actorIds = Array.isArray(entry?.actorIds)
        ? entry.actorIds.map((actorId) => String(actorId ?? "").trim()).filter((actorId, index, arr) => actorId && arr.indexOf(actorId) === index)
        : [];
      const createdAt = Number(entry?.createdAt ?? Date.now());
      const checkMeta = getEnvironmentCheckMeta(entry);
      return {
        id: String(entry?.id ?? foundry.utils.randomID()),
        presetKey: getEnvironmentPresetByKey(String(entry?.presetKey ?? "none")).key,
        movementDc: Math.max(1, Math.min(30, Math.floor(Number(entry?.movementDc ?? 12) || 12))),
        actorIds,
        note: String(entry?.note ?? ""),
        checkType: checkMeta.checkType,
        checkKey: checkMeta.checkKey,
        checkLabel: checkMeta.checkLabel,
        createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
        createdBy: String(entry?.createdBy ?? "GM")
      };
    })
    .filter((entry, index, arr) => entry.id && arr.findIndex((candidate) => candidate.id === entry.id) === index);
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

function buildIntegrationEffectData(payload) {
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

  return {
    name: INTEGRATION_EFFECT_NAME,
    img: "icons/svg/aura.svg",
    origin: INTEGRATION_EFFECT_ORIGIN,
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
}

function buildInjuryStatusEffectData(payload) {
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

  return {
    name: `${INJURY_EFFECT_NAME_PREFIX} ${injuryName}`,
    img: icon,
    origin: INJURY_EFFECT_ORIGIN,
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
}

function buildEnvironmentStatusEffectData(payload) {
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
  for (const effectChange of preset.effectChanges ?? []) {
    if (!effectChange?.key || effectChange?.value === undefined || effectChange?.value === null) continue;
    changes.push({
      key: effectChange.key,
      mode: addMode,
      value: String(effectChange.value),
      priority
    });
  }

  return {
    name: `${ENVIRONMENT_EFFECT_NAME_PREFIX} ${label}`,
    img: icon,
    origin: ENVIRONMENT_EFFECT_ORIGIN,
    disabled: false,
    transfer: false,
    description,
    duration: {
      startTime: game.time?.worldTime ?? 0
    },
    changes,
    flags: {
      [MODULE_ID]: {
        environmentStatus: true,
        syncedAt: payload.syncedAt,
        environment: {
          presetKey: String(environment.presetKey ?? "none"),
          label,
          movementCheck,
          checkType: check.checkType,
          checkKey: check.checkKey,
          checkSkill: check.checkType === "skill" ? check.checkKey : "",
          checkLabel: check.checkLabel
        }
      }
    }
  };
}

async function upsertIntegrationEffect(actor, payload) {
  const existing = getIntegrationEffect(actor);
  const data = buildIntegrationEffectData(payload);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeIntegrationEffect(actor) {
  const existing = getIntegrationEffect(actor);
  if (!existing) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
}

async function upsertInjuryStatusEffect(actor, payload) {
  const existing = getInjuryStatusEffect(actor);
  const injuryActive = Boolean(payload?.injury?.active);
  if (!injuryActive) {
    if (existing) await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
    return;
  }
  const data = buildInjuryStatusEffectData(payload);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeInjuryStatusEffect(actor) {
  const existing = getInjuryStatusEffect(actor);
  if (!existing) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
}

async function upsertEnvironmentStatusEffect(actor, payload) {
  const existing = getEnvironmentStatusEffect(actor);
  const active = Boolean(payload?.environment?.active);
  if (!active) {
    if (existing) await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
    return;
  }
  const data = buildEnvironmentStatusEffectData(payload);
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  await existing.update(data);
}

async function removeEnvironmentStatusEffect(actor) {
  const existing = getEnvironmentStatusEffect(actor);
  if (!existing) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", [existing.id]);
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
  const allowed = new Set(["planning", "readiness", "comms", "reputation", "base", "recovery", "gm"]);
  const stored = sessionStorage.getItem(getOperationsPageStorageKey()) ?? "planning";
  if (stored === "supply") return "base";
  if (stored === "gm" && !game.user?.isGM) return "planning";
  return allowed.has(stored) ? stored : "planning";
}

function setActiveOperationsPage(page) {
  if (page === "supply") page = "base";
  const allowed = new Set(["planning", "readiness", "comms", "reputation", "base", "recovery", "gm"]);
  if (page === "gm" && !game.user?.isGM) page = "planning";
  const value = allowed.has(page) ? page : "planning";
  sessionStorage.setItem(getOperationsPageStorageKey(), value);
}

function getOperationsPlanningTabStorageKey() {
  return `po-operations-planning-tab-${game.user?.id ?? "anon"}`;
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
      operationsPageReputation: operationsPage === "reputation",
      operationsPageSupply: false,
      operationsPageBase: operationsPage === "base",
      operationsPageRecovery: operationsPage === "recovery",
      operationsPageGm: operationsPage === "gm",
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
      case "show-communication-brief":
        await showCommunicationBrief();
        break;
      case "set-reputation-score":
        await setReputationScore(element);
        break;
      case "set-reputation-note":
        await setReputationNote(element);
        break;
      case "show-reputation-brief":
        await showReputationBrief();
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
      religious: { score: 0, note: "" },
      nobility: { score: 0, note: "" },
      criminal: { score: 0, note: "" },
      commoners: { score: 0, note: "" }
    },
    supplyLines: {
      resupplyRisk: "moderate",
      caravanEscortPlanned: false,
      caches: [],
      safehouses: []
    },
    baseOperations: {
      maintenanceRisk: "moderate",
      sites: []
    },
    environment: {
      presetKey: "none",
      movementDc: 12,
      appliedActorIds: [],
      note: "",
      logs: []
    },
    partyHealth: {
      modifierEnabled: {}
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
  const ledger = getOperationsLedger();
  mutator(ledger);

  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "ops:replace",
      userId: game.user.id,
      ledger
    });
    if (!options.skipLocalRefresh) refreshOpenApps();
    return;
  }

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
  const reputation = buildReputationContext(ledger.reputation ?? {});
  const baseOperations = buildBaseOperationsContext(ledger.baseOperations ?? {});
  const environmentState = ensureEnvironmentState(ledger);
  const environmentPreset = getEnvironmentPresetByKey(environmentState.presetKey);
  const environmentTargets = getOwnedPcActors()
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
    .map((actor) => ({
      actorId: actor.id,
      actorName: actor.name,
      selected: environmentState.appliedActorIds.includes(actor.id)
    }));
  const environmentActorNames = new Map(environmentTargets.map((target) => [target.actorId, target.actorName]));
  const environmentLogs = (environmentState.logs ?? [])
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
        note: String(entry.note ?? ""),
        hasNote: String(entry.note ?? "").trim().length > 0,
        createdBy: String(entry.createdBy ?? "GM"),
        createdAtLabel: Number.isFinite(createdAtDate.getTime()) ? createdAtDate.toLocaleString() : "Unknown"
      };
    });

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
    environment: {
      presetKey: environmentState.presetKey,
      preset: environmentPreset,
      checkLabel: getEnvironmentCheckMeta(environmentPreset).checkLabel,
      movementDc: environmentState.movementDc,
      note: environmentState.note,
      movementCheckActive: Boolean(environmentPreset.movementCheck),
      targetCount: environmentTargets.filter((target) => target.selected).length,
      appliedActorIds: [...environmentState.appliedActorIds],
      targets: environmentTargets,
      logs: environmentLogs,
      hasLogs: environmentLogs.length > 0,
      presetOptions: ENVIRONMENT_PRESETS.map((preset) => ({
        key: preset.key,
        label: preset.label,
        selected: preset.key === environmentState.presetKey
      }))
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
  const reputation = buildReputationContext(ledger.reputation ?? {});
  const baseOperations = buildBaseOperationsContext(ledger.baseOperations ?? {});
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
  const globalModifierRows = [];

  const addGlobalModifier = (modifierId, key, amount, label, appliesTo) => {
    const value = Number(amount ?? 0);
    if (!Number.isFinite(value) || value === 0) return { enabled: true, value: 0 };
    const enabled = partyHealth.modifierEnabled?.[modifierId] !== false;
    if (enabled) globalModifiers[key] = Number(globalModifiers[key] ?? 0) + value;
    globalModifierRows.push({
      modifierId,
      enabled,
      key,
      appliesTo,
      value,
      label,
      isPositive: value > 0,
      isNegative: value < 0,
      formatted: value > 0 ? `+${value}` : String(value),
      effectiveFormatted: enabled ? (value > 0 ? `+${value}` : String(value)) : "0"
    });
    return { enabled, value };
  };

  if (prepEdge) bonuses.push("Preparation edge active: grant advantage on one operational check this session.");
  if (hasQuartermaster && ledger.sops?.campSetup) bonuses.push("Supply discipline active: reduce one supply-tracking error this rest cycle.");
  if (hasCartographer && ledger.sops?.urbanEntry) bonuses.push("Route discipline active: reduce one navigation uncertainty this session.");
  if (hasChronicler) bonuses.push("Operational recall active: clarify one unknown clue or timeline detail once per session.");
  if (hasSteward) bonuses.push("Stewardship active: reduce one lifestyle/logistics cost friction once per session.");
  if (comms.ready) bonuses.push("Communication discipline active: improve one coordinated response roll by a minor margin.");
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
  if (baseOperations.readiness) {
    const modifier = addGlobalModifier("operational-sheltering", "savingThrows", 1, "Operational sheltering (base ready)", "All saving throws");
    if (modifier.enabled) globalMinorBonuses.push("Operational sheltering: all player actors gain +1 to saving throws while base readiness is stable.");
  }

  if (!ledger.roles?.quartermaster) risks.push("No Quartermaster: increase supply error risk this rest cycle.");
  if (!ledger.sops?.retreatProtocol) risks.push("No retreat protocol: escalate retreat complication by one step.");
  if (activeSops <= 2) risks.push("Low SOP coverage: apply disadvantage on one unplanned operation check.");
  if (!comms.ready) risks.push("Communication gaps: increase misread signal risk during first contact.");
  if (reputation.hostileCount >= 1) risks.push("Faction pressure: increase social or legal complication risk by one step.");
  if (baseOperations.maintenancePressure >= 3) risks.push("Base maintenance pressure: increase safehouse compromise/discovery risk by one step.");

  if (roleCoverage <= 1) addGlobalModifier("poor-role-coverage", "initiative", -1, "Poor role coverage", "Initiative rolls");
  if (activeSops <= 1) addGlobalModifier("insufficient-sop-coverage", "abilityChecks", -1, "Insufficient SOP coverage", "All ability checks");
  if (!comms.ready) addGlobalModifier("communication-gaps", "perceptionChecks", -1, "Communication gaps", "Perception checks");
  if (baseOperations.maintenancePressure >= 3) addGlobalModifier("base-maintenance-pressure", "savingThrows", -1, "Base maintenance pressure", "All saving throws");

  const pressurePenalty = baseOperations.maintenancePressure >= 4 ? 2 : baseOperations.maintenancePressure >= 3 ? 1 : 0;
  const riskScore = roleCoverage + activeSops - pressurePenalty;
  const riskTier = riskScore >= 8 ? "low" : riskScore >= 5 ? "moderate" : "high";

  return {
    prepEdge,
    riskTier,
    bonuses,
    globalMinorBonuses,
    globalModifiers,
    globalModifierRows,
    hasGlobalModifiers: globalModifierRows.length > 0,
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

function getReputationBand(score) {
  const value = Number(score ?? 0);
  if (value <= -3) return "hostile";
  if (value <= -1) return "cold";
  if (value >= 3) return "trusted";
  if (value >= 1) return "favorable";
  return "neutral";
}

function getReputationAccessLabel(score) {
  const band = getReputationBand(score);
  const map = {
    hostile: "Denied",
    cold: "Restricted",
    neutral: "Conditional",
    favorable: "Open",
    trusted: "Privileged"
  };
  return map[band] ?? "Conditional";
}

function buildReputationContext(reputationState) {
  const factions = [
    { key: "religious", label: "Religious Authority" },
    { key: "nobility", label: "Nobility" },
    { key: "criminal", label: "Criminal Factions" },
    { key: "commoners", label: "Common Populace" }
  ].map((faction) => {
    const score = Number(reputationState?.[faction.key]?.score ?? 0);
    const note = String(reputationState?.[faction.key]?.note ?? "");
    const band = getReputationBand(score);
    return {
      key: faction.key,
      label: faction.label,
      score,
      note,
      band,
      access: getReputationAccessLabel(score)
    };
  });

  return {
    factions,
    highStandingCount: factions.filter((faction) => ["favorable", "trusted"].includes(faction.band)).length,
    hostileCount: factions.filter((faction) => faction.band === "hostile").length
  };
}

function getBaseSiteTypeLabel(type) {
  const map = {
    safehouse: "Safehouse",
    chapel: "Chapel",
    watchtower: "Watchtower",
    cell: "Underground Cell"
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

function buildBaseOperationsContext(baseState) {
  const sites = Array.isArray(baseState?.sites)
    ? baseState.sites.map((site, index) => {
      const type = String(site.type ?? "safehouse");
      const status = String(site.status ?? "secure");
      const risk = String(site.risk ?? "moderate");
      const pressure = Math.max(0, Number(site.pressure ?? 0));
      return {
        id: site.id ?? `legacy-base-site-${index}`,
        type,
        typeLabel: getBaseSiteTypeLabel(type),
        name: String(site.name ?? "Unnamed Site"),
        status,
        statusLabel: getBaseSiteStatusLabel(status),
        risk,
        pressure,
        note: String(site.note ?? "")
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
      { value: "cell", label: "Underground Cell", selected: false }
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
  if (!ledger.baseOperations.maintenanceRisk) ledger.baseOperations.maintenanceRisk = "moderate";
  return ledger.baseOperations;
}

function ensurePartyHealthState(ledger) {
  if (!ledger.partyHealth || typeof ledger.partyHealth !== "object") {
    ledger.partyHealth = { modifierEnabled: {} };
  }
  if (!ledger.partyHealth.modifierEnabled || typeof ledger.partyHealth.modifierEnabled !== "object") {
    ledger.partyHealth.modifierEnabled = {};
  }
  return ledger.partyHealth;
}

function ensureSopNotesState(ledger) {
  if (!ledger.sopNotes || typeof ledger.sopNotes !== "object") ledger.sopNotes = {};
  const sopKeys = ["campSetup", "watchRotation", "dungeonBreach", "urbanEntry", "prisonerHandling", "retreatProtocol"];
  for (const key of sopKeys) {
    if (typeof ledger.sopNotes[key] !== "string") ledger.sopNotes[key] = "";
  }
  return ledger.sopNotes;
}

async function setOperationalRole(element) {
  const roleKey = element?.dataset?.role;
  const actorId = element?.value ?? "";
  if (!roleKey) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.roles) ledger.roles = {};
    ledger.roles[roleKey] = actorId;
  });
}

async function clearOperationalRole(element) {
  const roleKey = element?.dataset?.role;
  if (!roleKey) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.roles) ledger.roles = {};
    ledger.roles[roleKey] = "";
  });
}

async function toggleOperationalSOP(element, options = {}) {
  const sopKey = element?.dataset?.sop;
  if (!sopKey) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.sops) ledger.sops = {};
    ledger.sops[sopKey] = Boolean(element?.checked);
  }, options);
}

async function setOperationalResource(element) {
  const resourceKey = element?.dataset?.resource;
  if (!resourceKey) return;
  const isGm = Boolean(game.user?.isGM);
  const upkeepNumericKeys = new Set([
    "partySize",
    "foodPerMember",
    "waterPerMember",
    "foodMultiplier",
    "waterMultiplier",
    "torchPerRest"
  ]);

  if (!isGm && (resourceKey.startsWith("weatherMod:") || upkeepNumericKeys.has(resourceKey))) {
    ui.notifications?.warn("Only the GM can edit upkeep and gather DC settings.");
    return;
  }

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

async function setOperationalSopNote(element) {
  const sopKey = String(element?.dataset?.sop ?? "").trim();
  if (!sopKey) return;
  const note = String(element?.value ?? "");
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
    environment.presetKey = presetKey;
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
      presetKey: environment.presetKey,
      movementDc: environment.movementDc,
      actorIds: [...environment.appliedActorIds],
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
    const entry = environment.logs.find((candidate) => candidate.id === logId);
    if (!entry) return;
    environment.presetKey = getEnvironmentPresetByKey(entry.presetKey).key;
    environment.movementDc = Math.max(1, Math.min(30, Math.floor(Number(entry.movementDc ?? 12) || 12)));
    environment.appliedActorIds = [...(entry.actorIds ?? [])];
    environment.note = String(entry.note ?? "");
  });

  ui.notifications?.info("Loaded environment log into current controls.");
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
    environment.logs = environment.logs.filter((entry) => entry.id !== logId);
  });
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
  const content = `
    <div class="po-help">
      <p><strong>Environment:</strong> ${environment.preset.label}</p>
      <p><strong>Description:</strong> ${environment.preset.description}</p>
      <p><strong>Movement Check:</strong> ${environment.preset.movementCheck ? "Enabled" : "Off"}</p>
      <p><strong>Check:</strong> ${environment.preset.movementCheck ? (environment.checkLabel || "-") : "-"}</p>
      <p><strong>Movement DC (GM):</strong> ${environment.movementDc}</p>
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
      const rollResult = await actor.rollSkill("sur", { fastForward: true, chatMessage: true });
      const total = Number(rollResult?.total ?? rollResult?.roll?.total);
      if (Number.isFinite(total)) return { total, source: "native", roll: rollResult };
    } catch (error) {
      console.warn("party-operations: rollSkill(sur) failed, using fallback roll", error);
    }
  }

  const wisMod = Number(actor?.system?.abilities?.wis?.mod ?? 0);
  const roll = await (new Roll("1d20 + @mod", { mod: wisMod })).evaluate({ async: true });
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor
  });
  return { total: Number(roll.total ?? 0), source: "native", roll };
}

function getActorEnvironmentAssignment(actorId) {
  const ledger = getOperationsLedger();
  const environment = ensureEnvironmentState(ledger);
  const preset = getEnvironmentPresetByKey(environment.presetKey);
  const applies = preset.key !== "none" && environment.appliedActorIds.includes(String(actorId ?? ""));
  if (!applies) return null;
  return {
    preset,
    movementDc: Number(environment.movementDc ?? 12),
    failStatusId: String(preset.failStatusId ?? "").trim(),
    failHaltSquares: Math.max(0, Number(preset.failHaltSquares ?? 0) || 0)
  };
}

async function applyEnvironmentFailureConsequences(tokenDoc, assignment, movementContext = null) {
  if (!game.user.isGM || !tokenDoc || !assignment) return;

  const statusId = String(assignment.failStatusId ?? "").trim();
  if (statusId) {
    try {
      if (typeof tokenDoc.actor?.toggleStatusEffect === "function") {
        await tokenDoc.actor.toggleStatusEffect(statusId, { active: true, overlay: false });
      } else if (tokenDoc.object && typeof tokenDoc.object.toggleEffect === "function") {
        const statusEffect = CONFIG.statusEffects?.find((entry) => entry?.id === statusId) ?? statusId;
        await tokenDoc.object.toggleEffect(statusEffect, { active: true });
      }
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to apply environment status '${statusId}'`, error);
    }
  }

  const haltSquares = Math.max(0, Number(assignment.failHaltSquares ?? 0) || 0);
  if (haltSquares <= 0) return;

  const origin = movementContext?.origin;
  const destination = movementContext?.destination;
  if (!origin || !destination) return;

  const gridSize = Number(canvas?.scene?.grid?.size ?? canvas?.grid?.size ?? 0);
  if (!Number.isFinite(gridSize) || gridSize <= 0) return;
  const maxDistance = haltSquares * gridSize;
  const dx = Number(destination.x ?? 0) - Number(origin.x ?? 0);
  const dy = Number(destination.y ?? 0) - Number(origin.y ?? 0);
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance <= maxDistance) return;

  const ratio = maxDistance / distance;
  const nextX = Math.round(Number(origin.x ?? 0) + (dx * ratio));
  const nextY = Math.round(Number(origin.y ?? 0) + (dy * ratio));

  await tokenDoc.update({ x: nextX, y: nextY }, { poEnvironmentClamp: true });
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
      const roll = await actor.rollAbilitySave(check.checkKey, { fastForward: false, chatMessage: true });
      total = Number(roll?.total ?? roll?.roll?.total);
      if (Number.isFinite(total)) passed = total >= dc;
    } catch (error) {
      console.warn(`${MODULE_ID}: native movement save failed`, error);
    }
  } else if (!Number.isFinite(total) && typeof actor.rollSkill === "function") {
    try {
      const roll = await actor.rollSkill(check.checkKey, { fastForward: false, chatMessage: true });
      total = Number(roll?.total ?? roll?.roll?.total);
      if (Number.isFinite(total)) passed = total >= dc;
    } catch (error) {
      console.warn(`${MODULE_ID}: native movement check failed`, error);
    }
  }

  if (!Number.isFinite(total) && typeof passed !== "boolean") return;
  const failed = typeof passed === "boolean" ? !passed : (Number.isFinite(total) ? total < dc : false);
  if (failed) {
    await applyEnvironmentFailureConsequences(tokenDoc, assignment, movementContext);
  }

  const gmIds = ChatMessage.getWhisperRecipients("GM").map((user) => user.id);
  const resultText = failed ? "Fail" : "Success";
  const totalText = Number.isFinite(total) ? ` (${total})` : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    whisper: gmIds,
    content: `<p><strong>${actor.name}</strong> ${flavor}: ${resultText}${totalText}</p>`
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
              const foodRoll = await (new Roll("1d6 + @mod", { mod: wisMod })).evaluate({ async: true });
              gainedFood = Math.max(0, Math.floor(Number(foodRoll.total ?? 0)));
            }
            if (gatherType === "water" || gatherType === "both") {
              const waterRoll = await (new Roll("1d6 + @mod", { mod: wisMod })).evaluate({ async: true });
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

async function setCommunicationToggle(element) {
  const key = element?.dataset?.comm;
  if (!key) return;
  await updateOperationsLedger((ledger) => {
    if (!ledger.communication) ledger.communication = {};
    ledger.communication[key] = Boolean(element?.checked);
  });
}

async function setCommunicationText(element) {
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
  const faction = element?.dataset?.faction;
  if (!faction) return;
  const raw = Number(element?.value ?? 0);
  const score = Number.isFinite(raw) ? Math.max(-5, Math.min(5, Math.floor(raw))) : 0;
  await updateOperationsLedger((ledger) => {
    if (!ledger.reputation) ledger.reputation = {};
    if (!ledger.reputation[faction]) ledger.reputation[faction] = { score: 0, note: "" };
    ledger.reputation[faction].score = score;
  });
}

async function setReputationNote(element) {
  const faction = element?.dataset?.faction;
  if (!faction) return;
  const note = String(element?.value ?? "").trim();
  await updateOperationsLedger((ledger) => {
    if (!ledger.reputation) ledger.reputation = {};
    if (!ledger.reputation[faction]) ledger.reputation[faction] = { score: 0, note: "" };
    ledger.reputation[faction].note = note;
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

async function setBaseOperationsConfig(element) {
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
  const root = element?.closest(".po-base-site-editor");
  if (!root) return;
  const type = String(root.querySelector("select[name='baseSiteType']")?.value ?? "safehouse");
  const name = String(root.querySelector("input[name='baseSiteName']")?.value ?? "").trim();
  const status = String(root.querySelector("select[name='baseSiteStatus']")?.value ?? "secure");
  const pressureRaw = Number(root.querySelector("input[name='baseSitePressure']")?.value ?? 0);
  const risk = String(root.querySelector("select[name='baseSiteRisk']")?.value ?? "moderate");
  const note = String(root.querySelector("input[name='baseSiteNote']")?.value ?? "").trim();
  if (!name) {
    ui.notifications?.warn("Base site name is required.");
    return;
  }
  const pressure = Number.isFinite(pressureRaw) ? Math.max(0, Math.floor(pressureRaw)) : 0;

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
      note
    });
  });
}

async function clearBaseOperationsSite(element) {
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

async function showBaseOperationsBrief() {
  const baseOperations = buildOperationsContext().baseOperations;
  const sites = baseOperations.sites
    .map((site) => `<li>${site.typeLabel}: ${site.name} · ${site.statusLabel} · Pressure ${site.pressure} · Risk ${site.risk}${site.note ? ` · ${site.note}` : ""}</li>`)
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

  if (isAutomatic && !Number.isFinite(Number(before.resources?.upkeepLastAppliedTs))) {
    await updateOperationsLedger((ledger) => {
      if (!ledger.resources) ledger.resources = {};
      ensureOperationalResourceConfig(ledger.resources);
      ledger.resources.upkeepLastAppliedTs = currentTimestamp;
    }, { skipLocalRefresh: true });
    return;
  }

  const partySize = Math.max(0, Number(upkeep.partySize ?? 0));
  const foodPerMember = Math.max(0, Number(upkeep.foodPerMember ?? 0));
  const waterPerMember = Math.max(0, Number(upkeep.waterPerMember ?? 0));
  const foodMultiplier = Math.max(0, Number(upkeep.foodMultiplier ?? 1));
  const waterMultiplier = Math.max(0, Number(upkeep.waterMultiplier ?? 1));
  const torchPerRest = Math.max(0, Number(upkeep.torchPerRest ?? 0));

  const upkeepDays = getUpkeepDaysFromCalendar(before.resources?.upkeepLastAppliedTs, currentTimestamp);
  if (upkeepDays <= 0) {
    if (!isAutomatic) ui.notifications?.info("No upkeep is due yet (next deduction occurs at 20:00 world time).");
    return;
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

  if (shortages.length > 0) {
    ui.notifications?.warn(`${summary} Shortages: ${shortages.join(", ")}.`);
  } else if (!isAutomatic) {
    ui.notifications?.info(summary);
  }

  const context = buildOperationsContext();
  const effects = context.summary.effects;
  const riskLine = effects.riskTier === "high"
    ? "Operational risk is HIGH: apply one complication roll this cycle."
    : effects.riskTier === "moderate"
      ? "Operational risk is MODERATE: keep one risk trigger in reserve."
      : "Operational risk is LOW.";

  if (!isAutomatic || shortages.length > 0) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
      content: `<p><strong>Daily Upkeep</strong></p><p>${summary}</p>${itemSummary ? `<p><strong>Actor Item Depletion:</strong> ${itemSummary}</p>` : ""}<p>${riskLine}</p>`
    });
  }
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
  const state = getInjuryRecoveryState();
  mutator(state);

  if (!game.user.isGM) {
    game.socket.emit(SOCKET_CHANNEL, {
      type: "injury:replace",
      userId: game.user.id,
      state
    });
    refreshOpenApps();
    return;
  }

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
  const dueTimestamp = Number(entry?.recoveryDueTs ?? getCurrentWorldTimestamp());
  const nowTimestamp = getCurrentWorldTimestamp();
  const recoveryDays = Math.max(0, Number(entry?.recoveryDays ?? 0));
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
    startTimestamp: nowTimestamp,
    timestamp: dueTimestamp,
    endTimestamp: dueTimestamp,
    allDay: true,
    isPrivate: false,
    showToPlayers: true,
    playerVisible: true,
    flags: {
      [MODULE_ID]: {
        injuryActorId: actor?.id ?? ""
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
  if (!game.user.isGM || !isSimpleCalendarActive()) return false;
  const api = getSimpleCalendarApi();
  if (!api) {
    logSimpleCalendarSyncDebug("Simple Calendar API missing during injury sync", { actorId });
    return false;
  }
  if (!hasSimpleCalendarMutationApi(api)) {
    logSimpleCalendarSyncDebug("Simple Calendar API present but has no recognized mutation methods", { actorId });
    return false;
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
    return false;
  }

  const payload = buildInjuryCalendarPayload(actor, entry);
  const existingId = String(entry.calendarEntryId ?? "");
  let syncedId = existingId;
  let synced = false;

  if (existingId) {
    synced = await updateSimpleCalendarEntry(api, existingId, payload);
  }

  if (!synced) {
    const created = await createSimpleCalendarEntry(api, payload);
    if (created.success) {
      synced = true;
      if (created.id) syncedId = created.id;
    } else {
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
      existingEntryId: existingId || "(none)"
    });
  }

  return synced;
}

async function clearInjuryFromSimpleCalendar(entryId) {
  if (!game.user.isGM || !isSimpleCalendarActive() || !entryId) return false;
  const api = getSimpleCalendarApi();
  if (!api) return false;
  return removeSimpleCalendarEntry(api, entryId);
}

async function syncAllInjuriesToSimpleCalendar() {
  if (!game.user.isGM) return { synced: 0, total: 0 };
  const injuries = Object.keys(getInjuryRecoveryState().injuries ?? {});
  let synced = 0;
  for (const actorId of injuries) {
    if (await syncInjuryWithSimpleCalendar(actorId)) synced += 1;
  }
  return { synced, total: injuries.length };
}

async function setInjuryRecoveryConfig(element) {
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
  const rollResult = await (new Roll("1d100")).evaluate({ async: true });
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
    const roll = await (new Roll("1d20 + @mod", { mod: conMod })).evaluate({ async: true });
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
  const rollResult = await healer.rollSkill(skill, { fastForward: true, chatMessage: true });
  const total = Number(rollResult?.total ?? rollResult?.roll?.total ?? 0);
  return total >= dcValue;
}

async function upsertInjuryEntry(element) {
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
    const simpleCalendarApi = getSimpleCalendarApi();
    const hasMutationApi = hasSimpleCalendarMutationApi(simpleCalendarApi);
    const synced = await syncInjuryWithSimpleCalendar(actorId);
    if (isSimpleCalendarActive() && hasMutationApi && !synced) {
      ui.notifications?.warn(`Injury saved, but Simple Calendar sync was unavailable for ${game.actors.get(actorId)?.name ?? "actor"}.`);
    } else if (isSimpleCalendarActive() && !hasMutationApi) {
      ui.notifications?.info("Injury saved. Simple Calendar API is not currently available in this session.");
    } else if (synced) {
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

async function applyRecoveryCycle() {
  const state = getInjuryRecoveryState();

  const entries = Object.entries(state.injuries ?? {});
  if (entries.length === 0) {
    ui.notifications?.info("No tracked injuries to process.");
    return;
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
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Recovery Cycle</strong></p><p>${summary}</p>`
  });

  for (const entryId of calendarEntriesToClear) {
    await clearInjuryFromSimpleCalendar(entryId);
  }
  for (const actorId of actorsToSync) {
    await syncInjuryWithSimpleCalendar(actorId);
  }
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

function getSimpleCalendarApi() {
  return globalThis.SimpleCalendar?.api ?? game?.simpleCalendar?.api ?? null;
}

function getSimpleCalendarMutationMethods(api) {
  if (!api) return { updateMethods: [], createMethods: [], removeMethods: [] };
  const updateMethods = [api.updateEvent, api.updateNote, api.updateEntry].filter((fn) => typeof fn === "function");
  const createMethods = [api.addEvent, api.createEvent, api.addNote, api.createNote, api.addCalendarNote].filter((fn) => typeof fn === "function");
  const removeMethods = [api.removeEvent, api.deleteEvent, api.removeNote, api.deleteNote, api.removeEntry].filter((fn) => typeof fn === "function");
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

async function updateSimpleCalendarEntry(api, entryId, payload) {
  if (!api || !entryId) return false;
  const candidates = getSimpleCalendarMutationMethods(api).updateMethods;
  let lastError = null;
  for (const fn of candidates) {
    const methodName = String(fn.name || "unknownUpdateMethod");
    try {
      await fn.call(api, entryId, payload);
      return true;
    } catch (error) {
      lastError = error;
      try {
        await fn.call(api, { id: entryId, ...payload });
        return true;
      } catch (nestedError) {
        lastError = nestedError;
        try {
          await fn.call(api, payload, entryId);
          return true;
        } catch (fallbackError) {
          lastError = fallbackError;
          logSimpleCalendarSyncDebug("Update method signature attempts failed", {
            methodName,
            entryId,
            reason: String(fallbackError?.message ?? fallbackError ?? "unknown")
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
  let lastError = null;
  for (const fn of candidates) {
    const methodName = String(fn.name || "unknownCreateMethod");
    try {
      const result = await fn.call(api, payload);
      const id = extractCalendarEntryId(result);
      return { success: true, id };
    } catch (error) {
      lastError = error;
      try {
        const result = await fn.call(api, { ...payload });
        const id = extractCalendarEntryId(result);
        return { success: true, id };
      } catch (nestedError) {
        lastError = nestedError;
        logSimpleCalendarSyncDebug("Create method signature attempts failed", {
          methodName,
          reason: String(nestedError?.message ?? nestedError ?? "unknown")
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
  for (const fn of candidates) {
    try {
      await fn.call(api, entryId);
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
  const langs = actor?.system?.traits?.languages?.value;
  if (!langs || langs.length === 0) return null;
  if (langs.length <= 3) return langs.join(", ");
  return `${langs.length} langs`;
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
  const launcherHeight = Math.max(248, Number(launcher?.offsetHeight ?? 248));
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
  const launcherHeight = Math.max(220, Number(launcher?.offsetHeight ?? 220));
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
      <div class="po-floating-handle" title="Drag to move">⋮⋮</div>
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
    const hasOperationsBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="operations"]'));
    const hasGmBtn = Boolean(launcher.querySelector('.po-floating-btn[data-action="gm"]'));
    if (!hasOperationsBtn || !hasGmBtn) {
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

  game.partyOperations = {
    restWatch: () => new RestWatchApp().render({ force: true }),
    marchingOrder: () => new MarchingOrderApp().render({ force: true }),
    refreshAll: () => refreshOpenApps(),
    getOperations: () => foundry.utils.deepClone(getOperationsLedger()),
    applyUpkeep: () => applyOperationalUpkeep(),
    getInjuryRecovery: () => foundry.utils.deepClone(getInjuryRecoveryState()),
    applyRecoveryCycle: () => applyRecoveryCycle(),
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
    new RestWatchApp().render({ force: true });
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
    if (message.type === "ops:replace") {
      const ledger = message.ledger;
      if (!ledger || typeof ledger !== "object") return;
      await game.settings.set(MODULE_ID, SETTINGS.OPS_LEDGER, ledger);
      scheduleIntegrationSync("operations-ledger-socket");
      refreshOpenApps();
      emitSocketRefresh();
      return;
    }
    if (message.type === "injury:replace") {
      const previous = getInjuryRecoveryState();
      const state = message.state;
      if (!state || typeof state !== "object") return;
      await game.settings.set(MODULE_ID, SETTINGS.INJURY_RECOVERY, state);
      const previousInjuries = previous.injuries ?? {};
      const nextInjuries = state.injuries ?? {};
      const removedActorIds = Object.keys(previousInjuries).filter((actorId) => !nextInjuries[actorId]);
      for (const actorId of removedActorIds) {
        const priorCalendarEntryId = String(previousInjuries[actorId]?.calendarEntryId ?? "");
        if (priorCalendarEntryId) await clearInjuryFromSimpleCalendar(priorCalendarEntryId);
      }
      await syncAllInjuriesToSimpleCalendar();
      scheduleIntegrationSync("injury-recovery-socket");
      refreshOpenApps();
      emitSocketRefresh();
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
});

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
