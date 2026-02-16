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
  LOOT_SOURCE_CONFIG: "lootSourceConfig",
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
let launcherRecoveryScheduled = false;
const LAUNCHER_RECOVERY_DELAYS_MS = [120, 500, 1400, 3200];

const INTEGRATION_MODES = {
  AUTO: "auto",
  OFF: "off",
  FLAGS: "flags",
  DAE: "dae"
};

const NON_PARTY_SYNC_SCOPES = {
  SCENE: "scene",
  WORLD_NON_PARTY: "world-non-party",
  WORLD_ALL: "world-all"
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
const DEFAULT_MARCH_LIGHT_BRIGHT = 20;
const DEFAULT_MARCH_LIGHT_DIM = 40;
const SOP_KEYS = ["campSetup", "watchRotation", "dungeonBreach", "urbanEntry", "prisonerHandling", "retreatProtocol"];
const LOOT_WORLD_ITEMS_SOURCE_ID = "__world_items__";
const LOOT_DEFAULT_ITEM_TYPES = ["weapon", "equipment", "consumable", "loot"];
const LOOT_ITEM_TYPE_LABELS = {
  weapon: "Weapons",
  equipment: "Equipment",
  consumable: "Consumables",
  loot: "Treasure/Loot",
  tool: "Tools",
  backpack: "Containers",
  armor: "Armor",
  ammunition: "Ammunition",
  trinket: "Trinkets",
  spell: "Spell Items",
  feat: "Feat-like Items",
  class: "Class Features",
  race: "Race Features"
};
const LOOT_TABLE_TYPE_OPTIONS = [
  { value: "currency", label: "Currency" },
  { value: "gems", label: "Gems" },
  { value: "art", label: "Art Objects" },
  { value: "equipment", label: "Equipment" },
  { value: "consumables", label: "Consumables" },
  { value: "special", label: "Special Drops" }
];
const LOOT_RARITY_OPTIONS = [
  { value: "", label: "No Floor/Ceiling" },
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "very-rare", label: "Very Rare" },
  { value: "legendary", label: "Legendary" }
];
const LOOT_PREVIEW_MODE_OPTIONS = [
  { value: "horde", label: "Horde Loot" },
  { value: "defeated", label: "Defeated Enemy Loot" },
  { value: "encounter", label: "Encounter Assignment Loot" }
];
const LOOT_PREVIEW_PROFILE_OPTIONS = [
  { value: "poor", label: "Poorly Equipped" },
  { value: "standard", label: "Standard Equipment" },
  { value: "well", label: "Well Equipped" }
];
const LOOT_PREVIEW_CHALLENGE_OPTIONS = [
  { value: "low", label: "Low (CR 0-4)" },
  { value: "mid", label: "Mid (CR 5-10)" },
  { value: "high", label: "High (CR 11-16)" },
  { value: "epic", label: "Epic (CR 17+)" }
];
const LOOT_PREVIEW_SCALE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "major", label: "Major" }
];
const DOWNTIME_ACTION_OPTIONS = [
  {
    key: "carousing",
    label: "Carousing",
    guidance: "Social networking, rumors, and contacts."
  },
  {
    key: "crafting",
    label: "Crafting",
    guidance: "Create mundane items and accrue work progress."
  },
  {
    key: "profession",
    label: "Practicing A Profession",
    guidance: "Earn coin through work during downtime."
  },
  {
    key: "recuperating",
    label: "Recuperating",
    guidance: "Recover condition and reduce stress/wounds."
  },
  {
    key: "research",
    label: "Research",
    guidance: "Discover clues, lore, or leads."
  },
  {
    key: "training",
    label: "Training",
    guidance: "Build progress toward a language/tool proficiency."
  }
];
const DOWNTIME_TUNING_ECONOMY_OPTIONS = [
  { value: "stingy", label: "Stingy Economy" },
  { value: "standard", label: "Standard Economy" },
  { value: "generous", label: "Generous Economy" }
];
const DOWNTIME_TUNING_RISK_OPTIONS = [
  { value: "safe", label: "Low Complication Risk" },
  { value: "standard", label: "Standard Risk" },
  { value: "hazardous", label: "High Complication Risk" }
];
const DOWNTIME_TUNING_DISCOVERY_OPTIONS = [
  { value: "low", label: "Sparse Discovery" },
  { value: "standard", label: "Standard Discovery" },
  { value: "high", label: "Rich Discovery" }
];
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
  "set-downtime-hours",
  "set-downtime-tuning",
  "set-downtime-resolve-target",
  "prefill-downtime-resolution",
  "resolve-selected-downtime-entry",
  "resolve-downtime-actions",
  "clear-downtime-results",
  "set-party-health-modifier",
  "set-party-health-sync-scope",
  "set-party-health-custom-field",
  "set-party-health-sync-non-party",
  "add-party-health-custom",
  "remove-party-health-custom",
  "toggle-loot-pack-source",
  "set-loot-pack-weight",
  "toggle-loot-table-source",
  "set-loot-table-type",
  "toggle-loot-item-type",
  "set-loot-rarity-floor",
  "set-loot-rarity-ceiling",
  "reset-loot-source-config",
  "set-loot-preview-field",
  "roll-loot-preview",
  "clear-loot-preview",
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
  "gm-quick-weather-delete-preset",
  "apply-non-party-sync-actor",
  "clear-non-party-sync-actor",
  "reapply-all-non-party-sync",
  "clear-all-non-party-sync"
]);
const UPKEEP_DUSK_MINUTES = 20 * 60;
const ENVIRONMENT_MOVE_PROMPT_COOLDOWN_MS = 6000;
const environmentMovePromptByActor = new Map();
const environmentMoveOriginByToken = new Map();
const SOCKET_NOTE_MAX_LENGTH = 4000;
const SOCKET_ACTIVITY_TYPES = new Set(["rested", "light", "heavy", "strenuous"]);
const SOCKET_REST_OPS = new Set(["assignMe", "clearEntry", "setEntryNotes"]);
const SOCKET_MARCH_OPS = new Set(["joinRank", "setNote"]);
const SOCKET_MARCH_RANKS = new Set(["front", "middle", "rear"]);

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

function refreshTabAccessibility(root) {
  if (!root?.querySelectorAll) return;
  const tablists = Array.from(root.querySelectorAll("[role='tablist']"));
  for (const tablist of tablists) {
    const tabs = Array.from(tablist.querySelectorAll(".po-tab"));
    if (tabs.length === 0) continue;

    const activeTab = tabs.find((tab) => tab.classList.contains("is-active")) ?? tabs[0];
    for (const tab of tabs) {
      const isActive = tab === activeTab;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
    }

    if (tablist.dataset.poTabA11yBound === "1") continue;
    tablist.dataset.poTabA11yBound = "1";
    tablist.addEventListener("keydown", (event) => {
      const key = String(event.key ?? "");
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(key)) return;
      const currentTabs = Array.from(tablist.querySelectorAll(".po-tab"));
      if (currentTabs.length === 0) return;
      const current = event.target?.closest?.(".po-tab");
      const currentIndex = Math.max(0, currentTabs.indexOf(current));
      let targetIndex = currentIndex;
      if (key === "ArrowRight") targetIndex = (currentIndex + 1) % currentTabs.length;
      if (key === "ArrowLeft") targetIndex = (currentIndex - 1 + currentTabs.length) % currentTabs.length;
      if (key === "Home") targetIndex = 0;
      if (key === "End") targetIndex = currentTabs.length - 1;
      const target = currentTabs[targetIndex];
      if (!target) return;
      event.preventDefault();
      target.focus();
      target.click();
    });
  }
}

function syncNotesDisclosureState(root) {
  if (!root?.querySelectorAll) return;
  root.querySelectorAll(".po-watch-entry").forEach((entry, index) => {
    const notes = entry.querySelector(".po-notes");
    const toggleButton = entry.querySelector("[data-action='toggle-notes']");
    if (!notes || !toggleButton) return;
    if (!notes.id) notes.id = `po-notes-auto-${index}-${foundry.utils.randomID()}`;
    const noteValue = String(notes.querySelector("textarea")?.value ?? "").trim();
    if (noteValue) notes.classList.add("is-active");
    const expanded = notes.classList.contains("is-active");
    toggleButton.setAttribute("aria-controls", notes.id);
    toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    notes.setAttribute("aria-hidden", expanded ? "false" : "true");
  });
}

function sanitizeSocketIdentifier(value, options = {}) {
  const maxLength = Number.isFinite(Number(options.maxLength)) ? Math.max(1, Math.floor(Number(options.maxLength))) : 128;
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) return "";
  return normalized;
}

function clampSocketText(value, maxLength = SOCKET_NOTE_MAX_LENGTH) {
  const cap = Number.isFinite(Number(maxLength)) ? Math.max(0, Math.floor(Number(maxLength))) : SOCKET_NOTE_MAX_LENGTH;
  return String(value ?? "").slice(0, cap);
}

function resolveRequester(userOrId, options = {}) {
  const allowGM = options.allowGM !== false;
  const requireActive = options.requireActive === true;
  const requester = typeof userOrId === "string" ? game.users.get(userOrId) : userOrId;
  if (!requester) return null;
  if (!allowGM && requester.isGM) return null;
  if (requireActive && !requester.active) return null;
  return requester;
}

function getSocketRequester(message, options = {}) {
  const userId = sanitizeSocketIdentifier(message?.userId, { maxLength: 64 });
  if (!userId) return null;
  return resolveRequester(userId, options);
}

function normalizeSocketActivityType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return SOCKET_ACTIVITY_TYPES.has(normalized) ? normalized : "";
}

function normalizeSocketRestRequest(request) {
  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!SOCKET_REST_OPS.has(op)) return null;
  const slotId = sanitizeSocketIdentifier(request.slotId, { maxLength: 64 });
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!slotId || !actorId) return null;

  if (op === "setEntryNotes") {
    return {
      op,
      slotId,
      actorId,
      text: clampSocketText(request.text, SOCKET_NOTE_MAX_LENGTH)
    };
  }
  return { op, slotId, actorId };
}

