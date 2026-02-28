#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MODULE_ID = "party-operations";
const TAG_SCHEMA = "po-loot-v1";

const DEFAULT_DND5E_PACK_PATH = "C:/Users/Kyle/AppData/Local/FoundryVTT/Data/systems/dnd5e/packs/items";
const DEFAULT_MANIFEST_PATH = path.resolve(process.cwd(), "packs", "party-operations-loot-manifest.db");
const DEFAULT_REPORT_PATH = path.resolve(process.cwd(), "reports", "dnd5e-manifest-sync-report.json");
const DEFAULT_SOURCE_COLLECTION = "dnd5e.items";
const DEFAULT_MANIFEST_COLLECTION = `${MODULE_ID}.party-operations-loot-manifest`;
const ENRICHMENT_SCHEMA = "po-item-enrichment-v1";

const MIDI_QOL_DEFAULTS = Object.freeze({
  rollAttackPerTarget: "default",
  removeAttackDamageButtons: "default",
  effectActivation: false,
  itemCondition: "",
  reactionCondition: "",
  otherCondition: "",
  effectCondition: ""
});

const MIDI_PROPERTIES_DEFAULTS = Object.freeze({
  confirmTargets: "default",
  autoFailFriendly: false,
  autoSaveFriendly: false,
  critOther: false,
  offHandWeapon: false,
  magicdam: false,
  magiceffect: false,
  concentration: false,
  noConcentrationCheck: false,
  toggleEffect: false,
  ignoreTotalCover: false
});

const DAE_DEFAULTS = Object.freeze({
  disableIncapacitated: false,
  selfTarget: true,
  selfTargetAlways: true,
  dontApply: false,
  stackable: "noneName",
  showIcon: true,
  durationExpression: "",
  macroRepeat: "none",
  specialDuration: []
});

const RARITY_NORMALIZATION = Object.freeze({
  common: "common",
  uncommon: "uncommon",
  rare: "rare",
  veryrare: "very-rare",
  "very-rare": "very-rare",
  legendary: "legendary",
  artifact: "legendary"
});

