#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MODULE_ID = "party-operations";
const DEFAULT_MANIFEST = path.resolve(process.cwd(), "packs", "party-operations-loot-manifest.db");
const TAG_SCHEMA = "po-loot-v3";
const SOURCE_CURATED = "source.party.operations.party.operations.loot.manifest";
const OWNER_ID = "GFVfiCPdpln7qZBb";
const DEFAULT_MIDI_QOL = Object.freeze({
  rollAttackPerTarget: "default",
  removeAttackDamageButtons: "default",
  effectActivation: false,
  itemCondition: "",
  reactionCondition: "",
  otherCondition: "",
  effectCondition: ""
});
const DEFAULT_DAE = Object.freeze({
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
const DEFAULT_MIDI_PROPERTIES = Object.freeze({
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

const ZERO_PRICE_OVERRIDES = Object.freeze({
  CwWbeQ6XyqFzbMYw: Object.freeze({ value: 12000, denomination: "gp" }),
  wqVSRfkcTjuhvDyx: Object.freeze({ value: 3000, denomination: "gp" }),
  vpenjFjUyEBLLlUc: Object.freeze({ value: 1, denomination: "sp" }),
  Ij6x7481ch3Z0rff: Object.freeze({ value: 1, denomination: "cp" })
});

const NEW_TREASURE = Object.freeze([
  Object.freeze({
    kind: "gem",
    identifier: "bloodstone-cabochon",
    name: "Bloodstone Cabochon",
    img: "icons/commodities/gems/gem-faceted-rounded-brown.webp",
    weight: 0.05,
    price: 50,
    description: "A polished bloodstone cabochon flecked with deep red veins."
  }),
  Object.freeze({
    kind: "gem",
    identifier: "sunfire-citrine",
    name: "Sunfire Citrine",
    img: "icons/commodities/gems/gem-faceted-teardrop-yellow.webp",
    weight: 0.08,
    price: 100,
    description: "A honey-gold citrine that flashes like embers in direct light."
  }),
  Object.freeze({
    kind: "gem",
    identifier: "imperial-topaz",
    name: "Imperial Topaz",
    img: "icons/commodities/gems/gem-faceted-hexagon-orange.webp",
    weight: 0.07,
    price: 500,
    description: "A clear orange topaz commonly mounted in high ceremonial jewelry."
  }),
  Object.freeze({
    kind: "gem",
    identifier: "black-pearl-pair",
    name: "Black Pearl Pair",
    img: "icons/commodities/gems/pearl-black.webp",
    weight: 0.06,
    price: 500,
    description: "A matched pair of black pearls selected for shape and luster."
  }),
  Object.freeze({
    kind: "gem",
    identifier: "dragon-garnet",
    name: "Dragon Garnet",
    img: "icons/commodities/gems/gem-faceted-round-red.webp",
    weight: 0.12,
    price: 1000,
    description: "A rich crimson garnet cut with broad facets and sold as a noble stone."
  }),
  Object.freeze({
    kind: "gem",
    identifier: "star-sapphire-cabochon",
    name: "Star Sapphire Cabochon",
    img: "icons/commodities/gems/gem-oval-blue.webp",
    weight: 0.08,
    price: 1000,
    description: "A sapphire cabochon that shows a six-rayed star under bright light."
  }),
  Object.freeze({
    kind: "art",
    leaf: "decorative-finery",
    identifier: "silver-filigree-mask",
    name: "Silver Filigree Mask",
    img: "icons/equipment/head/mask-ornate-silver.webp",
    weight: 3,
    price: 250,
    description: "A ceremonial silver mask chased with fine filigree knotwork."
  }),
  Object.freeze({
    kind: "art",
    leaf: "wall-art",
    identifier: "cedar-war-chronicle-panel",
    name: "Cedar War Chronicle Panel",
    img: "icons/sundries/documents/document-sealed-brown.webp",
    weight: 12,
    price: 750,
    description: "A carved cedar panel depicting banners and battle formations."
  }),
  Object.freeze({
    kind: "art",
    leaf: "decorative-finery",
    identifier: "bronze-astral-orrery",
    name: "Bronze Astral Orrery",
    img: "icons/commodities/tech/astrolabe-brass.webp",
    weight: 15,
    price: 2500,
    description: "A finely geared bronze orrery engraved with constellations."
  }),
  Object.freeze({
    kind: "art",
    leaf: "sculptures-idols",
    identifier: "obsidian-shrine-idol",
    name: "Obsidian Shrine Idol",
    img: "icons/commodities/treasure/statue-carved-face.webp",
    weight: 20,
    price: 750,
    description: "A glossy obsidian idol with stylized prayer markings."
  }),
  Object.freeze({
    kind: "art",
    leaf: "wall-art",
    identifier: "gilded-battle-standard",
    name: "Gilded Battle Standard",
    img: "icons/sundries/flags/banner-symbol-sword-blue.webp",
    weight: 8,
    price: 500,
    description: "A gilt-edged military standard preserved in costly cloth."
  }),
  Object.freeze({
    kind: "art",
    leaf: "decorative-finery",
    identifier: "porcelain-phoenix-vase",
    name: "Porcelain Phoenix Vase",
    img: "icons/commodities/treasure/vase-ceramic-blue.webp",
    weight: 6,
    price: 1000,
    description: "A cobalt-and-white porcelain vase painted with a phoenix motif."
  })
]);

function parseArgs(argv = []) {
  const args = { manifest: DEFAULT_MANIFEST, report: "", write: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] ?? "").trim();
    if (!token) continue;
    if (token === "--write") args.write = true;
    if (token === "--manifest") {
      args.manifest = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
    }
    if (token === "--report") {
      args.report = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
    }
  }
  return args;
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function round(value, digits = 2) {
  const factor = 10 ** Math.max(0, digits);
  return Math.round((toNumber(value) * factor)) / factor;
}

function normalizeRarity(value = "") {
  const key = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "").replace(/_/g, "-");
  if (key === "veryrare") return "very-rare";
  if (["very-rare", "legendary", "rare", "uncommon", "common"].includes(key)) return key;
  if (["artifact", "artefact"].includes(key)) return "legendary";
  return "";
}

function getRarity(item = {}, po = {}) {
  const values = [po.rarityNormalized, item.rarity, item?.system?.rarity, item?.system?.details?.rarity, item?.system?.traits?.rarity];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const rarity = typeof value === "object" ? normalizeRarity(value.value ?? value.label ?? value.name ?? "") : normalizeRarity(value);
    if (rarity) return rarity;
  }
  return "";
}

function getTier(rarity = "") {
  if (rarity === "legendary" || rarity === "very-rare") return "tier.t4";
  if (rarity === "rare") return "tier.t3";
  if (rarity === "uncommon") return "tier.t2";
  return "tier.t1";
}

function getValueBand(gp = 0) {
  if (gp < 5) return "value.v0";
  if (gp <= 49) return "value.v1";
  if (gp <= 149) return "value.v2";
  if (gp <= 749) return "value.v3";
  if (gp <= 2999) return "value.v4";
  return "value.v5";
}

function getGpValue(item = {}) {
  const price = item?.system?.price;
  const map = { pp: 10, gp: 1, ep: 0.5, sp: 0.1, cp: 0.01 };
  if (price && typeof price === "object") {
    const amount = Math.max(0, toNumber(price.value ?? price.amount ?? 0));
    const denomination = String(price.denomination ?? price.currency ?? "gp").trim().toLowerCase() || "gp";
    return round(amount * (map[denomination] ?? 1), 2);
  }
  return round(Math.max(0, toNumber(price ?? 0)), 2);
}

function getDenomination(item = {}) {
  const denomination = String(item?.system?.price?.denomination ?? item?.system?.price?.currency ?? "gp").trim().toLowerCase();
  return denomination || "gp";
}

function isMagic(item = {}, rarity = "") {
  if (rarity && rarity !== "common") return true;
  if (String(item?.system?.attunement ?? "").trim().toLowerCase() === "required") return true;
  const properties = Array.isArray(item?.system?.properties) ? item.system.properties : [];
  if (properties.some((entry) => String(entry ?? "").trim().toLowerCase() === "mgc")) return true;
  return /\+\s*[1-9]\d*/.test(String(item?.name ?? ""));
}

function classifyLootType(item = {}, rarity = "") {
  const type = String(item?.type ?? "").trim().toLowerCase();
  const subtype = String(item?.system?.type?.value ?? "").trim().toLowerCase();
  const magic = isMagic(item, rarity);
  if (type === "weapon") return magic ? "loot.weapon.magic" : "loot.weapon";
  if (type === "equipment") return magic ? (["light", "medium", "heavy", "shield"].includes(subtype) ? "loot.armor.magic" : "loot.equipment.magic") : (["light", "medium", "heavy", "shield"].includes(subtype) ? "loot.armor" : "loot.equipment");
  if (type === "consumable") return subtype === "potion" ? "loot.potion" : (subtype === "poison" ? "loot.poison" : "loot.consumable");
  if (type === "tool") return "loot.tool";
  if (type === "container" || type === "backpack") return "loot.container";
  if (type === "spell") return "loot.spell";
  if (type === "loot") return "loot.loot";
  return `loot.${type || "item"}`;
}

function normalizeVariableKind(value = "") {
  const key = String(value ?? "").trim().toLowerCase();
  if (["gem", "gems", "gemstone", "gemstones"].includes(key)) return "gem";
  if (["art", "art-item", "art-items", "art-object", "art-objects"].includes(key)) return "art";
  return "";
}

function detectVariableKind(item = {}, po = {}, tags = new Set()) {
  const explicit = normalizeVariableKind(item.variableTreasureKind ?? po.variableTreasureKind ?? "");
  if (explicit) return explicit;
  if (tags.has("merchant.gem") || tags.has("folder.leaf.gemstones")) return "gem";
  if (tags.has("merchant.art") || tags.has("folder.section.art-objects")) return "art";
  const name = String(item?.name ?? "").trim().toLowerCase();
  if (/\b(amber|agate|amethyst|aquamarine|bloodstone|diamond|emerald|garnet|gem|jade|jasper|onyx|opal|pearl|quartz|ruby|sapphire|topaz|tourmaline)\b/.test(name)) return "gem";
  if (/\b(art|painting|portrait|tapestry|statue|idol|vase|chalice|mask|bust|sculpture|carving)\b/.test(name)) return "art";
  return "";
}

function makeId(seed = "") {
  return crypto.createHash("sha256").update(String(seed)).digest("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
}

function readManifest(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

function writeManifest(filePath, items) {
  fs.writeFileSync(filePath, `${items.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
}

function ensureDir(filePath) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function createTreasureItem(spec = {}) {
  const id = makeId(`party-operations:${spec.identifier}`);
  const isGem = spec.kind === "gem";
  const sectionKey = isGem ? "gems-jewelry" : "art-objects";
  const sectionLabel = isGem ? "Gems & Jewelry" : "Art Objects";
  const leafKey = isGem ? "gemstones" : String(spec.leaf ?? "decorative-finery");
  const leafLabelMap = {
    gemstones: "Gemstones",
    "wall-art": "Wall Art",
    "sculptures-idols": "Sculptures & Idols",
    "decorative-finery": "Decorative Finery"
  };
  const leafLabel = leafLabelMap[leafKey] ?? "General";
  const pathKey = `sundries/${sectionKey}/${leafKey}`;
  const sourceId = `Compendium.party-operations.party-operations-loot-manifest.Item.${id}`;

  return {
    _id: id,
    name: spec.name,
    type: "loot",
    img: spec.img,
    system: {
      description: {
        value: `<p>${spec.description}</p><p>Weight: ${spec.weight} lb.</p>`,
        chat: `<p><strong>${spec.name}</strong></p><p>${spec.description}</p>`
      },
      source: { rules: "2014", revision: 1, custom: "Party Operations Curated Treasure" },
      quantity: 1,
      weight: { value: spec.weight, units: "lb" },
      price: { value: spec.price, denomination: "gp" },
      rarity: "",
      identified: true,
      type: { value: "treasure", subtype: "" },
      identifier: spec.identifier,
      activities: {
        dnd5eactivity000: {
          _id: "dnd5eactivity000",
          type: "utility",
          activation: { type: "action", value: 1, condition: "", override: false },
          consumption: { targets: [], scaling: { allowed: false, max: "" }, spellSlot: true },
          description: { chatFlavor: `Use ${spec.name}` },
          duration: { concentration: false, value: "", units: "inst", special: "", override: false },
          effects: [],
          range: { units: "self", special: "", override: false },
          target: { template: {}, affects: {}, prompt: true, override: false },
          uses: { spent: 0, max: "", recovery: [] },
          roll: { formula: "", name: "", prompt: false, visible: false },
          sort: 0
        }
      }
    },
    effects: [],
    folder: null,
    flags: {
      core: { sourceId },
      "midi-qol": { ...DEFAULT_MIDI_QOL },
      dae: { ...DEFAULT_DAE },
      midiProperties: { ...DEFAULT_MIDI_PROPERTIES },
      [MODULE_ID]: {
        folder: {
          schema: "po-loot-folder-v1",
          familyKey: "sundries",
          familyLabel: "Sundries",
          sectionKey,
          sectionLabel,
          leafKey,
          leafLabel,
          path: [
            { key: "sundries", label: "Sundries", sort: 6000 },
            { key: sectionKey, label: sectionLabel, sort: isGem ? 6200 : 6250 },
            { key: leafKey, label: leafLabel, sort: isGem ? 6210 : 6280 }
          ],
          pathLabels: ["Sundries", sectionLabel, leafLabel],
          pathKeys: ["sundries", sectionKey, leafKey],
          pathKey
        }
      }
    },
    _stats: {
      compendiumSource: sourceId,
      duplicateSource: null,
      coreVersion: "12.343",
      systemId: "dnd5e",
      systemVersion: "4.4.4",
      createdTime: Date.now(),
      modifiedTime: Date.now(),
      lastModifiedBy: OWNER_ID
    },
    sort: 0,
    ownership: {
      default: 0,
      [OWNER_ID]: 3
    }
  };
}

function enrichItem(item = {}, nowIso = "") {
  if (!item.flags) item.flags = {};
  if (!item.flags[MODULE_ID]) item.flags[MODULE_ID] = {};
  if (!item.system) item.system = {};
  if (!item.system.price || typeof item.system.price !== "object") item.system.price = { value: 0, denomination: "gp" };
  if (!item.system.weight || typeof item.system.weight !== "object") item.system.weight = { value: 0, units: "lb" };
  if (!item.flags.core) item.flags.core = {};
  if (!item.flags.core.sourceId && item._id) item.flags.core.sourceId = `Compendium.party-operations.party-operations-loot-manifest.Item.${item._id}`;
  if (!item.flags["midi-qol"] || typeof item.flags["midi-qol"] !== "object") item.flags["midi-qol"] = { ...DEFAULT_MIDI_QOL };
  if (!item.flags.dae || typeof item.flags.dae !== "object") item.flags.dae = { ...DEFAULT_DAE };
  if (!item.flags.midiProperties || typeof item.flags.midiProperties !== "object") item.flags.midiProperties = { ...DEFAULT_MIDI_PROPERTIES };
  if (!item._stats || typeof item._stats !== "object") {
    item._stats = {
      compendiumSource: item.flags.core.sourceId,
      duplicateSource: null,
      coreVersion: "12.343",
      systemId: "dnd5e",
      systemVersion: "4.4.4",
      createdTime: Date.now(),
      modifiedTime: Date.now(),
      lastModifiedBy: OWNER_ID
    };
  }
  if (!item.ownership || typeof item.ownership !== "object") item.ownership = { default: 0, [OWNER_ID]: 3 };
  if (item.sort === undefined || item.sort === null) item.sort = 0;

  const po = item.flags[MODULE_ID];
  const override = ZERO_PRICE_OVERRIDES[String(item._id ?? "").trim()];
  if (override && po.lootEligible !== false && getGpValue(item) <= 0) {
    item.system.price.value = override.value;
    item.system.price.denomination = override.denomination;
  }

  const rarity = getRarity(item, po);
  const lootType = String(po.lootType ?? "").trim().toLowerCase() || classifyLootType(item, rarity);
  const gp = getGpValue(item);
  const denomination = getDenomination(item);
  const tier = getTier(rarity);
  const valueBand = getValueBand(gp);
  const weight = Math.max(0, toNumber(item?.system?.weight?.value ?? 0));
  const weightBand = weight <= 0 ? "none" : (weight <= 1 ? "light" : (weight <= 10 ? "medium" : (weight <= 40 ? "heavy" : "bulk")));

  const keywordMap = new Map();
  for (const value of Array.isArray(po.keywords) ? po.keywords : []) {
    const text = String(value ?? "").trim();
    if (text) keywordMap.set(text.toLowerCase(), text);
  }
  for (const key of Array.from(keywordMap.keys())) {
    if (key.startsWith("tier.") || key.startsWith("value.v") || key.startsWith("price.") || key.startsWith("rarity.") || key.startsWith("weight.") || key.startsWith("source.class.") || key.startsWith("source.policy.") || key.startsWith("curation.") || key.startsWith("economy.") || key.startsWith("loot.variable") || key === "source.curated" || key === "treasure.gem" || key === "treasure.art" || key === "value.high" || key === "loot.excluded") keywordMap.delete(key);
  }

  const addTag = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return;
    keywordMap.set(text.toLowerCase(), text);
  };

  addTag("loot");
  addTag(`foundryType.${String(item.type ?? "item").trim().toLowerCase()}`);
  addTag(lootType);
  addTag(tier);
  addTag(valueBand);
  addTag(`price.${denomination}`);
  addTag(rarity ? `rarity.${rarity}` : "rarity.none");
  addTag(`weight.${weightBand}`);
  if (gp >= 5000) addTag("value.high");
  if (isMagic(item, rarity)) addTag("magic.bonus");
  if (String(item?.system?.attunement ?? "").trim().toLowerCase() === "required") addTag("attunement.required");
  const sourceTag = String(item?.flags?.core?.sourceId ?? "").includes("Compendium.dnd5e.items.") ? "source.dnd5e.items" : SOURCE_CURATED;
  addTag(sourceTag);

  const activities = item?.system?.activities && typeof item.system.activities === "object" ? Object.values(item.system.activities) : [];
  if (activities.length > 0) {
    addTag("automation.activity");
    addTag("automation.mode.usable");
    for (const entry of activities) {
      const activityType = String(entry?.type ?? "").trim().toLowerCase();
      const activationType = String(entry?.activation?.type ?? "").trim().toLowerCase();
      if (activityType) addTag(`automation.activity.${activityType}`);
      if (activationType) addTag(`activation.${activationType}`);
    }
  }

  const variableKind = detectVariableKind(item, po, new Set(keywordMap.keys()));
  if (variableKind) {
    addTag("loot.variable");
    addTag(`loot.variable.${variableKind}`);
    addTag(`treasure.${variableKind}`);
    addTag(`merchant.${variableKind}`);
    po.variableTreasureKind = variableKind;
    item.variableTreasureKind = variableKind;
  } else {
    delete po.variableTreasureKind;
    delete item.variableTreasureKind;
  }

  const categories = new Set((Array.isArray(po.merchantCategories) ? po.merchantCategories : []).map((entry) => String(entry ?? "").trim().toLowerCase()).filter(Boolean));
  for (const key of keywordMap.keys()) {
    if (!key.startsWith("merchant.")) continue;
    const category = key.slice("merchant.".length).trim().toLowerCase();
    if (category) categories.add(category);
  }
  const itemType = String(item.type ?? "").trim().toLowerCase();
  if (lootType.includes("weapon")) { categories.add("arms"); categories.add("weapon"); }
  if (lootType.includes("armor")) { categories.add("armor"); categories.add("equipment"); categories.add("outfitting"); }
  if (lootType.includes("equipment")) { categories.add("equipment"); categories.add("outfitting"); }
  if (lootType.includes("container")) { categories.add("container"); categories.add("storage"); }
  if (lootType.includes("tool")) { categories.add("tool"); categories.add("tools"); }
  if (lootType.includes("consumable")) categories.add("consumable");
  if (itemType === "spell") { categories.add("arcana"); categories.add("spell"); categories.add("magic"); }
  if (isMagic(item, rarity)) categories.add("magic");
  if (variableKind) { categories.add("treasure"); categories.add("luxury"); categories.add("loot"); }
  if (categories.size <= 0) categories.add(itemType || "loot");
  for (const category of categories) addTag(`merchant.${category}`);

  const sale = categories.has("salvage") ? "sale.salvage" : ((categories.has("luxury") || categories.has("treasure") || categories.has("gem") || categories.has("art")) ? "sale.luxury" : ((rarity === "legendary" || rarity === "very-rare" || gp >= 10000) ? "sale.specialty" : "sale.standard"));
  addTag(sale);

  const sourceClass = sourceTag === SOURCE_CURATED ? "curated" : "generated";
  addTag(`source.class.${sourceClass}`);
  addTag("source.policy.normal");
  if (sourceClass === "curated") addTag("source.curated");
  const curationScore = round(5 + (activities.length > 0 ? 1 : 0) + (String(item?.system?.description?.value ?? "").trim() ? 1 : 0) + (variableKind ? 1 : 0) + (sourceClass === "curated" ? 1 : 0), 2);
  addTag(`curation.${curationScore >= 8 ? "high" : "medium"}`);

  const lootEligible = po.lootEligible !== false;
  addTag(lootEligible ? "economy.sellable" : "economy.unsellable");
  if (!lootEligible) addTag("loot.excluded");

  po.keywords = Array.from(keywordMap.values()).sort((left, right) => left.localeCompare(right));
  po.lootType = lootType;
  po.tier = tier;
  po.rarityNormalized = rarity;
  po.gpValue = gp;
  po.valueBand = valueBand;
  po.priceDenomination = denomination;
  po.lootEligible = lootEligible;
  po.merchantCategories = Array.from(categories).sort((left, right) => left.localeCompare(right));
  po.saleLiquidity = sale;
  po.lootWeight = round(Math.max(0.05, Math.min(2.5, (rarity === "legendary" ? 0.16 : rarity === "very-rare" ? 0.28 : rarity === "rare" ? 0.48 : rarity === "uncommon" ? 0.9 : 1.2) * (gp <= 10 ? 1.1 : gp <= 250 ? 1 : gp <= 1000 ? 0.85 : gp <= 5000 ? 0.7 : 0.5) * (variableKind ? 1.2 : 1))), 3);
  po.maxRecommendedQty = rarity === "legendary" || rarity === "very-rare" || rarity === "rare" ? 1 : (variableKind ? (gp <= 10 ? 12 : gp <= 50 ? 8 : gp <= 250 ? 4 : 2) : (gp <= 1 ? 8 : gp <= 10 ? 6 : gp <= 50 ? 4 : 2));
  po.sellValueGp = round(gp * 0.5, 2);
  po.tagSchema = TAG_SCHEMA;
  po.taggedAt = nowIso;
  po.sourceClass = sourceClass;
  po.sourcePolicy = "normal";
  po.curationScore = curationScore;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.manifest)) throw new Error(`Manifest not found: ${args.manifest}`);

  const nowIso = new Date().toISOString();
  const items = readManifest(args.manifest);
  const existingIds = new Set(items.map((item) => String(item?._id ?? "").trim()).filter(Boolean));
  const existingIdentifiers = new Set(items.map((item) => String(item?.system?.identifier ?? "").trim().toLowerCase()).filter(Boolean));
  const seeded = [];

  for (const spec of NEW_TREASURE) {
    const candidate = createTreasureItem(spec);
    const id = String(candidate?._id ?? "").trim();
    const identifier = String(candidate?.system?.identifier ?? "").trim().toLowerCase();
    if (existingIds.has(id) || existingIdentifiers.has(identifier)) continue;
    items.push(candidate);
    existingIds.add(id);
    existingIdentifiers.add(identifier);
    seeded.push({ id, name: candidate.name });
  }

  let zeroPriceResolved = 0;
  let variableTagged = 0;
  for (const item of items) {
    const before = getGpValue(item);
    enrichItem(item, nowIso);
    if (before <= 0 && getGpValue(item) > 0) zeroPriceResolved += 1;
    if (String(item?.flags?.[MODULE_ID]?.variableTreasureKind ?? "").trim()) variableTagged += 1;
  }

  const summary = {
    generatedAt: nowIso,
    writeMode: Boolean(args.write),
    manifestPath: args.manifest,
    manifestItemCountAfter: items.length,
    seededItemCount: seeded.length,
    seededItems: seeded,
    variableTreasureTaggedCount: variableTagged,
    zeroPriceItemsResolved: zeroPriceResolved
  };

  if (args.write) writeManifest(args.manifest, items);
  if (String(args.report ?? "").trim()) {
    ensureDir(args.report);
    fs.writeFileSync(args.report, JSON.stringify(summary, null, 2), "utf8");
  }
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