function normalizeSocketMarchRequest(request) {
  if (!request || typeof request !== "object") return null;
  const op = String(request.op ?? "").trim();
  if (!SOCKET_MARCH_OPS.has(op)) return null;
  const actorId = sanitizeSocketIdentifier(request.actorId, { maxLength: 64 });
  if (!actorId) return null;

  if (op === "joinRank") {
    const rankId = String(request.rankId ?? "").trim();
    if (!SOCKET_MARCH_RANKS.has(rankId)) return null;
    return { op, actorId, rankId };
  }

  return {
    op,
    actorId,
    text: clampSocketText(request.text, SOCKET_NOTE_MAX_LENGTH)
  };
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
  const operationsWindow = root.querySelector(".po-window[data-main-tab='operations'], .po-window[data-main-tab='gm']");
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

async function setModuleSettingWithLocalRefreshSuppressed(settingKey, value) {
  const fullSettingKey = `${MODULE_ID}.${settingKey}`;
  suppressNextSettingRefresh(fullSettingKey);
  await game.settings.set(MODULE_ID, settingKey, value);
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

function isMissingActiveEffectError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("activeeffect") && message.includes("does not exist");
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

async function upsertManagedEffect(actor, existing, data, contextLabel = "sync") {
  if (!actor || !data) return;
  if (!existing) {
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
    return;
  }
  try {
    await existing.update(data);
  } catch (error) {
    if (!isMissingActiveEffectError(error)) throw error;
    console.warn(`${MODULE_ID}: stale ${contextLabel} effect reference ${existing.id}; recreating.`);
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
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
  await upsertManagedEffect(actor, existing, data, "integration");
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
  await upsertManagedEffect(actor, existing, data, "injury");
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
  await upsertManagedEffect(actor, existing, data, "environment");
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

function getSceneNonPartySyncConfig(globalContext) {
  const context = globalContext ?? buildIntegrationGlobalContext();
  const partyHealth = context.operations?.partyHealth ?? {};
  const environment = context.operations?.environment ?? {};
  const scope = getNonPartySyncScope(partyHealth.nonPartySyncScope);
  const syncWorldGlobal = Boolean(partyHealth.syncToSceneNonParty);
  const syncEnvironment = Boolean(environment.syncToSceneNonParty && String(environment.presetKey ?? "none") !== "none");
  return {
    context,
    scope,
    scopeLabel: getNonPartySyncScopeLabel(scope),
    syncWorldGlobal,
    syncEnvironment,
    enabled: syncWorldGlobal || syncEnvironment
  };
}

async function syncSingleSceneNonPartyActor(actor, globalContext, resolvedMode, options = {}) {
  if (!actor) return { synced: false, cleared: false, skipped: true, enabled: false };
  const mode = resolvedMode ?? resolveIntegrationMode();
  const config = getSceneNonPartySyncConfig(globalContext);
  const enabled = Boolean(config.enabled);

  if (!enabled || mode === INTEGRATION_MODES.OFF) {
    const hasSync = Boolean(actor.getFlag(MODULE_ID, "sync"));
    const hasEffect = Boolean(getIntegrationEffect(actor));
    const hasInjuryEffect = Boolean(getInjuryStatusEffect(actor));
    const hasEnvironmentEffect = Boolean(getEnvironmentStatusEffect(actor));
    if (hasSync || hasEffect || hasInjuryEffect || hasEnvironmentEffect) {
      await clearActorIntegrationPayload(actor);
      return { synced: false, cleared: true, skipped: false, enabled };
    }
    return { synced: false, cleared: false, skipped: true, enabled };
  }

  const applyAsNonParty = !isTrackableCharacter(actor);
  const payload = buildActorIntegrationPayload(actor.id, config.context, {
    nonParty: applyAsNonParty,
    includeWorldGlobal: config.syncWorldGlobal,
    forceEnvironmentApply: config.syncEnvironment && options.includeEnvironment === true
  });
  await applyActorIntegrationPayload(actor, payload, mode);
  return { synced: true, cleared: false, skipped: false, enabled };
}

async function syncSceneNonPartyIntegrationActors(globalContext, resolvedMode, options = {}) {
  if (!game.user.isGM) return { synced: 0, cleared: 0, total: 0, enabled: false };
  const mode = resolvedMode ?? resolveIntegrationMode();
  const config = getSceneNonPartySyncConfig(globalContext);
  const scope = getNonPartySyncScope(options.scope ?? config.scope);
  const targets = getNonPartyIntegrationTargets(scope);
  let synced = 0;
  let cleared = 0;

  for (const target of targets) {
    const actor = target?.actor;
    if (!actor) continue;
    const result = await syncSingleSceneNonPartyActor(actor, config.context, mode, {
      includeEnvironment: target.isSceneTarget === true
    });
    if (result.synced) synced += 1;
    if (result.cleared) cleared += 1;
  }

  return {
    synced,
    cleared,
    total: targets.length,
    enabled: Boolean(config.enabled),
    scope,
    scopeLabel: getNonPartySyncScopeLabel(scope)
  };
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
  await syncSceneNonPartyIntegrationActors(globalContext, resolvedMode);
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
  const stored = String(sessionStorage.getItem(getRestMainTabStorageKey()) ?? "rest-watch").trim().toLowerCase();
  if (stored === "gm" && game.user?.isGM) return "gm";
  if (stored === "operations") return "operations";
  return "rest-watch";
}

function setActiveRestMainTab(tab) {
  const value = tab === "gm" && game.user?.isGM
    ? "gm"
    : (tab === "operations" ? "operations" : "rest-watch");
  sessionStorage.setItem(getRestMainTabStorageKey(), value);
}

function getRestMainTabLabel(tab = getActiveRestMainTab()) {
  const value = String(tab ?? "").trim().toLowerCase();
  if (value === "gm") return "GM";
  if (value === "operations") return "Operations";
  return "Rest Watch";
}

function getRestMainWindowTitle(tab = getActiveRestMainTab()) {
  return `Party Operations - ${getRestMainTabLabel(tab)}`;
}

function syncApplicationWindowTitle(app, title) {
  const label = String(title ?? "").trim();
  if (!app || !label) return;
  if (app.options?.window) app.options.window.title = label;
  const root = getAppRootElement(app);
  const frame = root?.closest?.(".application, .app") ?? null;
  const titleNode = frame?.querySelector?.(".window-title, .window-header .title") ?? null;
  if (titleNode) titleNode.textContent = label;
}

function getOperationsPageStorageKey() {
  return `po-operations-page-${game.user?.id ?? "anon"}`;
}

function getActiveOperationsPage() {
  const allowed = new Set(["planning", "readiness", "comms", "reputation", "base", "downtime", "recovery", "gm"]);
  const stored = sessionStorage.getItem(getOperationsPageStorageKey()) ?? "planning";
  if (stored === "supply") return "base";
  if (stored === "gm" && !game.user?.isGM) return "planning";
  return allowed.has(stored) ? stored : "planning";
}

function setActiveOperationsPage(page) {
  if (page === "supply") page = "base";
  const allowed = new Set(["planning", "readiness", "comms", "reputation", "base", "downtime", "recovery", "gm"]);
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

function getLootPackSourcesUiStorageKey() {
  return `po-loot-pack-sources-ui-${game.user?.id ?? "anon"}`;
}

function normalizeLootPackSourcesFilter(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
}

function getLootPackSourcesUiState() {
  const defaults = { collapsed: false, filter: "" };
  const raw = sessionStorage.getItem(getLootPackSourcesUiStorageKey());
  if (!raw) return defaults;
  try {
    const parsed = JSON.parse(raw);
    return {
      collapsed: Boolean(parsed?.collapsed),
      filter: normalizeLootPackSourcesFilter(parsed?.filter)
    };
  } catch (_error) {
    return defaults;
  }
}

function setLootPackSourcesUiState(patch = {}) {
  const previous = getLootPackSourcesUiState();
  const next = {
    collapsed: (patch?.collapsed === undefined) ? previous.collapsed : Boolean(patch.collapsed),
    filter: (patch?.filter === undefined) ? previous.filter : normalizeLootPackSourcesFilter(patch.filter)
  };
  sessionStorage.setItem(getLootPackSourcesUiStorageKey(), JSON.stringify(next));
}

function getLootRegistryTabStorageKey() {
  return `po-loot-registry-tab-${game.user?.id ?? "anon"}`;
}

function getActiveLootRegistryTab() {
  const stored = String(sessionStorage.getItem(getLootRegistryTabStorageKey()) ?? "preview").trim().toLowerCase();
  return stored === "settings" ? "settings" : "preview";
}

function setActiveLootRegistryTab(tab) {
  const value = String(tab ?? "preview").trim().toLowerCase();
  sessionStorage.setItem(getLootRegistryTabStorageKey(), value === "settings" ? "settings" : "preview");
}

function getNonPartySyncFilterStorageKey() {
  return `po-non-party-sync-filter-${game.user?.id ?? "anon"}`;
}

function normalizeNonPartySyncFilterKeyword(value) {
  return normalizeLootPackSourcesFilter(value);
}

function getNonPartySyncFilterKeyword() {
  return normalizeNonPartySyncFilterKeyword(sessionStorage.getItem(getNonPartySyncFilterStorageKey()));
}

function setNonPartySyncFilterKeyword(value) {
  const normalized = normalizeNonPartySyncFilterKeyword(value);
  if (!normalized) {
    sessionStorage.removeItem(getNonPartySyncFilterStorageKey());
    return;
  }
  sessionStorage.setItem(getNonPartySyncFilterStorageKey(), normalized);
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

function getLootPreviewDraftStorageKey() {
  return `po-loot-preview-draft-${game.user?.id ?? "anon"}`;
}

function getLootPreviewResultStorageKey() {
  return `po-loot-preview-result-${game.user?.id ?? "anon"}`;
}

function normalizeLootPreviewDraft(input = {}) {
  const mode = String(input?.mode ?? "horde").trim().toLowerCase();
  const profile = String(input?.profile ?? "standard").trim().toLowerCase();
  const challenge = String(input?.challenge ?? "mid").trim().toLowerCase();
  const scale = String(input?.scale ?? "medium").trim().toLowerCase();
  const actorCountRaw = Number(input?.actorCount ?? 1);
  const actorCount = Number.isFinite(actorCountRaw) ? Math.max(1, Math.min(100, Math.floor(actorCountRaw))) : 1;
  const modeAllowed = new Set(LOOT_PREVIEW_MODE_OPTIONS.map((entry) => entry.value));
  const profileAllowed = new Set(LOOT_PREVIEW_PROFILE_OPTIONS.map((entry) => entry.value));
  const challengeAllowed = new Set(LOOT_PREVIEW_CHALLENGE_OPTIONS.map((entry) => entry.value));
  const scaleAllowed = new Set(LOOT_PREVIEW_SCALE_OPTIONS.map((entry) => entry.value));
  return {
    mode: modeAllowed.has(mode) ? mode : "horde",
    profile: profileAllowed.has(profile) ? profile : "standard",
    challenge: challengeAllowed.has(challenge) ? challenge : "mid",
    scale: scaleAllowed.has(scale) ? scale : "medium",
    actorCount
  };
}

function getLootPreviewDraft() {
  const raw = sessionStorage.getItem(getLootPreviewDraftStorageKey());
  if (!raw) return normalizeLootPreviewDraft({});
  try {
    return normalizeLootPreviewDraft(JSON.parse(raw));
  } catch {
    return normalizeLootPreviewDraft({});
  }
}

function setLootPreviewDraft(draft = {}) {
  const normalized = normalizeLootPreviewDraft(draft);
  sessionStorage.setItem(getLootPreviewDraftStorageKey(), JSON.stringify(normalized));
}

function getLootPreviewResult() {
  const raw = sessionStorage.getItem(getLootPreviewResultStorageKey());
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function setLootPreviewResult(result = null) {
  if (!result) {
    sessionStorage.removeItem(getLootPreviewResultStorageKey());
    return;
  }
  sessionStorage.setItem(getLootPreviewResultStorageKey(), JSON.stringify(result));
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
  const allowed = new Set(["environment", "logs", "derived", "active-sync", "non-party", "custom", "loot-sources"]);
  return allowed.has(stored) ? stored : "environment";
}

function setActiveGmOperationsTab(tab) {
  const value = String(tab ?? "environment").trim().toLowerCase();
  const allowed = new Set(["environment", "logs", "derived", "active-sync", "non-party", "custom", "loot-sources"]);
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

function getElementStatePath(node, root) {
  if (!node || !root || !(node instanceof HTMLElement)) return "";
  const segments = [];
  let cursor = node;
  while (cursor && cursor !== root && cursor instanceof HTMLElement) {
    const parent = cursor.parentElement;
    let siblingIndex = 0;
    if (parent) {
      const siblings = Array.from(parent.children).filter((entry) => entry.tagName === cursor.tagName);
      const found = siblings.indexOf(cursor);
      siblingIndex = found >= 0 ? found : 0;
    }
    const tag = cursor.tagName.toLowerCase();
    const idPart = cursor.id ? `#${cursor.id}` : "";
    const actionPart = cursor.dataset?.action ? `[a=${cursor.dataset.action}]` : "";
    const pagePart = cursor.dataset?.page ? `[p=${cursor.dataset.page}]` : "";
    const tabPart = cursor.dataset?.tab ? `[t=${cursor.dataset.tab}]` : "";
    segments.unshift(`${tag}:${siblingIndex}${idPart}${actionPart}${pagePart}${tabPart}`);
    cursor = parent;
  }
  return segments.join(">");
}

function captureDisclosureState(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll("details"))
    .map((details) => {
      const key = getElementStatePath(details, root);
      if (!key) return null;
      return {
        key,
        open: details.open === true
      };
    })
    .filter(Boolean);
}

function applyDisclosureState(root, disclosureState) {
  if (!root || !Array.isArray(disclosureState) || disclosureState.length === 0) return;
  const map = new Map(
    disclosureState
      .filter((entry) => entry && typeof entry.key === "string")
      .map((entry) => [entry.key, entry.open === true])
  );
  if (map.size === 0) return;
  root.querySelectorAll("details").forEach((details) => {
    const key = getElementStatePath(details, root);
    if (!key || !map.has(key)) return;
    const shouldOpen = map.get(key) === true;
    if (details.open !== shouldOpen) details.open = shouldOpen;
  });
}

function captureUiState(app) {
  const root = getAppRootElement(app);
  if (!root) return null;

  if (app instanceof RestWatchApp || app instanceof RestWatchPlayerApp) {
    const openNotes = Array.from(root.querySelectorAll(".po-watch-entry .po-notes.is-active"))
      .map((notes) => getWatchEntryStateKey(notes.closest(".po-watch-entry")))
      .filter(Boolean);
    return {
      type: "rest",
      openNotes,
      disclosures: captureDisclosureState(root)
    };
  }

  if (app instanceof MarchingOrderApp) {
    return {
      type: "march",
      disclosures: captureDisclosureState(root)
    };
  }

  return null;
}

function applyUiState(app, state) {
  if (!state) return;
  const root = getAppRootElement(app);
  if (!root) return;
  applyDisclosureState(root, state.disclosures);

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
  const apply = () => applyScrollState(root, states);
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
  setTimeout(apply, 50);
  setTimeout(apply, 180);
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
    const operationsTabActive = mainTab === "operations" || mainTab === "gm";
    const operationsPageValue = mainTab === "gm"
      ? "gm"
      : (() => {
        const active = getActiveOperationsPage();
        return active === "gm" ? "planning" : active;
      })();
    const operationsPlanningTab = getActiveOperationsPlanningTab();
    const gmOperationsTab = getActiveGmOperationsTab();
    const gmOperationsTabLabelMap = {
      environment: "Environment",
      logs: "Logs",
      derived: "Derived",
      "active-sync": "Sync Effects",
      "non-party": "Non-Party",
      custom: "Custom Mods",
      "loot-sources": "Loot Sources"
    };
    const gmOperationsTabLabel = gmOperationsTabLabelMap[gmOperationsTab] ?? "Environment";
    const miniViz = buildMiniVisualizationContext({ visibility });
    const miniVizUi = buildMiniVizUiContext();
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((slot) => (slot.entries?.length ?? 0) > 0).length;
    const assignedEntries = slots.reduce((count, slot) => count + (slot.entries?.length ?? 0), 0);
    const lowDarkvisionSlots = slots.filter((slot) => Number(slot.slotNoDarkvision ?? 0) > 0).length;
    const lockState = state.locked ? (isGM ? "Locked for players" : "Locked by GM") : "Open";
    const campfireState = state.campfire ? "Lit" : "Out";

    return {
      isGM,
      locked: state.locked,
      lockBannerText,
      lockBannerTooltip,
      lockBannerClass: isGM ? "is-gm" : "",
      showPopout: false,
      lastUpdatedAt: state.lastUpdatedAt ?? "-",
      lastUpdatedBy: state.lastUpdatedBy ?? "-",
      mainContextLabel: mainTab === "gm" ? "GM" : (mainTab === "operations" ? "Operations" : "Rest Watch"),
      mainSubtitleLabel: mainTab === "gm" ? "GM" : (mainTab === "operations" ? "Operations" : "Rest Watch"),
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
      mainTabGm: mainTab === "gm",
      mainTabOperationsOrGm: operationsTabActive,
      gmPanelTabCore: mainTab === "rest-watch",
      gmPanelTabOperations: operationsTabActive,
      operationsPagePlanning: operationsPageValue === "planning",
      operationsPageReadiness: operationsPageValue === "readiness",
      operationsPageComms: operationsPageValue === "comms",
      operationsPageReputation: operationsPageValue === "reputation",
      operationsPageSupply: false,
      operationsPageBase: operationsPageValue === "base",
      operationsPageDowntime: operationsPageValue === "downtime",
      operationsPageRecovery: operationsPageValue === "recovery",
      operationsPageGm: operationsPageValue === "gm",
      gmOpsTabEnvironment: gmOperationsTab === "environment",
      gmOpsTabLogs: gmOperationsTab === "logs",
      gmOpsTabDerived: gmOperationsTab === "derived",
      gmOpsTabActiveSync: gmOperationsTab === "active-sync",
      gmOpsTabNonParty: gmOperationsTab === "non-party",
      gmOpsTabCustom: gmOperationsTab === "custom",
      gmOpsTabLootSources: gmOperationsTab === "loot-sources",
      gmOpsTabLabel: gmOperationsTabLabel,
      operationsPlanningRoles: operationsPlanningTab === "roles",
      operationsPlanningSops: operationsPlanningTab === "sops",
      operationsPlanningResources: operationsPlanningTab === "resources",
      operationsPlanningBonuses: operationsPlanningTab === "bonuses",
      overview: {
        totalSlots,
        occupiedSlots,
        assignedEntries,
        lowDarkvisionSlots,
        hasLowDarkvisionCoverage: lowDarkvisionSlots > 0,
        lockState,
        campfireState
      }
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (DEBUG_LOG) console.log("RestWatchApp: _onRender called");
    restWatchAppInstance = this;
    ensurePartyOperationsClass(this);
    syncApplicationWindowTitle(this, getRestMainWindowTitle(getActiveRestMainTab()));
    
    if (this.element && !this.element.dataset.poBoundRest) {
      this.element.dataset.poBoundRest = "1";

      // Use event delegation on the app element
      this.element.addEventListener("click", (event) => {
        const tab = event.target?.closest(".po-tabs-main .po-tab[data-tab]");
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
        if (event.target?.matches("input[data-action='set-loot-pack-filter']")) {
          this.#onAction(event);
          return;
        }
        if (event.target?.matches("input[data-action='set-non-party-sync-filter-keyword']")) {
          this.#onAction(event);
          return;
        }
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
    refreshTabAccessibility(this.element);

    // Setup drag-and-drop for rest watch entries
    setupRestWatchDragAndDrop(this.element);
    
    if (game.user.isGM && !this._openedPlayers) {
      emitOpenRestPlayers();
      this._openedPlayers = true;
    }

    restorePendingWindowState(this);
    restorePendingUiState(this);
    syncNotesDisclosureState(this.element);
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
    if (!root || (root.dataset.mainTab !== "operations" && root.dataset.mainTab !== "gm")) return;

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
    if (tabName === "gm") {
      if (!game.user?.isGM) {
        ui.notifications?.warn("GM permissions are required for the GM section.");
        return;
      }
      setActiveRestMainTab("gm");
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
        await assignSlotToUser(element);
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
        if (String(element?.dataset?.page ?? "").trim() === "gm" && game.user?.isGM) setActiveRestMainTab("gm");
        else if (getActiveRestMainTab() === "gm") setActiveRestMainTab("operations");
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
      case "set-downtime-hours":
        await setDowntimeHoursGranted(element);
        break;
      case "set-downtime-tuning":
        await setDowntimeTuningField(element);
        break;
      case "set-downtime-resolve-target":
        applyDowntimeResolverBaseToUi(element, { force: true });
        break;
      case "prefill-downtime-resolution":
        applyDowntimeResolverBaseToUi(element, { force: true });
        break;
      case "submit-downtime-action":
        await submitDowntimeAction(element);
        break;
      case "clear-downtime-entry":
        await clearDowntimeEntry(element);
        break;
      case "resolve-selected-downtime-entry":
        await resolveSelectedDowntimeEntry(element);
        break;
      case "resolve-downtime-actions":
        await resolveDowntimeActions();
        break;
      case "clear-downtime-results":
        await clearDowntimeResults();
        break;
      case "post-downtime-log":
        await postDowntimeLogOutcome(element);
        break;
      case "collect-downtime-result":
        await collectDowntimeResult(element);
        break;
      case "set-party-health-modifier":
        await setPartyHealthModifier(element);
        break;
      case "set-party-health-sync-scope":
        await setPartyHealthSyncScope(element);
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
      case "toggle-loot-pack-sources-collapsed": {
        const current = getLootPackSourcesUiState();
        setLootPackSourcesUiState({ collapsed: !current.collapsed });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      }
      case "set-loot-registry-tab":
        setActiveLootRegistryTab(String(element?.dataset?.tab ?? "preview"));
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "set-loot-pack-filter":
        setLootPackSourcesUiState({ filter: String(element?.value ?? "") });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "clear-loot-pack-filter":
        setLootPackSourcesUiState({ filter: "" });
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "toggle-loot-pack-source":
        await toggleLootPackSource(element);
        break;
      case "set-loot-pack-weight":
        await setLootPackWeight(element);
        break;
      case "toggle-loot-table-source":
        await toggleLootTableSource(element);
        break;
      case "set-loot-table-type":
        await setLootTableType(element);
        break;
      case "toggle-loot-item-type":
        await toggleLootItemType(element);
        break;
      case "set-loot-rarity-floor":
        await setLootRarityFloor(element);
        break;
      case "set-loot-rarity-ceiling":
        await setLootRarityCeiling(element);
        break;
      case "reset-loot-source-config":
        await resetLootSourceConfig();
        break;
      case "set-loot-preview-field":
        setLootPreviewField(element);
        break;
      case "roll-loot-preview":
        await rollLootPreview(element);
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "clear-loot-preview":
        clearLootPreviewResult();
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
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
      case "set-non-party-sync-filter-keyword":
        setNonPartySyncFilterKeyword(String(element?.value ?? ""));
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "clear-non-party-sync-filter-keyword":
        setNonPartySyncFilterKeyword("");
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "apply-non-party-sync-actor":
        await applyNonPartySyncActor(element);
        break;
      case "clear-non-party-sync-actor":
        await clearNonPartySyncActor(element);
        break;
      case "reapply-all-non-party-sync":
        await reapplyAllNonPartySync();
        break;
      case "clear-all-non-party-sync":
        await clearAllNonPartySync();
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
    const totalSlots = slots.length;
    const occupiedSlots = slots.filter((slot) => (slot.entries?.length ?? 0) > 0).length;
    const assignedEntries = slots.reduce((count, slot) => count + (slot.entries?.length ?? 0), 0);
    const lowDarkvisionSlots = slots.filter((slot) => Number(slot.slotNoDarkvision ?? 0) > 0).length;
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
      ...miniVizUi,
      overview: {
        totalSlots,
        occupiedSlots,
        assignedEntries,
        lowDarkvisionSlots,
        hasLowDarkvisionCoverage: lowDarkvisionSlots > 0,
        lockState: state.locked ? "Locked by GM" : "Open"
      }
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
    syncNotesDisclosureState(this.element);
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

  #renderWithPreservedState(renderOptions = { force: true, parts: ["main"] }) {
    const uiState = captureUiState(this);
    if (uiState) pendingUiRestore.set(this, uiState);
    const scrollState = captureScrollState(this);
    if (scrollState.length > 0) pendingScrollRestore.set(this, scrollState);
    this.render(renderOptions);
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
      case "main-tab":
        this.#onTabClick(element, this.element);
        break;
      case "toggle-mini-viz":
        setMiniVizCollapsed(!isMiniVizCollapsed());
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "assign-me":
        await assignSlotToUser(element);
        break;
      case "set-activity":
        await updateActivity(element, { skipLocalRefresh: true });
        break;
      case "clear":
        await clearSlotEntry(element);
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
    const lightToggles = buildLightToggles(state, ranks, isGM);
    const frontCount = (ranks.find((rank) => rank.id === "front")?.entries?.length ?? 0);
    const middleCount = (ranks.find((rank) => rank.id === "middle")?.entries?.length ?? 0);
    const rearCount = (ranks.find((rank) => rank.id === "rear")?.entries?.length ?? 0);
    const totalAssigned = frontCount + middleCount + rearCount;
    const lightSources = lightToggles.filter((entry) => entry.hasLight).length;
    const lockState = state.locked ? (isGM ? "Locked for players" : "Locked by GM") : "Open";
    return {
      isGM,
      locked: state.locked,
      lockBannerText,
      lockBannerTooltip,
      lockBannerClass: isGM ? "is-gm" : "",
      showPopout: false,
      lastUpdatedAt: state.lastUpdatedAt ?? "-",
      lastUpdatedBy: state.lastUpdatedBy ?? "-",
      usageCollapsed: false,
      usageToggleLabel: "Collapse",
      usageToggleIcon: "fa-chevron-up",
      ranks,
      gmNotes: state.gmNotes ?? "",
      lightToggles,
      gmSections: {
        shareCollapsed: false,
        shareToggleLabel: "Collapse",
        shareToggleIcon: "fa-chevron-up",
        helpCollapsed: false,
        helpToggleLabel: "Collapse",
        helpToggleIcon: "fa-chevron-up",
        lockCollapsed: false,
        lockToggleLabel: "Collapse",
        lockToggleIcon: "fa-chevron-up",
        formationsCollapsed: false,
        formationsToggleLabel: "Collapse",
        formationsToggleIcon: "fa-chevron-up",
        lightCollapsed: false,
        lightToggleLabel: "Collapse",
        lightToggleIcon: "fa-chevron-up",
        exportCollapsed: false,
        exportToggleLabel: "Collapse",
        exportToggleIcon: "fa-chevron-up",
        snapshotCollapsed: false,
        snapshotToggleLabel: "Collapse",
        snapshotToggleIcon: "fa-chevron-up",
        clearCollapsed: false,
        clearToggleLabel: "Collapse",
        clearToggleIcon: "fa-chevron-up",
        gmNotesCollapsed: false,
        gmNotesToggleLabel: "Collapse",
        gmNotesToggleIcon: "fa-chevron-up"
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
      },
      overview: {
        totalAssigned,
        frontCount,
        middleCount,
        rearCount,
        formationLabel: formationLabels[formation] ?? formationLabels.default,
        lightSources,
        lockState
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
        const tab = event.target?.closest(".po-tabs-main .po-tab[data-tab]");
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
    refreshTabAccessibility(this.element);
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
      return;
    }
    if (tabName === "gm") {
      if (!game.user?.isGM) {
        ui.notifications?.warn("GM permissions are required for the GM section.");
        return;
      }
      setActiveRestMainTab("gm");
      new RestWatchApp().render({ force: true });
      this.close();
    }
  }

  #renderWithPreservedState(renderOptions = { force: true, parts: ["main"] }) {
    const uiState = captureUiState(this);
    if (uiState) pendingUiRestore.set(this, uiState);
    const scrollState = captureScrollState(this);
    if (scrollState.length > 0) pendingScrollRestore.set(this, scrollState);
    this.render(renderOptions);
  }

  async #onAction(event) {
    const element = event.target?.closest("[data-action]");
    const action = element?.dataset?.action;
    if (DEBUG_LOG) console.log("MarchingOrderApp #onAction:", { action, element, event });
    if (!action) return;
    if (element?.tagName === "SELECT" && event?.type !== "change") return;

    switch (action) {
      case "refresh":
        emitSocketRefresh();
        break;
      case "main-tab":
        this.#onTabClick(element, this.element);
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
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
        break;
      case "toggle-section": {
        const sectionId = element?.dataset?.sectionId;
        if (!sectionId) break;
        setMarchSectionCollapsed(sectionId, !isMarchSectionCollapsed(sectionId));
        this.#renderWithPreservedState({ force: true, parts: ["main"] });
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
      case "set-light-range":
        await setLightRange(element);
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

function buildDefaultLootSourceConfig() {
  return {
    packs: [
      {
        id: LOOT_WORLD_ITEMS_SOURCE_ID,
        label: "World Item Directory",
        sourceKind: "world-items",
        enabled: true,
        weight: 1
      }
    ],
    tables: [],
    filters: {
      allowedTypes: [...LOOT_DEFAULT_ITEM_TYPES],
      rarityFloor: "",
      rarityCeiling: ""
    },
    updatedAt: 0,
    updatedBy: ""
  };
}

function normalizeLootRarityValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const allowed = new Set(LOOT_RARITY_OPTIONS.map((entry) => String(entry.value ?? "").trim().toLowerCase()));
  return allowed.has(raw) ? raw : "";
}

function buildLootItemTypeCatalog() {
  const labels = CONFIG?.Item?.typeLabels && typeof CONFIG.Item.typeLabels === "object"
    ? CONFIG.Item.typeLabels
    : {};
  const merged = new Map();
  for (const [key, label] of Object.entries(LOOT_ITEM_TYPE_LABELS)) {
    merged.set(String(key).trim(), String(label).trim() || String(key).trim());
  }
  for (const [key, label] of Object.entries(labels)) {
    const id = String(key ?? "").trim();
    if (!id) continue;
    if (!merged.has(id)) merged.set(id, String(label ?? id).trim() || id);
  }
  return Array.from(merged.entries())
    .map(([value, label]) => ({ value, label }))
    .filter((entry) => entry.value)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeLootSourcePackEntry(entry = {}) {
  const id = String(entry?.id ?? entry?.pack ?? "").trim();
  if (!id) return null;
  const weightRaw = Number(entry?.weight ?? 1);
  const weight = Number.isFinite(weightRaw) ? Math.max(1, Math.floor(weightRaw)) : 1;
  const sourceKindRaw = String(entry?.sourceKind ?? (id === LOOT_WORLD_ITEMS_SOURCE_ID ? "world-items" : "compendium-pack")).trim().toLowerCase();
  const sourceKind = sourceKindRaw === "world-items" ? "world-items" : "compendium-pack";
  return {
    id,
    label: String(entry?.label ?? "").trim(),
    sourceKind,
    enabled: entry?.enabled !== false,
    weight
  };
}

function normalizeLootSourceTableEntry(entry = {}) {
  const id = String(entry?.id ?? entry?.tableRef ?? entry?.tableUuid ?? "").trim();
  if (!id) return null;
  const typeRaw = String(entry?.tableType ?? entry?.type ?? "currency").trim().toLowerCase();
  const validTypes = new Set(LOOT_TABLE_TYPE_OPTIONS.map((option) => option.value));
  const tableType = validTypes.has(typeRaw) ? typeRaw : "currency";
  const sourceKindRaw = String(entry?.sourceKind ?? (id.startsWith("world-table:") ? "world-table" : "table-pack")).trim().toLowerCase();
  const sourceKind = sourceKindRaw === "world-table" ? "world-table" : "table-pack";
  return {
    id,
    label: String(entry?.label ?? "").trim(),
    sourceKind,
    enabled: entry?.enabled !== false,
    tableType
  };
}

function normalizeLootSourceConfig(config = {}) {
  const fallback = buildDefaultLootSourceConfig();
  const rawPacks = Array.isArray(config?.packs) ? config.packs : fallback.packs;
  const rawTables = Array.isArray(config?.tables) ? config.tables : fallback.tables;
  const packs = rawPacks
    .map((entry) => normalizeLootSourcePackEntry(entry))
    .filter((entry, index, rows) => entry && rows.findIndex((candidate) => candidate.id === entry.id) === index);
  const tables = rawTables
    .map((entry) => normalizeLootSourceTableEntry(entry))
    .filter((entry, index, rows) => entry && rows.findIndex((candidate) => candidate.id === entry.id) === index);

  const itemTypeCatalog = new Set(buildLootItemTypeCatalog().map((entry) => entry.value));
  const rawAllowedTypes = Array.isArray(config?.filters?.allowedTypes)
    ? config.filters.allowedTypes
    : fallback.filters.allowedTypes;
  const allowedTypes = rawAllowedTypes
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, rows) => entry && itemTypeCatalog.has(entry) && rows.indexOf(entry) === index);

  const updatedAtRaw = Number(config?.updatedAt ?? 0);
  return {
    packs,
    tables,
    filters: {
      allowedTypes: allowedTypes.length > 0 ? allowedTypes : [...LOOT_DEFAULT_ITEM_TYPES],
      rarityFloor: normalizeLootRarityValue(config?.filters?.rarityFloor),
      rarityCeiling: normalizeLootRarityValue(config?.filters?.rarityCeiling)
    },
    updatedAt: Number.isFinite(updatedAtRaw) ? updatedAtRaw : 0,
    updatedBy: String(config?.updatedBy ?? "")
  };
}

function getLootSourceConfig() {
  const stored = game.settings.get(MODULE_ID, SETTINGS.LOOT_SOURCE_CONFIG);
  return normalizeLootSourceConfig(stored ?? buildDefaultLootSourceConfig());
}

async function updateLootSourceConfig(mutator, options = {}) {
  if (typeof mutator !== "function") return;
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const config = getLootSourceConfig();
  mutator(config);
  const next = normalizeLootSourceConfig(config);
  next.updatedAt = Date.now();
  next.updatedBy = String(game.user?.name ?? "GM");
  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.LOOT_SOURCE_CONFIG, next);
  if (!options.skipLocalRefresh) refreshOpenApps();
  emitSocketRefresh();
}

function getAllCompendiumPacks() {
  if (!game?.packs) return [];
  if (typeof game.packs.values === "function") return Array.from(game.packs.values());
  const rows = [];
  for (const entry of game.packs) {
    if (Array.isArray(entry) && entry.length > 1) rows.push(entry[1]);
    else rows.push(entry);
  }
  return rows;
}

function getAvailableLootItemPackSources() {
  const rows = [{
    id: LOOT_WORLD_ITEMS_SOURCE_ID,
    label: "World Item Directory",
    sourceKind: "world-items"
  }];
  for (const pack of getAllCompendiumPacks()) {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim().toLowerCase();
    if (documentName !== "item") continue;
    const id = String(pack?.collection ?? "").trim();
    if (!id) continue;
    const packageLabel = String(pack?.metadata?.packageName ?? pack?.metadata?.package ?? "").trim();
    const baseLabel = String(pack?.metadata?.label ?? pack?.title ?? id).trim() || id;
    rows.push({
      id,
      label: packageLabel ? `${baseLabel} (${packageLabel})` : baseLabel,
      sourceKind: "compendium-pack"
    });
  }
  return rows
    .filter((entry, index, list) => entry.id && list.findIndex((candidate) => candidate.id === entry.id) === index)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getAvailableLootTableSources() {
  const rows = [];

  for (const table of game.tables?.contents ?? []) {
    const uuid = String(table?.uuid ?? "").trim();
    if (!uuid) continue;
    const name = String(table?.name ?? "World Roll Table").trim() || "World Roll Table";
    rows.push({
      id: `world-table:${uuid}`,
      label: `${name} (World Table)`,
      sourceKind: "world-table"
    });
  }

  for (const pack of getAllCompendiumPacks()) {
    const documentName = String(pack?.documentName ?? pack?.metadata?.type ?? "").trim().toLowerCase();
    if (documentName !== "rolltable") continue;
    const id = String(pack?.collection ?? "").trim();
    if (!id) continue;
    const packageLabel = String(pack?.metadata?.packageName ?? pack?.metadata?.package ?? "").trim();
    const baseLabel = String(pack?.metadata?.label ?? pack?.title ?? id).trim() || id;
    rows.push({
      id: `table-pack:${id}`,
      label: packageLabel ? `${baseLabel} (${packageLabel})` : baseLabel,
      sourceKind: "table-pack"
    });
  }

  return rows
    .filter((entry, index, list) => entry.id && list.findIndex((candidate) => candidate.id === entry.id) === index)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeLootSourceSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLootSourceSearchText(value) {
  const normalized = normalizeLootSourceSearchText(value);
  return normalized ? normalized.split(" ") : [];
}

function hasEditDistanceWithin(sourceToken, queryToken, maxDistance = 1) {
  if (sourceToken === queryToken) return true;
  const sourceLength = sourceToken.length;
  const queryLength = queryToken.length;
  if (!sourceLength || !queryLength) return false;
  if (Math.abs(sourceLength - queryLength) > maxDistance) return false;

  let previousRow = Array.from({ length: queryLength + 1 }, (_entry, index) => index);
  for (let rowIndex = 1; rowIndex <= sourceLength; rowIndex += 1) {
    const currentRow = [rowIndex];
    let rowMin = currentRow[0];
    for (let colIndex = 1; colIndex <= queryLength; colIndex += 1) {
      const substitutionCost = sourceToken[rowIndex - 1] === queryToken[colIndex - 1] ? 0 : 1;
      const value = Math.min(
        previousRow[colIndex] + 1,
        currentRow[colIndex - 1] + 1,
        previousRow[colIndex - 1] + substitutionCost
      );
      currentRow[colIndex] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > maxDistance) return false;
    previousRow = currentRow;
  }
  return previousRow[queryLength] <= maxDistance;
}

function doesLootSourceTokenMatch(queryToken, candidateToken) {
  if (!queryToken || !candidateToken) return false;
  if (candidateToken.includes(queryToken) || queryToken.includes(candidateToken)) return true;

  const queryStem = queryToken.length > 4 && queryToken.endsWith("s") ? queryToken.slice(0, -1) : queryToken;
  const candidateStem = candidateToken.length > 4 && candidateToken.endsWith("s") ? candidateToken.slice(0, -1) : candidateToken;
  if (candidateStem.includes(queryStem) || queryStem.includes(candidateStem)) return true;

  const queryPrefix = queryStem.slice(0, Math.min(4, queryStem.length));
  const candidatePrefix = candidateStem.slice(0, Math.min(4, candidateStem.length));
  if (queryPrefix.length >= 3 && candidateStem.startsWith(queryPrefix)) return true;
  if (candidatePrefix.length >= 3 && queryStem.startsWith(candidatePrefix)) return true;

  const maxDistance = queryStem.length >= 6 ? 2 : 1;
  return hasEditDistanceWithin(candidateStem, queryStem, maxDistance);
}

function matchesLootSourceSearchQuery(query, source = {}) {
  const normalizedQuery = normalizeLootSourceSearchText(query);
  if (!normalizedQuery) return true;
  const queryTokens = tokenizeLootSourceSearchText(normalizedQuery);
  if (queryTokens.length === 0) return true;

  const searchableText = normalizeLootSourceSearchText([
    source.label,
    source.id,
    source.sourceKind,
    source.available ? "available" : "unavailable",
    source.enabled ? "enabled" : "disabled"
  ].join(" "));

  if (!searchableText) return false;
  if (searchableText.includes(normalizedQuery)) return true;

  const searchableTokens = tokenizeLootSourceSearchText(searchableText);
  return queryTokens.every((queryToken) => {
    if (searchableText.includes(queryToken)) return true;
    return searchableTokens.some((candidateToken) => doesLootSourceTokenMatch(queryToken, candidateToken));
  });
}

function buildLootSourceRegistryContext() {
  const config = getLootSourceConfig();
  const availablePacks = getAvailableLootItemPackSources();
  const availableTables = getAvailableLootTableSources();
  const packLookup = new Map((config.packs ?? []).map((entry) => [entry.id, entry]));
  const tableLookup = new Map((config.tables ?? []).map((entry) => [entry.id, entry]));

  const itemPackOptions = availablePacks.map((source) => {
    const stored = packLookup.get(source.id);
    const weightRaw = Number(stored?.weight ?? 1);
    return {
      id: source.id,
      label: source.label,
      sourceKind: source.sourceKind,
      available: true,
      enabled: Boolean(stored?.enabled),
      weight: Number.isFinite(weightRaw) ? Math.max(1, Math.floor(weightRaw)) : 1
    };
  });

  for (const stored of config.packs ?? []) {
    if (itemPackOptions.some((entry) => entry.id === stored.id)) continue;
    const weightRaw = Number(stored?.weight ?? 1);
    itemPackOptions.push({
      id: stored.id,
      label: stored.label || `${stored.id} (Unavailable)`,
      sourceKind: stored.sourceKind,
      available: false,
      enabled: Boolean(stored.enabled),
      weight: Number.isFinite(weightRaw) ? Math.max(1, Math.floor(weightRaw)) : 1
    });
  }

  const tableOptions = availableTables.map((source) => {
    const stored = tableLookup.get(source.id);
    const currentType = String(stored?.tableType ?? "currency");
    return {
      id: source.id,
      label: source.label,
      sourceKind: source.sourceKind,
      available: true,
      enabled: Boolean(stored?.enabled),
      tableType: currentType,
      typeOptions: LOOT_TABLE_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        selected: option.value === currentType
      }))
    };
  });

  for (const stored of config.tables ?? []) {
    if (tableOptions.some((entry) => entry.id === stored.id)) continue;
    const currentType = String(stored?.tableType ?? "currency");
    tableOptions.push({
      id: stored.id,
      label: stored.label || `${stored.id} (Unavailable)`,
      sourceKind: stored.sourceKind,
      available: false,
      enabled: Boolean(stored.enabled),
      tableType: currentType,
      typeOptions: LOOT_TABLE_TYPE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        selected: option.value === currentType
      }))
    });
  }

  itemPackOptions.sort((a, b) => {
    const enabledDelta = Number(Boolean(b.enabled)) - Number(Boolean(a.enabled));
    if (enabledDelta !== 0) return enabledDelta;
    return a.label.localeCompare(b.label);
  });
  tableOptions.sort((a, b) => {
    const enabledDelta = Number(Boolean(b.enabled)) - Number(Boolean(a.enabled));
    if (enabledDelta !== 0) return enabledDelta;
    return a.label.localeCompare(b.label);
  });

  const itemPackUi = getLootPackSourcesUiState();
  const itemPackFilter = normalizeLootPackSourcesFilter(itemPackUi.filter);
  const itemPackVisibleOptions = itemPackOptions.filter((entry) => matchesLootSourceSearchQuery(itemPackFilter, entry));
  const itemPackCollapsed = Boolean(itemPackUi.collapsed);

  const selectedTypes = new Set(config.filters?.allowedTypes ?? []);
  const itemTypeOptions = buildLootItemTypeCatalog().map((entry) => ({
    value: entry.value,
    label: entry.label,
    selected: selectedTypes.has(entry.value)
  }));

  const rarityFloor = normalizeLootRarityValue(config.filters?.rarityFloor);
  const rarityCeiling = normalizeLootRarityValue(config.filters?.rarityCeiling);
  const updatedAt = Number(config.updatedAt ?? 0);
  const updatedAtLabel = updatedAt > 0 ? new Date(updatedAt).toLocaleString() : "Not set";
  return {
    itemPackOptions,
    itemPackVisibleOptions,
    itemPackCollapsed,
    itemPackToggleLabel: itemPackCollapsed ? "Expand" : "Collapse",
    itemPackToggleIcon: itemPackCollapsed ? "fa-chevron-down" : "fa-chevron-up",
    itemPackFilter,
    itemPackFilterActive: itemPackFilter.length > 0,
    itemPackVisibleCount: itemPackVisibleOptions.length,
    tableOptions,
    itemTypeOptions,
    rarityFloorOptions: LOOT_RARITY_OPTIONS.map((entry) => ({
      value: entry.value,
      label: entry.label,
      selected: entry.value === rarityFloor
    })),
    rarityCeilingOptions: LOOT_RARITY_OPTIONS.map((entry) => ({
      value: entry.value,
      label: entry.label,
      selected: entry.value === rarityCeiling
    })),
    summary: {
      enabledItemPacks: itemPackOptions.filter((entry) => entry.enabled).length,
      totalItemPacks: itemPackOptions.length,
      enabledTables: tableOptions.filter((entry) => entry.enabled).length,
      totalTables: tableOptions.length,
      enabledItemTypes: itemTypeOptions.filter((entry) => entry.selected).length,
      totalItemTypes: itemTypeOptions.length,
      updatedAtLabel,
      updatedBy: String(config.updatedBy ?? "").trim() || "GM"
    }
  };
}

function getCollectionValues(collectionLike) {
  if (!collectionLike) return [];
  if (Array.isArray(collectionLike)) return collectionLike;
  if (typeof collectionLike.values === "function") return Array.from(collectionLike.values());
  if (Array.isArray(collectionLike.contents)) return collectionLike.contents;
  return [];
}

function normalizeLootRarity(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (["veryrare", "very rare", "very_rare", "very-rare"].includes(raw)) return "very-rare";
  if (["legend", "legendary"].includes(raw)) return "legendary";
  if (["rare"].includes(raw)) return "rare";
  if (["uncommon"].includes(raw)) return "uncommon";
  if (["common"].includes(raw)) return "common";
  return "";
}

function getLootRarityFromData(data = {}) {
  const candidates = [
    data?.rarity,
    data?.system?.rarity,
    data?.system?.details?.rarity,
    data?.system?.traits?.rarity,
    data?.system?.properties?.rarity
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (typeof candidate === "object") {
      const nested = normalizeLootRarity(candidate.value ?? candidate.label ?? candidate.name ?? "");
      if (nested) return nested;
      continue;
    }
    const normalized = normalizeLootRarity(candidate);
    if (normalized) return normalized;
  }
  return "";
}

function isLootRarityAllowed(rarity, floor, ceiling) {
  const rankMap = {
    common: 1,
    uncommon: 2,
    rare: 3,
    "very-rare": 4,
    legendary: 5
  };
  const normalized = normalizeLootRarity(rarity);
  if (!normalized) return true;
  const value = Number(rankMap[normalized] ?? 0);
  if (!value) return true;
  const floorValue = Number(rankMap[normalizeLootRarity(floor)] ?? 0);
  const ceilingValue = Number(rankMap[normalizeLootRarity(ceiling)] ?? 0);
  if (floorValue > 0 && value < floorValue) return false;
  if (ceilingValue > 0 && value > ceilingValue) return false;
  return true;
}

function getLootProfileRarityWeight(profile, rarity) {
  const normalizedProfile = String(profile ?? "standard").trim().toLowerCase();
  const normalizedRarity = getLootRarityBucket(rarity);
  if (!normalizedRarity) return 1;
  if (normalizedProfile === "poor") {
    if (normalizedRarity === "common") return 1.15;
    if (normalizedRarity === "uncommon") return 0.75;
    if (normalizedRarity === "rare") return 0.4;
    if (normalizedRarity === "very-rare") return 0.2;
    if (normalizedRarity === "legendary") return 0.08;
    return 1;
  }
  if (normalizedProfile === "well") {
    if (normalizedRarity === "common") return 0.9;
    if (normalizedRarity === "uncommon") return 1.08;
    if (normalizedRarity === "rare") return 1.18;
    if (normalizedRarity === "very-rare") return 1.28;
    if (normalizedRarity === "legendary") return 1.38;
    return 1;
  }
  return 1;
}

function getLootRarityBucket(rarity) {
  return normalizeLootRarity(rarity) || "common";
}

function getLootModeChallengeRarityWeight(draft = {}, rarity = "") {
  const mode = String(draft?.mode ?? "horde").trim().toLowerCase();
  const challenge = String(draft?.challenge ?? "mid").trim().toLowerCase();
  const bucket = getLootRarityBucket(rarity);
  const table = {
    defeated: {
      low: { common: 24, uncommon: 2.2, rare: 0.15, "very-rare": 0.01, legendary: 0 },
      mid: { common: 22, uncommon: 3, rare: 0.35, "very-rare": 0.03, legendary: 0 },
      high: { common: 20, uncommon: 4.2, rare: 0.8, "very-rare": 0.1, legendary: 0.01 },
      epic: { common: 17, uncommon: 5.5, rare: 1.4, "very-rare": 0.25, legendary: 0.03 }
    },
    encounter: {
      low: { common: 20, uncommon: 3.5, rare: 0.4, "very-rare": 0.03, legendary: 0 },
      mid: { common: 18, uncommon: 4.5, rare: 0.8, "very-rare": 0.08, legendary: 0.01 },
      high: { common: 16, uncommon: 5.8, rare: 1.5, "very-rare": 0.22, legendary: 0.02 },
      epic: { common: 14, uncommon: 6.5, rare: 2.4, "very-rare": 0.4, legendary: 0.05 }
    },
    horde: {
      low: { common: 16, uncommon: 4.5, rare: 0.9, "very-rare": 0.08, legendary: 0 },
      mid: { common: 14, uncommon: 5.8, rare: 1.5, "very-rare": 0.18, legendary: 0.01 },
      high: { common: 12, uncommon: 6.8, rare: 2.6, "very-rare": 0.45, legendary: 0.03 },
      epic: { common: 10.5, uncommon: 7.2, rare: 3.8, "very-rare": 0.95, legendary: 0.08 }
    }
  };
  const byMode = table[mode] ?? table.horde;
  const byChallenge = byMode[challenge] ?? byMode.mid;
  const base = Number(byChallenge[bucket] ?? 1);
  return Number.isFinite(base) ? Math.max(0, base) : 1;
}

function getLootRaritySelectionCaps(draft = {}, targetCount = 0) {
  const mode = String(draft?.mode ?? "horde").trim().toLowerCase();
  const challenge = String(draft?.challenge ?? "mid").trim().toLowerCase();
  const count = Math.max(0, Math.floor(Number(targetCount) || 0));
  const ratioTable = {
    defeated: {
      low: { uncommon: 0.12, rare: 0, "very-rare": 0, legendary: 0 },
      mid: { uncommon: 0.16, rare: 0.03, "very-rare": 0, legendary: 0 },
      high: { uncommon: 0.22, rare: 0.06, "very-rare": 0.01, legendary: 0 },
      epic: { uncommon: 0.28, rare: 0.1, "very-rare": 0.03, legendary: 0.005 }
    },
    encounter: {
      low: { uncommon: 0.2, rare: 0.03, "very-rare": 0, legendary: 0 },
      mid: { uncommon: 0.26, rare: 0.06, "very-rare": 0.01, legendary: 0 },
      high: { uncommon: 0.33, rare: 0.11, "very-rare": 0.03, legendary: 0.005 },
      epic: { uncommon: 0.38, rare: 0.15, "very-rare": 0.05, legendary: 0.01 }
    },
    horde: {
      low: { uncommon: 0.3, rare: 0.08, "very-rare": 0.01, legendary: 0 },
      mid: { uncommon: 0.36, rare: 0.12, "very-rare": 0.03, legendary: 0.002 },
      high: { uncommon: 0.42, rare: 0.18, "very-rare": 0.06, legendary: 0.01 },
      epic: { uncommon: 0.48, rare: 0.24, "very-rare": 0.1, legendary: 0.02 }
    }
  };
  const byMode = ratioTable[mode] ?? ratioTable.horde;
  const byChallenge = byMode[challenge] ?? byMode.mid;
  const caps = {
    uncommon: Math.max(0, Math.min(count, Math.floor(count * Number(byChallenge.uncommon ?? 0)))),
    rare: Math.max(0, Math.min(count, Math.floor(count * Number(byChallenge.rare ?? 0)))),
    "very-rare": Math.max(0, Math.min(count, Math.floor(count * Number(byChallenge["very-rare"] ?? 0)))),
    legendary: Math.max(0, Math.min(count, Math.floor(count * Number(byChallenge.legendary ?? 0))))
  };

  if (mode === "horde") {
    if (count >= 4) caps.uncommon = Math.max(caps.uncommon, 1);
    if (challenge !== "low" && count >= 8) caps.rare = Math.max(caps.rare, 1);
    if ((challenge === "high" || challenge === "epic") && count >= 14) caps["very-rare"] = Math.max(caps["very-rare"], 1);
    if (challenge === "epic" && count >= 30) caps.legendary = Math.max(caps.legendary, 1);
  } else if (mode === "encounter") {
    if ((challenge === "high" || challenge === "epic") && count >= 14) caps.rare = Math.max(caps.rare, 1);
    if (challenge === "epic" && count >= 20) caps["very-rare"] = Math.max(caps["very-rare"], 1);
  }

  return caps;
}

function canSelectLootRarityWithCaps(rarity, selectedCounts = {}, caps = {}) {
  const bucket = getLootRarityBucket(rarity);
  if (bucket === "common") return true;
  const cap = Math.max(0, Number(caps?.[bucket] ?? 0) || 0);
  const current = Math.max(0, Number(selectedCounts?.[bucket] ?? 0) || 0);
  return current < cap;
}

function chooseWeightedEntry(entries, weightAccessor) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const getWeight = typeof weightAccessor === "function"
    ? weightAccessor
    : (entry) => Number(entry?.weight ?? 1);
  let total = 0;
  const weighted = entries.map((entry) => {
    const raw = Number(getWeight(entry));
    const weight = Number.isFinite(raw) ? Math.max(0, raw) : 0;
    total += weight;
    return { entry, weight };
  });
  if (total <= 0) return entries[0] ?? null;
  let cursor = Math.random() * total;
  for (const row of weighted) {
    cursor -= row.weight;
    if (cursor <= 0) return row.entry;
  }
  return weighted[weighted.length - 1]?.entry ?? null;
}

function shuffleArray(input = []) {
  const rows = [...input];
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [rows[index], rows[swapIndex]] = [rows[swapIndex], rows[index]];
  }
  return rows;
}

function getLootCurrencyProfile(draft = {}) {
  const mode = String(draft.mode ?? "horde");
  const challenge = String(draft.challenge ?? "mid");
  const table = {
    horde: {
      low: { dice: "6d10", bonus: 60 },
      mid: { dice: "8d12", bonus: 180 },
      high: { dice: "10d20", bonus: 450 },
      epic: { dice: "12d30", bonus: 1200 }
    },
    defeated: {
      low: { dice: "1d8", bonus: 2 },
      mid: { dice: "2d10", bonus: 5 },
      high: { dice: "3d12", bonus: 12 },
      epic: { dice: "4d20", bonus: 30 }
    },
    encounter: {
      low: { dice: "3d10", bonus: 20 },
      mid: { dice: "5d12", bonus: 55 },
      high: { dice: "7d16", bonus: 180 },
      epic: { dice: "9d24", bonus: 500 }
    }
  };
  const modeRows = table[mode] ?? table.horde;
  return modeRows[challenge] ?? modeRows.mid;
}

function getLootScaleMultiplier(scale = "medium") {
  if (scale === "small") return 0.75;
  if (scale === "major") return 1.8;
  return 1;
}

function getLootProfileMultiplier(profile = "standard") {
  if (profile === "poor") return 0.75;
  if (profile === "well") return 1.35;
  return 1;
}

function convertGpToCurrency(gpValue = 0) {
  const gp = Math.max(0, Number(gpValue) || 0);
  let cpTotal = Math.max(0, Math.round(gp * 100));
  const pp = Math.floor(cpTotal / 1000);
  cpTotal -= (pp * 1000);
  const finalGp = Math.floor(cpTotal / 100);
  cpTotal -= (finalGp * 100);
  const sp = Math.floor(cpTotal / 10);
  cpTotal -= (sp * 10);
  const cp = cpTotal;
  return {
    pp,
    gp: finalGp,
    sp,
    cp,
    gpEquivalent: gp
  };
}

async function rollLootCurrency(draft = {}) {
  const profile = getLootCurrencyProfile(draft);
  const roll = await (new Roll(String(profile.dice ?? "1d1"))).evaluate();
  const rollTotal = Number(roll?.total ?? 0);
  const actorCount = Math.max(1, Number(draft.actorCount ?? 1) || 1);
  const mode = String(draft.mode ?? "horde");
  const modeFactor = mode === "defeated"
    ? actorCount
    : mode === "encounter"
      ? Math.max(1, Math.round(actorCount * 0.6))
      : 1;
  const scaled = (Math.max(0, rollTotal) + Math.max(0, Number(profile.bonus ?? 0)))
    * getLootScaleMultiplier(String(draft.scale ?? "medium"))
    * getLootProfileMultiplier(String(draft.profile ?? "standard"))
    * modeFactor;
  const gpEquivalent = Math.max(0, Math.round(scaled));
  return {
    formula: `${profile.dice} + ${profile.bonus}`,
    rolled: Math.max(0, Math.floor(rollTotal)),
    modeFactor,
    scaleMultiplier: getLootScaleMultiplier(String(draft.scale ?? "medium")),
    profileMultiplier: getLootProfileMultiplier(String(draft.profile ?? "standard")),
    ...convertGpToCurrency(gpEquivalent)
  };
}

function getLootItemCount(draft = {}) {
  const mode = String(draft.mode ?? "horde");
  const challenge = String(draft.challenge ?? "mid");
  const profile = String(draft.profile ?? "standard");
  const actorCount = Math.max(1, Number(draft.actorCount ?? 1) || 1);
  const scaleFactor = getLootScaleMultiplier(String(draft.scale ?? "medium"));
  const profileFactor = profile === "poor" ? 0.8 : profile === "well" ? 1.2 : 1;

  if (mode === "defeated") {
    const perActorChance = {
      low: 0.08,
      mid: 0.14,
      high: 0.22,
      epic: 0.32
    };
    const expected = actorCount * Number(perActorChance[challenge] ?? perActorChance.mid) * profileFactor * scaleFactor;
    const challengeBonus = challenge === "high" ? 0.5 : challenge === "epic" ? 1 : 0;
    return Math.min(24, Math.max(0, Math.round(expected + challengeBonus)));
  }

  if (mode === "encounter") {
    const perActorRate = {
      low: 0.18,
      mid: 0.28,
      high: 0.4,
      epic: 0.55
    };
    const baseline = challenge === "low" ? 1 : 2;
    const expected = actorCount * Number(perActorRate[challenge] ?? perActorRate.mid) * profileFactor * scaleFactor;
    return Math.min(40, Math.max(0, baseline + Math.round(expected)));
  }

  const hordeBase = { low: 3, mid: 5, high: 8, epic: 12 };
  const hordeProfileMod = { poor: -1, standard: 0, well: 2 };
  const base = Number(hordeBase[challenge] ?? hordeBase.mid);
  const delta = Number(hordeProfileMod[profile] ?? 0);
  const total = Math.max(0, Math.round((base + delta) * scaleFactor));
  return Math.min(60, total);
}

async function buildLootItemCandidates(sourceConfig, draft, warnings = []) {
  const allowedTypes = new Set(sourceConfig?.filters?.allowedTypes ?? []);
  const floor = String(sourceConfig?.filters?.rarityFloor ?? "");
  const ceiling = String(sourceConfig?.filters?.rarityCeiling ?? "");
  const enabledSources = (sourceConfig?.packs ?? []).filter((entry) => entry?.enabled !== false);
  const candidates = [];
  for (const source of enabledSources) {
    const sourceId = String(source?.id ?? "").trim();
    const sourceLabel = String(source?.label ?? sourceId).trim() || sourceId;
    const sourceWeight = Math.max(1, Math.floor(Number(source?.weight ?? 1) || 1));
    if (!sourceId) continue;
    if (sourceId === LOOT_WORLD_ITEMS_SOURCE_ID) {
      for (const item of game.items?.contents ?? []) {
        if (!item) continue;
        const itemType = String(item.type ?? "").trim();
        if (allowedTypes.size > 0 && !allowedTypes.has(itemType)) continue;
        const rarity = getLootRarityFromData(item);
        const rarityBucket = getLootRarityBucket(rarity);
        if (!isLootRarityAllowed(rarity, floor, ceiling)) continue;
        candidates.push({
          key: String(item.uuid ?? item.id ?? foundry.utils.randomID()),
          name: String(item.name ?? "Item").trim() || "Item",
          img: String(item.img ?? "icons/svg/item-bag.svg"),
          itemType,
          rarity,
          rarityBucket,
          uuid: String(item.uuid ?? ""),
          sourceId,
          sourceLabel,
          sourceWeight,
          profileWeight: getLootProfileRarityWeight(draft.profile, rarityBucket),
          rarityWeight: getLootModeChallengeRarityWeight(draft, rarityBucket)
        });
      }
      continue;
    }

    const pack = game.packs?.get(sourceId);
    if (!pack) {
      warnings.push(`Item source missing: ${sourceLabel}.`);
      continue;
    }
    try {
      const index = await pack.getIndex({
        fields: ["type", "img", "system.rarity", "system.details.rarity", "system.traits.rarity", "rarity"]
      });
      for (const row of getCollectionValues(index)) {
        const entry = Array.isArray(row) ? row[1] : row;
        if (!entry) continue;
        const itemType = String(entry.type ?? "").trim();
        if (allowedTypes.size > 0 && !allowedTypes.has(itemType)) continue;
        const rarity = getLootRarityFromData(entry);
        const rarityBucket = getLootRarityBucket(rarity);
        if (!isLootRarityAllowed(rarity, floor, ceiling)) continue;
        const docId = String(entry._id ?? entry.id ?? "").trim();
        if (!docId) continue;
        candidates.push({
          key: `Compendium.${pack.collection}.${docId}`,
          name: String(entry.name ?? "Item").trim() || "Item",
          img: String(entry.img ?? "icons/svg/item-bag.svg"),
          itemType,
          rarity,
          rarityBucket,
          uuid: `Compendium.${pack.collection}.${docId}`,
          sourceId,
          sourceLabel,
          sourceWeight,
          profileWeight: getLootProfileRarityWeight(draft.profile, rarityBucket),
          rarityWeight: getLootModeChallengeRarityWeight(draft, rarityBucket)
        });
      }
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to read loot source pack`, sourceId, error);
      warnings.push(`Could not read item source: ${sourceLabel}.`);
    }
  }
  return candidates;
}

function pickLootItemsFromCandidates(candidates, count = 0, draft = {}) {
  const targetCount = Math.max(0, Math.floor(Number(count) || 0));
  if (!Array.isArray(candidates) || candidates.length === 0 || targetCount <= 0) return [];
  const pool = [...candidates];
  const selected = [];
  const rarityCaps = getLootRaritySelectionCaps(draft, targetCount);
  const selectedByRarity = {
    common: 0,
    uncommon: 0,
    rare: 0,
    "very-rare": 0,
    legendary: 0
  };
  while (pool.length > 0 && selected.length < targetCount) {
    const cappedPool = pool.filter((entry) => canSelectLootRarityWithCaps(entry?.rarity, selectedByRarity, rarityCaps));
    const selectionPool = cappedPool.length > 0 ? cappedPool : pool;
    const picked = chooseWeightedEntry(selectionPool, (entry) => {
      const sourceWeight = Math.max(1, Number(entry?.sourceWeight ?? 1) || 1);
      const profileWeight = Math.max(0.1, Number(entry?.profileWeight ?? 1) || 1);
      const rarityWeight = Math.max(0.01, Number(entry?.rarityWeight ?? 1) || 1);
      return sourceWeight * profileWeight * rarityWeight;
    });
    if (!picked) break;
    const rarityBucket = getLootRarityBucket(picked.rarity);
    selectedByRarity[rarityBucket] = Math.max(0, Number(selectedByRarity[rarityBucket] ?? 0) || 0) + 1;
    selected.push({
      name: picked.name,
      img: picked.img,
      itemType: picked.itemType,
      rarity: picked.rarity || "",
      sourceLabel: picked.sourceLabel,
      uuid: picked.uuid
    });
    const index = pool.indexOf(picked);
    if (index >= 0) pool.splice(index, 1);
  }
  return selected;
}

async function resolveUuidDocument(uuid) {
  const ref = String(uuid ?? "").trim();
  if (!ref) return null;
  if (typeof fromUuidSync === "function") {
    try {
      const syncDoc = fromUuidSync(ref);
      if (syncDoc) return syncDoc;
    } catch {
      // Fall back to async lookup.
    }
  }
  if (typeof fromUuid === "function") {
    try {
      return await fromUuid(ref);
    } catch {
      return null;
    }
  }
  return null;
}

function getLootTableRollBudget(draft = {}) {
  const mode = String(draft.mode ?? "horde");
  const challenge = String(draft.challenge ?? "mid");
  const scale = String(draft.scale ?? "medium");
  const modeBase = mode === "horde" ? 2 : 1;
  const challengeBonus = challenge === "high" ? 1 : challenge === "epic" ? 2 : 0;
  const scaleBonus = scale === "major" ? 1 : 0;
  return Math.max(0, Math.min(6, modeBase + challengeBonus + scaleBonus));
}

async function resolveLootTableFromSource(source = {}) {
  const sourceId = String(source?.id ?? "").trim();
  if (!sourceId) return null;

  if (sourceId.startsWith("world-table:")) {
    const uuid = sourceId.slice("world-table:".length);
    const document = await resolveUuidDocument(uuid);
    if (document?.documentName === "RollTable") return document;
    return null;
  }

  if (sourceId.startsWith("table-pack:")) {
    const collection = sourceId.slice("table-pack:".length);
    const pack = game.packs?.get(collection);
    if (!pack) return null;
    const index = await pack.getIndex();
    const rows = getCollectionValues(index);
    if (!rows.length) return null;
    const row = rows[Math.floor(Math.random() * rows.length)];
    const entry = Array.isArray(row) ? row[1] : row;
    const docId = String(entry?._id ?? entry?.id ?? "").trim();
    if (!docId) return null;
    return pack.getDocument(docId);
  }

  return null;
}

function getRollTableResultLabel(result = {}) {
  const text = String(result?.text ?? "").trim();
  if (text) return text;
  const collection = String(result?.documentCollection ?? "").trim();
  const docId = String(result?.documentId ?? "").trim();
  if (collection && docId) return `${collection} (${docId})`;
  return "No result text";
}

async function rollLootTableDry(tableDoc) {
  if (!tableDoc) return null;
  const formula = String(tableDoc.formula ?? "1d100").trim() || "1d100";
  const roll = await (new Roll(formula)).evaluate();
  const total = Number(roll?.total ?? 0);
  const results = getCollectionValues(tableDoc.results);
  const matches = results.filter((result) => {
    const range = Array.isArray(result?.range) ? result.range : [1, 1];
    const min = Number(range[0] ?? 1);
    const max = Number(range[1] ?? min);
    return total >= min && total <= max;
  });
  const picked = matches.length > 0
    ? matches[Math.floor(Math.random() * matches.length)]
    : (results[0] ?? null);
  return {
    tableName: String(tableDoc.name ?? "Roll Table").trim() || "Roll Table",
    formula,
    total: Number.isFinite(total) ? Math.floor(total) : 0,
    result: picked ? getRollTableResultLabel(picked) : "No matching result",
    resultType: String(picked?.type ?? "").trim()
  };
}

async function buildLootTableRolls(sourceConfig, draft, warnings = []) {
  const enabledSources = (sourceConfig?.tables ?? []).filter((entry) => entry?.enabled !== false);
  if (!enabledSources.length) return [];
  const budget = getLootTableRollBudget(draft);
  if (budget <= 0) return [];
  const sources = shuffleArray(enabledSources).slice(0, budget);
  const rolls = [];
  for (const source of sources) {
    try {
      const tableDoc = await resolveLootTableFromSource(source);
      if (!tableDoc) {
        warnings.push(`Table source unavailable: ${source.label || source.id}.`);
        continue;
      }
      const rolled = await rollLootTableDry(tableDoc);
      if (!rolled) continue;
      rolls.push({
        sourceLabel: String(source.label ?? source.id ?? "Roll Table Source"),
        sourceType: String(source.tableType ?? "currency"),
        ...rolled
      });
    } catch (error) {
      console.warn(`${MODULE_ID}: failed loot table roll`, source?.id, error);
      warnings.push(`Failed to roll table source: ${source?.label || source?.id || "Unknown source"}.`);
    }
  }
  return rolls;
}

async function generateLootPreviewPayload(draftInput = {}) {
  const draft = normalizeLootPreviewDraft(draftInput);
  const sourceConfig = getLootSourceConfig();
  const warnings = [];
  const currency = await rollLootCurrency(draft);
  const candidates = await buildLootItemCandidates(sourceConfig, draft, warnings);
  const itemCountTarget = getLootItemCount(draft);
  const items = pickLootItemsFromCandidates(candidates, itemCountTarget, draft);
  const tableRolls = await buildLootTableRolls(sourceConfig, draft, warnings);
  if (candidates.length === 0) warnings.push("No eligible item candidates were found for current source/filter settings.");
  return {
    generatedAt: Date.now(),
    generatedBy: String(game.user?.name ?? "GM"),
    draft,
    currency,
    items,
    tableRolls,
    stats: {
      candidateCount: candidates.length,
      itemCountTarget,
      itemCountGenerated: items.length,
      tableRollCount: tableRolls.length,
      enabledItemSources: (sourceConfig.packs ?? []).filter((entry) => entry?.enabled !== false).length,
      enabledTableSources: (sourceConfig.tables ?? []).filter((entry) => entry?.enabled !== false).length
    },
    warnings
  };
}

function buildLootPreviewContext() {
  const draft = getLootPreviewDraft();
  const result = getLootPreviewResult();
  const hasResult = Boolean(result && typeof result === "object");
  const mode = String(draft.mode ?? "horde");
  const profile = String(draft.profile ?? "standard");
  const challenge = String(draft.challenge ?? "mid");
  const scale = String(draft.scale ?? "medium");
  const generatedAt = Number(result?.generatedAt ?? 0);
  const generatedAtLabel = generatedAt > 0 ? new Date(generatedAt).toLocaleString() : "-";
  return {
    draft,
    modeOptions: LOOT_PREVIEW_MODE_OPTIONS.map((entry) => ({ ...entry, selected: entry.value === mode })),
    profileOptions: LOOT_PREVIEW_PROFILE_OPTIONS.map((entry) => ({ ...entry, selected: entry.value === profile })),
    challengeOptions: LOOT_PREVIEW_CHALLENGE_OPTIONS.map((entry) => ({ ...entry, selected: entry.value === challenge })),
    scaleOptions: LOOT_PREVIEW_SCALE_OPTIONS.map((entry) => ({ ...entry, selected: entry.value === scale })),
    hasResult,
    generatedAtLabel,
    generatedBy: String(result?.generatedBy ?? "GM"),
    currency: {
      pp: Math.max(0, Number(result?.currency?.pp ?? 0) || 0),
      gp: Math.max(0, Number(result?.currency?.gp ?? 0) || 0),
      sp: Math.max(0, Number(result?.currency?.sp ?? 0) || 0),
      cp: Math.max(0, Number(result?.currency?.cp ?? 0) || 0),
      gpEquivalent: Math.max(0, Number(result?.currency?.gpEquivalent ?? 0) || 0),
      formula: String(result?.currency?.formula ?? "")
    },
    stats: {
      candidateCount: Math.max(0, Number(result?.stats?.candidateCount ?? 0) || 0),
      itemCountTarget: Math.max(0, Number(result?.stats?.itemCountTarget ?? 0) || 0),
      itemCountGenerated: Math.max(0, Number(result?.stats?.itemCountGenerated ?? 0) || 0),
      tableRollCount: Math.max(0, Number(result?.stats?.tableRollCount ?? 0) || 0),
      enabledItemSources: Math.max(0, Number(result?.stats?.enabledItemSources ?? 0) || 0),
      enabledTableSources: Math.max(0, Number(result?.stats?.enabledTableSources ?? 0) || 0)
    },
    items: Array.isArray(result?.items)
      ? result.items.map((entry) => ({
        name: String(entry?.name ?? "Item"),
        itemType: String(entry?.itemType ?? ""),
        rarity: String(entry?.rarity ?? ""),
        sourceLabel: String(entry?.sourceLabel ?? ""),
        hasRarity: String(entry?.rarity ?? "").trim().length > 0
      }))
      : [],
    tableRolls: Array.isArray(result?.tableRolls)
      ? result.tableRolls.map((entry) => ({
        sourceLabel: String(entry?.sourceLabel ?? "Source"),
        sourceType: String(entry?.sourceType ?? "currency"),
        tableName: String(entry?.tableName ?? "Roll Table"),
        formula: String(entry?.formula ?? ""),
        total: Math.max(0, Number(entry?.total ?? 0) || 0),
        result: String(entry?.result ?? "No result")
      }))
      : [],
    warnings: Array.isArray(result?.warnings)
      ? result.warnings.map((entry) => String(entry ?? "").trim()).filter(Boolean)
      : []
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
    downtime: {
      hoursGranted: 4,
      tuning: {
        economy: "standard",
        risk: "standard",
        discovery: "standard"
      },
      entries: {},
      logs: []
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
      syncToSceneNonParty: true,
      nonPartySyncScope: NON_PARTY_SYNC_SCOPES.SCENE
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

  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.OPS_LEDGER, ledger);
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

function getSceneNonPartyIntegrationTargets() {
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
    const actorUuid = String(actor.uuid ?? "").trim();
    const tokenUuid = String(tokenDoc.uuid ?? "").trim();
    const key = actorUuid || tokenUuid || `${scene.id}:${tokenDoc.id}:${actorId || tokenDoc.id}`;
    if (!key) continue;
    if (!unique.has(key)) {
      unique.set(key, {
        key,
        actor,
        actorName: String(actor.name ?? tokenDoc.name ?? "Unknown Actor").trim() || "Unknown Actor",
        tokenCount: 0,
        tokenNames: []
      });
    }
    const row = unique.get(key);
    row.tokenCount += 1;
    const tokenName = String(tokenDoc.name ?? actor.name ?? "").trim();
    if (tokenName && !row.tokenNames.includes(tokenName)) row.tokenNames.push(tokenName);
  }
  return Array.from(unique.values())
    .map((row) => ({
      actor: row.actor,
      actorRef: String(row.key),
      actorName: row.actorName,
      tokenCount: Math.max(1, Number(row.tokenCount ?? 0) || 1),
      tokenNamesLabel: row.tokenNames.length > 0 ? row.tokenNames.join(", ") : row.actorName
    }))
    .sort((a, b) => a.actorName.localeCompare(b.actorName));
}

function getSceneNonPartyIntegrationActors() {
  return getSceneNonPartyIntegrationTargets()
    .map((entry) => entry.actor)
    .filter(Boolean);
}

function getNonPartySyncScope(rawScope) {
  const value = String(rawScope ?? "").trim().toLowerCase();
  if (value === NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY) return NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY;
  if (value === NON_PARTY_SYNC_SCOPES.WORLD_ALL) return NON_PARTY_SYNC_SCOPES.WORLD_ALL;
  return NON_PARTY_SYNC_SCOPES.SCENE;
}

function getNonPartySyncScopeLabel(scope) {
  if (scope === NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY) return "All Non-Party Monsters (World)";
  if (scope === NON_PARTY_SYNC_SCOPES.WORLD_ALL) return "All Actors (World)";
  return "Non-Party Actors on Current Scene";
}

function getWorldNonPartyIntegrationTargets() {
  const partyActorIds = getPartyMemberActorIds();
  return game.actors.contents
    .filter((actor) => actor && !actor.hasPlayerOwner && !partyActorIds.has(String(actor.id ?? "")))
    .map((actor) => ({
      actor,
      actorRef: String(actor.id ?? ""),
      actorName: String(actor.name ?? "Unknown Actor").trim() || "Unknown Actor",
      tokenCount: 0,
      tokenNamesLabel: "Not on active scene",
      isSceneTarget: false
    }))
    .sort((a, b) => a.actorName.localeCompare(b.actorName));
}

function getWorldAllIntegrationTargets() {
  return game.actors.contents
    .filter((actor) => Boolean(actor))
    .map((actor) => ({
      actor,
      actorRef: String(actor.id ?? ""),
      actorName: String(actor.name ?? "Unknown Actor").trim() || "Unknown Actor",
      tokenCount: 0,
      tokenNamesLabel: "Not on active scene",
      isSceneTarget: false
    }))
    .sort((a, b) => a.actorName.localeCompare(b.actorName));
}

function getNonPartyIntegrationTargets(scope = NON_PARTY_SYNC_SCOPES.SCENE) {
  const normalizedScope = getNonPartySyncScope(scope);
  if (normalizedScope === NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY) return getWorldNonPartyIntegrationTargets();
  if (normalizedScope === NON_PARTY_SYNC_SCOPES.WORLD_ALL) return getWorldAllIntegrationTargets();
  return getSceneNonPartyIntegrationTargets().map((entry) => ({ ...entry, isSceneTarget: true }));
}

function getNonPartyIntegrationActors(scope = NON_PARTY_SYNC_SCOPES.SCENE) {
  return getNonPartyIntegrationTargets(scope)
    .map((entry) => entry.actor)
    .filter(Boolean);
}

function resolveActorFromReference(actorRef) {
  const ref = String(actorRef ?? "").trim();
  if (!ref) return null;
  if (typeof fromUuidSync === "function" && ref.includes(".")) {
    try {
      const doc = fromUuidSync(ref);
      if (doc && doc.documentName === "Actor") return doc;
      if (doc && doc.documentName === "Token") return doc.actor ?? null;
      if (doc?.actor) return doc.actor;
    } catch {
      // Fall through to actor id lookup.
    }
  }
  return game.actors.get(ref) ?? null;
}

function getIntegrationModeLabel(mode) {
  if (mode === INTEGRATION_MODES.DAE) return "DAE + Flags";
  if (mode === INTEGRATION_MODES.FLAGS) return "Flags Only";
  if (mode === INTEGRATION_MODES.OFF) return "Off";
  return "Auto";
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
  const downtimeState = ensureDowntimeState(ledger);
  const downtime = buildDowntimeContext(downtimeState);
  const lootSources = buildLootSourceRegistryContext();
  const lootRegistryTab = getActiveLootRegistryTab();
  lootSources.registryTab = lootRegistryTab;
  lootSources.registryTabPreview = lootRegistryTab === "preview";
  lootSources.registryTabSettings = lootRegistryTab === "settings";
  lootSources.preview = buildLootPreviewContext();
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
    if (drain <= 0) return "infinite";
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
          summary: `Visibility ${formatSignedModifier(Number(entry.visibilityModifier ?? 0)) || "0"} - Darkness ${Number(entry.darkness ?? 0).toFixed(2)}`,
          details: `${getWeatherEffectSummary(Number(entry.visibilityModifier ?? 0))} - ${describeWeatherDaeChanges(entry.daeChanges ?? [])}`,
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
        summary: `${check.checkLabel} - DC ${Math.max(1, Math.floor(Number(entry.movementDc ?? 12) || 12))}`,
        details: `Affected: ${actorNames.length > 0 ? actorNames.join(", ") : "No actors assigned"}${entry.syncToSceneNonParty !== false ? " - + non-party scene actors" : ""}`,
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
  const resolvedIntegrationMode = resolveIntegrationMode();
  const integrationModeLabel = getIntegrationModeLabel(resolvedIntegrationMode);
  const nonPartySyncScope = getNonPartySyncScope(partyHealthState.nonPartySyncScope);
  const nonPartySyncScopeLabel = getNonPartySyncScopeLabel(nonPartySyncScope);
  const nonPartySyncScopeOptions = [
    { value: NON_PARTY_SYNC_SCOPES.SCENE, label: getNonPartySyncScopeLabel(NON_PARTY_SYNC_SCOPES.SCENE), selected: nonPartySyncScope === NON_PARTY_SYNC_SCOPES.SCENE },
    {
      value: NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY,
      label: getNonPartySyncScopeLabel(NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY),
      selected: nonPartySyncScope === NON_PARTY_SYNC_SCOPES.WORLD_NON_PARTY
    },
    { value: NON_PARTY_SYNC_SCOPES.WORLD_ALL, label: getNonPartySyncScopeLabel(NON_PARTY_SYNC_SCOPES.WORLD_ALL), selected: nonPartySyncScope === NON_PARTY_SYNC_SCOPES.WORLD_ALL }
  ];
  const nonPartySyncGlobal = Boolean(partyHealthState.syncToSceneNonParty);
  const nonPartySyncEnvironment = Boolean(environmentState.syncToSceneNonParty && String(environmentState.presetKey ?? "none") !== "none");
  const nonPartySyncEnabled = nonPartySyncGlobal || nonPartySyncEnvironment;
  const nonPartyTargets = getNonPartyIntegrationTargets(nonPartySyncScope);
  const nonPartyRowsAll = nonPartyTargets.map((target) => {
    const actor = target.actor;
    const hasSyncFlag = Boolean(actor?.getFlag(MODULE_ID, "sync"));
    const integrationEffect = getIntegrationEffect(actor);
    const injuryEffect = getInjuryStatusEffect(actor);
    const environmentEffect = getEnvironmentStatusEffect(actor);
    const hasIntegrationEffect = Boolean(integrationEffect);
    const hasInjuryEffect = Boolean(injuryEffect);
    const hasEnvironmentEffect = Boolean(environmentEffect);
    const hasAnySync = hasSyncFlag || hasIntegrationEffect || hasInjuryEffect || hasEnvironmentEffect;
    const effectNames = [];
    if (hasIntegrationEffect) effectNames.push(String(integrationEffect?.name ?? INTEGRATION_EFFECT_NAME));
    if (hasInjuryEffect) effectNames.push(String(injuryEffect?.name ?? `${INJURY_EFFECT_NAME_PREFIX} Status`));
    if (hasEnvironmentEffect) effectNames.push(String(environmentEffect?.name ?? `${ENVIRONMENT_EFFECT_NAME_PREFIX} Status`));
    const shouldBeCleared = hasAnySync && (!nonPartySyncEnabled || resolvedIntegrationMode === INTEGRATION_MODES.OFF);
    return {
      actorRef: target.actorRef,
      actorName: target.actorName,
      tokenCount: target.tokenCount,
      tokenNamesLabel: target.tokenNamesLabel,
      isSceneTarget: target.isSceneTarget === true,
      locationLabel: target.isSceneTarget === true
        ? `Scene Tokens: ${target.tokenCount} | ${target.tokenNamesLabel}`
        : "World Actor Target",
      hasSyncFlag,
      hasIntegrationEffect,
      hasInjuryEffect,
      hasEnvironmentEffect,
      hasAnySync,
      shouldBeCleared,
      statusLabel: hasAnySync ? (shouldBeCleared ? "Stale (should clear)" : "Synced") : "Clear",
      effectsSummary: effectNames.length > 0 ? effectNames.join(" | ") : "None"
    };
  });
  const nonPartyFilterKeyword = getNonPartySyncFilterKeyword();
  const nonPartyFilterActive = nonPartyFilterKeyword.length > 0;
  const nonPartyRows = nonPartyFilterActive
    ? nonPartyRowsAll.filter((entry) => matchesLootSourceSearchQuery(nonPartyFilterKeyword, {
      label: entry.actorName,
      id: entry.actorRef,
      sourceKind: `${entry.locationLabel} ${entry.effectsSummary} ${entry.statusLabel}`,
      available: entry.hasAnySync,
      enabled: !entry.shouldBeCleared
    }))
    : [];
  const nonPartySyncedCount = nonPartyRowsAll.filter((entry) => entry.hasAnySync).length;
  const nonPartyStaleCount = nonPartyRowsAll.filter((entry) => entry.shouldBeCleared).length;

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
      syncToSceneNonParty: Boolean(partyHealthState.syncToSceneNonParty),
      nonPartySyncScope: nonPartySyncScope
    },
    lootSources,
    nonPartySync: {
      sceneName: String(game.scenes?.current?.name ?? "No Active Scene"),
      scope: nonPartySyncScope,
      scopeLabel: nonPartySyncScopeLabel,
      scopeOptions: nonPartySyncScopeOptions,
      integrationMode: resolvedIntegrationMode,
      integrationModeLabel,
      syncGlobalEnabled: nonPartySyncGlobal,
      syncEnvironmentEnabled: nonPartySyncEnvironment,
      enabled: nonPartySyncEnabled,
      enabledLabel: nonPartySyncEnabled ? "ON" : "OFF",
      modeOff: resolvedIntegrationMode === INTEGRATION_MODES.OFF,
      environmentPresetLabel: String(environmentPreset?.label ?? "None"),
      actorCount: nonPartyRowsAll.length,
      syncedCount: nonPartySyncedCount,
      staleCount: nonPartyStaleCount,
      visibleCount: nonPartyRows.length,
      hasAnyTargets: nonPartyRowsAll.length > 0,
      filter: {
        keyword: nonPartyFilterKeyword,
        active: nonPartyFilterActive
      },
      hasTargets: nonPartyRows.length > 0,
      rows: nonPartyRows
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
    downtime,
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
        label: `${stamp} - Rep ${signedScore} - ${summary}`,
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
        storageWeightSummary: maxWeight > 0 ? `${storageWeightUsed.toFixed(1)} / ${maxWeight.toFixed(1)}` : `${storageWeightUsed.toFixed(1)} / infinite`,
        storageSpaceSummary: maxSpace > 0 ? `${storageItemCount} / ${maxSpace}` : `${storageItemCount} / infinite`
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

function getDowntimeActionDefinition(actionKey = "") {
  const key = String(actionKey ?? "").trim().toLowerCase();
  return DOWNTIME_ACTION_OPTIONS.find((entry) => entry.key === key) ?? DOWNTIME_ACTION_OPTIONS[0];
}

function normalizeDowntimeResult(result = {}) {
  const resolvedAtRaw = Number(result?.resolvedAt ?? result?.rolledAt ?? Date.now());
  const resolvedAt = Number.isFinite(resolvedAtRaw) ? resolvedAtRaw : Date.now();
  const actionDef = getDowntimeActionDefinition(result?.actionKey);
  const details = Array.isArray(result?.details)
    ? result.details.map((entry) => String(entry ?? "").trim()).filter(Boolean).slice(0, 8)
    : [];
  const rollTotalRaw = Number(result?.rollTotal ?? 0);
  const gpDeltaRaw = Number(result?.gpDelta ?? 0);
  const progressRaw = Number(result?.progress ?? 0);
  const rumorCountRaw = Number(result?.rumorCount ?? 0);
  const itemRewards = Array.isArray(result?.itemRewards)
    ? result.itemRewards
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean)
      .slice(0, 10)
    : [];
  const gmNotes = String(result?.gmNotes ?? "").trim();
  const collected = result?.collected === true;
  const collectedAtRaw = Number(result?.collectedAt ?? 0);
  const collectedAt = Number.isFinite(collectedAtRaw) && collectedAtRaw > 0 ? collectedAtRaw : 0;
  const collectedBy = String(result?.collectedBy ?? "").trim();
  const gpDelta = Number.isFinite(gpDeltaRaw) ? Math.floor(gpDeltaRaw) : 0;
  const rumorCount = Number.isFinite(rumorCountRaw) ? Math.max(0, Math.floor(rumorCountRaw)) : 0;
  const hasClaimableRewards = gpDelta > 0 || rumorCount > 0 || itemRewards.length > 0 || gmNotes.length > 0;
  return {
    id: String(result?.id ?? foundry.utils.randomID()).trim() || foundry.utils.randomID(),
    actionKey: actionDef.key,
    actionLabel: String(result?.actionLabel ?? actionDef.label).trim() || actionDef.label,
    summary: String(result?.summary ?? "").trim(),
    details,
    rollTotal: Number.isFinite(rollTotalRaw) ? Math.floor(rollTotalRaw) : 0,
    gpDelta,
    progress: Number.isFinite(progressRaw) ? Math.max(0, Math.floor(progressRaw)) : 0,
    complication: String(result?.complication ?? "").trim(),
    resolvedAt,
    resolvedBy: String(result?.resolvedBy ?? "GM").trim() || "GM",
    rumorCount,
    itemRewards,
    gmNotes,
    hasClaimableRewards,
    collected,
    collectedAt,
    collectedBy
  };
}

function ensureDowntimeState(ledger) {
  if (!ledger.downtime || typeof ledger.downtime !== "object") {
    ledger.downtime = {};
  }
  const downtime = ledger.downtime;
  const hoursGrantedRaw = Number(downtime.hoursGranted ?? 4);
  downtime.hoursGranted = Number.isFinite(hoursGrantedRaw)
    ? Math.max(1, Math.min(24, Math.floor(hoursGrantedRaw)))
    : 4;
  if (!downtime.tuning || typeof downtime.tuning !== "object") downtime.tuning = {};

  const economyAllowed = new Set(DOWNTIME_TUNING_ECONOMY_OPTIONS.map((entry) => entry.value));
  const riskAllowed = new Set(DOWNTIME_TUNING_RISK_OPTIONS.map((entry) => entry.value));
  const discoveryAllowed = new Set(DOWNTIME_TUNING_DISCOVERY_OPTIONS.map((entry) => entry.value));
  const economy = String(downtime.tuning.economy ?? "standard").trim().toLowerCase();
  const risk = String(downtime.tuning.risk ?? "standard").trim().toLowerCase();
  const discovery = String(downtime.tuning.discovery ?? "standard").trim().toLowerCase();
  downtime.tuning.economy = economyAllowed.has(economy) ? economy : "standard";
  downtime.tuning.risk = riskAllowed.has(risk) ? risk : "standard";
  downtime.tuning.discovery = discoveryAllowed.has(discovery) ? discovery : "standard";

  if (!downtime.entries || typeof downtime.entries !== "object" || Array.isArray(downtime.entries)) {
    downtime.entries = {};
  }

  const normalizedEntries = {};
  for (const [rawActorId, rawEntry] of Object.entries(downtime.entries ?? {})) {
    const actorId = String(rawEntry?.actorId ?? rawActorId ?? "").trim();
    if (!actorId) continue;
    const actionDef = getDowntimeActionDefinition(rawEntry?.actionKey);
    const rawHours = Number(rawEntry?.hours ?? downtime.hoursGranted);
    const hours = Number.isFinite(rawHours) ? Math.max(1, Math.min(downtime.hoursGranted, Math.floor(rawHours))) : downtime.hoursGranted;
    const updatedAtRaw = Number(rawEntry?.updatedAt ?? rawEntry?.submittedAt ?? 0);
    const updatedAt = Number.isFinite(updatedAtRaw) ? updatedAtRaw : 0;
    const lastResult = rawEntry?.lastResult && typeof rawEntry.lastResult === "object"
      ? normalizeDowntimeResult(rawEntry.lastResult)
      : null;
    normalizedEntries[actorId] = {
      actorId,
      actorName: String(rawEntry?.actorName ?? game.actors.get(actorId)?.name ?? `Actor ${actorId}`).trim() || `Actor ${actorId}`,
      actionKey: actionDef.key,
      hours,
      note: String(rawEntry?.note ?? "").slice(0, 1000),
      pending: rawEntry?.pending !== false,
      updatedAt,
      updatedBy: String(rawEntry?.updatedBy ?? rawEntry?.submittedBy ?? "").trim() || "Player",
      updatedByUserId: String(rawEntry?.updatedByUserId ?? rawEntry?.submittedByUserId ?? "").trim(),
      lastResult
    };
  }
  downtime.entries = normalizedEntries;

  if (!Array.isArray(downtime.logs)) downtime.logs = [];
  downtime.logs = downtime.logs
    .map((entry) => {
      const normalized = normalizeDowntimeResult(entry);
      return {
        ...normalized,
        actorId: String(entry?.actorId ?? "").trim(),
        actorName: String(entry?.actorName ?? "Unknown Actor").trim() || "Unknown Actor",
        hours: Math.max(1, Math.floor(Number(entry?.hours ?? 4) || 4))
      };
    })
    .filter((entry) => entry.actorId)
    .sort((a, b) => Number(b.resolvedAt ?? 0) - Number(a.resolvedAt ?? 0))
    .slice(0, 80);

  return downtime;
}

function getDowntimeSelectableActorsForUser(user = game.user) {
  if (!user) return [];
  const unique = new Map();
  const addActor = (actor) => {
    if (!actor || actor.type !== "character" || !actor.hasPlayerOwner || !actor.id) return;
    unique.set(String(actor.id), actor);
  };

  if (user.isGM) {
    for (const actor of getOwnedPcActors()) addActor(actor);
  } else {
    for (const actor of game.actors.contents) {
      if (!actor || actor.type !== "character" || !actor.hasPlayerOwner) continue;
      if (actor.testUserPermission?.(user, "OWNER")) addActor(actor);
    }
    if (user.character && user.character.testUserPermission?.(user, "OWNER")) addActor(user.character);
  }

  return Array.from(unique.values()).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function canUserManageDowntimeActor(user, actor) {
  if (!user || !actor) return false;
  if (user.isGM) return true;
  if (!actor.hasPlayerOwner || actor.type !== "character") return false;
  return Boolean(actor.testUserPermission?.(user, "OWNER"));
}

function getDowntimeResolutionBase(entry = {}, downtimeState = {}) {
  const actionDef = getDowntimeActionDefinition(entry?.actionKey);
  const hoursGranted = Math.max(1, Math.min(24, Math.floor(Number(downtimeState?.hoursGranted ?? 4) || 4)));
  const hours = Math.max(1, Math.min(hoursGranted, Math.floor(Number(entry?.hours ?? hoursGranted) || hoursGranted)));
  const blocks = Math.max(1, Math.ceil(hours / 4));
  const tuning = downtimeState?.tuning ?? {};
  const economy = String(tuning.economy ?? "standard");
  const discovery = String(tuning.discovery ?? "standard");
  const economyMultiplier = economy === "stingy" ? 0.8 : economy === "generous" ? 1.3 : 1;
  const discoveryBonus = discovery === "low" ? 0 : discovery === "high" ? 1 : 0;

  let gpAward = 0;
  let rumorCount = 0;
  let itemRewards = [];
  let summary = `${actionDef.label} resolved.`;
  let hint = "Set payouts and notes, then resolve.";

  switch (actionDef.key) {
    case "carousing":
      rumorCount = Math.max(1, blocks + discoveryBonus);
      gpAward = Math.max(0, Math.floor(blocks * economyMultiplier));
      summary = `Carousing established ${rumorCount} rumor/contact lead(s).`;
      hint = "Carousing defaults to rumors/contacts with optional small coin favors.";
      break;
    case "crafting":
      itemRewards = ["Crafting materials package"];
      gpAward = Math.max(0, Math.floor((2 * blocks) * economyMultiplier));
      summary = "Crafting yielded usable materials or a completed mundane item.";
      hint = "Crafting defaults to item/material rewards plus optional reimbursement.";
      break;
    case "profession":
      gpAward = Math.max(1, Math.floor((3 * blocks) * economyMultiplier));
      summary = `Professional work earned ${gpAward} gp.`;
      hint = "Profession defaults to direct coin payout.";
      break;
    case "recuperating":
      summary = "Recuperation granted recovery progress and treatment stabilization.";
      hint = "Recuperating usually grants notes/progress; coin and items are optional.";
      break;
    case "research":
      rumorCount = Math.max(1, blocks + discoveryBonus);
      summary = `Research uncovered ${rumorCount} actionable lead(s).`;
      hint = "Research defaults to rumors/leads and reference notes.";
      break;
    case "training":
      itemRewards = ["Training milestone credit"];
      summary = `Training logged ${hours} hour(s) of progress.`;
      hint = "Training defaults to milestone notes and optional certification reward.";
      break;
    default:
      summary = `${actionDef.label} resolved for ${hours} hour(s).`;
      hint = "Set any payout and notes, then resolve.";
      break;
  }

  return {
    actionKey: actionDef.key,
    actionLabel: actionDef.label,
    gpAward: Math.max(0, Math.floor(gpAward)),
    rumorCount: Math.max(0, Math.floor(rumorCount)),
    itemRewards,
    itemRewardsText: itemRewards.join("\n"),
    summary,
    gmNotes: "",
    hint
  };
}

function buildDowntimeContext(downtimeState = {}, options = {}) {
  const user = options.user ?? game.user;
  const hoursGranted = Math.max(1, Math.min(24, Math.floor(Number(downtimeState?.hoursGranted ?? 4) || 4)));
  const tuning = downtimeState?.tuning ?? {};
  const economy = String(tuning.economy ?? "standard");
  const risk = String(tuning.risk ?? "standard");
  const discovery = String(tuning.discovery ?? "standard");
  const selectableActors = getDowntimeSelectableActorsForUser(user);
  const activeActorId = String(getActiveActorForUser()?.id ?? "").trim();
  const defaultActorId = selectableActors.some((actor) => String(actor.id) === activeActorId)
    ? activeActorId
    : String(selectableActors[0]?.id ?? "");
  const actorOptions = [
    { id: "", name: "Select actor", selected: !defaultActorId },
    ...selectableActors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      selected: String(actor.id) === defaultActorId
    }))
  ];

  const actorEntries = Object.values(downtimeState?.entries ?? {}).map((entry) => {
    const actor = game.actors.get(String(entry?.actorId ?? "").trim());
    const actionDef = getDowntimeActionDefinition(entry?.actionKey);
    const updatedAtRaw = Number(entry?.updatedAt ?? 0);
    const updatedAtDate = updatedAtRaw > 0 ? new Date(updatedAtRaw) : null;
    const updatedAtLabel = updatedAtDate && Number.isFinite(updatedAtDate.getTime()) ? updatedAtDate.toLocaleString() : "Not set";
    const result = entry?.lastResult ? normalizeDowntimeResult(entry.lastResult) : null;
    const gpDelta = Number(result?.gpDelta ?? 0);
    const rumorCount = Math.max(0, Number(result?.rumorCount ?? 0) || 0);
    const itemRewards = Array.isArray(result?.itemRewards) ? result.itemRewards : [];
    const gmNotes = String(result?.gmNotes ?? "");
    const isCollected = result?.collected === true;
    const collectedAt = Number(result?.collectedAt ?? 0);
    const collectedAtLabel = collectedAt > 0 ? new Date(collectedAt).toLocaleString() : "";
    const canCollect = Boolean(result)
      && result.hasClaimableRewards === true
      && !isCollected
      && canUserManageDowntimeActor(user, actor);
    const rewardParts = [];
    if (gpDelta > 0) rewardParts.push(`${gpDelta} gp`);
    if (rumorCount > 0) rewardParts.push(`${rumorCount} rumor/lead`);
    if (itemRewards.length > 0) rewardParts.push(`${itemRewards.length} item reward(s)`);
    if (gmNotes.trim().length > 0) rewardParts.push("GM notes");
    return {
      actorId: String(entry?.actorId ?? "").trim(),
      actorName: String(entry?.actorName ?? actor?.name ?? "Unknown Actor").trim() || "Unknown Actor",
      actionKey: actionDef.key,
      actionLabel: actionDef.label,
      actionGuidance: actionDef.guidance,
      hours: Math.max(1, Math.min(hoursGranted, Math.floor(Number(entry?.hours ?? hoursGranted) || hoursGranted))),
      note: String(entry?.note ?? ""),
      hasNote: String(entry?.note ?? "").trim().length > 0,
      pending: entry?.pending !== false,
      statusLabel: entry?.pending !== false ? "Pending Resolution" : "Resolved",
      updatedAtLabel,
      updatedBy: String(entry?.updatedBy ?? "Player"),
      canClear: canUserManageDowntimeActor(user, actor),
      hasResult: Boolean(result),
      resultSummary: String(result?.summary ?? ""),
      resultDetails: Array.isArray(result?.details) ? result.details : [],
      hasResultDetails: Array.isArray(result?.details) && result.details.length > 0,
      rollTotal: Number(result?.rollTotal ?? 0),
      gpDelta,
      gpDeltaLabel: gpDelta > 0 ? `+${gpDelta}` : String(gpDelta),
      progress: Math.max(0, Number(result?.progress ?? 0) || 0),
      hasComplication: String(result?.complication ?? "").trim().length > 0,
      complication: String(result?.complication ?? ""),
      resolvedAtLabel: result?.resolvedAt ? new Date(Number(result.resolvedAt)).toLocaleString() : "",
      resolvedBy: String(result?.resolvedBy ?? ""),
      rumorCount,
      hasRumorCount: rumorCount > 0,
      itemRewards,
      hasItemRewards: itemRewards.length > 0,
      gmNotes,
      hasGmNotes: gmNotes.trim().length > 0,
      isCollected,
      canCollect,
      hasClaimableRewards: Boolean(result?.hasClaimableRewards),
      rewardSummary: rewardParts.length > 0 ? rewardParts.join(" | ") : "No claimable rewards",
      collectedAtLabel,
      collectedBy: String(result?.collectedBy ?? "")
    };
  }).sort((a, b) => {
    const pendingA = a.pending ? 0 : 1;
    const pendingB = b.pending ? 0 : 1;
    if (pendingA !== pendingB) return pendingA - pendingB;
    return a.actorName.localeCompare(b.actorName);
  });

  const currentEntry = actorEntries.find((entry) => entry.actorId === defaultActorId) ?? null;
  const selectedActionKey = currentEntry?.actionKey ?? DOWNTIME_ACTION_OPTIONS[0]?.key ?? "carousing";
  const submitHours = Math.max(1, Math.min(hoursGranted, Math.floor(Number(currentEntry?.hours ?? hoursGranted) || hoursGranted)));
  const actionOptions = DOWNTIME_ACTION_OPTIONS.map((entry) => ({
    ...entry,
    selected: entry.key === selectedActionKey
  }));

  const logs = Array.isArray(downtimeState?.logs)
    ? downtimeState.logs
      .map((entry) => {
        const normalized = normalizeDowntimeResult(entry);
        const gpDelta = Number(normalized.gpDelta ?? 0);
        const resolvedAtValue = Number(normalized.resolvedAt);
        const resolvedAtDate = new Date(resolvedAtValue);
        const rumorCount = Math.max(0, Number(normalized.rumorCount ?? 0) || 0);
        const itemRewards = Array.isArray(normalized.itemRewards) ? normalized.itemRewards : [];
        const gmNotes = String(normalized.gmNotes ?? "");
        const collectedAt = Number(normalized.collectedAt ?? 0);
        const rewardParts = [];
        if (gpDelta > 0) rewardParts.push(`${gpDelta} gp`);
        if (rumorCount > 0) rewardParts.push(`${rumorCount} rumor/lead`);
        if (itemRewards.length > 0) rewardParts.push(`${itemRewards.length} item reward(s)`);
        if (gmNotes.trim().length > 0) rewardParts.push("GM notes");
        return {
          logId: String(normalized.id ?? "").trim() || foundry.utils.randomID(),
          actorId: String(entry?.actorId ?? "").trim(),
          actorName: String(entry?.actorName ?? "Unknown Actor").trim() || "Unknown Actor",
          actionLabel: normalized.actionLabel,
          hours: Math.max(1, Math.floor(Number(entry?.hours ?? 4) || 4)),
          summary: normalized.summary,
          details: Array.isArray(normalized.details) ? normalized.details : [],
          hasDetails: Array.isArray(normalized.details) && normalized.details.length > 0,
          resolvedAtLabel: Number.isFinite(resolvedAtDate.getTime()) ? resolvedAtDate.toLocaleString() : "Unknown",
          resolvedBy: normalized.resolvedBy,
          gpDelta,
          gpDeltaLabel: gpDelta > 0 ? `+${gpDelta}` : String(gpDelta),
          hasComplication: normalized.complication.length > 0,
          complication: normalized.complication,
          rumorCount,
          hasRumorCount: rumorCount > 0,
          itemRewards,
          hasItemRewards: itemRewards.length > 0,
          gmNotes,
          hasGmNotes: gmNotes.trim().length > 0,
          isCollected: normalized.collected === true,
          hasClaimableRewards: normalized.hasClaimableRewards === true,
          rewardSummary: rewardParts.length > 0 ? rewardParts.join(" | ") : "No claimable rewards",
          collectedAtLabel: collectedAt > 0 ? new Date(collectedAt).toLocaleString() : "",
          collectedBy: String(normalized.collectedBy ?? "")
        };
      })
      .slice(0, 20)
    : [];

  const pendingEntries = actorEntries.filter((entry) => entry.pending);
  const pendingOptions = pendingEntries.map((entry, index) => {
    const base = getDowntimeResolutionBase(entry, downtimeState);
    return {
      actorId: entry.actorId,
      label: `${entry.actorName} - ${entry.actionLabel} (${entry.hours}h)`,
      selected: index === 0,
      baseSummary: base.summary,
      baseGpAward: base.gpAward,
      baseRumorCount: base.rumorCount,
      baseItemRewardsText: base.itemRewardsText,
      baseNotes: base.gmNotes,
      baseHint: base.hint
    };
  });
  const selectedPending = pendingOptions.find((entry) => entry.selected) ?? null;

  return {
    hoursGranted,
    tuning: {
      economy,
      risk,
      discovery,
      economyOptions: DOWNTIME_TUNING_ECONOMY_OPTIONS.map((entry) => ({
        ...entry,
        selected: entry.value === economy
      })),
      riskOptions: DOWNTIME_TUNING_RISK_OPTIONS.map((entry) => ({
        ...entry,
        selected: entry.value === risk
      })),
      discoveryOptions: DOWNTIME_TUNING_DISCOVERY_OPTIONS.map((entry) => ({
        ...entry,
        selected: entry.value === discovery
      }))
    },
    submit: {
      actorOptions,
      actionOptions,
      hours: submitHours,
      note: currentEntry?.note ?? ""
    },
    entries: actorEntries,
    hasEntries: actorEntries.length > 0,
    pendingCount: actorEntries.filter((entry) => entry.pending).length,
    resolvedCount: actorEntries.filter((entry) => entry.hasResult).length,
    logs,
    logCount: logs.length,
    hasLogs: logs.length > 0,
    gmResolve: {
      hasPending: pendingOptions.length > 0,
      pendingOptions,
      selectedActorId: String(selectedPending?.actorId ?? ""),
      summary: String(selectedPending?.baseSummary ?? ""),
      gpAward: Number(selectedPending?.baseGpAward ?? 0),
      rumorCount: Number(selectedPending?.baseRumorCount ?? 0),
      itemRewardsText: String(selectedPending?.baseItemRewardsText ?? ""),
      gmNotes: String(selectedPending?.baseNotes ?? ""),
      hint: String(selectedPending?.baseHint ?? "Set payouts and notes, then resolve.")
    }
  };
}

function getRandomDowntimeComplication(actionKey = "") {
  const catalog = {
    carousing: [
      "A rival social contact starts spreading false rumors.",
      "A favor is now owed to a dangerous patron.",
      "A local authority notices the character's spending and asks questions."
    ],
    crafting: [
      "Critical materials are delayed by a supplier dispute.",
      "A flaw forces rework and wastes part of the effort.",
      "A competitor undercuts the project and drives up costs."
    ],
    profession: [
      "Unexpected fees or guild dues reduce net earnings.",
      "A difficult client disputes payment terms.",
      "Work demand drops suddenly for this cycle."
    ],
    recuperating: [
      "Recovery is interrupted by stress, weather, or poor shelter.",
      "Treatment supplies are consumed faster than expected.",
      "A follow-up check or specialist consultation is required."
    ],
    research: [
      "A key source is missing, damaged, or intentionally altered.",
      "Conflicting accounts produce misleading conclusions.",
      "A relevant authority restricts access to records."
    ],
    training: [
      "Instruction quality drops and progress slows this block.",
      "An interruption forces missed practice sessions.",
      "Additional equipment or tutoring costs are required."
    ]
  };
  const list = Array.isArray(catalog[actionKey]) ? catalog[actionKey] : [];
  if (list.length === 0) return "";
  return String(list[Math.floor(Math.random() * list.length)] ?? "").trim();
}

async function generateDowntimeResult(entry, downtimeState) {
  const actionDef = getDowntimeActionDefinition(entry?.actionKey);
  const hoursGranted = Math.max(1, Math.min(24, Math.floor(Number(downtimeState?.hoursGranted ?? 4) || 4)));
  const hours = Math.max(1, Math.min(hoursGranted, Math.floor(Number(entry?.hours ?? hoursGranted) || hoursGranted)));
  const blocks = Math.max(1, Math.ceil(hours / 4));
  const tuning = downtimeState?.tuning ?? {};
  const economy = String(tuning.economy ?? "standard");
  const risk = String(tuning.risk ?? "standard");
  const discovery = String(tuning.discovery ?? "standard");

  const economyMultiplier = economy === "stingy" ? 0.8 : economy === "generous" ? 1.3 : 1;
  const discoveryBonus = discovery === "low" ? 0 : discovery === "high" ? 2 : 1;
  const riskComplicationChance = risk === "safe" ? 0.1 : risk === "hazardous" ? 0.38 : 0.22;

  const roll = await (new Roll("1d20")).evaluate();
  const rollTotal = Math.max(1, Math.floor(Number(roll?.total ?? 1) || 1));
  let gpDelta = 0;
  let progress = 0;
  let summary = "";
  const details = [];

  switch (actionDef.key) {
    case "carousing": {
      progress = Math.max(0, Math.min(3, Math.floor((rollTotal + discoveryBonus - 4) / 6)));
      const spend = Math.max(2, Math.round((5 * blocks) * economyMultiplier));
      gpDelta = -spend;
      summary = progress > 0
        ? `Built ${progress} social contact(s) while carousing.`
        : "No lasting contact was secured while carousing.";
      details.push(`Spent ${spend} gp on social costs and favors.`);
      break;
    }
    case "crafting": {
      progress = Math.max(1, Math.round((2 * blocks) + Math.floor((rollTotal + discoveryBonus) / 10)));
      const cost = Math.max(1, Math.round(progress * (economy === "stingy" ? 2 : economy === "generous" ? 1 : 1.5)));
      gpDelta = -cost;
      summary = `Made ${progress} crafting progress point(s).`;
      details.push(`Materials consumed: ${cost} gp.`);
      break;
    }
    case "profession": {
      const lifestyleTier = rollTotal >= 16 ? 2 : rollTotal >= 11 ? 1 : 0;
      const wageBase = lifestyleTier === 2 ? 2 : lifestyleTier === 1 ? 1 : 0;
      const wage = Math.max(0, Math.round((wageBase * blocks) * economyMultiplier));
      gpDelta = wage;
      progress = Math.max(1, blocks);
      summary = wage > 0
        ? `Earned ${wage} gp through professional work.`
        : "Covered basic living expenses but earned no spare coin.";
      break;
    }
    case "recuperating": {
      const recoveryScore = rollTotal + (risk === "safe" ? 2 : risk === "hazardous" ? -2 : 0);
      progress = recoveryScore >= 18 ? 3 : recoveryScore >= 13 ? 2 : recoveryScore >= 8 ? 1 : 0;
      summary = progress >= 3
        ? "Exceptional recovery progress."
        : progress === 2
          ? "Solid recovery progress."
          : progress === 1
            ? "Minor recovery progress."
            : "No meaningful recovery progress this cycle.";
      details.push(`Recovery score ${recoveryScore} (${rollTotal} on d20).`);
      break;
    }
    case "research": {
      progress = Math.max(0, Math.floor((rollTotal + (discoveryBonus * 2) - 6) / 7));
      summary = progress > 0
        ? `Uncovered ${progress} research lead(s).`
        : "No actionable lead was uncovered this cycle.";
      details.push("Cross-reference discovered leads with faction, map, and journal notes.");
      break;
    }
    case "training": {
      progress = Math.max(1, Math.floor(hours / 2));
      summary = `Logged ${hours} hour(s) of structured training (${progress} progress).`;
      details.push("Apply progress toward language/tool proficiency milestones.");
      break;
    }
    default: {
      progress = Math.max(1, blocks);
      summary = `${actionDef.label} advanced by ${progress} progress point(s).`;
      break;
    }
  }

  const adjustedComplicationChance = Math.max(0, Math.min(0.9, riskComplicationChance + (rollTotal <= 6 ? 0.1 : 0) - (rollTotal >= 18 ? 0.08 : 0)));
  const complication = Math.random() < adjustedComplicationChance
    ? getRandomDowntimeComplication(actionDef.key)
    : "";
  if (complication) details.push(`Complication: ${complication}`);

  return normalizeDowntimeResult({
    id: foundry.utils.randomID(),
    actionKey: actionDef.key,
    actionLabel: actionDef.label,
    rollTotal,
    summary,
    details,
    gpDelta,
    progress,
    complication,
    resolvedAt: Date.now(),
    resolvedBy: String(game.user?.name ?? "GM")
  });
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
  if (recommendations.length === 0) recommendations.push("Recon plan is stable. Maintain cadence and refresh leads after major events.");

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
    ledger.partyHealth = {
      modifierEnabled: {},
      customModifiers: [],
      archivedSyncEffects: [],
      syncToSceneNonParty: true,
      nonPartySyncScope: NON_PARTY_SYNC_SCOPES.SCENE
    };
  }
  if (!ledger.partyHealth.modifierEnabled || typeof ledger.partyHealth.modifierEnabled !== "object") {
    ledger.partyHealth.modifierEnabled = {};
  }
  if (!Array.isArray(ledger.partyHealth.customModifiers)) ledger.partyHealth.customModifiers = [];
  if (!Array.isArray(ledger.partyHealth.archivedSyncEffects)) ledger.partyHealth.archivedSyncEffects = [];
  ledger.partyHealth.syncToSceneNonParty = ledger.partyHealth.syncToSceneNonParty !== false;
  ledger.partyHealth.nonPartySyncScope = getNonPartySyncScope(ledger.partyHealth.nonPartySyncScope);
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

function normalizeDowntimeSubmission(raw = {}, downtimeState = {}) {
  const hoursGranted = Math.max(1, Math.min(24, Math.floor(Number(downtimeState?.hoursGranted ?? 4) || 4)));
  const actorId = String(raw?.actorId ?? "").trim();
  const actionDef = getDowntimeActionDefinition(raw?.actionKey);
  const hoursRaw = Number(raw?.hours ?? hoursGranted);
  const hours = Number.isFinite(hoursRaw)
    ? Math.max(1, Math.min(hoursGranted, Math.floor(hoursRaw)))
    : hoursGranted;
  const note = String(raw?.note ?? "").slice(0, 1000);
  return {
    actorId,
    actionKey: actionDef.key,
    hours,
    note
  };
}

function readDowntimeSubmissionFromUi(element) {
  const root = element?.closest(".po-downtime-panel");
  if (!root) return null;
  return {
    actorId: String(root.querySelector("select[name='downtimeActorId']")?.value ?? "").trim(),
    actionKey: String(root.querySelector("select[name='downtimeActionKey']")?.value ?? "").trim(),
    hours: Number(root.querySelector("input[name='downtimeHours']")?.value ?? 0),
    note: String(root.querySelector("textarea[name='downtimeNote']")?.value ?? "")
  };
}

async function applyDowntimeSubmissionForUser(user, rawSubmission = {}) {
  if (!user) return false;
  const ledger = getOperationsLedger();
  const downtimeState = ensureDowntimeState(ledger);
  const submission = normalizeDowntimeSubmission(rawSubmission, downtimeState);
  if (!submission.actorId) return false;

  const actor = game.actors.get(submission.actorId);
  if (!actor || !canUserManageDowntimeActor(user, actor)) return false;

  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    const normalized = normalizeDowntimeSubmission(submission, downtime);
    const previous = downtime.entries?.[normalized.actorId] ?? {};
    downtime.entries[normalized.actorId] = {
      ...previous,
      actorId: normalized.actorId,
      actorName: String(actor.name ?? `Actor ${normalized.actorId}`),
      actionKey: normalized.actionKey,
      hours: normalized.hours,
      note: normalized.note,
      pending: true,
      updatedAt: Date.now(),
      updatedBy: String(user.name ?? "Player"),
      updatedByUserId: String(user.id ?? ""),
      lastResult: null
    };
  });
  return true;
}

async function submitDowntimeAction(element) {
  const submission = readDowntimeSubmissionFromUi(element);
  if (!submission) return;
  if (!submission.actorId) {
    ui.notifications?.warn("Select an actor for downtime submission.");
    return;
  }

  if (game.user.isGM) {
    const applied = await applyDowntimeSubmissionForUser(game.user, submission);
    if (!applied) ui.notifications?.warn("Downtime submission failed.");
    else ui.notifications?.info("Downtime action submitted.");
    return;
  }

  const actor = game.actors.get(submission.actorId);
  if (!actor || !canUserManageDowntimeActor(game.user, actor)) {
    ui.notifications?.warn("You can only submit downtime for actors you own.");
    return;
  }

  game.socket.emit(SOCKET_CHANNEL, {
    type: "ops:downtime-submit",
    userId: game.user.id,
    entry: submission
  });
  ui.notifications?.info("Downtime request sent to GM.");
}

async function clearDowntimeEntry(element) {
  const actorId = String(element?.dataset?.actorId ?? readDowntimeSubmissionFromUi(element)?.actorId ?? "").trim();
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor) {
    ui.notifications?.warn("Actor for downtime entry was not found.");
    return;
  }

  if (game.user.isGM) {
    await updateOperationsLedger((ledger) => {
      const downtime = ensureDowntimeState(ledger);
      if (!downtime.entries) return;
      delete downtime.entries[actorId];
    });
    ui.notifications?.info(`Cleared downtime entry for ${actor.name}.`);
    return;
  }

  if (!canUserManageDowntimeActor(game.user, actor)) {
    ui.notifications?.warn("You can only clear downtime entries for actors you own.");
    return;
  }
  game.socket.emit(SOCKET_CHANNEL, {
    type: "ops:downtime-clear",
    userId: game.user.id,
    actorId
  });
  ui.notifications?.info("Downtime clear request sent to GM.");
}

async function setDowntimeHoursGranted(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can set downtime hours.");
    return;
  }
  const valueRaw = Number(element?.value ?? 4);
  const value = Number.isFinite(valueRaw) ? Math.max(1, Math.min(24, Math.floor(valueRaw))) : 4;
  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    downtime.hoursGranted = value;
  });
}

async function setDowntimeTuningField(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit downtime tuning.");
    return;
  }
  const key = String(element?.dataset?.tuning ?? "").trim().toLowerCase();
  const value = String(element?.value ?? "").trim().toLowerCase();
  if (!key) return;
  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    if (!downtime.tuning || typeof downtime.tuning !== "object") downtime.tuning = {};
    if (key === "economy") {
      const allowed = new Set(DOWNTIME_TUNING_ECONOMY_OPTIONS.map((entry) => entry.value));
      downtime.tuning.economy = allowed.has(value) ? value : "standard";
      return;
    }
    if (key === "risk") {
      const allowed = new Set(DOWNTIME_TUNING_RISK_OPTIONS.map((entry) => entry.value));
      downtime.tuning.risk = allowed.has(value) ? value : "standard";
      return;
    }
    if (key === "discovery") {
      const allowed = new Set(DOWNTIME_TUNING_DISCOVERY_OPTIONS.map((entry) => entry.value));
      downtime.tuning.discovery = allowed.has(value) ? value : "standard";
    }
  });
}

function parseDowntimeItemRewardsText(value) {
  return String(value ?? "")
    .split(/\r?\n|,/)
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

function getDowntimeResolverRoot(element) {
  return element?.closest(".po-downtime-resolver") ?? null;
}

function readDowntimeResolverSelection(root) {
  const select = root?.querySelector("select[name='resolveDowntimeActorId']");
  const actorId = String(select?.value ?? "").trim();
  const selectedOption = select?.selectedOptions?.[0] ?? null;
  return {
    actorId,
    selectedOption
  };
}

function applyDowntimeResolverBaseToUi(element, options = {}) {
  if (!game.user.isGM) return;
  const root = getDowntimeResolverRoot(element);
  if (!root) return;
  const { selectedOption } = readDowntimeResolverSelection(root);
  if (!selectedOption) return;
  const force = options?.force === true;

  const summaryInput = root.querySelector("input[name='resolveDowntimeSummary']");
  const gpInput = root.querySelector("input[name='resolveDowntimeGp']");
  const rumorInput = root.querySelector("input[name='resolveDowntimeRumors']");
  const itemTextarea = root.querySelector("textarea[name='resolveDowntimeItems']");
  const notesTextarea = root.querySelector("textarea[name='resolveDowntimeNotes']");
  const hintNode = root.querySelector("[data-downtime-resolve-hint]");

  if (summaryInput && (force || !String(summaryInput.value ?? "").trim())) summaryInput.value = String(selectedOption.dataset.baseSummary ?? "");
  if (gpInput && (force || !String(gpInput.value ?? "").trim())) gpInput.value = String(selectedOption.dataset.baseGp ?? "0");
  if (rumorInput && (force || !String(rumorInput.value ?? "").trim())) rumorInput.value = String(selectedOption.dataset.baseRumors ?? "0");
  if (itemTextarea && (force || !String(itemTextarea.value ?? "").trim())) itemTextarea.value = String(selectedOption.dataset.baseItems ?? "");
  if (notesTextarea && (force || !String(notesTextarea.value ?? "").trim())) notesTextarea.value = String(selectedOption.dataset.baseNotes ?? "");
  if (hintNode) hintNode.textContent = String(selectedOption.dataset.baseHint ?? "Set payouts and notes, then resolve.");
}

function readDowntimeResolutionFromUi(element) {
  const root = getDowntimeResolverRoot(element);
  if (!root) return null;
  const { actorId } = readDowntimeResolverSelection(root);
  const summary = String(root.querySelector("input[name='resolveDowntimeSummary']")?.value ?? "").trim();
  const gpAwardRaw = Number(root.querySelector("input[name='resolveDowntimeGp']")?.value ?? 0);
  const rumorRaw = Number(root.querySelector("input[name='resolveDowntimeRumors']")?.value ?? 0);
  const itemRewards = parseDowntimeItemRewardsText(root.querySelector("textarea[name='resolveDowntimeItems']")?.value ?? "");
  const gmNotes = String(root.querySelector("textarea[name='resolveDowntimeNotes']")?.value ?? "").trim();
  return {
    actorId,
    summary,
    gpAward: Number.isFinite(gpAwardRaw) ? Math.max(0, Math.floor(gpAwardRaw)) : 0,
    rumorCount: Number.isFinite(rumorRaw) ? Math.max(0, Math.floor(rumorRaw)) : 0,
    itemRewards,
    gmNotes
  };
}

async function resolveSelectedDowntimeEntry(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can resolve downtime.");
    return;
  }
  const resolution = readDowntimeResolutionFromUi(element);
  if (!resolution?.actorId) {
    ui.notifications?.warn("Select a pending downtime entry.");
    return;
  }

  const ledger = getOperationsLedger();
  const downtime = ensureDowntimeState(ledger);
  const entry = downtime.entries?.[resolution.actorId];
  if (!entry || entry.pending === false) {
    ui.notifications?.warn("Selected downtime entry is no longer pending.");
    return;
  }

  const actionDef = getDowntimeActionDefinition(entry.actionKey);
  const actorName = String(game.actors.get(resolution.actorId)?.name ?? entry.actorName ?? `Actor ${resolution.actorId}`);
  const details = [];
  if (resolution.gpAward > 0) details.push(`Awarded ${resolution.gpAward} gp.`);
  if (resolution.rumorCount > 0) details.push(`Rumor leads awarded: ${resolution.rumorCount}.`);
  if (resolution.itemRewards.length > 0) details.push(`Item rewards: ${resolution.itemRewards.join("; ")}.`);
  if (resolution.gmNotes) details.push(`GM Notes: ${resolution.gmNotes}`);

  const summary = resolution.summary
    || `${actionDef.label} resolved for ${actorName}.`;
  const result = normalizeDowntimeResult({
    id: foundry.utils.randomID(),
    actionKey: actionDef.key,
    actionLabel: actionDef.label,
    summary,
    details,
    rollTotal: 0,
    gpDelta: resolution.gpAward,
    progress: 0,
    complication: "",
    rumorCount: resolution.rumorCount,
    itemRewards: resolution.itemRewards,
    gmNotes: resolution.gmNotes,
    collected: false,
    resolvedAt: Date.now(),
    resolvedBy: String(game.user?.name ?? "GM")
  });

  await updateOperationsLedger((nextLedger) => {
    const state = ensureDowntimeState(nextLedger);
    if (!state.entries || typeof state.entries !== "object") state.entries = {};
    if (!Array.isArray(state.logs)) state.logs = [];

    const current = state.entries[resolution.actorId] ?? {};
    state.entries[resolution.actorId] = {
      ...current,
      actorId: resolution.actorId,
      actorName,
      actionKey: actionDef.key,
      hours: Math.max(1, Math.min(state.hoursGranted, Math.floor(Number(current.hours ?? entry.hours ?? state.hoursGranted) || state.hoursGranted))),
      pending: false,
      updatedAt: Date.now(),
      updatedBy: String(game.user?.name ?? "GM"),
      updatedByUserId: String(game.user?.id ?? ""),
      lastResult: result
    };

    state.logs.unshift({
      ...result,
      actorId: resolution.actorId,
      actorName,
      hours: Math.max(1, Math.min(state.hoursGranted, Math.floor(Number(current.hours ?? entry.hours ?? state.hoursGranted) || state.hoursGranted)))
    });
    state.logs = state.logs
      .sort((a, b) => Number(b.resolvedAt ?? 0) - Number(a.resolvedAt ?? 0))
      .slice(0, 80);
  });

  ui.notifications?.info(`Resolved downtime for ${actorName}.`);
}

function getActorCurrentGp(actor) {
  if (!actor) return 0;
  const gpNode = actor.system?.currency?.gp;
  const raw = typeof gpNode === "object" ? Number(gpNode?.value) : Number(gpNode);
  return Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
}

async function awardGpToActor(actor, amount) {
  const gp = Number(amount ?? 0);
  if (!actor || !Number.isFinite(gp) || gp <= 0) return 0;
  const gain = Math.max(0, Math.floor(gp));
  if (gain <= 0) return 0;
  const next = getActorCurrentGp(actor) + gain;
  if (typeof actor.system?.currency?.gp === "object") {
    await actor.update({ "system.currency.gp.value": next });
  } else {
    await actor.update({ "system.currency.gp": next });
  }
  return gain;
}

async function applyDowntimeCollectionForUser(user, actorId) {
  const actor = game.actors.get(String(actorId ?? "").trim());
  if (!actor) return { ok: false, message: "Actor not found." };
  if (!canUserManageDowntimeActor(user, actor)) return { ok: false, message: "You do not own this actor." };

  const ledger = getOperationsLedger();
  const downtime = ensureDowntimeState(ledger);
  const entry = downtime.entries?.[actor.id];
  const result = entry?.lastResult ? normalizeDowntimeResult(entry.lastResult) : null;
  if (!result) return { ok: false, message: "No resolved downtime result found." };
  if (entry?.pending !== false) return { ok: false, message: "This downtime result is still pending." };
  if (!result.hasClaimableRewards) return { ok: false, message: "No claimable rewards are attached to this result." };
  if (result.collected) return { ok: false, message: "This downtime reward was already collected." };

  let gpApplied = 0;
  const gpToAward = Math.max(0, Math.floor(Number(result.gpDelta ?? 0) || 0));
  if (gpToAward > 0) {
    try {
      gpApplied = await awardGpToActor(actor, gpToAward);
    } catch (error) {
      console.warn(`${MODULE_ID}: failed to apply downtime GP reward`, error);
      return { ok: false, message: "Failed to apply GP to actor currency." };
    }
  }

  const now = Date.now();
  const collectorName = String(user?.name ?? "Player");
  await updateOperationsLedger((nextLedger) => {
    const state = ensureDowntimeState(nextLedger);
    const currentEntry = state.entries?.[actor.id];
    if (!currentEntry || !currentEntry.lastResult) return;
    const normalizedResult = normalizeDowntimeResult({
      ...currentEntry.lastResult,
      collected: true,
      collectedAt: now,
      collectedBy: collectorName
    });
    currentEntry.lastResult = normalizedResult;
    if (Array.isArray(state.logs)) {
      state.logs = state.logs.map((row) => {
        if (String(row?.id ?? "") !== String(normalizedResult.id ?? "")) return row;
        if (String(row?.actorId ?? "") !== String(actor.id)) return row;
        return normalizeDowntimeResult({
          ...row,
          collected: true,
          collectedAt: now,
          collectedBy: collectorName
        });
      });
    }
  });

  return {
    ok: true,
    actorName: String(actor.name ?? "Actor"),
    gpApplied,
    rumorCount: Number(result.rumorCount ?? 0) || 0,
    itemRewards: Array.isArray(result.itemRewards) ? result.itemRewards : [],
    gmNotes: String(result.gmNotes ?? "").trim()
  };
}

function getDowntimeCollectionSummary(outcome = {}) {
  const parts = [];
  const gp = Math.max(0, Number(outcome?.gpApplied ?? 0) || 0);
  const rumors = Math.max(0, Number(outcome?.rumorCount ?? 0) || 0);
  const items = Array.isArray(outcome?.itemRewards) ? outcome.itemRewards.filter(Boolean) : [];
  const hasNotes = String(outcome?.gmNotes ?? "").trim().length > 0;
  if (gp > 0) parts.push(`${gp} gp added`);
  if (rumors > 0) parts.push(`${rumors} rumor/lead`);
  if (items.length > 0) parts.push(`${items.length} item reward(s)`);
  if (hasNotes) parts.push("GM notes reviewed");
  if (parts.length === 0) return "Rewards marked as collected.";
  return parts.join(" | ");
}

async function collectDowntimeResult(element) {
  const actorId = String(element?.dataset?.actorId ?? "").trim();
  if (!actorId) return;

  if (game.user.isGM) {
    const outcome = await applyDowntimeCollectionForUser(game.user, actorId);
    if (!outcome.ok) {
      ui.notifications?.warn(outcome.message ?? "Failed to collect downtime rewards.");
      return;
    }
    ui.notifications?.info(`Collected downtime rewards for ${outcome.actorName}. ${getDowntimeCollectionSummary(outcome)}`);
    return;
  }

  const actor = game.actors.get(actorId);
  if (!actor || !canUserManageDowntimeActor(game.user, actor)) {
    ui.notifications?.warn("You can only collect downtime rewards for actors you own.");
    return;
  }
  game.socket.emit(SOCKET_CHANNEL, {
    type: "ops:downtime-collect",
    userId: game.user.id,
    actorId
  });
  ui.notifications?.info("Downtime collection request sent to GM.");
}

async function resolveDowntimeActions() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can resolve downtime.");
    return;
  }
  const ledger = getOperationsLedger();
  const downtime = ensureDowntimeState(ledger);
  const entries = Object.values(downtime.entries ?? {}).filter((entry) => {
    const actorId = String(entry?.actorId ?? "").trim();
    if (!actorId) return false;
    return entry?.pending !== false || !entry?.lastResult;
  });
  if (entries.length === 0) {
    ui.notifications?.info("No pending downtime entries to resolve.");
    return;
  }

  const generated = [];
  for (const entry of entries) {
    const result = await generateDowntimeResult(entry, downtime);
    generated.push({
      actorId: String(entry.actorId),
      actorName: String(game.actors.get(entry.actorId)?.name ?? entry.actorName ?? `Actor ${entry.actorId}`),
      actionKey: getDowntimeActionDefinition(entry.actionKey).key,
      actionLabel: getDowntimeActionDefinition(entry.actionKey).label,
      hours: Math.max(1, Math.min(downtime.hoursGranted, Math.floor(Number(entry.hours ?? downtime.hoursGranted) || downtime.hoursGranted))),
      result
    });
  }

  await updateOperationsLedger((ledger) => {
    const state = ensureDowntimeState(ledger);
    if (!state.entries || typeof state.entries !== "object") state.entries = {};
    if (!Array.isArray(state.logs)) state.logs = [];

    for (const row of generated) {
      const entry = state.entries[row.actorId] ?? {};
      state.entries[row.actorId] = {
        ...entry,
        actorId: row.actorId,
        actorName: row.actorName,
        actionKey: row.actionKey,
        hours: row.hours,
        pending: false,
        updatedAt: Date.now(),
        updatedBy: String(game.user?.name ?? "GM"),
        updatedByUserId: String(game.user?.id ?? ""),
        lastResult: normalizeDowntimeResult(row.result)
      };
      state.logs.unshift({
        ...normalizeDowntimeResult(row.result),
        actorId: row.actorId,
        actorName: row.actorName,
        hours: row.hours
      });
    }
    state.logs = state.logs
      .sort((a, b) => Number(b.resolvedAt ?? 0) - Number(a.resolvedAt ?? 0))
      .slice(0, 80);
  });

  const lines = generated
    .map((row) => `<li><strong>${row.actorName}</strong>: ${row.result.summary}</li>`)
    .join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `<p><strong>Downtime Resolution</strong></p><ul>${lines}</ul>`
  });
  ui.notifications?.info(`Resolved downtime for ${generated.length} actor(s).`);
}

async function clearDowntimeResults() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can clear downtime results.");
    return;
  }
  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    for (const entry of Object.values(downtime.entries ?? {})) {
      if (!entry || typeof entry !== "object") continue;
      entry.pending = true;
      entry.lastResult = null;
    }
    downtime.logs = [];
  });
  ui.notifications?.info("Downtime results cleared.");
}

async function postDowntimeLogOutcome(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can post downtime outcomes.");
    return;
  }
  const logId = String(element?.dataset?.logId ?? "").trim();
  if (!logId) return;
  const ledger = getOperationsLedger();
  const downtime = ensureDowntimeState(ledger);
  const source = Array.isArray(downtime.logs)
    ? downtime.logs.find((entry) => String(entry?.id ?? "").trim() === logId)
    : null;
  if (!source) {
    ui.notifications?.warn("Downtime log entry not found.");
    return;
  }

  const result = normalizeDowntimeResult(source);
  const escape = foundry.utils.escapeHTML ?? ((value) => String(value ?? ""));
  const actorName = String(source.actorName ?? "Unknown Actor").trim() || "Unknown Actor";
  const actionLabel = String(result.actionLabel ?? getDowntimeActionDefinition(source.actionKey).label ?? "Downtime");
  const hours = Math.max(1, Math.floor(Number(source.hours ?? 4) || 4));
  const detailsHtml = (Array.isArray(result.details) ? result.details : [])
    .map((entry) => `<li>${escape(entry)}</li>`)
    .join("");
  const complication = String(result.complication ?? "").trim();
  const rumorCount = Math.max(0, Number(result.rumorCount ?? 0) || 0);
  const itemRewards = Array.isArray(result.itemRewards) ? result.itemRewards : [];
  const gmNotes = String(result.gmNotes ?? "").trim();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `
      <p><strong>Downtime Outcome</strong></p>
      <p><strong>${escape(actorName)}</strong> - ${escape(actionLabel)} (${hours} hour(s))</p>
      <p>${escape(result.summary || "No summary provided.")}</p>
      ${detailsHtml ? `<ul>${detailsHtml}</ul>` : ""}
      <p><strong>GP:</strong> ${result.gpDelta > 0 ? `+${result.gpDelta}` : String(result.gpDelta)}</p>
      ${rumorCount > 0 ? `<p><strong>Rumors/Leads:</strong> ${rumorCount}</p>` : ""}
      ${itemRewards.length > 0 ? `<p><strong>Item Rewards:</strong> ${escape(itemRewards.join("; "))}</p>` : ""}
      ${gmNotes ? `<p><strong>GM Notes:</strong> ${escape(gmNotes)}</p>` : ""}
      ${complication ? `<p><strong>Complication:</strong> ${escape(complication)}</p>` : ""}
      <p><em>Resolved by ${escape(result.resolvedBy)} at ${escape(new Date(Number(result.resolvedAt)).toLocaleString())}</em></p>
    `
  });
  ui.notifications?.info(`Posted downtime outcome for ${actorName}.`);
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

async function setPartyHealthSyncScope(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can edit Party Health modifiers.");
    return;
  }
  const scope = getNonPartySyncScope(element?.value);
  await updateOperationsLedger((ledger) => {
    const partyHealth = ensurePartyHealthState(ledger);
    partyHealth.nonPartySyncScope = scope;
  });
}

async function setOperationalSopNote(element) {
  const sopKey = String(element?.dataset?.sop ?? "").trim();
  if (!sopKey || !SOP_KEYS.includes(sopKey)) return;
  const note = clampSocketText(element?.value, SOCKET_NOTE_MAX_LENGTH);
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
    source: `${actor.name} - ${item.name}`
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
    source: `${actor.name} - ${item.name}`
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

  return { summary: summaryParts.join(" - ") };
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
    ? ` - Fail Streak ${streakState.next}`
    : (streakState.previous > 0 ? " - Fail Streak Reset" : "");
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
    ? "Recon success: lower entry uncertainty before first contact."
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
  const root = element?.closest(".po-op-role-row[data-faction]") ?? element?.closest(".po-op-role-row");
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
    content: `<p><strong>Reputation Log:</strong> ${foundry.utils.escapeHTML(factionLabel)} - ${signedScore}</p><p>${foundry.utils.escapeHTML(String(createdLog.dayLabel ?? ""))}</p><p>${foundry.utils.escapeHTML(String(createdLog.note ?? ""))}</p>`
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
    .map((faction) => `<li>${faction.label}: ${faction.score} (${faction.band}) - Access ${faction.access}${faction.note ? ` - ${faction.note}` : ""}</li>`)
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

async function applyNonPartySyncActor(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can apply non-party sync.");
    return;
  }
  const actorRef = String(element?.dataset?.actorRef ?? "").trim();
  const includeEnvironment = String(element?.dataset?.sceneTarget ?? "").trim().toLowerCase() === "true";
  if (!actorRef) return;
  const actor = resolveActorFromReference(actorRef);
  if (!actor) {
    ui.notifications?.warn("Sync target actor not found.");
    return;
  }
  const result = await syncSingleSceneNonPartyActor(actor, null, resolveIntegrationMode(), {
    includeEnvironment
  });
  refreshOpenApps();
  emitSocketRefresh();
  if (result.synced) {
    ui.notifications?.info(`Reapplied non-party sync to ${actor.name}.`);
    return;
  }
  if (result.cleared) {
    ui.notifications?.info(`Cleared non-party sync from ${actor.name} because sync is currently disabled.`);
    return;
  }
  ui.notifications?.info(`No non-party sync changes were needed for ${actor.name}.`);
}

async function clearNonPartySyncActor(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can clear non-party sync.");
    return;
  }
  const actorRef = String(element?.dataset?.actorRef ?? "").trim();
  if (!actorRef) return;
  const actor = resolveActorFromReference(actorRef);
  if (!actor) {
    ui.notifications?.warn("Sync target actor not found.");
    return;
  }
  await clearActorIntegrationPayload(actor);
  refreshOpenApps();
  emitSocketRefresh();
  ui.notifications?.info(`Cleared non-party sync from ${actor.name}.`);
}

async function reapplyAllNonPartySync() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can reapply non-party sync.");
    return;
  }
  const result = await syncSceneNonPartyIntegrationActors(null, resolveIntegrationMode());
  refreshOpenApps();
  emitSocketRefresh();
  ui.notifications?.info(`Non-party sync applied (${result.scopeLabel}): ${result.synced} synced, ${result.cleared} cleared across ${result.total} actor(s).`);
}

async function clearAllNonPartySync() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can clear non-party sync.");
    return;
  }
  const config = getSceneNonPartySyncConfig();
  const targets = getNonPartyIntegrationActors(config.scope);
  let cleared = 0;
  for (const actor of targets) {
    const hasSync = Boolean(actor.getFlag(MODULE_ID, "sync"));
    const hasEffect = Boolean(getIntegrationEffect(actor));
    const hasInjuryEffect = Boolean(getInjuryStatusEffect(actor));
    const hasEnvironmentEffect = Boolean(getEnvironmentStatusEffect(actor));
    if (!hasSync && !hasEffect && !hasInjuryEffect && !hasEnvironmentEffect) continue;
    await clearActorIntegrationPayload(actor);
    cleared += 1;
  }
  refreshOpenApps();
  emitSocketRefresh();
  ui.notifications?.info(`Cleared non-party sync (${config.scopeLabel}) from ${cleared} actor(s).`);
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
      await safeDeleteActiveEffect(actor, effect, "integration");
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

  await safeDeleteActiveEffect(actor, effect, "integration");
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
        <div><strong>${escape(entry.logTypeLabel)}</strong> - ${escape(entry.title)}</div>
        <div class="po-op-summary">${escape(entry.summary)}${entry.details ? ` - ${escape(entry.details)}` : ""}</div>
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

function getLootPackSourceMetaById(packId) {
  const id = String(packId ?? "").trim();
  if (!id) return null;
  return getAvailableLootItemPackSources().find((entry) => entry.id === id) ?? null;
}

function getLootTableSourceMetaById(tableId) {
  const id = String(tableId ?? "").trim();
  if (!id) return null;
  return getAvailableLootTableSources().find((entry) => entry.id === id) ?? null;
}

async function toggleLootPackSource(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const packId = String(element?.dataset?.packId ?? "").trim();
  if (!packId) return;
  const enabled = Boolean(element?.checked);
  const meta = getLootPackSourceMetaById(packId);

  await updateLootSourceConfig((config) => {
    if (!Array.isArray(config.packs)) config.packs = [];
    let row = config.packs.find((entry) => String(entry?.id ?? "") === packId);
    if (!row) {
      row = normalizeLootSourcePackEntry({
        id: packId,
        label: String(meta?.label ?? packId),
        sourceKind: String(meta?.sourceKind ?? "compendium-pack"),
        enabled,
        weight: 1
      });
      if (row) config.packs.push(row);
      return;
    }
    row.enabled = enabled;
    row.label = String(meta?.label ?? row.label ?? packId);
    row.sourceKind = String(meta?.sourceKind ?? row.sourceKind ?? "compendium-pack");
    row.weight = Math.max(1, Math.floor(Number(row.weight ?? 1) || 1));
  });
}

async function setLootPackWeight(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const packId = String(element?.dataset?.packId ?? "").trim();
  if (!packId) return;
  const weightRaw = Number(element?.value ?? 1);
  const weight = Number.isFinite(weightRaw) ? Math.max(1, Math.floor(weightRaw)) : 1;
  const meta = getLootPackSourceMetaById(packId);

  await updateLootSourceConfig((config) => {
    if (!Array.isArray(config.packs)) config.packs = [];
    let row = config.packs.find((entry) => String(entry?.id ?? "") === packId);
    if (!row) {
      row = normalizeLootSourcePackEntry({
        id: packId,
        label: String(meta?.label ?? packId),
        sourceKind: String(meta?.sourceKind ?? "compendium-pack"),
        enabled: false,
        weight
      });
      if (row) config.packs.push(row);
      return;
    }
    row.weight = weight;
    row.label = String(meta?.label ?? row.label ?? packId);
    row.sourceKind = String(meta?.sourceKind ?? row.sourceKind ?? "compendium-pack");
  });
}

async function toggleLootTableSource(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const tableId = String(element?.dataset?.tableId ?? "").trim();
  if (!tableId) return;
  const enabled = Boolean(element?.checked);
  const meta = getLootTableSourceMetaById(tableId);

  await updateLootSourceConfig((config) => {
    if (!Array.isArray(config.tables)) config.tables = [];
    let row = config.tables.find((entry) => String(entry?.id ?? "") === tableId);
    if (!row) {
      row = normalizeLootSourceTableEntry({
        id: tableId,
        label: String(meta?.label ?? tableId),
        sourceKind: String(meta?.sourceKind ?? "table-pack"),
        enabled,
        tableType: "currency"
      });
      if (row) config.tables.push(row);
      return;
    }
    row.enabled = enabled;
    row.label = String(meta?.label ?? row.label ?? tableId);
    row.sourceKind = String(meta?.sourceKind ?? row.sourceKind ?? "table-pack");
    if (!row.tableType) row.tableType = "currency";
  });
}

async function setLootTableType(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const tableId = String(element?.dataset?.tableId ?? "").trim();
  if (!tableId) return;
  const tableType = String(element?.value ?? "currency").trim().toLowerCase();
  const validTypes = new Set(LOOT_TABLE_TYPE_OPTIONS.map((entry) => entry.value));
  const nextType = validTypes.has(tableType) ? tableType : "currency";
  const meta = getLootTableSourceMetaById(tableId);

  await updateLootSourceConfig((config) => {
    if (!Array.isArray(config.tables)) config.tables = [];
    let row = config.tables.find((entry) => String(entry?.id ?? "") === tableId);
    if (!row) {
      row = normalizeLootSourceTableEntry({
        id: tableId,
        label: String(meta?.label ?? tableId),
        sourceKind: String(meta?.sourceKind ?? "table-pack"),
        enabled: false,
        tableType: nextType
      });
      if (row) config.tables.push(row);
      return;
    }
    row.tableType = nextType;
    row.label = String(meta?.label ?? row.label ?? tableId);
    row.sourceKind = String(meta?.sourceKind ?? row.sourceKind ?? "table-pack");
  });
}

async function toggleLootItemType(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const itemType = String(element?.dataset?.itemType ?? "").trim();
  if (!itemType) return;
  const enabled = Boolean(element?.checked);
  const validTypes = new Set(buildLootItemTypeCatalog().map((entry) => entry.value));
  if (!validTypes.has(itemType)) return;

  await updateLootSourceConfig((config) => {
    if (!config.filters || typeof config.filters !== "object") config.filters = {};
    const current = new Set(Array.isArray(config.filters.allowedTypes) ? config.filters.allowedTypes.map((entry) => String(entry ?? "").trim()) : []);
    if (enabled) current.add(itemType);
    else current.delete(itemType);
    config.filters.allowedTypes = Array.from(current).filter((entry) => validTypes.has(entry));
  });
}

async function setLootRarityFloor(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const rarityFloor = normalizeLootRarityValue(element?.value);
  await updateLootSourceConfig((config) => {
    if (!config.filters || typeof config.filters !== "object") config.filters = {};
    config.filters.rarityFloor = rarityFloor;
  });
}

async function setLootRarityCeiling(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const rarityCeiling = normalizeLootRarityValue(element?.value);
  await updateLootSourceConfig((config) => {
    if (!config.filters || typeof config.filters !== "object") config.filters = {};
    config.filters.rarityCeiling = rarityCeiling;
  });
}

async function resetLootSourceConfig() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can configure loot sources.");
    return;
  }
  const defaults = buildDefaultLootSourceConfig();
  await updateLootSourceConfig((config) => {
    config.packs = foundry.utils.deepClone(defaults.packs);
    config.tables = foundry.utils.deepClone(defaults.tables);
    config.filters = foundry.utils.deepClone(defaults.filters);
  });
  ui.notifications?.info("Loot source configuration reset to defaults.");
}

function setLootPreviewField(element) {
  if (!game.user.isGM) return;
  const field = String(element?.dataset?.field ?? "").trim();
  if (!field) return;
  const current = getLootPreviewDraft();
  const next = {
    ...current,
    [field]: (field === "actorCount")
      ? Number(element?.value ?? current.actorCount ?? 1)
      : String(element?.value ?? current[field] ?? "")
  };
  setLootPreviewDraft(next);
}

function readLootPreviewDraftFromUi(element) {
  const root = element?.closest(".po-loot-preview-panel");
  if (!root) return null;
  return normalizeLootPreviewDraft({
    mode: root.querySelector("select[name='lootPreviewMode']")?.value ?? "",
    profile: root.querySelector("select[name='lootPreviewProfile']")?.value ?? "",
    challenge: root.querySelector("select[name='lootPreviewChallenge']")?.value ?? "",
    scale: root.querySelector("select[name='lootPreviewScale']")?.value ?? "",
    actorCount: root.querySelector("input[name='lootPreviewActorCount']")?.value ?? 1
  });
}

async function rollLootPreview(element) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can generate loot previews.");
    return;
  }
  const draft = readLootPreviewDraftFromUi(element) ?? getLootPreviewDraft();
  setLootPreviewDraft(draft);
  const payload = await generateLootPreviewPayload(draft);
  setLootPreviewResult(payload);
  ui.notifications?.info(`Loot preview generated (${payload.items.length} item(s), ${Math.round(Number(payload.currency?.gpEquivalent ?? 0))} gp equivalent).`);
}

function clearLootPreviewResult() {
  if (!game.user.isGM) return;
  setLootPreviewResult(null);
}

async function gmQuickAddFaction() {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can update reputation.");
    return;
  }
  const content = `
    <div class="form-group">
      <label>Faction Name</label>
      <input type="text" name="quickFactionName" placeholder="e.g., Black Salt Consortium" />
    </div>
  `;
  const dialog = new Dialog({
    title: "Quick Add Faction",
    content,
    buttons: {
      add: {
        label: "Add Faction",
        callback: async (html) => {
          const label = String(html.find("input[name='quickFactionName']").val() ?? "").trim();
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
          ui.notifications?.info(`Faction added: ${label}.`);
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "add"
  });
  dialog.render(true);
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
    note: note || `Weather profile logged - darkness ${darkness.toFixed(2)}`,
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
          <div class="po-op-role-status">Qty ${qty} - ${weight.toFixed(1)} wt each</div>
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
      <div class="po-op-summary"><strong>${foundry.utils.escapeHTML(String(site.name ?? "Storage Site"))}</strong> - ${foundry.utils.escapeHTML(getBaseSiteTypeLabel(String(site.type ?? "safehouse")))}</div>
      <div class="po-op-summary">Weight: ${weightUsed.toFixed(1)} / ${Math.max(0, Number(storage.maxWeight ?? 0) || 0).toFixed(1)} - Space: ${spaceUsed} / ${Math.max(0, Number(storage.maxSpace ?? 0) || 0)}</div>

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
    title: `Storage Inventory - ${String(site.name ?? "Site")}`,
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
    .map((site) => `<li>${site.typeLabel}: ${site.name} - ${site.statusLabel} - Pressure ${site.pressure} - Risk ${site.risk} - Storage ${site.storageItemCount} items (${site.storageWeightSummary} wt, ${site.storageSpaceSummary} space)${site.note ? ` - ${site.note}` : ""}</li>`)
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

async function runSessionAutopilot(options = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can run session autopilot.");
    return null;
  }
  const requireConfirm = options.confirm !== false;
  if (requireConfirm) {
    const confirmed = await Dialog.confirm({
      title: "Run Session Autopilot?",
      content: `
        <p>This will run the automated session cycle:</p>
        <ul>
          <li>Apply daily upkeep (if due)</li>
          <li>Run injury recovery cycle</li>
          <li>Log current scene weather snapshot</li>
          <li>Run integration sync (effects/flags)</li>
          <li>Sync injuries to Simple Calendar</li>
        </ul>
        <p>A full snapshot is saved first so you can use <strong>Undo Autopilot</strong>.</p>
      `
    });
    if (!confirmed) return null;
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
  const nonPartyScopeLabel = getNonPartySyncScopeLabel(getNonPartySyncScope(context.partyHealth?.nonPartySyncScope));
  const nonPartyLine = `Non-party sync (${nonPartyScopeLabel}): modifiers ${nonPartyGlobal ? "ON" : "OFF"} | environment ${nonPartyEnvironment ? "ON" : "OFF"}.`;
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

async function undoLastSessionAutopilot(options = {}) {
  if (!game.user.isGM) {
    ui.notifications?.warn("Only the GM can undo session autopilot.");
    return false;
  }
  const snapshot = getSessionAutopilotSnapshot();
  if (!snapshot || !snapshot.createdAt) {
    ui.notifications?.warn("No saved session autopilot snapshot found.");
    return false;
  }
  const requireConfirm = options.confirm !== false;
  if (requireConfirm) {
    const createdAt = new Date(Number(snapshot.createdAt)).toLocaleString();
    const confirmed = await Dialog.confirm({
      title: "Undo Session Autopilot?",
      content: `
        <p>This restores the snapshot saved before the last autopilot run.</p>
        <p><strong>Snapshot:</strong> ${foundry.utils.escapeHTML(createdAt)} by ${foundry.utils.escapeHTML(String(snapshot.createdBy ?? "GM"))}</p>
        <p>It will restore Rest Watch, Marching Order, Activities, Operations, and Injury Recovery states.</p>
      `
    });
    if (!confirmed) return false;
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
    .map((item) => `<li>${item.label}: ${item.formatted} - applies to ${item.appliesTo}${item.enabled ? "" : " - OFF"}</li>`)
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
      <p><strong>Healer's Kit:</strong> Charges are consumed from the selected healer's kit item in Injury & Recovery.</p>
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
      healersKitCharges: 10,
      healersKitActorId: "",
      healersKitItemId: ""
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

  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.INJURY_RECOVERY, state);
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

function normalizeHealersKitText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/['`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isHealersKitItem(item) {
  if (!item) return false;
  const nameText = normalizeHealersKitText(item.name);
  const idText = normalizeHealersKitText(item.system?.identifier ?? item.system?.slug ?? item.id);
  const combined = `${nameText} ${idText}`.trim();
  if (!combined) return false;
  if (combined.includes("healers kit") || combined.includes("healer kit")) return true;
  return combined.includes("healer") && combined.includes("kit");
}

function getHealersKitTrackedCharges(item) {
  const uses = Number(item?.system?.uses?.value);
  if (Number.isFinite(uses)) return Math.max(0, Math.floor(uses));
  const quantity = Number(item?.system?.quantity);
  if (Number.isFinite(quantity)) return Math.max(0, Math.floor(quantity));
  return 0;
}

async function setHealersKitTrackedCharges(item, value) {
  const next = Math.max(0, Math.floor(Number(value) || 0));
  if (item?.system?.uses?.value !== undefined) {
    await item.update({ "system.uses.value": next });
    return;
  }
  if (item?.system?.quantity !== undefined) {
    await item.update({ "system.quantity": next });
  }
}

function getHealersKitOwnerActors() {
  return game.actors.contents
    .filter((actor) => actor && actor.isOwner)
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

function getHealersKitItems(actor, options = {}) {
  if (!actor?.items?.contents) return [];
  const includeDepleted = options?.includeDepleted === true;
  return actor.items.contents
    .filter((item) => isHealersKitItem(item))
    .map((item) => ({
      id: item.id,
      name: String(item.name ?? "Healer's Kit").trim() || "Healer's Kit",
      charges: getHealersKitTrackedCharges(item)
    }))
    .filter((item) => includeDepleted || item.charges > 0)
    .sort((a, b) => {
      const chargeDelta = Number(b.charges ?? 0) - Number(a.charges ?? 0);
      if (chargeDelta !== 0) return chargeDelta;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });
}

function normalizeHealersKitSelection(supplies = {}) {
  return {
    actorId: String(supplies?.healersKitActorId ?? "").trim(),
    itemId: String(supplies?.healersKitItemId ?? "").trim()
  };
}

function getAllHealersKitEntries(options = {}) {
  const includeDepleted = options?.includeDepleted === true;
  const entries = [];
  for (const actor of getHealersKitOwnerActors()) {
    const items = getHealersKitItems(actor, { includeDepleted });
    for (const item of items) {
      entries.push({
        actorId: actor.id,
        actorName: String(actor.name ?? "Unknown Actor").trim() || "Unknown Actor",
        itemId: item.id,
        itemName: item.name,
        charges: item.charges
      });
    }
  }
  return entries;
}

function buildHealersKitSelectionContext(state) {
  const supplies = state?.supplies ?? {};
  const selected = normalizeHealersKitSelection(supplies);
  const actorRows = getHealersKitOwnerActors()
    .map((actor) => {
      const items = getHealersKitItems(actor, { includeDepleted: true });
      if (items.length === 0) return null;
      const totalCharges = items.reduce((sum, item) => sum + Math.max(0, Number(item.charges ?? 0)), 0);
      return { actor, items, totalCharges };
    })
    .filter(Boolean);

  const actorFallback = actorRows[0]?.actor.id ?? "";
  const selectedActorId = actorRows.some((entry) => entry.actor.id === selected.actorId)
    ? selected.actorId
    : actorFallback;
  const activeActorRow = actorRows.find((entry) => entry.actor.id === selectedActorId) ?? null;

  let selectedItemId = selected.itemId;
  const activeItems = activeActorRow?.items ?? [];
  if (!activeItems.some((item) => item.id === selectedItemId && item.charges > 0)) {
    selectedItemId = activeItems.find((item) => item.charges > 0)?.id ?? activeItems[0]?.id ?? "";
  }

  const actorOptions = [
    { id: "", name: "None", selected: !selectedActorId },
    ...actorRows.map((entry) => ({
      id: entry.actor.id,
      name: `${entry.actor.name} (${entry.totalCharges})`,
      selected: entry.actor.id === selectedActorId
    }))
  ];
  const itemOptions = [
    { id: "", name: "None", selected: !selectedItemId },
    ...activeItems.map((item) => ({
      id: item.id,
      name: `${item.name} (${item.charges})`,
      selected: item.id === selectedItemId
    }))
  ];

  const selectedItem = activeItems.find((item) => item.id === selectedItemId) ?? null;
  const allEntries = getAllHealersKitEntries({ includeDepleted: false });
  const totalCharges = allEntries.reduce((sum, entry) => sum + Math.max(0, Number(entry.charges ?? 0)), 0);

  return {
    actorOptions,
    itemOptions,
    selectedActorId,
    selectedItemId,
    hasActor: Boolean(activeActorRow),
    hasItem: Boolean(selectedItem),
    selectedCharges: Math.max(0, Number(selectedItem?.charges ?? 0)),
    selectedLabel: selectedItem
      ? `${String(activeActorRow?.actor?.name ?? "")} - ${selectedItem.name}`
      : "None",
    totalCharges
  };
}

function getOrderedHealersKitCandidates(state) {
  const selected = normalizeHealersKitSelection(state?.supplies ?? {});
  const allEntries = getAllHealersKitEntries({ includeDepleted: false });
  if (allEntries.length === 0) return [];

  const prioritized = [];
  const pushEntry = (entry) => {
    if (!entry) return;
    const key = `${entry.actorId}:${entry.itemId}`;
    if (prioritized.some((candidate) => `${candidate.actorId}:${candidate.itemId}` === key)) return;
    prioritized.push(entry);
  };

  if (selected.actorId && selected.itemId) {
    pushEntry(allEntries.find((entry) => entry.actorId === selected.actorId && entry.itemId === selected.itemId));
  }
  if (selected.actorId) {
    for (const entry of allEntries.filter((candidate) => candidate.actorId === selected.actorId)) pushEntry(entry);
  }
  for (const entry of allEntries) pushEntry(entry);
  return prioritized;
}

async function consumeHealersKitCharges(requiredCharges, state = null) {
  const needed = Math.max(0, Math.floor(Number(requiredCharges) || 0));
  if (needed <= 0) {
    const context = buildHealersKitSelectionContext(state ?? getInjuryRecoveryState());
    return {
      ok: true,
      needed: 0,
      consumed: 0,
      missing: 0,
      details: [],
      nextSelection: {
        actorId: context.selectedActorId,
        itemId: context.selectedItemId
      },
      totalCharges: context.totalCharges
    };
  }

  const currentState = state ?? getInjuryRecoveryState();
  const candidates = getOrderedHealersKitCandidates(currentState);
  if (candidates.length === 0) {
    return {
      ok: false,
      needed,
      consumed: 0,
      missing: needed,
      details: [],
      nextSelection: { actorId: "", itemId: "" },
      totalCharges: 0
    };
  }
  const availableCharges = candidates.reduce((sum, entry) => sum + Math.max(0, Number(entry.charges ?? 0)), 0);
  if (availableCharges < needed) {
    const context = buildHealersKitSelectionContext(currentState);
    return {
      ok: false,
      needed,
      consumed: 0,
      missing: needed,
      details: [],
      nextSelection: {
        actorId: context.selectedActorId,
        itemId: context.selectedItemId
      },
      totalCharges: context.totalCharges
    };
  }

  let remaining = needed;
  const details = [];
  for (const candidate of candidates) {
    if (remaining <= 0) break;
    const actor = game.actors.get(candidate.actorId);
    const item = actor?.items?.get(candidate.itemId);
    if (!actor || !item) continue;
    const available = getHealersKitTrackedCharges(item);
    if (available <= 0) continue;
    const spent = Math.min(available, remaining);
    await setHealersKitTrackedCharges(item, available - spent);
    remaining -= spent;
    details.push({
      actorId: actor.id,
      actorName: String(actor.name ?? "Unknown Actor").trim() || "Unknown Actor",
      itemId: item.id,
      itemName: String(item.name ?? "Healer's Kit").trim() || "Healer's Kit",
      spent,
      remainingCharges: Math.max(0, available - spent)
    });
  }

  const nextContext = buildHealersKitSelectionContext(currentState);
  return {
    ok: remaining <= 0,
    needed,
    consumed: needed - remaining,
    missing: Math.max(0, remaining),
    details,
    nextSelection: {
      actorId: nextContext.selectedActorId,
      itemId: nextContext.selectedItemId
    },
    totalCharges: nextContext.totalCharges
  };
}

function buildInjuryRecoveryContext() {
  const state = getInjuryRecoveryState();
  const config = state.config ?? {};
  const defaultActorId = resolveDefaultInjuryActorId();
  const healerKitSelection = buildHealersKitSelectionContext(state);
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
      healersKitCharges: Number(healerKitSelection.totalCharges ?? 0),
      kitSelection: healerKitSelection
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
  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.INJURY_RECOVERY, state);
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
    const stringValue = String(element?.value ?? "").trim();

    if (key === "healersKitActorId") {
      state.supplies.healersKitActorId = stringValue;
      if (!stringValue) {
        state.supplies.healersKitItemId = "";
      } else {
        const actor = game.actors.get(stringValue);
        const items = getHealersKitItems(actor, { includeDepleted: true });
        const currentItemId = String(state.supplies.healersKitItemId ?? "").trim();
        if (!items.some((item) => item.id === currentItemId && item.charges > 0)) {
          state.supplies.healersKitItemId = items.find((item) => item.charges > 0)?.id ?? items[0]?.id ?? "";
        }
      }
      state.supplies.healersKitCharges = getAllHealersKitEntries({ includeDepleted: false })
        .reduce((sum, entry) => sum + Math.max(0, Number(entry.charges ?? 0)), 0);
      return;
    }

    if (key === "healersKitItemId") {
      state.supplies.healersKitItemId = stringValue;
      state.supplies.healersKitCharges = getAllHealersKitEntries({ includeDepleted: false })
        .reduce((sum, entry) => sum + Math.max(0, Number(entry.charges ?? 0)), 0);
      return;
    }

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
  const recoveryState = getInjuryRecoveryState();
  const initial = recoveryState.injuries?.[actorId];
  if (!initial) return;
  if (initial.permanent) {
    ui.notifications?.warn("This injury is permanent and cannot be stabilized by kit treatment.");
    return;
  }

  const requiredCharges = Math.max(0, Number(initial.kitCharges ?? 1));
  const treatmentDc = Math.max(0, Number(initial.treatmentDc ?? 0));
  const treatmentSkill = String(initial.treatmentSkill ?? "");

  const kitResult = await consumeHealersKitCharges(requiredCharges, recoveryState);
  await updateInjuryRecoveryState((state) => {
    if (!state.supplies) state.supplies = {};
    state.supplies.healersKitActorId = String(kitResult.nextSelection?.actorId ?? "");
    state.supplies.healersKitItemId = String(kitResult.nextSelection?.itemId ?? "");
    state.supplies.healersKitCharges = Math.max(0, Number(kitResult.totalCharges ?? 0));
  });

  const consumedSummary = kitResult.details
    .map((entry) => `${entry.actorName} - ${entry.itemName} (-${entry.spent})`)
    .join(", ");

  if (!kitResult.ok) {
    if (kitResult.consumed > 0) {
      ui.notifications?.warn(`Healer's Kit partially consumed (${consumedSummary || `${kitResult.consumed} charge(s)`}), but ${kitResult.missing} additional charge(s) are required.`);
      return;
    }
    ui.notifications?.warn("No usable Healer's Kit charges are available for this treatment.");
    return;
  }

  const passedCheck = await rollTreatmentCheck(actorId, treatmentSkill, treatmentDc);
  if (!passedCheck) {
    if (kitResult.consumed > 0) ui.notifications?.warn(`Treatment attempt failed after consuming ${kitResult.consumed} Healer's Kit charge(s).`);
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

  const consumedLabel = consumedSummary || `${kitResult.consumed} charge(s)`;
  ui.notifications?.info(`Treatment succeeded. Consumed ${consumedLabel}.`);
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
      lines.push(`${actorName}: ${before}->${after} days (progress ${progress})`);

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
    .map((entry) => `<li>${entry.actorName}: ${entry.injuryName}${entry.injuryRoll ? ` (d100 ${entry.injuryRoll})` : ""} - ${entry.permanent ? "permanent" : `${entry.recoveryDays} day(s)`} - ${entry.stabilized ? "stabilized" : "unstable"}${entry.treatmentDc ? ` - DC ${entry.treatmentDc} ${entry.treatmentSkill === "ins" ? "Insight" : entry.treatmentSkill === "con" ? "CON" : "Medicine"}` : ""} - due ${entry.recoveryDueLabel}</li>`)
    .join("");
  const content = `
    <div class="po-help">
      <p><strong>Active Injuries:</strong> ${context.summary.activeInjuries}</p>
      <p><strong>Unstable:</strong> ${context.summary.unstableCount}</p>
      <p><strong>Permanent:</strong> ${context.summary.permanentCount}</p>
      <p><strong>Selected Healer's Kit:</strong> ${context.supplies.kitSelection.selectedLabel} (${context.supplies.kitSelection.selectedCharges})</p>
      <p><strong>Total Healer's Kit Charges:</strong> ${context.supplies.kitSelection.totalCharges}</p>
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
    lightRanges: {},
    doctrineTracker: {
      lastCheckAt: "-",
      lastCheckNote: "-"
    }
  };
}

function normalizeLightDistance(value, fallback) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(999, Math.floor(raw)));
}

function getMarchLightRange(state, actorId) {
  const fallbackBright = DEFAULT_MARCH_LIGHT_BRIGHT;
  const fallbackDim = DEFAULT_MARCH_LIGHT_DIM;
  const source = state?.lightRanges?.[actorId] ?? {};
  const bright = normalizeLightDistance(source.bright, fallbackBright);
  const dimRaw = normalizeLightDistance(source.dim, fallbackDim);
  const dim = Math.max(bright, dimRaw);
  return { bright, dim };
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
    const normalizedRequest = normalizeSocketRestRequest(mutatorOrRequest);
    if (!normalizedRequest) return;
    game.socket.emit(SOCKET_CHANNEL, {
      type: "rest:mutate",
      userId: game.user.id,
      request: normalizedRequest
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
  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_STATE, state);
  scheduleIntegrationSync("rest-watch");
  if (!options.skipLocalRefresh) refreshOpenApps();
  emitSocketRefresh();
}

async function updateMarchingOrderState(mutatorOrRequest, options = {}) {
  if (!game.user.isGM) {
    const normalizedRequest = normalizeSocketMarchRequest(mutatorOrRequest);
    if (!normalizedRequest) return;
    game.socket.emit(SOCKET_CHANNEL, {
      type: "march:mutate",
      userId: game.user.id,
      request: normalizedRequest
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
  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.MARCH_STATE, state);
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
  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_STATE, foundry.utils.deepClone(committed));
  scheduleIntegrationSync("rest-watch-restore");
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
  const rankLabels = {
    front: "Front",
    middle: "Middle",
    rear: "Rear"
  };
  const orderedRankIds = ["front", "middle", "rear"];
  const escape = foundry.utils.escapeHTML ?? ((value) => String(value ?? ""));
  const seenActors = new Set();
  const doctrinePartyRows = [];
  for (const rankId of orderedRankIds) {
    for (const actorId of state.ranks?.[rankId] ?? []) {
      if (!actorId || seenActors.has(actorId)) continue;
      seenActors.add(actorId);
      const actor = game.actors.get(actorId);
      if (!actor) continue;
      const range = getMarchLightRange(state, actorId);
      doctrinePartyRows.push(
        `<li><strong>${escape(actor.name)}</strong> (${escape(rankLabels[rankId] ?? rankId)}) - ${state.light?.[actorId] ? `Torch active (Bright ${range.bright} ft / Dim ${range.dim} ft)` : "No torch"}</li>`
      );
    }
  }
  const doctrinePartySummary = doctrinePartyRows.length > 0
    ? `<ul>${doctrinePartyRows.join("")}</ul>`
    : "<p><em>No actors currently assigned to marching order.</em></p>";

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
      <p><strong>Marching Panel:</strong></p>
      ${doctrinePartySummary}
      <p><em>${escape(note)}</em></p>
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
    if (state.lightRanges) delete state.lightRanges[actorId];
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
    if (!state.lightRanges) state.lightRanges = {};
    state.light[actorId] = Boolean(checked);
    if (checked && !state.lightRanges[actorId]) {
      state.lightRanges[actorId] = {
        bright: DEFAULT_MARCH_LIGHT_BRIGHT,
        dim: DEFAULT_MARCH_LIGHT_DIM
      };
    }
  });
}

async function setLightRange(element) {
  if (!game.user.isGM) return;
  const actorId = element?.closest("[data-actor-id]")?.dataset?.actorId;
  const rangeKey = String(element?.dataset?.range ?? "").trim().toLowerCase();
  if (!actorId || !["bright", "dim"].includes(rangeKey)) return;
  const fallback = rangeKey === "bright" ? DEFAULT_MARCH_LIGHT_BRIGHT : DEFAULT_MARCH_LIGHT_DIM;
  const value = normalizeLightDistance(element?.value, fallback);
  await updateMarchingOrderState((state) => {
    if (!state.lightRanges) state.lightRanges = {};
    const current = getMarchLightRange(state, actorId);
    const next = {
      bright: rangeKey === "bright" ? value : current.bright,
      dim: rangeKey === "dim" ? value : current.dim
    };
    next.dim = Math.max(next.bright, next.dim);
    state.lightRanges[actorId] = next;
    if (!state.light) state.light = {};
    if (state.light[actorId] && rangeKey === "bright" && next.dim < next.bright) {
      state.lightRanges[actorId].dim = next.bright;
    }
  });
}

async function copyMarchingText(asMarkdown) {
  const state = getMarchingOrderState();
  const lines = Object.entries(state.ranks).map(([rank, actorIds]) => {
    const names = (actorIds ?? []).map((actorId) => {
      const name = game.actors.get(actorId)?.name ?? "(missing)";
      if (!state.light?.[actorId]) return name;
      const range = getMarchLightRange(state, actorId);
      return `${name} [Torch ${range.bright}/${range.dim}ft]`;
    });
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
    state.lightRanges = {};
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

  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_ACTIVITIES, activities);
  refreshOpenApps();
  emitSocketRefresh();
}

async function updateActivity(element, options = {}) {
  const actorId = sanitizeSocketIdentifier(element?.dataset?.actorId, { maxLength: 64 });
  const activityType = normalizeSocketActivityType(element?.value ?? element?.dataset?.activity);
  if (!actorId || !activityType) return;

  if (game.user.isGM) {
    // GM updates directly
    const activities = getRestActivities();
    if (!activities.activities[actorId]) activities.activities[actorId] = {};
    activities.activities[actorId].activity = activityType;
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_ACTIVITIES, activities);
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

  await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_ACTIVITIES, activities);

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
        const lightRange = getMarchLightRange(state, actorId);
        const lightTooltip = hasLight
          ? `Torch active: Bright ${lightRange.bright} ft, Dim ${lightRange.dim} ft.`
          : "";
        const canEditNote = (isGM || userOwnsActor(actor)) && !lockedForUser;
        return {
          actorId,
          actor: buildActorView(actor, isGM, "names-passives"),
          hasLight,
          lightBright: lightRange.bright,
          lightDim: lightRange.dim,
          lightTooltip,
          notes: state.notes?.[actorId] ?? "",
          canEditNote
        };
      })
      .filter(Boolean);

    const capacity = config?.capacity;
    const capacityPercent = capacity ? Math.min(100, (entries.length / capacity) * 100) : 0;

    return {
      ...rank,
      ...config,
      entries,
      capacity,
      capacityPercent,
      collapsed: false,
      toggleLabel: "Collapse",
      toggleIcon: "fa-chevron-up"
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
      const range = getMarchLightRange(state, actorId);
      return {
        actorId,
        actorName: actor.name,
        hasLight: Boolean(state.light?.[actorId]),
        bright: range.bright,
        dim: range.dim
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
    const pos = clampFloatingLauncherPosition(resetPos);
    applyFloatingLauncherInlineStyles(launcher, pos);
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

function applyClickOpenerInlineStyles(opener) {
  if (!opener) return;
  opener.style.position = "fixed";
  opener.style.left = "58px";
  opener.style.bottom = "84px";
  opener.style.zIndex = "10050";
  opener.style.display = "flex";
  opener.style.visibility = "visible";
  opener.style.opacity = "1";
  opener.style.alignItems = "center";
  opener.style.justifyContent = "center";
  opener.style.width = "40px";
  opener.style.height = "40px";
  opener.style.pointerEvents = "auto";
}

function applyFloatingLauncherInlineStyles(launcher, position = null) {
  if (!launcher) return;
  launcher.style.position = "fixed";
  launcher.style.zIndex = "10050";
  launcher.style.display = "flex";
  launcher.style.visibility = "visible";
  launcher.style.opacity = "1";
  launcher.style.pointerEvents = "auto";
  launcher.style.flexDirection = "column";
  launcher.style.gap = "6px";
  const pos = position ?? clampFloatingLauncherPosition(getFloatingLauncherPosition());
  launcher.style.left = `${pos.left}px`;
  launcher.style.top = `${pos.top}px`;
}

function scheduleLauncherRecoveryPass() {
  if (launcherRecoveryScheduled) return;
  launcherRecoveryScheduled = true;
  const finalDelay = LAUNCHER_RECOVERY_DELAYS_MS[LAUNCHER_RECOVERY_DELAYS_MS.length - 1];

  for (const delay of LAUNCHER_RECOVERY_DELAYS_MS) {
    window.setTimeout(() => {
      try {
        ensureClickOpener();
        ensureFloatingLauncher();
      } catch (error) {
        console.warn(`${MODULE_ID}: launcher recovery pass failed`, error);
      } finally {
        if (delay === finalDelay) {
          launcherRecoveryScheduled = false;
        }
      }
    }, delay);
  }
}

function openOperationsUi() {
  setActiveRestMainTab("operations");
  return new RestWatchApp().render({ force: true });
}

function openGmUi() {
  if (!game.user?.isGM) {
    ui.notifications?.warn("GM permissions are required for the GM section.");
    return null;
  }
  setActiveRestMainTab("gm");
  return new RestWatchApp().render({ force: true });
}

function ensureLauncherUi() {
  ensureClickOpener();
  ensureFloatingLauncher();
  scheduleLauncherRecoveryPass();
}

function buildPartyOperationsApi() {
  const api = {
    restWatch: () => new RestWatchApp().render({ force: true }),
    marchingOrder: () => new MarchingOrderApp().render({ force: true }),
    operations: () => openOperationsUi(),
    gm: () => openGmUi(),
    refreshAll: () => refreshOpenApps(),
    getOperations: () => foundry.utils.deepClone(getOperationsLedger()),
    applyUpkeep: () => applyOperationalUpkeep(),
    getInjuryRecovery: () => foundry.utils.deepClone(getInjuryRecoveryState()),
    applyRecoveryCycle: () => applyRecoveryCycle(),
    runSessionAutopilot: () => runSessionAutopilot(),
    undoSessionAutopilot: () => undoLastSessionAutopilot(),
    syncInjuryCalendar: () => syncAllInjuriesToSimpleCalendar(),
    syncIntegrations: () => scheduleIntegrationSync("api"),
    getLootSourceConfig: () => foundry.utils.deepClone(getLootSourceConfig()),
    previewLoot: (draft) => generateLootPreviewPayload(draft),
    getLootPreviewResult: () => foundry.utils.deepClone(getLootPreviewResult()),
    diagnoseWorldData: (options) => diagnoseWorldData(options),
    repairWorldData: () => diagnoseWorldData({ repair: true }),
    resetLauncherPosition: () => resetFloatingLauncherPosition(),
    ensureLauncher: () => ensureLauncherUi(),
    showLauncher: () => ensureLauncherUi()
  };

  // Backward-compatible aliases for older macro snippets.
  api.openRestWatch = api.restWatch;
  api.openMarchingOrder = api.marchingOrder;
  api.openOperations = api.operations;
  api.openGM = api.gm;
  api.launcher = api.ensureLauncher;

  return api;
}

function registerPartyOperationsApi() {
  const api = buildPartyOperationsApi();
  game.partyOperations = api;

  const moduleRef = game.modules?.get?.(MODULE_ID);
  if (moduleRef) {
    try {
      moduleRef.api = api;
    } catch (error) {
      console.warn(`${MODULE_ID}: unable to attach api on module reference`, error);
    }
  }

  return api;
}

function ensureClickOpener() {
  let opener = document.getElementById("po-click-opener");
  if (!opener) {
    opener = document.createElement("button");
    opener.id = "po-click-opener";
    opener.type = "button";
    opener.setAttribute("title", "Open Party Operations");
    opener.setAttribute("aria-label", "Open Party Operations");
    opener.innerHTML = '<i class="fas fa-compass"></i>';
    opener.addEventListener("click", () => {
      ensureFloatingLauncher();
      if (game.user?.isGM) {
        new RestWatchApp().render({ force: true });
      } else {
        new RestWatchPlayerApp().render({ force: true });
      }
    });
    document.body.appendChild(opener);
  }

  applyClickOpenerInlineStyles(opener);
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
        setActiveRestMainTab("gm");
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
  applyFloatingLauncherInlineStyles(launcher, pos);
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
    ensureLauncherUi();
  });

  Hooks.on("canvasReady", () => {
    ensureLauncherUi();
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

  game.settings.register(MODULE_ID, SETTINGS.LOOT_SOURCE_CONFIG, {
    scope: "world",
    config: false,
    type: Object,
    default: buildDefaultLootSourceConfig()
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

  registerPartyOperationsApi();

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

Hooks.once("setup", () => {
  registerPartyOperationsApi();
});

Hooks.once("ready", () => {
  registerPartyOperationsApi();
  // Setup UI controls for sidebar
  setupPartyOperationsUI();
  ensureLauncherUi();
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

    if (!game.user.isGM) return; // only GM applies mutations

    if (message.type === "activity:update") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      const actorId = sanitizeSocketIdentifier(message.actorId, { maxLength: 64 });
      const activityType = normalizeSocketActivityType(message.activity);
      if (!requester || !actorId || !activityType) return;

      // Players can update their own activity
      const requesterActor = requester.character;
      if (!requesterActor || requesterActor.id !== actorId) return; // security check

      const activities = getRestActivities();
      if (!activities.activities[actorId]) activities.activities[actorId] = {};
      activities.activities[actorId].activity = activityType;
      await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_ACTIVITIES, activities);
      refreshOpenApps();
      emitSocketRefresh();
      return;
    }

    if (message.type === "rest:mutate") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      const request = normalizeSocketRestRequest(message.request);
      if (!requester || !request) return;
      await applyRestRequest(request, requester);
      return;
    }
    if (message.type === "march:mutate") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      const request = normalizeSocketMarchRequest(message.request);
      if (!requester || !request) return;
      await applyMarchRequest(request, requester);
      return;
    }
    if (message.type === "ops:setSopNote") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      if (!requester) return;
      await applyPlayerSopNoteRequest(message, requester);
      return;
    }
    if (message.type === "ops:downtime-submit") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      if (!requester) return;
      await applyPlayerDowntimeSubmitRequest(message, requester);
      return;
    }
    if (message.type === "ops:downtime-clear") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      if (!requester) return;
      await applyPlayerDowntimeClearRequest(message, requester);
      return;
    }
    if (message.type === "ops:downtime-collect") {
      const requester = getSocketRequester(message, { allowGM: false, requireActive: true });
      if (!requester) return;
      await applyPlayerDowntimeCollectRequest(message, requester);
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
    const lootSourceKey = `${MODULE_ID}.${SETTINGS.LOOT_SOURCE_CONFIG}`;
    const integrationModeKey = `${MODULE_ID}.${SETTINGS.INTEGRATION_MODE}`;
    if (settingKey === restKey || settingKey === marchKey || settingKey === actKey || settingKey === opsKey || settingKey === injuryKey || settingKey === lootSourceKey) {
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

async function applyPlayerSopNoteRequest(message, requesterRef = null) {
  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;

  const sopKey = String(message?.sopKey ?? "").trim();
  if (!SOP_KEYS.includes(sopKey)) return;
  const note = clampSocketText(message?.note, SOCKET_NOTE_MAX_LENGTH);

  await updateOperationsLedger((ledger) => {
    const sopNotes = ensureSopNotesState(ledger);
    sopNotes[sopKey] = note;
  });
}

async function applyPlayerDowntimeSubmitRequest(message, requesterRef = null) {
  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const entry = message?.entry && typeof message.entry === "object" ? message.entry : null;
  if (!entry) return;
  const previewLedger = getOperationsLedger();
  const previewDowntime = ensureDowntimeState(previewLedger);
  const normalizedEntry = normalizeDowntimeSubmission(entry, previewDowntime);
  if (!sanitizeSocketIdentifier(normalizedEntry.actorId, { maxLength: 64 })) return;
  await applyDowntimeSubmissionForUser(requester, normalizedEntry);
}

async function applyPlayerDowntimeClearRequest(message, requesterRef = null) {
  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor || !canUserManageDowntimeActor(requester, actor)) return;
  await updateOperationsLedger((ledger) => {
    const downtime = ensureDowntimeState(ledger);
    if (!downtime.entries) return;
    delete downtime.entries[actorId];
  });
}

async function applyPlayerDowntimeCollectRequest(message, requesterRef = null) {
  const requester = resolveRequester(requesterRef ?? message?.userId, { allowGM: false, requireActive: true });
  if (!requester) return;
  const actorId = sanitizeSocketIdentifier(message?.actorId, { maxLength: 64 });
  if (!actorId) return;
  const outcome = await applyDowntimeCollectionForUser(requester, actorId);
  if (!outcome.ok) {
    ui.notifications?.warn(`Downtime collect failed (${requester.name}): ${outcome.message ?? "Unknown error."}`);
    return;
  }
  ui.notifications?.info(`${requester.name} collected downtime rewards for ${outcome.actorName}.`);
}

async function applyRestRequest(request, requesterRef) {
  if (!request || typeof request !== "object") return;
  const state = getRestWatchState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
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
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
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
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
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
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.REST_STATE, state);
    scheduleIntegrationSync("rest-watch-player-mutate");
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }
}

async function applyMarchRequest(request, requesterRef) {
  if (!request || typeof request !== "object") return;
  const state = getMarchingOrderState();
  const requester = resolveRequester(requesterRef, { allowGM: true });
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
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
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
    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.MARCH_STATE, state);
    scheduleIntegrationSync("marching-order-player-mutate");
    refreshOpenApps();
    emitSocketRefresh();
    return;
  }
}

function toggleCardNotes(element) {
  const entry = element?.closest(".po-watch-entry");
  const notes = entry?.querySelector(".po-notes");
  if (!notes) return;
  const isActive = notes.classList.toggle("is-active");
  notes.setAttribute("aria-hidden", isActive ? "false" : "true");
  if (element?.setAttribute) element.setAttribute("aria-expanded", isActive ? "true" : "false");
  if (isActive) {
    const input = notes.querySelector("textarea");
    input?.focus?.({ preventScroll: true });
  }
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