function parseArgs(argv) {
  const args = {
    source: DEFAULT_DND5E_PACK_PATH,
    manifest: DEFAULT_MANIFEST_PATH,
    report: DEFAULT_REPORT_PATH,
    collection: DEFAULT_SOURCE_COLLECTION,
    allowedTypes: [],
    balanced: false,
    deriveSpellPricing: false,
    write: false,
    backup: true
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] ?? "").trim();
    if (!token) continue;
    if (token === "--write") {
      args.write = true;
      continue;
    }
    if (token === "--no-backup") {
      args.backup = false;
      continue;
    }
    if (token === "--source") {
      args.source = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
    if (token === "--manifest") {
      args.manifest = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
    if (token === "--report") {
      args.report = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
    if (token === "--collection") {
      args.collection = String(argv[index + 1] ?? "").trim() || DEFAULT_SOURCE_COLLECTION;
      index += 1;
      continue;
    }
    if (token === "--allowed-types") {
      args.allowedTypes = String(argv[index + 1] ?? "")
        .split(",")
        .map((entry) => String(entry ?? "").trim().toLowerCase())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (token === "--balanced") {
      args.balanced = true;
      continue;
    }
    if (token === "--derive-spell-pricing") {
      args.deriveSpellPricing = true;
      continue;
    }
  }

  return args;
}

function getClassicLevel() {
  const candidates = [
    "classic-level",
    path.resolve(process.cwd(), ".tmp_level", "node_modules", "classic-level")
  ];
  for (const candidate of candidates) {
    try {
      const mod = require(candidate);
      if (mod?.ClassicLevel) return mod.ClassicLevel;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(
    "classic-level is required. Install with `npm install classic-level --no-save` or keep .tmp_level helper available."
  );
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureObject(parent, key) {
  if (!isPlainObject(parent[key])) parent[key] = {};
  return parent[key];
}

function cloneDefault(value) {
  if (Array.isArray(value)) return [...value];
  if (isPlainObject(value)) return { ...value };
  return value;
}

function applyDefaults(target, defaults) {
  let applied = 0;
  for (const [key, fallback] of Object.entries(defaults)) {
    if (target[key] === undefined || target[key] === null) {
      target[key] = cloneDefault(fallback);
      applied += 1;
      continue;
    }
    if (Array.isArray(fallback) && !Array.isArray(target[key])) {
      target[key] = [...fallback];
      applied += 1;
      continue;
    }
    if (isPlainObject(fallback) && !isPlainObject(target[key])) {
      target[key] = { ...fallback };
      applied += 1;
      continue;
    }
  }
  return applied;
}

function toNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function normalizeRarity(value) {
  const raw = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return "";
  return String(RARITY_NORMALIZATION[raw] ?? "");
}

function getRarityFromItem(item = {}) {
  const candidates = [
    item?.rarity,
    item?.system?.rarity,
    item?.system?.details?.rarity,
    item?.system?.traits?.rarity,
    item?.system?.properties?.rarity
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (isPlainObject(candidate)) {
      const nested = normalizeRarity(candidate.value ?? candidate.label ?? candidate.name ?? "");
      if (nested) return nested;
      continue;
    }
    const normalized = normalizeRarity(candidate);
    if (normalized) return normalized;
  }
  return "";
}

function itemIsArtifactRarity(item = {}) {
  const candidates = [
    item?.rarity,
    item?.system?.rarity,
    item?.system?.details?.rarity,
    item?.system?.traits?.rarity,
    item?.system?.properties?.rarity
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined) continue;
    if (isPlainObject(candidate)) {
      const raw = String(candidate.value ?? candidate.label ?? candidate.name ?? "").trim().toLowerCase();
      if (raw.includes("artifact") || raw.includes("artefact")) return true;
      continue;
    }
    const raw = String(candidate ?? "").trim().toLowerCase();
    if (raw.includes("artifact") || raw.includes("artefact")) return true;
  }
  return false;
}

function getGpValue(item = {}) {
  const price = item?.system?.price;
  if (isPlainObject(price)) {
    const amount = Math.max(0, toNumber(price.value ?? price.amount ?? 0));
    const denomRaw = String(price.denomination ?? price.currency ?? "gp").trim().toLowerCase();
    const denomMap = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
    const multiplier = toNumber(denomMap[denomRaw] ?? 1) || 1;
    return Math.max(0, amount * multiplier);
  }
  if (price !== null && price !== undefined) return Math.max(0, toNumber(price));
  return Math.max(0, toNumber(item?.price ?? 0));
}

function getSpellLevel(item = {}) {
  const direct = Number(item?.system?.level);
  if (Number.isFinite(direct)) return Math.max(0, Math.floor(direct));
  const legacy = Number(item?.level);
  if (Number.isFinite(legacy)) return Math.max(0, Math.floor(legacy));
  return 0;
}

function getSuggestedSpellPriceGp(level = 0) {
  const normalized = Math.max(0, Math.floor(Number(level) || 0));
  const table = {
    0: 25,
    1: 50,
    2: 250,
    3: 500,
    4: 2500,
    5: 5000,
    6: 15000,
    7: 25000,
    8: 50000,
    9: 250000
  };
  return Math.max(0, Number(table[normalized] ?? 250000) || 0);
}

function getSuggestedSpellRarity(level = 0) {
  const normalized = Math.max(0, Math.floor(Number(level) || 0));
  if (normalized <= 1) return "common";
  if (normalized <= 3) return "uncommon";
  if (normalized <= 5) return "rare";
  if (normalized <= 8) return "very-rare";
  return "legendary";
}

function applyBalancedAdjustments(item = {}, options = {}) {
  const type = String(item?.type ?? "").trim().toLowerCase();
  if (type !== "spell" || !options?.deriveSpellPricing) return;

  const system = ensureObject(item, "system");
  const price = isPlainObject(system.price) ? system.price : {};
  system.price = price;
  const currentValue = Number(price.value ?? 0);
  if (!Number.isFinite(currentValue) || currentValue <= 0) {
    price.value = getSuggestedSpellPriceGp(getSpellLevel(item));
  }
  if (!String(price.denomination ?? "").trim()) price.denomination = "gp";

  const currentRarity = normalizeRarity(system.rarity ?? item?.rarity ?? "");
  if (!currentRarity) {
    const suggested = getSuggestedSpellRarity(getSpellLevel(item));
    system.rarity = suggested;
    if (!item.rarity) item.rarity = suggested;
  }
}

function isBalancedSourceItem(item = {}, options = {}) {
  const type = String(item?.type ?? "").trim().toLowerCase();
  if (!type) return false;
  const allowedTypes = Array.isArray(options?.allowedTypes) ? options.allowedTypes : [];
  if (allowedTypes.length > 0 && !allowedTypes.includes(type)) return false;

  if (itemIsArtifactRarity(item)) return false;

  const gpValue = getGpValue(item);
  if (type === "spell" && options?.deriveSpellPricing) return true;
  if (gpValue <= 0) return false;
  if (gpValue > 250000) return false;
  return true;
}

function getTierFromRarity(rarity = "") {
  const normalized = normalizeRarity(rarity);
  if (normalized === "legendary" || normalized === "very-rare") return "tier.t4";
  if (normalized === "rare") return "tier.t3";
  if (normalized === "uncommon") return "tier.t2";
  return "tier.t1";
}

function getValueBand(gpValue = 0) {
  const gp = Math.max(0, toNumber(gpValue));
  if (gp <= 49) return "value.v1";
  if (gp <= 149) return "value.v2";
  if (gp <= 749) return "value.v3";
  if (gp <= 2999) return "value.v4";
  return "value.v5";
}

function sanitizeKeywordSegment(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getDamageTypes(item = {}) {
  const types = [];
  const baseTypes = item?.system?.damage?.base?.types;
  if (Array.isArray(baseTypes)) types.push(...baseTypes);
  const activities = item?.system?.activities;
  if (isPlainObject(activities)) {
    for (const activity of Object.values(activities)) {
      const parts = activity?.damage?.parts;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        const partTypes = part?.types;
        if (!Array.isArray(partTypes)) continue;
        types.push(...partTypes);
      }
    }
  }
  return Array.from(new Set(types.map((entry) => sanitizeKeywordSegment(entry)).filter(Boolean)));
}

function isMagicItem(item = {}, rarity = "") {
  const normalizedRarity = normalizeRarity(rarity);
  if (normalizedRarity && normalizedRarity !== "common") return true;
  const attunement = String(item?.system?.attunement ?? "").trim().toLowerCase();
  if (attunement === "required") return true;
  const properties = Array.isArray(item?.system?.properties) ? item.system.properties : [];
  if (properties.some((entry) => String(entry ?? "").trim().toLowerCase() === "mgc")) return true;
  if (/\+\s*[123]/.test(String(item?.name ?? ""))) return true;
  return false;
}

function classifyLootType(item = {}, rarity = "") {
  const type = String(item?.type ?? "").trim().toLowerCase();
  const subtype = String(item?.system?.type?.value ?? "").trim().toLowerCase();
  const magical = isMagicItem(item, rarity);

  if (type === "weapon") return magical ? "loot.weapon.magic" : "loot.weapon";
  if (type === "equipment") {
    if (["light", "medium", "heavy", "shield"].includes(subtype)) {
      return magical ? "loot.armor.magic" : "loot.armor";
    }
    return magical ? "loot.equipment.magic" : "loot.equipment";
  }
  if (type === "consumable") {
    if (subtype === "potion") return "loot.potion";
    if (subtype === "poison") return "loot.poison";
    return "loot.consumable";
  }
  if (type === "tool") return "loot.tool";
  if (type === "container" || type === "backpack") return "loot.container";
  if (type === "loot") return "loot.loot";
  return `loot.${type || "item"}`;
}

function buildKeywords(item = {}, metadata = {}) {
  const keywords = new Set();
  const type = String(item?.type ?? "").trim().toLowerCase();
  const subtype = String(item?.system?.type?.value ?? "").trim().toLowerCase();
  const baseItem = String(item?.system?.type?.baseItem ?? "").trim().toLowerCase();
  const rarity = String(metadata.rarity ?? "").trim().toLowerCase();
  const lootType = String(metadata.lootType ?? "").trim().toLowerCase();
  const tier = String(metadata.tier ?? "").trim().toLowerCase();
  const valueBand = String(metadata.valueBand ?? "").trim().toLowerCase();
  const gpValue = Math.max(0, toNumber(metadata.gpValue));

  if (type) keywords.add(`foundryType.${type}`);
  keywords.add("loot");
  if (lootType) keywords.add(lootType);
  if (rarity) keywords.add(`rarity.${rarity}`);
  if (subtype) keywords.add(`subtype.${sanitizeKeywordSegment(subtype)}`);
  if (baseItem) keywords.add(`base.${sanitizeKeywordSegment(baseItem)}`);
  if (tier) keywords.add(tier);
  if (valueBand) keywords.add(valueBand);
  keywords.add("price.gp");
  if (item?.system?.attunement === "required") keywords.add("attunement.required");
  if (isMagicItem(item, rarity)) keywords.add("magic.bonus");

  const properties = Array.isArray(item?.system?.properties) ? item.system.properties : [];
  for (const prop of properties) {
    const normalized = sanitizeKeywordSegment(prop);
    if (!normalized) continue;
    keywords.add(`prop.${normalized}`);
  }

  for (const damageType of getDamageTypes(item)) keywords.add(`dmg.${damageType}`);

  const nameLower = String(item?.name ?? "").trim().toLowerCase();
  if (nameLower.includes("ring")) keywords.add("tag.ring");
  if (nameLower.includes("gem")) keywords.add("tag.gem");
  if (nameLower.includes("potion")) keywords.add("tag.potion");

  if (gpValue >= 5000) keywords.add("value.high");
  return Array.from(keywords).sort((left, right) => left.localeCompare(right));
}

function getWeaponEnhancementBonus(item = {}) {
  const type = String(item?.type ?? "").trim().toLowerCase();
  if (type !== "weapon") return 0;

  const candidates = [];

  const name = String(item?.name ?? "");
  const nameMatch = name.match(/\+\s*([1-9]\d*)\b/);
  if (nameMatch) candidates.push(Number(nameMatch[1]));

  const identifier = String(item?.system?.identifier ?? "").trim().toLowerCase();
  const identifierMatch = identifier.match(/(?:^|[-_])([1-9]\d*)$/);
  if (identifierMatch) candidates.push(Number(identifierMatch[1]));

  const formulas = [
    item?.system?.damage?.base?.custom?.formula,
    item?.system?.damage?.versatile?.custom?.formula
  ];
  for (const formula of formulas) {
    const formulaText = String(formula ?? "").trim();
    if (!formulaText) continue;
    const formulaMatch = formulaText.match(/[+-]\s*([1-9]\d*)\s*$/);
    if (formulaMatch) candidates.push(Number(formulaMatch[1]));
  }

  const valid = candidates.filter((entry) => Number.isFinite(entry) && entry > 0);
  if (valid.length === 0) return 0;
  return Math.max(...valid);
}

function normalizeWeaponDamageFormula(formula = "", enhancementBonus = 0) {
  const text = String(formula ?? "").trim();
  if (!text) return "";
  const withoutTrailingFlatBonus = text.replace(/\s*[+-]\s*\d+\s*$/, "").trim();
  const base = withoutTrailingFlatBonus || text;
  if (!(enhancementBonus > 0)) return base;
  return `${base} + ${enhancementBonus}`.replace(/\s+/g, " ").trim();
}

function tuneWeaponDamagePart(part = {}, enhancementBonus = 0) {
  if (!isPlainObject(part)) return { changed: 0, tuned: false };
  let changed = 0;
  const bonusText = enhancementBonus > 0 ? String(enhancementBonus) : "";

  const custom = ensureObject(part, "custom");
  const customFormula = String(custom.formula ?? "").trim();
  if (custom.enabled && customFormula) {
    const normalizedFormula = normalizeWeaponDamageFormula(customFormula, enhancementBonus);
    if (String(custom.formula ?? "").trim() !== normalizedFormula) {
      custom.formula = normalizedFormula;
      changed += 1;
    }
    return { changed, tuned: true };
  }

  const diceCount = Number(part?.number);
  const dieFaces = Number(part?.denomination);
  const hasDice = Number.isFinite(diceCount) && diceCount > 0 && Number.isFinite(dieFaces) && dieFaces > 0;
  if (!hasDice) return { changed, tuned: false };

  if (String(part?.bonus ?? "").trim() !== bonusText) {
    part.bonus = bonusText;
    changed += 1;
  }

  return { changed, tuned: true };
}

function tuneEnhancedWeaponItem(item = {}, summary = null) {
  const enhancementBonus = getWeaponEnhancementBonus(item);
  if (!(enhancementBonus > 0)) return;

  if (summary) summary.enhancedWeaponsDetected += 1;

  const system = ensureObject(item, "system");
  if (system.proficient !== 1) {
    system.proficient = 1;
    if (summary) summary.enhancedWeaponProficiencyForced += 1;
  }

  const currentProperties = Array.isArray(system.properties) ? system.properties : [];
  const hasMagicProperty = currentProperties.some((entry) => String(entry ?? "").trim().toLowerCase() === "mgc");
  if (!hasMagicProperty) {
    system.properties = [...currentProperties, "mgc"];
    if (summary) summary.enhancedWeaponMagicPropertyAdded += 1;
  } else if (!Array.isArray(system.properties)) {
    system.properties = [...currentProperties];
  }

  const flags = ensureObject(item, "flags");
  const midiProperties = ensureObject(flags, "midiProperties");
  if (midiProperties.magicdam !== true) {
    midiProperties.magicdam = true;
    if (summary) summary.enhancedWeaponMidiMagicDamageEnabled += 1;
  }
  if (midiProperties.magiceffect !== true) {
    midiProperties.magiceffect = true;
    if (summary) summary.enhancedWeaponMidiMagicEffectEnabled += 1;
  }

  const activities = isPlainObject(system.activities) ? Object.values(system.activities) : [];
  for (const activity of activities) {
    if (!isPlainObject(activity)) continue;
    if (String(activity?.type ?? "").trim().toLowerCase() !== "attack") continue;

    const attack = ensureObject(activity, "attack");
    const nextAttackBonus = String(enhancementBonus);
    if (String(attack?.bonus ?? "").trim() !== nextAttackBonus) {
      attack.bonus = nextAttackBonus;
      if (summary) summary.enhancedWeaponAttackBonusesTuned += 1;
    }

    const damage = ensureObject(activity, "damage");
    if (damage.includeBase !== true) {
      damage.includeBase = true;
      if (summary) summary.enhancedWeaponActivitiesTuned += 1;
    }
  }

  const damageProfile = ensureObject(system, "damage");
  const basePart = ensureObject(damageProfile, "base");
  const versatilePart = ensureObject(damageProfile, "versatile");
  const baseResult = tuneWeaponDamagePart(basePart, enhancementBonus);
  const versatileResult = tuneWeaponDamagePart(versatilePart, enhancementBonus);

  if (summary) {
    summary.enhancedWeaponDamagePartsTuned += Number(baseResult.tuned) + Number(versatileResult.tuned);
    summary.enhancedWeaponDamageChanges += Number(baseResult.changed) + Number(versatileResult.changed);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeStableId(seed, length = 16) {
  return crypto.createHash("sha1").update(String(seed ?? "")).digest("hex").slice(0, Math.max(8, Number(length) || 16));
}

function getNextActivityId(activityMap = {}) {
  const map = isPlainObject(activityMap) ? activityMap : {};
  for (let index = 0; index < 1000; index += 1) {
    const candidate = `dnd5eactivity${String(index).padStart(3, "0")}`;
    if (!Object.prototype.hasOwnProperty.call(map, candidate)) return candidate;
  }
  return `dnd5eactivity${makeStableId(JSON.stringify(Object.keys(map))).slice(0, 3)}`;
}

function assignIfChanged(target = {}, key, value) {
  if (!isPlainObject(target)) return false;
  if (JSON.stringify(target[key]) === JSON.stringify(value)) return false;
  target[key] = value;
  return true;
}

function buildGenericUtilityActivity(item = {}, activityId = "dnd5eactivity000", sort = 0) {
  const itemName = String(item?.name ?? "Item").trim() || "Item";
  return {
    _id: String(activityId),
    type: "utility",
    activation: {
      type: "action",
      value: 1,
      condition: "",
      override: false
    },
    consumption: {
      targets: [],
      scaling: {
        allowed: false,
        max: ""
      },
      spellSlot: true
    },
    description: {
      chatFlavor: `Use ${itemName}`
    },
    duration: {
      concentration: false,
      value: "",
      units: "inst",
      special: "",
      override: false
    },
    effects: [],
    range: {
      units: "self",
      special: "",
      override: false
    },
    target: {
      template: {
        count: "",
        contiguous: false,
        type: "",
        size: "",
        width: "",
        height: "",
        units: ""
      },
      affects: {
        count: "",
        type: "",
        choice: false,
        special: ""
      },
      prompt: true,
      override: false
    },
    uses: {
      spent: 0,
      max: "",
      recovery: []
    },
    roll: {
      formula: "",
      name: "",
      prompt: false,
      visible: false
    },
    sort: Number.isFinite(Number(sort)) ? Number(sort) : 0,
    useConditionText: "",
    useConditionReason: "",
    effectConditionText: "",
    macroData: {
      name: "",
      command: ""
    },
    ignoreTraits: {
      idi: false,
      idr: false,
      idv: false,
      ida: false
    },
    midiProperties: {
      ignoreTraits: [],
      triggeredActivityId: "none",
      triggeredActivityConditionText: "",
      triggeredActivityTargets: "targets",
      triggeredActivityRollAs: "self",
      forceDialog: false,
      confirmTargets: "default",
      autoTargetType: "any",
      autoTargetAction: "default",
      automationOnly: false,
      otherActivityCompatible: true,
      identifier: "",
      displayActivityName: false,
      rollMode: "default",
      chooseEffects: false,
      toggleEffect: false,
      ignoreFullCover: false
    },
    isOverTimeFlag: false,
    overTimeProperties: {
      saveRemoves: true,
      preRemoveConditionText: "",
      postRemoveConditionText: ""
    },
    otherActivityId: "none"
  };
}

function buildGenericSaveActivity(item = {}, activityId = "dnd5eactivity000", sort = 0, options = {}) {
  const activity = buildGenericUtilityActivity(item, activityId, sort);
  activity.type = "save";
  activity.name = String(options?.name ?? "").trim();
  activity.damage = {
    onSave: String(options?.onSave ?? "none").trim() || "none",
    parts: Array.isArray(options?.damageParts) ? options.damageParts : [],
    critical: {
      allow: false
    }
  };
  activity.save = {
    ability: [String(options?.ability ?? "con").trim() || "con"],
    dc: {
      calculation: "",
      formula: String(options?.dc ?? "10").trim() || "10"
    }
  };
  return activity;
}

function tuneActivity(activity = {}, summary = null) {
  if (!isPlainObject(activity)) return;
  if (summary) summary.activitiesReviewed += 1;

  let patched = 0;
  patched += applyDefaults(activity, {
    sort: 0,
    useConditionText: "",
    useConditionReason: "",
    effectConditionText: "",
    isOverTimeFlag: false,
    otherActivityId: "none"
  });

  const activation = ensureObject(activity, "activation");
  patched += applyDefaults(activation, { type: "action", value: 1, condition: "", override: false });

  const consumption = ensureObject(activity, "consumption");
  patched += applyDefaults(consumption, {
    targets: [],
    scaling: { allowed: false, max: "" },
    spellSlot: true
  });
  if (!Array.isArray(consumption.targets)) {
    consumption.targets = [];
    patched += 1;
  }
  const consumptionScaling = ensureObject(consumption, "scaling");
  patched += applyDefaults(consumptionScaling, { allowed: false, max: "" });

  const description = ensureObject(activity, "description");
  patched += applyDefaults(description, { chatFlavor: "" });

  const duration = ensureObject(activity, "duration");
  patched += applyDefaults(duration, {
    concentration: false,
    value: "",
    units: "inst",
    special: "",
    override: false
  });

  if (!Array.isArray(activity.effects)) {
    activity.effects = [];
    patched += 1;
  }

  const range = ensureObject(activity, "range");
  patched += applyDefaults(range, { units: "self", special: "", override: false });

  const target = ensureObject(activity, "target");
  const template = ensureObject(target, "template");
  patched += applyDefaults(template, {
    count: "",
    contiguous: false,
    type: "",
    size: "",
    width: "",
    height: "",
    units: ""
  });
  const affects = ensureObject(target, "affects");
  patched += applyDefaults(affects, {
    count: "",
    type: "",
    choice: false,
    special: ""
  });
  patched += applyDefaults(target, { prompt: true, override: false });

  const uses = ensureObject(activity, "uses");
  patched += applyDefaults(uses, { spent: 0, max: "", recovery: [] });
  if (!Array.isArray(uses.recovery)) {
    uses.recovery = [];
    patched += 1;
  }

  const roll = ensureObject(activity, "roll");
  patched += applyDefaults(roll, { formula: "", name: "", prompt: false, visible: false });

  const macroData = ensureObject(activity, "macroData");
  patched += applyDefaults(macroData, { name: "", command: "" });

  const ignoreTraits = ensureObject(activity, "ignoreTraits");
  patched += applyDefaults(ignoreTraits, {
    idi: false,
    idr: false,
    idv: false,
    ida: false
  });

  const midiProperties = ensureObject(activity, "midiProperties");
  patched += applyDefaults(midiProperties, {
    ignoreTraits: [],
    triggeredActivityId: "none",
    triggeredActivityConditionText: "",
    triggeredActivityTargets: "targets",
    triggeredActivityRollAs: "self",
    forceDialog: false,
    confirmTargets: "default",
    autoTargetType: "any",
    autoTargetAction: "default",
    automationOnly: false,
    otherActivityCompatible: true,
    identifier: "",
    displayActivityName: false,
    rollMode: "default",
    chooseEffects: false,
    toggleEffect: false,
    ignoreFullCover: false
  });
  if (!Array.isArray(midiProperties.ignoreTraits)) {
    midiProperties.ignoreTraits = [];
    patched += 1;
  }

  const overTimeProperties = ensureObject(activity, "overTimeProperties");
  patched += applyDefaults(overTimeProperties, {
    saveRemoves: true,
    preRemoveConditionText: "",
    postRemoveConditionText: ""
  });

  if (summary && patched > 0) {
    summary.activitiesPatched += 1;
    summary.activityFieldsPatched += patched;
  }
}

function inferBlankActivationProfile(item = {}, activity = {}) {
  const activation = ensureObject(activity, "activation");
  const currentType = String(activation?.type ?? "").trim().toLowerCase();
  if (currentType) return null;

  const parts = [
    String(activity?.activation?.condition ?? ""),
    String(activity?.description?.chatFlavor ?? ""),
    stripHtml(item?.system?.description?.value ?? "")
  ].filter(Boolean);
  const text = parts.join(" ").toLowerCase();

  const minuteMatch = text.match(/(?:every|each|once per)\s+(\d+)\s*minute(?:s)?\b/i)
    ?? text.match(/\bevery\s+minute\b/i);
  if (minuteMatch) {
    const value = minuteMatch[1] ? Number(minuteMatch[1]) : 1;
    return { type: "minute", value: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1, source: "text" };
  }

  const hourMatch = text.match(/(?:every|each|once per)\s+(\d+)\s*hour(?:s)?\b/i)
    ?? text.match(/\bevery\s+hour\b/i);
  if (hourMatch) {
    const value = hourMatch[1] ? Number(hourMatch[1]) : 1;
    return { type: "hour", value: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1, source: "text" };
  }

  const dayMatch = text.match(/(?:every|each|once per)\s+(\d+)\s*day(?:s)?\b/i)
    ?? text.match(/\bonce per day\b/i)
    ?? text.match(/\bevery day\b/i);
  if (dayMatch) {
    const value = dayMatch[1] ? Number(dayMatch[1]) : 1;
    return { type: "day", value: Number.isFinite(value) && value > 0 ? Math.floor(value) : 1, source: "text" };
  }

  if (/\bas a bonus action\b/i.test(text)) return { type: "bonus", value: 1, source: "text" };
  if (/\bas a reaction\b/i.test(text)) return { type: "reaction", value: 1, source: "text" };
  if (/\b(?:as|use)\s+an?\s+action\b/i.test(text) || /\btake\s+an?\s+action\b/i.test(text)) {
    return { type: "action", value: 1, source: "text" };
  }

  if (/\bat will\b/i.test(text)) return { type: "special", value: 1, source: "text" };
  return { type: "special", value: 1, source: "fallback" };
}

function ensureBlankActivationType(item = {}, activity = {}, summary = null) {
  if (!isPlainObject(activity)) return;
  const activation = ensureObject(activity, "activation");
  const currentType = String(activation?.type ?? "").trim();
  if (currentType) return;

  const inferred = inferBlankActivationProfile(item, activity) ?? { type: "special", value: 1, source: "fallback" };
  const nextType = String(inferred?.type ?? "special").trim() || "special";
  const valueNumber = Number(inferred?.value);
  const nextValue = Number.isFinite(valueNumber) && valueNumber > 0 ? Math.floor(valueNumber) : 1;

  let changed = 0;
  if (assignIfChanged(activation, "type", nextType)) changed += 1;
  if (assignIfChanged(activation, "value", nextValue)) changed += 1;

  if (summary && changed > 0) {
    summary.blankActivationTypesPatched += 1;
    summary.blankActivationFieldsPatched += changed;
    if (String(inferred?.source ?? "") === "text") summary.blankActivationTextInferred += 1;
  }
}

function ensureActivityByType(item = {}, type = "utility", builder = null, summary = null) {
  const system = ensureObject(item, "system");
  if (!isPlainObject(system.activities)) {
    system.activities = {};
    if (summary) summary.activityCollectionsInitialized += 1;
  }

  const normalizedType = String(type ?? "").trim().toLowerCase();
  const match = Object.entries(system.activities).find(([, activity]) => (
    String(activity?.type ?? "").trim().toLowerCase() === normalizedType
  ));
  if (match) return { key: match[0], activity: match[1], created: false };

  const sort = Object.keys(system.activities).length;
  const activityId = getNextActivityId(system.activities);
  const create = typeof builder === "function"
    ? builder
    : ((id, nextSort) => buildGenericUtilityActivity(item, id, nextSort));
  system.activities[activityId] = create(activityId, sort);
  if (summary) summary.consumableActivitiesAdded += 1;
  return { key: activityId, activity: system.activities[activityId], created: true };
}

function ensureActivityActivation(activity = {}, options = {}) {
  let changed = 0;
  const activation = ensureObject(activity, "activation");
  if (assignIfChanged(activation, "type", String(options?.type ?? "action"))) changed += 1;
  if (assignIfChanged(activation, "value", Number.isFinite(Number(options?.value)) ? Number(options.value) : 1)) changed += 1;
  if (assignIfChanged(activation, "condition", String(options?.condition ?? ""))) changed += 1;
  if (assignIfChanged(activation, "override", false)) changed += 1;
  return changed;
}

function ensureItemUsesConsumptionTarget(activity = {}, amount = "1") {
  let changed = 0;
  const consumption = ensureObject(activity, "consumption");
  if (!Array.isArray(consumption.targets)) {
    consumption.targets = [];
    changed += 1;
  }

  let target = consumption.targets.find((entry) => String(entry?.type ?? "").trim() === "itemUses");
  if (!isPlainObject(target)) {
    target = {};
    consumption.targets.push(target);
    changed += 1;
  }

  if (assignIfChanged(target, "type", "itemUses")) changed += 1;
  if (assignIfChanged(target, "target", "")) changed += 1;
  if (assignIfChanged(target, "value", String(amount ?? "1"))) changed += 1;
  const scaling = ensureObject(target, "scaling");
  if (assignIfChanged(scaling, "mode", "")) changed += 1;
  if (assignIfChanged(scaling, "formula", "")) changed += 1;

  const filteredTargets = [target];
  if (consumption.targets.length !== 1 || consumption.targets[0] !== target) {
    consumption.targets = filteredTargets;
    changed += 1;
  }

  return changed;
}

function ensureSingleWillingTarget(activity = {}, rangeUnits = "touch") {
  let changed = 0;
  const range = ensureObject(activity, "range");
  if (assignIfChanged(range, "units", String(rangeUnits ?? "touch"))) changed += 1;
  if (assignIfChanged(range, "special", "")) changed += 1;
  if (assignIfChanged(range, "override", false)) changed += 1;

  const target = ensureObject(activity, "target");
  const template = ensureObject(target, "template");
  if (assignIfChanged(template, "count", "")) changed += 1;
  if (assignIfChanged(template, "contiguous", false)) changed += 1;
  if (assignIfChanged(template, "type", "")) changed += 1;
  if (assignIfChanged(template, "size", "")) changed += 1;
  if (assignIfChanged(template, "width", "")) changed += 1;
  if (assignIfChanged(template, "height", "")) changed += 1;
  if (assignIfChanged(template, "units", "ft")) changed += 1;

  const affects = ensureObject(target, "affects");
  if (assignIfChanged(affects, "count", "1")) changed += 1;
  if (assignIfChanged(affects, "type", "willing")) changed += 1;
  if (assignIfChanged(affects, "choice", false)) changed += 1;
  if (assignIfChanged(affects, "special", "")) changed += 1;
  if (assignIfChanged(target, "prompt", true)) changed += 1;
  if (assignIfChanged(target, "override", false)) changed += 1;

  return changed;
}

function ensureActivityEffectReference(activity = {}, effectId = "", onSave = false) {
  const id = String(effectId ?? "").trim();
  if (!id) return 0;
  if (!Array.isArray(activity.effects)) {
    activity.effects = [];
  }

  const nextEntry = { _id: id };
  if (onSave) nextEntry.onSave = false;
  const nextSignature = JSON.stringify([nextEntry]);
  if (JSON.stringify(activity.effects) === nextSignature) return 0;
  activity.effects = [nextEntry];
  return 1;
}

function extractFlatBonusFromDescription(descriptionText = "", target = "ac") {
  const text = String(descriptionText ?? "").toLowerCase();
  if (!text) return 0;
  const patterns = target === "save"
    ? [
      /(?:\+|plus\s+)(\d+)\s+bonus(?:es)?\s+to\s+saving throws?\b/i,
      /bonus(?:es)?\s+to\s+saving throws?\s+of\s+(?:\+|plus\s+)?(\d+)/i
    ]
    : [
      /(?:\+|plus\s+)(\d+)\s+bonus(?:es)?\s+to\s+(?:ac|armor class)\b/i,
      /bonus(?:es)?\s+to\s+(?:ac|armor class)\s+of\s+(?:\+|plus\s+)?(\d+)/i
    ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const numeric = Number(match[1]);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  }
  return 0;
}

function hasEffectChange(item = {}, key = "") {
  const normalizedKey = String(key ?? "").trim();
  if (!normalizedKey) return false;
  const effects = Array.isArray(item?.effects) ? item.effects : [];
  for (const effect of effects) {
    const changes = Array.isArray(effect?.changes) ? effect.changes : [];
    if (changes.some((change) => String(change?.key ?? "").trim() === normalizedKey)) return true;
  }
  return false;
}

function buildTransferEffect(item = {}, options = {}) {
  const effectId = String(options?.effectId ?? "").trim() || makeStableId(`${item?._id ?? "item"}:effect`);
  const effectName = String(options?.name ?? "Passive Effect").trim() || "Passive Effect";
  const changes = Array.isArray(options?.changes) ? options.changes.map((change) => ({
    key: String(change?.key ?? "").trim(),
    mode: Number.isFinite(Number(change?.mode)) ? Number(change.mode) : 2,
    value: String(change?.value ?? "").trim(),
    priority: change?.priority ?? null
  })).filter((change) => change.key) : [];
  const origin = String(options?.origin ?? item?.flags?.core?.sourceId ?? "").trim();

  return {
    _id: effectId,
    changes,
    disabled: false,
    duration: {
      startTime: null,
      seconds: null,
      combat: null,
      rounds: null,
      turns: null,
      startRound: null,
      startTurn: null
    },
    origin,
    transfer: true,
    flags: {
      "midi-qol": cloneDefault(MIDI_QOL_DEFAULTS),
      dae: cloneDefault(DAE_DEFAULTS)
    },
    tint: "#ffffff",
    name: effectName,
    description: "",
    statuses: [],
    img: String(item?.img ?? "icons/svg/aura.svg"),
    type: "base",
    system: {},
    sort: 0
  };
}

function upsertTransferEffect(item = {}, options = {}, summary = null) {
  if (!Array.isArray(item.effects)) item.effects = [];
  const effects = item.effects;
  const effectId = String(options?.effectId ?? "").trim() || makeStableId(`${item?._id ?? "item"}:${options?.slug ?? "effect"}`);
  const nextEffect = buildTransferEffect(item, { ...options, effectId });
  const nextSignature = JSON.stringify(nextEffect);

  let existing = effects.find((entry) => String(entry?._id ?? "").trim() === effectId) ?? null;
  if (!existing) {
    const nextKeys = new Set(nextEffect.changes.map((change) => `${change.key}:${change.mode}:${change.value}`));
    existing = effects.find((entry) => {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      const keys = new Set(changes.map((change) => `${change?.key}:${change?.mode}:${change?.value}`));
      if (keys.size !== nextKeys.size) return false;
      for (const key of nextKeys) {
        if (!keys.has(key)) return false;
      }
      return true;
    }) ?? null;
  }

  if (!existing) {
    effects.push(nextEffect);
    if (summary) summary.passiveEffectsAdded += 1;
    return { changed: true, added: true, updated: false };
  }

  const beforeSignature = JSON.stringify(existing);
  const preservedId = String(existing?._id ?? "").trim() || effectId;
  Object.assign(existing, nextEffect);
  existing._id = preservedId;
  const afterSignature = JSON.stringify(existing);
  if (beforeSignature !== afterSignature && summary) summary.passiveEffectsUpdated += 1;
  return { changed: beforeSignature !== afterSignature, added: false, updated: beforeSignature !== afterSignature };
}

function buildAppliedEffect(item = {}, options = {}) {
  const effect = buildTransferEffect(item, options);
  effect.transfer = false;
  effect.origin = String(options?.origin ?? `Item.${String(item?._id ?? "").trim()}`).trim();

  const duration = ensureObject(effect, "duration");
  const seconds = Number(options?.seconds);
  duration.seconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : null;

  const dae = ensureObject(effect.flags, "dae");
  dae.selfTarget = false;
  dae.selfTargetAlways = false;
  dae.stackable = "noneName";

  effect.flags["times-up"] = { isPassive: false };
  effect.description = String(options?.description ?? "").trim();

  const statuses = Array.isArray(options?.statuses)
    ? options.statuses.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  effect.statuses = statuses;

  return effect;
}

function upsertAppliedEffect(item = {}, options = {}, summary = null) {
  if (!Array.isArray(item.effects)) item.effects = [];
  const effects = item.effects;
  const effectId = String(options?.effectId ?? "").trim() || makeStableId(`${item?._id ?? "item"}:${options?.slug ?? "effect"}`);
  const matcher = typeof options?.matcher === "function" ? options.matcher : null;
  const nextEffect = buildAppliedEffect(item, { ...options, effectId });
  const nextSignature = JSON.stringify(nextEffect);

  let existing = effects.find((entry) => String(entry?._id ?? "").trim() === effectId) ?? null;
  if (!existing && matcher) {
    existing = effects.find((entry) => matcher(entry)) ?? null;
  }

  if (!existing) {
    effects.push(nextEffect);
    if (summary) summary.consumableEffectsAdded += 1;
    return { changed: true, added: true, updated: false, effectId };
  }

  const beforeSignature = JSON.stringify(existing);
  const preservedId = String(existing?._id ?? "").trim() || effectId;
  Object.assign(existing, nextEffect);
  existing._id = preservedId;
  const afterSignature = JSON.stringify(existing);
  const changed = beforeSignature !== afterSignature;
  if (changed && summary) summary.consumableEffectsUpdated += 1;
  return { changed, added: false, updated: changed, effectId: preservedId };
}

function appendCommonRulingDescription(item = {}, noteText = "", marker = "", summary = null) {
  const markerText = String(marker ?? "").trim();
  const note = String(noteText ?? "").trim();
  if (!markerText || !note) return false;

  const system = ensureObject(item, "system");
  const description = ensureObject(system, "description");
  const current = String(description.value ?? "");
  const token = `po-ruling:${markerText}`;
  if (current.includes(token)) return false;

  const suffix = `<p><strong>Common Table Ruling:</strong> ${escapeHtml(note)}</p><!-- ${token} -->`;
  description.value = `${current}${current.trim() ? "" : "<p></p>"}${suffix}`;
  if (summary) summary.commonRulingNotesAdded += 1;
  return true;
}

function ensureSourceMetadata(item = {}, summary = null) {
  const flags = ensureObject(item, "flags");
  const coreFlags = ensureObject(flags, "core");
  const itemId = String(item?._id ?? "").trim();
  if (itemId && !String(coreFlags.sourceId ?? "").trim()) {
    coreFlags.sourceId = `Compendium.${DEFAULT_MANIFEST_COLLECTION}.Item.${itemId}`;
    if (summary) summary.synthesizedCoreSourceIds += 1;
  }

  const system = ensureObject(item, "system");
  const source = ensureObject(system, "source");
  let filled = 0;
  if (!String(source.rules ?? "").trim()) {
    source.rules = "2014";
    filled += 1;
  }
  if (!Number.isFinite(Number(source.revision))) {
    source.revision = 1;
    filled += 1;
  }
  if (summary) summary.systemSourceFieldsFilled += filled;
}

function ensureDescription(item = {}, summary = null) {
  const system = ensureObject(item, "system");
  const description = ensureObject(system, "description");
  const current = String(description?.value ?? "").trim();
  if (current) return;

  const itemName = String(item?.name ?? "Unnamed Item").trim() || "Unnamed Item";
  const itemType = String(item?.type ?? "item").trim().toLowerCase() || "item";
  const rarity = getRarityFromItem(item) || "common";
  const rarityLabel = rarity.replace(/-/g, " ");
  const gpValue = getGpValue(item);
  const valueText = gpValue > 0
    ? `Estimated value: ${Number(gpValue.toFixed(2))} gp.`
    : "Value varies by market and campaign context.";

  description.value = `<p><em>${escapeHtml(itemName)}</em> is a ${escapeHtml(rarityLabel)} ${escapeHtml(itemType)} item curated in Party Operations.</p><p>${escapeHtml(valueText)}</p>`;
  if (summary) summary.generatedDescriptions += 1;
}

function ensureActivityCoverage(item = {}, summary = null) {
  const system = ensureObject(item, "system");
  if (!isPlainObject(system.activities)) {
    system.activities = {};
    if (summary) summary.activityCollectionsInitialized += 1;
  }

  const itemType = String(item?.type ?? "").trim().toLowerCase();
  const canGenerateUtility = new Set(["equipment", "loot", "container", "consumable"]);
  const keys = Object.keys(system.activities);
  if (keys.length === 0 && canGenerateUtility.has(itemType)) {
    const activityId = getNextActivityId(system.activities);
    system.activities[activityId] = buildGenericUtilityActivity(item, activityId, 0);
    if (summary) summary.utilityActivitiesAdded += 1;
  }

  const entries = Object.entries(system.activities);
  entries.sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  for (let index = 0; index < entries.length; index += 1) {
    const [key, activity] = entries[index];
    if (!isPlainObject(activity)) {
      system.activities[key] = buildGenericUtilityActivity(item, key, index);
      if (summary) summary.activitiesPatched += 1;
    }
    system.activities[key].sort = index;
    tuneActivity(system.activities[key], summary);
    ensureBlankActivationType(item, system.activities[key], summary);
  }
}

function ensurePassiveEffects(item = {}, summary = null) {
  const itemType = String(item?.type ?? "").trim().toLowerCase();
  const itemName = String(item?.name ?? "").trim();
  if (!itemName) return;

  const wandMatch = itemName.match(/wand of the war mage\s*\+\s*([1-9]\d*)\b/i);
  if (wandMatch) {
    const bonus = Number(wandMatch[1]);
    if (Number.isFinite(bonus) && bonus > 0) {
      const hasMsak = hasEffectChange(item, "system.bonuses.msak.attack");
      const hasRsak = hasEffectChange(item, "system.bonuses.rsak.attack");
      if (!hasMsak || !hasRsak) {
        const result = upsertTransferEffect(item, {
          slug: "wand-war-mage-bonus",
          name: `+${bonus} Spell Attack Rolls`,
          changes: [
            { key: "system.bonuses.msak.attack", mode: 2, value: `+${bonus}` },
            { key: "system.bonuses.rsak.attack", mode: 2, value: `+${bonus}` }
          ]
        }, summary);
        if (result.changed && summary) summary.wandWarMageEffectsEnsured += 1;
      }
    }
  }

  if (itemType === "weapon") {
    if (Array.isArray(item.effects)) {
      const beforeCount = item.effects.length;
      item.effects = item.effects.filter((effect) => {
        const changes = Array.isArray(effect?.changes) ? effect.changes : [];
        const hasOnlyAcChange = changes.length === 1 && String(changes[0]?.key ?? "").trim() === "system.attributes.ac.bonus";
        if (!hasOnlyAcChange) return true;
        const effectName = String(effect?.name ?? "").trim();
        // Remove auto-generated unconditional AC bonus effects from heuristic parsing on weapons.
        if (/^\+\d+\s+AC$/i.test(effectName) || /^\+\d+\s+AC\s*&\s*\+\d+\s+Saves$/i.test(effectName)) return false;
        return true;
      });
      const removed = Math.max(0, beforeCount - item.effects.length);
      if (removed > 0 && summary) summary.passiveEffectsRemoved += removed;
    }

    if (/luck blade/i.test(itemName) && !hasEffectChange(item, "system.bonuses.abilities.save")) {
      const result = upsertTransferEffect(item, {
        slug: "luck-blade-save",
        name: "+1 Saves",
        changes: [{ key: "system.bonuses.abilities.save", mode: 2, value: "+1" }]
      }, summary);
      if (result.changed && summary) summary.luckBladeEffectsEnsured += 1;
    }
    return;
  }

  if (itemType !== "equipment") return;

  const equipmentType = String(item?.system?.type?.value ?? "").trim().toLowerCase();
  const isArmorLike = new Set(["light", "medium", "heavy", "shield"]).has(equipmentType);
  if (isArmorLike) return;

  const descriptionText = stripHtml(item?.system?.description?.value ?? "");
  if (!descriptionText) return;

  const acBonus = extractFlatBonusFromDescription(descriptionText, "ac");
  const saveBonus = extractFlatBonusFromDescription(descriptionText, "save");
  const shouldAddAc = acBonus > 0 && !hasEffectChange(item, "system.attributes.ac.bonus");
  const shouldAddSave = saveBonus > 0 && !hasEffectChange(item, "system.bonuses.abilities.save");
  if (!shouldAddAc && !shouldAddSave) return;

  const changes = [];
  if (shouldAddAc) changes.push({ key: "system.attributes.ac.bonus", mode: 2, value: `+${acBonus}` });
  if (shouldAddSave) changes.push({ key: "system.bonuses.abilities.save", mode: 2, value: `+${saveBonus}` });

  const effectName = shouldAddAc && shouldAddSave
    ? `+${acBonus} AC & +${saveBonus} Saves`
    : (shouldAddAc ? `+${acBonus} AC` : `+${saveBonus} Saves`);
  const result = upsertTransferEffect(item, {
    slug: `passive-bonus-${acBonus}-${saveBonus}`,
    name: effectName,
    changes
  }, summary);
  if (result.changed && summary) {
    if (shouldAddAc) summary.genericAcEffectsEnsured += 1;
    if (shouldAddSave) summary.genericSaveEffectsEnsured += 1;
  }
}

function ensureMundaneConsumableRules(item = {}, summary = null) {
  const itemType = String(item?.type ?? "").trim().toLowerCase();
  if (itemType !== "consumable") return;

  const itemName = String(item?.name ?? "").trim();
  if (!itemName) return;

  const isAlcoholicDrink = /\b(ale|beer|wine|mead|cider|liquor|spirit|spirits|whiskey|rum|vodka|brandy|stout)\b/i.test(itemName);
  const isRations = /\brations?\b|\bfeed\b/i.test(itemName);
  const isWaterskin = /\bwaterskin\b/i.test(itemName);
  if (!isAlcoholicDrink && !isRations && !isWaterskin) return;

  let changed = 0;

  if (isAlcoholicDrink) {
    const utilityEntry = ensureActivityByType(item, "utility", (activityId, sort) => (
      buildGenericUtilityActivity(item, activityId, sort)
    ), summary);
    const utility = utilityEntry.activity;
    tuneActivity(utility, summary);
    if (assignIfChanged(utility, "name", `Drink ${itemName}`)) changed += 1;
    const utilityDescription = ensureObject(utility, "description");
    if (assignIfChanged(utilityDescription, "chatFlavor", `Drink a serving of ${itemName}.`)) changed += 1;
    changed += ensureActivityActivation(utility, { type: "action", value: 1, condition: "" });
    changed += ensureItemUsesConsumptionTarget(utility, "1");
    changed += ensureSingleWillingTarget(utility, "touch");
    if (Array.isArray(utility.effects) && utility.effects.length > 0) {
      utility.effects = [];
      changed += 1;
    }

    const intoxicatedEffect = upsertAppliedEffect(item, {
      slug: "alcohol-intoxicated",
      name: "Intoxicated (Mild)",
      seconds: 3600,
      description: "Common table ruling: after enough alcohol, the creature may become intoxicated for up to 1 hour.",
      changes: [{ key: "StatusEffectName", mode: 0, value: "Intoxicated", priority: 20 }],
      matcher: (effect) => /\b(buzzed|intoxicated)\b/i.test(String(effect?.name ?? ""))
    }, summary);

    const saveEntry = ensureActivityByType(item, "save", (activityId, sort) => (
      buildGenericSaveActivity(item, activityId, sort, {
        name: "Resist Intoxication",
        ability: "con",
        dc: "10",
        onSave: "none"
      })
    ), summary);
    const save = saveEntry.activity;
    tuneActivity(save, summary);
    if (assignIfChanged(save, "type", "save")) changed += 1;
    if (assignIfChanged(save, "name", "Resist Intoxication")) changed += 1;
    const saveDescription = ensureObject(save, "description");
    if (assignIfChanged(saveDescription, "chatFlavor", "Optional ruling: DC 10 Constitution save after heavy drinking; on a failure, apply Intoxicated (Mild).")) changed += 1;
    changed += ensureActivityActivation(save, { type: "action", value: 1, condition: "" });
    changed += ensureItemUsesConsumptionTarget(save, "1");
    changed += ensureSingleWillingTarget(save, "touch");
    const saveData = ensureObject(save, "save");
    const ability = Array.isArray(saveData.ability) ? saveData.ability : [];
    if (JSON.stringify(ability) !== JSON.stringify(["con"])) {
      saveData.ability = ["con"];
      changed += 1;
    }
    const dc = ensureObject(saveData, "dc");
    if (assignIfChanged(dc, "calculation", "")) changed += 1;
    if (assignIfChanged(dc, "formula", "10")) changed += 1;
    const damage = ensureObject(save, "damage");
    if (assignIfChanged(damage, "onSave", "none")) changed += 1;
    if (!Array.isArray(damage.parts) || damage.parts.length > 0) {
      damage.parts = [];
      changed += 1;
    }
    const critical = ensureObject(damage, "critical");
    if (assignIfChanged(critical, "allow", false)) changed += 1;
    changed += ensureActivityEffectReference(save, intoxicatedEffect.effectId, true);

    appendCommonRulingDescription(
      item,
      "After heavy drinking, call for a DC 10 Constitution save. On a failed save, apply Intoxicated (Mild) for 1 hour.",
      "ale",
      summary
    );
  }

  if (isRations) {
    const system = ensureObject(item, "system");
    const hasHealingActivity = Object.values(system.activities ?? {}).some((activity) => (
      String(activity?.type ?? "").trim().toLowerCase() === "heal"
    ));
    if (!hasHealingActivity) {
      const utilityEntry = ensureActivityByType(item, "utility", (activityId, sort) => (
        buildGenericUtilityActivity(item, activityId, sort)
      ), summary);
      const utility = utilityEntry.activity;
      tuneActivity(utility, summary);
      if (assignIfChanged(utility, "name", "Eat Rations")) changed += 1;
      const utilityDescription = ensureObject(utility, "description");
      if (assignIfChanged(utilityDescription, "chatFlavor", "Consume one day of preserved food.")) changed += 1;
      changed += ensureActivityActivation(utility, { type: "action", value: 1, condition: "" });
      changed += ensureItemUsesConsumptionTarget(utility, "1");
      changed += ensureSingleWillingTarget(utility, "touch");
    }

    appendCommonRulingDescription(
      item,
      "One ration generally sustains one creature for one day of travel.",
      "rations",
      summary
    );
  }

  if (isWaterskin) {
    const utilityEntry = ensureActivityByType(item, "utility", (activityId, sort) => (
      buildGenericUtilityActivity(item, activityId, sort)
    ), summary);
    const utility = utilityEntry.activity;
    tuneActivity(utility, summary);
    if (assignIfChanged(utility, "name", "Drink Water")) changed += 1;
    const utilityDescription = ensureObject(utility, "description");
    if (assignIfChanged(utilityDescription, "chatFlavor", "Drink from this waterskin.")) changed += 1;
    changed += ensureActivityActivation(utility, { type: "action", value: 1, condition: "" });
    changed += ensureItemUsesConsumptionTarget(utility, "1");
    changed += ensureSingleWillingTarget(utility, "touch");

    appendCommonRulingDescription(
      item,
      "A full waterskin typically holds 4 pints (about 4 pounds of water).",
      "waterskin",
      summary
    );
  }

  if (summary && changed > 0) summary.consumableActivityFieldsPatched += changed;
}

function stampEnrichmentDetails(item = {}, summary = null) {
  const flags = ensureObject(item, "flags");
  const poFlags = ensureObject(flags, MODULE_ID);
  const details = ensureObject(poFlags, "details");
  const system = ensureObject(item, "system");
  const activities = isPlainObject(system.activities) ? Object.keys(system.activities).length : 0;
  const effects = Array.isArray(item?.effects) ? item.effects.length : 0;
  const hasDescription = Boolean(String(system?.description?.value ?? "").trim());

  let changed = 0;
  const setIfDifferent = (key, value) => {
    if (JSON.stringify(details[key]) === JSON.stringify(value)) return;
    details[key] = value;
    changed += 1;
  };

  setIfDifferent("schema", ENRICHMENT_SCHEMA);
  setIfDifferent("itemType", String(item?.type ?? ""));
  setIfDifferent("activityCount", activities);
  setIfDifferent("effectCount", effects);
  setIfDifferent("hasDescription", hasDescription);
  setIfDifferent("coreSourceId", String(item?.flags?.core?.sourceId ?? ""));

  if (summary && changed > 0) summary.detailFieldsFilled += changed;
}

function enrichManifestItem(item = {}, summary = null) {
  ensureSourceMetadata(item, summary);
  tuneEnhancedWeaponItem(item, summary);
  ensureDescription(item, summary);
  ensureActivityCoverage(item, summary);
  ensurePassiveEffects(item, summary);
  ensureMundaneConsumableRules(item, summary);
  stampEnrichmentDetails(item, summary);
}

function normalizeItemFlags(item, summary) {
  const flags = ensureObject(item, "flags");
  const itemMidi = ensureObject(flags, "midi-qol");
  const itemDae = ensureObject(flags, "dae");
  const itemMidiProps = ensureObject(flags, "midiProperties");
  summary.itemMidiDefaults += applyDefaults(itemMidi, MIDI_QOL_DEFAULTS);
  summary.itemDaeDefaults += applyDefaults(itemDae, DAE_DEFAULTS);
  summary.itemMidiPropertiesDefaults += applyDefaults(itemMidiProps, MIDI_PROPERTIES_DEFAULTS);
}

function normalizeEffects(item, summary) {
  const rawEffects = Array.isArray(item?.effects) ? item.effects : [];
  const normalizedEffects = [];
  let removed = 0;

  for (let index = 0; index < rawEffects.length; index += 1) {
    const effect = rawEffects[index];
    if (!isPlainObject(effect)) {
      removed += 1;
      continue;
    }

    const hasMeaningfulPayload = Object.keys(effect).length > 0;
    if (!hasMeaningfulPayload) {
      removed += 1;
      continue;
    }

    if (!String(effect?._id ?? "").trim()) {
      const seed = `${String(item?._id ?? "item")}:effect:${index}:${String(effect?.name ?? "")}`;
      effect._id = makeStableId(seed, 16);
      summary.effectIdsSynthesized += 1;
    }

    normalizedEffects.push(effect);
  }

  item.effects = normalizedEffects;
  if (removed > 0) summary.invalidEffectsRemoved += removed;

  const validEffectIds = new Set(normalizedEffects.map((effect) => String(effect?._id ?? "").trim()).filter(Boolean));
  const activities = item?.system?.activities;
  if (isPlainObject(activities)) {
    for (const activity of Object.values(activities)) {
      if (!isPlainObject(activity)) continue;
      const refs = Array.isArray(activity.effects) ? activity.effects : [];
      const nextRefs = refs.filter((ref) => {
        const id = String(ref?._id ?? "").trim();
        if (!id) return false;
        return validEffectIds.has(id);
      });
      if (nextRefs.length !== refs.length) {
        activity.effects = nextRefs;
        summary.activityEffectRefsPruned += (refs.length - nextRefs.length);
      }
    }
  }

  for (const effect of normalizedEffects) {
    if (!isPlainObject(effect)) continue;
    summary.effectCount += 1;
    const flags = ensureObject(effect, "flags");
    const midi = ensureObject(flags, "midi-qol");
    const dae = ensureObject(flags, "dae");
    summary.effectMidiDefaults += applyDefaults(midi, MIDI_QOL_DEFAULTS);
    summary.effectDaeDefaults += applyDefaults(dae, DAE_DEFAULTS);
  }
}

function stampPartyOperationsMetadata(item, summary, options = {}) {
  const flags = ensureObject(item, "flags");
  const coreFlags = ensureObject(flags, "core");
  const id = String(item?._id ?? "").trim();
  const collection = String(options?.collection ?? DEFAULT_SOURCE_COLLECTION).trim() || DEFAULT_SOURCE_COLLECTION;
  if (id && !String(coreFlags.sourceId ?? "").trim()) {
    coreFlags.sourceId = `Compendium.${collection}.Item.${id}`;
  }

  const rarity = getRarityFromItem(item);
  const gpValue = getGpValue(item);
  const lootType = classifyLootType(item, rarity);
  const tier = getTierFromRarity(rarity);
  const valueBand = getValueBand(gpValue);
  const taggedAt = new Date().toISOString();
  const keywords = buildKeywords(item, { rarity, gpValue, lootType, tier, valueBand });

  const poFlags = ensureObject(flags, MODULE_ID);
  poFlags.keywords = keywords;
  poFlags.lootType = lootType;
  poFlags.tier = tier;
  poFlags.rarityNormalized = rarity;
  poFlags.gpValue = gpValue;
  poFlags.valueBand = valueBand;
  poFlags.taggedAt = taggedAt;
  poFlags.tagSchema = TAG_SCHEMA;

  summary.taggedItems += 1;
}

function readManifestItems(manifestPath) {
  const text = fs.readFileSync(manifestPath, "utf8");
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, lineNumber) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON in manifest at line ${lineNumber + 1}: ${error.message}`);
      }
    });
}

function writeManifestItems(manifestPath, items) {
  const output = items.map((item) => JSON.stringify(item)).join("\n");
  fs.writeFileSync(manifestPath, `${output}\n`, "utf8");
}

async function readSourceItemsFromLevelDb(sourcePath) {
  const ClassicLevel = getClassicLevel();
  const db = new ClassicLevel(sourcePath, { valueEncoding: "utf8" });
  await db.open();
  try {
    const rows = [];
    for await (const [key, value] of db.iterator()) {
      const keyText = String(key ?? "");
      if (!keyText.startsWith("!items!")) continue;
      try {
        const parsed = JSON.parse(String(value ?? ""));
        if (isPlainObject(parsed)) rows.push(parsed);
      } catch {
        // Ignore malformed records.
      }
    }
    return rows;
  } finally {
    await db.close();
  }
}

function toScopedSourceKey(collection = "", id = "") {
  const collectionText = String(collection ?? "").trim();
  const idText = String(id ?? "").trim();
  if (!collectionText || !idText) return "";
  return `${collectionText}::${idText}`;
}

function parseCompendiumSourceId(sourceId = "") {
  const raw = String(sourceId ?? "").trim();
  if (!raw.startsWith("Compendium.")) return null;
  const withoutPrefix = raw.slice("Compendium.".length);
  const marker = ".Item.";
  const markerIndex = withoutPrefix.lastIndexOf(marker);
  if (markerIndex <= 0) return null;
  const collection = withoutPrefix.slice(0, markerIndex).trim();
  const id = withoutPrefix.slice(markerIndex + marker.length).trim();
  if (!collection || !id) return null;
  return { collection, id };
}

function buildPresentSourceState(manifestItems) {
  const presentIds = new Set();
  const presentScopedSourceIds = new Set();
  for (const item of manifestItems) {
    const id = String(item?._id ?? "").trim();
    if (id) presentIds.add(id);
    const sourceId = String(item?.flags?.core?.sourceId ?? "").trim();
    const parsed = parseCompendiumSourceId(sourceId);
    if (!parsed) continue;
    if (parsed.id) presentIds.add(parsed.id);
    const scopedKey = toScopedSourceKey(parsed.collection, parsed.id);
    if (scopedKey) presentScopedSourceIds.add(scopedKey);
  }
  return { presentIds, presentScopedSourceIds };
}

function ensureDirectory(filePath) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.source)) throw new Error(`Source dnd5e pack not found: ${args.source}`);
  if (!fs.existsSync(args.manifest)) throw new Error(`Manifest pack not found: ${args.manifest}`);

  const sourceItems = await readSourceItemsFromLevelDb(args.source);
  const manifestItems = readManifestItems(args.manifest);
  const sourceCollection = String(args.collection ?? DEFAULT_SOURCE_COLLECTION).trim() || DEFAULT_SOURCE_COLLECTION;
  const presentSourceState = buildPresentSourceState(manifestItems);
  const missingSourceItems = sourceItems.filter((item) => {
    const id = String(item?._id ?? "").trim();
    if (!id) return false;
    if (presentSourceState.presentIds.has(id)) return false;
    const scopedKey = toScopedSourceKey(sourceCollection, id);
    if (scopedKey && presentSourceState.presentScopedSourceIds.has(scopedKey)) return false;
    return true;
  });

  const summary = {
    sourcePath: args.source,
    manifestPath: args.manifest,
    sourceItemCount: sourceItems.length,
    manifestItemCountBefore: manifestItems.length,
    missingFromManifestCount: missingSourceItems.length,
    balancedMode: Boolean(args.balanced),
    deriveSpellPricing: Boolean(args.deriveSpellPricing),
    sourceCollection,
    allowedTypes: args.allowedTypes,
    skippedByBalance: 0,
    importedCount: 0,
    taggedItems: 0,
    itemMidiDefaults: 0,
    itemDaeDefaults: 0,
    itemMidiPropertiesDefaults: 0,
    effectCount: 0,
    effectMidiDefaults: 0,
    effectDaeDefaults: 0,
    invalidEffectsRemoved: 0,
    effectIdsSynthesized: 0,
    activityEffectRefsPruned: 0,
    enhancedWeaponsDetected: 0,
    enhancedWeaponProficiencyForced: 0,
    enhancedWeaponMagicPropertyAdded: 0,
    enhancedWeaponMidiMagicDamageEnabled: 0,
    enhancedWeaponMidiMagicEffectEnabled: 0,
    enhancedWeaponAttackBonusesTuned: 0,
    enhancedWeaponActivitiesTuned: 0,
    enhancedWeaponDamagePartsTuned: 0,
    enhancedWeaponDamageChanges: 0,
    synthesizedCoreSourceIds: 0,
    systemSourceFieldsFilled: 0,
    generatedDescriptions: 0,
    activityCollectionsInitialized: 0,
    utilityActivitiesAdded: 0,
    activitiesReviewed: 0,
    activitiesPatched: 0,
    activityFieldsPatched: 0,
    passiveEffectsAdded: 0,
    passiveEffectsUpdated: 0,
    passiveEffectsRemoved: 0,
    consumableEffectsAdded: 0,
    consumableEffectsUpdated: 0,
    consumableActivitiesAdded: 0,
    consumableActivityFieldsPatched: 0,
    commonRulingNotesAdded: 0,
    blankActivationTypesPatched: 0,
    blankActivationFieldsPatched: 0,
    blankActivationTextInferred: 0,
    wandWarMageEffectsEnsured: 0,
    luckBladeEffectsEnsured: 0,
    genericAcEffectsEnsured: 0,
    genericSaveEffectsEnsured: 0,
    detailFieldsFilled: 0
  };

  const importedPreview = [];

  for (const sourceItemRaw of missingSourceItems) {
    const sourceItem = JSON.parse(JSON.stringify(sourceItemRaw));
    if (args.balanced) {
      applyBalancedAdjustments(sourceItem, { deriveSpellPricing: args.deriveSpellPricing });
      if (!isBalancedSourceItem(sourceItem, {
        allowedTypes: args.allowedTypes,
        deriveSpellPricing: args.deriveSpellPricing
      })) {
        summary.skippedByBalance += 1;
        continue;
      }
    }
    const clone = JSON.parse(JSON.stringify(sourceItem));
    stampPartyOperationsMetadata(clone, summary, { collection: args.collection });
    normalizeItemFlags(clone, summary);
    enrichManifestItem(clone, summary);
    normalizeEffects(clone, summary);
    manifestItems.push(clone);
    summary.importedCount += 1;
    importedPreview.push({
      id: String(clone?._id ?? ""),
      name: String(clone?.name ?? ""),
      type: String(clone?.type ?? "")
    });
  }

  for (const manifestItem of manifestItems) {
    normalizeItemFlags(manifestItem, summary);
    enrichManifestItem(manifestItem, summary);
    normalizeEffects(manifestItem, summary);
    const hasTaggedMetadata = Array.isArray(manifestItem?.flags?.[MODULE_ID]?.keywords)
      && manifestItem.flags[MODULE_ID].keywords.length > 0;
    if (!hasTaggedMetadata) {
      stampPartyOperationsMetadata(manifestItem, summary, { collection: args.collection });
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    writeMode: Boolean(args.write),
    summary: {
      ...summary,
      manifestItemCountAfter: manifestItems.length
    },
    importedItems: importedPreview
  };

  if (args.write) {
    if (args.backup) {
      const backupPath = `${args.manifest}.pre-dnd5e-sync.bak`;
      if (!fs.existsSync(backupPath)) fs.copyFileSync(args.manifest, backupPath);
      output.backupPath = backupPath;
    }
    writeManifestItems(args.manifest, manifestItems);
  }

  if (args.report) {
    ensureDirectory(args.report);
    fs.writeFileSync(args.report, JSON.stringify(output, null, 2), "utf8");
  }

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`sync-dnd5e-items-into-manifest failed: ${error.message}\n`);
  process.exit(1);
});
