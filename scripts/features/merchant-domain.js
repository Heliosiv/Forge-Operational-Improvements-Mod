export const MERCHANT_SOURCE_TYPES = Object.freeze({
  COMPENDIUM_PACK: "compendium-pack",
  WORLD_FOLDER: "world-folder",
  WORLD_ITEMS: "world-items"
});

export const MERCHANT_SCARCITY_LEVELS = Object.freeze({
  DESPERATE: "desperate",
  VERY_SCARCE: "very-scarce",
  SCARCE: "scarce",
  THIN: "thin",
  MODEST: "modest",
  NORMAL: "normal",
  STOCKED: "stocked",
  PLENTIFUL: "plentiful",
  ABUNDANT: "abundant",
  SURPLUS: "surplus"
});

export const MERCHANT_SCARCITY_PROFILES = Object.freeze([
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.DESPERATE, label: "1 - Desperate", multiplier: 0.25 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.VERY_SCARCE, label: "2 - Very Scarce", multiplier: 0.4 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.SCARCE, label: "3 - Scarce", multiplier: 0.55 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.THIN, label: "4 - Thin", multiplier: 0.7 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.MODEST, label: "5 - Modest", multiplier: 0.85 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.NORMAL, label: "6 - Normal", multiplier: 1 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.STOCKED, label: "7 - Stocked", multiplier: 1.15 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.PLENTIFUL, label: "8 - Plentiful", multiplier: 1.3 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.ABUNDANT, label: "9 - Abundant", multiplier: 1.45 }),
  Object.freeze({ value: MERCHANT_SCARCITY_LEVELS.SURPLUS, label: "10 - Surplus", multiplier: 1.6 })
]);

export const MERCHANT_ALLOWED_ITEM_TYPES = new Set([
  "weapon",
  "equipment",
  "consumable",
  "loot",
  "tool",
  "backpack",
  "armor",
  "ammunition",
  "trinket",
  "spell"
]);

export const MERCHANT_ALLOWED_ITEM_TYPE_LIST = Object.freeze(Array.from(MERCHANT_ALLOWED_ITEM_TYPES));
export const MERCHANT_EDITOR_MAX_CURATED_ITEMS = 200;
export const MERCHANT_EDITOR_CANDIDATE_LIMIT = 400;
export const MERCHANT_PREVIEW_ITEM_LIMIT = 240;
export const MERCHANT_ACCESS_LOG_LIMIT = 120;
export const MERCHANT_ACCESS_LOG_THROTTLE_MS = 45000;

const MERCHANT_MAX_MARKUP_PERCENT = 1000;
const MERCHANT_MAX_ITEM_COUNT = 100;
const MERCHANT_MAX_TAG_COUNT = 40;
const MERCHANT_MAX_TAG_LENGTH = 80;
const MERCHANT_MAX_PACK_ID_COUNT = 100;
const MERCHANT_MAX_PACK_ID_LENGTH = 200;
const MERCHANT_MAX_CURATED_UUID_LENGTH = 260;
const MERCHANT_MAX_CITY_COUNT = 200;
const MERCHANT_MAX_CITY_LENGTH = 120;
const MERCHANT_MAX_KEYWORD_COUNT = 60;
const MERCHANT_MAX_KEYWORD_LENGTH = 80;
const MERCHANT_MAX_DUPLICATE_CHANCE = 100;
const MERCHANT_MAX_STACK_SIZE = 25;
const MERCHANT_MAX_RARITY_WEIGHT = 100;
const MERCHANT_MAX_GENERATED_ITEM_COUNT = 250;
const MERCHANT_RARITY_BUCKETS = Object.freeze(["common", "uncommon", "rare", "very-rare", "legendary"]);
const MERCHANT_DEFAULT_RARITY_WEIGHTS = Object.freeze({
  common: 100,
  uncommon: 45,
  rare: 16,
  "very-rare": 5,
  legendary: 1
});

export const MERCHANT_EDITOR_RACE_OPTIONS = Object.freeze([
  "Aarakocra",
  "Aasimar",
  "Astral Elf",
  "Autognome",
  "Bugbear",
  "Centaur",
  "Changeling",
  "Deep Gnome",
  "Dragonborn",
  "Dwarf",
  "Duergar",
  "Eladrin",
  "Elf",
  "Fairy",
  "Firbolg",
  "Genasi",
  "Giff",
  "Githyanki",
  "Githzerai",
  "Gnome",
  "Goblin",
  "Goliath",
  "Half-Elf",
  "Half-Orc",
  "Halfling",
  "Harengon",
  "Hobgoblin",
  "Human",
  "Kalashtar",
  "Kenku",
  "Kobold",
  "Leonin",
  "Lizardfolk",
  "Loxodon",
  "Minotaur",
  "Orc",
  "Owlin",
  "Plasmoid",
  "Satyr",
  "Sea Elf",
  "Shadar-kai",
  "Shifter",
  "Tabaxi",
  "Thri-kreen",
  "Tiefling",
  "Tortle",
  "Triton",
  "Vedalken",
  "Verdan",
  "Warforged",
  "Yuan-ti"
]);

export const MERCHANT_RANDOM_TITLE_OPTIONS = Object.freeze([
  "Quartermaster",
  "Guild Provisioner",
  "Market Broker",
  "Traveling Trader",
  "Arcane Supplier",
  "Outfitter",
  "Arms Dealer",
  "Curio Merchant",
  "General Goods Keeper",
  "Supply Factor"
]);

export const MERCHANT_RANDOM_NAME_POOLS = Object.freeze({
  default: Object.freeze({
    first: Object.freeze(["Arin", "Vera", "Bram", "Sel", "Cato", "Mira", "Tobin", "Lysa", "Renn", "Kara"]),
    last: Object.freeze(["Stone", "Willow", "Mire", "Vale", "Dusk", "Rowe", "Hollow", "Cross", "Thorn", "Morn"])
  }),
  celestial: Object.freeze({
    first: Object.freeze(["Aurel", "Serin", "Ilyon", "Mirael", "Cael", "Vespera", "Liora", "Thamiel"]),
    last: Object.freeze(["Dawnward", "Halo", "Sunspire", "Brightwing", "Mercy", "Silverlight"])
  }),
  elf: Object.freeze({
    first: Object.freeze(["Aelar", "Sylra", "Faelar", "Myri", "Thalan", "Leth", "Ilyra", "Vaeril"]),
    last: Object.freeze(["Moonwhisper", "Dawnsong", "Starleaf", "Nightbreeze", "Silvershade", "Brightbrook"])
  }),
  fey: Object.freeze({
    first: Object.freeze(["Briar", "Nim", "Puck", "Sable", "Lyri", "Hallow", "Moth", "Petal"]),
    last: Object.freeze(["Glimmerstep", "Thistledown", "Moonpetal", "Dewchime", "Hazelgleam", "Wisp"])
  }),
  dwarf: Object.freeze({
    first: Object.freeze(["Balin", "Dagna", "Korin", "Helja", "Rurik", "Sannl", "Torra", "Brom"]),
    last: Object.freeze(["Ironvein", "Stonehelm", "Deepdelver", "Copperhand", "Hammerfall", "Gravelbeard"])
  }),
  giantkin: Object.freeze({
    first: Object.freeze(["Runa", "Tharn", "Bjor", "Kelda", "Skori", "Igrim", "Vauna", "Morn"]),
    last: Object.freeze(["Skybreaker", "Highridge", "Stonepeak", "Stormstep", "Frostmantle", "Boulderborn"])
  }),
  halfling: Object.freeze({
    first: Object.freeze(["Pip", "Merry", "Nora", "Bix", "Rosco", "Tessa", "Ludo", "Pella"]),
    last: Object.freeze(["Goodbarrel", "Underbough", "Tooke", "Greenbottle", "Hearthglen", "Appletoe"])
  }),
  gnome: Object.freeze({
    first: Object.freeze(["Nix", "Wren", "Fizz", "Bibble", "Tink", "Merri", "Zook", "Pala"]),
    last: Object.freeze(["Gearwhistle", "Coppercoil", "Brightfuse", "Mosswire", "Clockstep", "Nimblethumb"])
  }),
  dragonborn: Object.freeze({
    first: Object.freeze(["Arjhan", "Balasar", "Rhogar", "Sora", "Mishann", "Kriv", "Torinn", "Nala"]),
    last: Object.freeze(["Flamecrest", "Ashfang", "Bronzescale", "Stormclaw", "Embermaw", "Ironbreath"])
  }),
  orc: Object.freeze({
    first: Object.freeze(["Gor", "Ugra", "Thokk", "Maka", "Brug", "Kura", "Ront", "Vola"]),
    last: Object.freeze(["Skullcleaver", "Ashhide", "Ironjaw", "Redtusk", "Stonefist", "Warbrand"])
  }),
  goblin: Object.freeze({
    first: Object.freeze(["Snik", "Rikk", "Vix", "Grib", "Mog", "Tippa", "Krek", "Zib"]),
    last: Object.freeze(["Quickfingers", "Knifetooth", "Ratcatch", "Smokeeye", "Rustblade", "Nimblefoot"])
  }),
  feline: Object.freeze({
    first: Object.freeze(["Zahara", "Mira", "Rasik", "Nemeh", "Khepri", "Taru", "Suri", "Bast"]),
    last: Object.freeze(["Whisperpaw", "Sunstalk", "Duneclaw", "Nightstride", "Goldmane", "Softstep"])
  }),
  avian: Object.freeze({
    first: Object.freeze(["Kree", "Talon", "Ari", "Skree", "Vael", "Quill", "Irix", "Rook"]),
    last: Object.freeze(["Windcry", "Cloudwing", "Highperch", "Dawnfeather", "Stormbeak", "Skycall"])
  }),
  reptile: Object.freeze({
    first: Object.freeze(["Sszar", "Ixtli", "Keth", "Rassk", "Tlaqa", "Vesh", "Nizik", "Qira"]),
    last: Object.freeze(["Scalebinder", "Marshstep", "Sunscale", "Coilfang", "Mudcloak", "Jadecrest"])
  }),
  aquatic: Object.freeze({
    first: Object.freeze(["Neris", "Thal", "Mirae", "Aster", "Coral", "Varyn", "Lir", "Sere"]),
    last: Object.freeze(["Wavecaller", "Tideborn", "Pearlfin", "Deepcurrent", "Seaglass", "Brineheart"])
  }),
  elemental: Object.freeze({
    first: Object.freeze(["Ashar", "Zeph", "Iona", "Cairn", "Ember", "Mistral", "Pyra", "Rime"]),
    last: Object.freeze(["Stormspark", "Duststep", "Emberveil", "Stonepulse", "Mistweave", "Flarewind"])
  }),
  tiefling: Object.freeze({
    first: Object.freeze(["Ash", "Nyx", "Mordai", "Riven", "Cinder", "Zara", "Vex", "Iris"]),
    last: Object.freeze(["Nightbrand", "Embervein", "Blackthorn", "Hellspark", "Redglass", "Dreadmere"])
  }),
  construct: Object.freeze({
    first: Object.freeze(["Unit K-7", "Brassline", "Vector", "Iris-9", "Cog", "Bastion", "Lattice", "Forge"]),
    last: Object.freeze(["of the Foundry", "Steelframe", "Gearheart", "Ironline", "Clockwork", "Coppercore"])
  }),
  aberrant: Object.freeze({
    first: Object.freeze(["Xil", "Vriss", "Thuun", "Aru", "Nex", "Iraxa", "Qel", "Siv"]),
    last: Object.freeze(["Mindwake", "Starseam", "Voidtide", "Dreamcoil", "Fracture", "Whisperdepth"])
  })
});

const MERCHANT_RANDOM_NAME_PARTS_FLAT = Object.freeze({
  first: Object.freeze(
    Object.values(MERCHANT_RANDOM_NAME_POOLS)
      .flatMap((pool) => Array.isArray(pool?.first) ? pool.first : [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .filter((value, index, rows) => rows.indexOf(value) === index)
  ),
  last: Object.freeze(
    Object.values(MERCHANT_RANDOM_NAME_POOLS)
      .flatMap((pool) => Array.isArray(pool?.last) ? pool.last : [])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .filter((value, index, rows) => rows.indexOf(value) === index)
  )
});

const MERCHANT_OFFER_TAG_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "all",
    label: "All",
    itemTypes: Object.freeze([...MERCHANT_ALLOWED_ITEM_TYPE_LIST])
  }),
  Object.freeze({
    id: "weapons",
    label: "Weapons",
    itemTypes: Object.freeze(["weapon", "ammunition"])
  }),
  Object.freeze({
    id: "armor",
    label: "Armor",
    itemTypes: Object.freeze(["armor"])
  }),
  Object.freeze({
    id: "consumables",
    label: "Consumables",
    itemTypes: Object.freeze(["consumable"])
  })
]);

export const MERCHANT_DEFAULTS = Object.freeze({
  settlement: "",
  pricing: Object.freeze({
    buyMarkup: 1,
    sellRate: 0.5,
    sellEnabled: true,
    cashOnHandGp: 500,
    buybackAllowedTypes: Object.freeze([...MERCHANT_ALLOWED_ITEM_TYPE_LIST]),
    barterEnabled: true,
    barterDc: 15,
    barterAbility: "cha"
  }),
  stock: Object.freeze({
    sourceType: MERCHANT_SOURCE_TYPES.WORLD_ITEMS,
    sourceRef: "",
    sourcePackIds: Object.freeze([]),
    includeTags: [],
    excludeTags: [],
    keywordInclude: [],
    keywordExclude: [],
    allowedTypes: Object.freeze([...MERCHANT_ALLOWED_ITEM_TYPE_LIST]),
    curatedItemUuids: Object.freeze([]),
    maxItems: 20,
    targetValueGp: 0,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
    duplicateChance: 25,
    maxStackSize: 20,
    rarityWeights: Object.freeze({ ...MERCHANT_DEFAULT_RARITY_WEIGHTS })
  })
});

export const MERCHANT_STARTER_BLUEPRINTS = Object.freeze([
  Object.freeze({
    id: "starter-sundries",
    name: "Sundries",
    title: "General Goods",
    race: "Human",
    img: "icons/svg/item-bag.svg",
    folderAliases: Object.freeze(["sundries", "general goods", "general store"]),
    allowedTypes: Object.freeze(["equipment", "consumable", "loot", "trinket", "backpack"]),
    markupPercent: 20,
    maxItems: 18
  }),
  Object.freeze({
    id: "starter-tools",
    name: "Tools",
    title: "Implements and Kits",
    race: "Dwarf",
    img: "icons/svg/hammer.svg",
    folderAliases: Object.freeze(["tools", "toolkits", "kits"]),
    allowedTypes: Object.freeze(["tool", "equipment", "backpack"]),
    markupPercent: 18,
    maxItems: 16
  }),
  Object.freeze({
    id: "starter-armour",
    name: "Armour",
    title: "Shields and Harness",
    race: "Goliath",
    img: "icons/svg/shield.svg",
    folderAliases: Object.freeze(["armour", "armor"]),
    allowedTypes: Object.freeze(["armor"]),
    markupPercent: 25,
    maxItems: 14
  }),
  Object.freeze({
    id: "starter-weapons",
    name: "Weapons",
    title: "Arms and Ammunition",
    race: "Orc",
    img: "icons/svg/sword.svg",
    folderAliases: Object.freeze(["weapons", "arms", "arsenal"]),
    allowedTypes: Object.freeze(["weapon", "ammunition"]),
    markupPercent: 25,
    maxItems: 16
  }),
  Object.freeze({
    id: "starter-spells",
    name: "Spells",
    title: "Scrolls and Arcana",
    race: "Elf",
    img: "icons/svg/book.svg",
    folderAliases: Object.freeze(["spells", "scrolls", "magic"]),
    allowedTypes: Object.freeze(["spell", "consumable"]),
    markupPercent: 30,
    maxItems: 12
  })
]);

function clampMerchantMarkupPercent(value, fallback = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(0, Math.min(MERCHANT_MAX_MARKUP_PERCENT, Number(fallback) || 0));
  return Math.max(0, Math.min(MERCHANT_MAX_MARKUP_PERCENT, Number(raw.toFixed(2))));
}

function clampMerchantItemCount(value, fallback = MERCHANT_DEFAULTS.stock.maxItems) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(Number(fallback) || 1)));
  return Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(raw)));
}

function clampMerchantDuplicateChance(value, fallback = MERCHANT_DEFAULTS.stock.duplicateChance) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(0, Math.min(MERCHANT_MAX_DUPLICATE_CHANCE, Math.floor(Number(fallback) || 0)));
  return Math.max(0, Math.min(MERCHANT_MAX_DUPLICATE_CHANCE, Math.floor(raw)));
}

function clampMerchantMaxStackSize(value, fallback = MERCHANT_DEFAULTS.stock.maxStackSize) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(1, Math.min(MERCHANT_MAX_STACK_SIZE, Math.floor(Number(fallback) || 1)));
  return Math.max(1, Math.min(MERCHANT_MAX_STACK_SIZE, Math.floor(raw)));
}

export function normalizeMerchantTagList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, rows) => entry.length > 0 && entry.length <= MERCHANT_MAX_TAG_LENGTH && rows.indexOf(entry) === index)
    .slice(0, MERCHANT_MAX_TAG_COUNT);
}

export function normalizeMerchantKeywordList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, rows) => entry.length > 0 && entry.length <= MERCHANT_MAX_KEYWORD_LENGTH && rows.indexOf(entry) === index)
    .slice(0, MERCHANT_MAX_KEYWORD_COUNT);
}

export function normalizeMerchantRarity(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (["artifact", "artifacts", "artefact", "artefacts", "superrare", "super-rare", "super rare"].includes(raw)) return "very-rare";
  if (["veryrare", "very rare", "very_rare", "very-rare"].includes(raw)) return "very-rare";
  if (["legend", "legendary"].includes(raw)) return "legendary";
  if (["rare"].includes(raw)) return "rare";
  if (["uncommon"].includes(raw)) return "uncommon";
  if (["common"].includes(raw)) return "common";
  return "";
}

export function getMerchantRarityBucket(value) {
  return normalizeMerchantRarity(value) || "common";
}

export function normalizeMerchantRarityWeights(raw = {}, fallback = MERCHANT_DEFAULT_RARITY_WEIGHTS) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackWeights = fallback && typeof fallback === "object" ? fallback : MERCHANT_DEFAULT_RARITY_WEIGHTS;
  const normalized = {};
  for (const bucket of MERCHANT_RARITY_BUCKETS) {
    const sourceValue = bucket === "very-rare" ? (source[bucket] ?? source.veryRare) : source[bucket];
    const fallbackValue = bucket === "very-rare"
      ? (fallbackWeights[bucket] ?? fallbackWeights.veryRare)
      : fallbackWeights[bucket];
    const parsed = Number(sourceValue ?? fallbackValue ?? MERCHANT_DEFAULT_RARITY_WEIGHTS[bucket] ?? 1);
    normalized[bucket] = Number.isFinite(parsed)
      ? Math.max(0, Math.min(MERCHANT_MAX_RARITY_WEIGHT, Number(parsed.toFixed(2))))
      : Number(MERCHANT_DEFAULT_RARITY_WEIGHTS[bucket] ?? 1);
  }
  return normalized;
}

export function normalizeMerchantCityList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, rows) => entry.length > 0 && entry.length <= MERCHANT_MAX_CITY_LENGTH && rows.indexOf(entry) === index)
    .slice(0, MERCHANT_MAX_CITY_COUNT);
}

export function parseMerchantCityListInput(value = "") {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return normalizeMerchantCityList(text.split(/[\n,;]+/));
}

export function formatMerchantCityListInput(values = []) {
  return normalizeMerchantCityList(values).join(", ");
}

export function normalizeMerchantSourcePackIds(values = [], fallbackSourceRef = "") {
  const rows = [];
  if (Array.isArray(values)) rows.push(...values);
  else if (typeof values === "string") rows.push(...values.split(/[\n,;]+/));
  if (String(fallbackSourceRef ?? "").trim()) rows.push(String(fallbackSourceRef ?? "").trim());
  return rows
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, all) => entry.length > 0 && entry.length <= MERCHANT_MAX_PACK_ID_LENGTH && all.indexOf(entry) === index)
    .slice(0, MERCHANT_MAX_PACK_ID_COUNT);
}

export function normalizeMerchantAllowedItemTypes(values = []) {
  const source = Array.isArray(values) ? values : [];
  const normalized = source
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, all) => MERCHANT_ALLOWED_ITEM_TYPES.has(entry) && all.indexOf(entry) === index);
  if (normalized.length > 0) return normalized;
  return [...MERCHANT_ALLOWED_ITEM_TYPE_LIST];
}

export function normalizeMerchantCuratedItemUuids(values = []) {
  const source = Array.isArray(values) ? values : [];
  return source
    .map((entry) => String(entry ?? "").trim())
    .filter((entry, index, all) => entry.length > 0 && entry.length <= MERCHANT_MAX_CURATED_UUID_LENGTH && all.indexOf(entry) === index)
    .slice(0, MERCHANT_EDITOR_MAX_CURATED_ITEMS);
}

export function parseMerchantUuidListInput(value) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return normalizeMerchantCuratedItemUuids(text.split(/[\n,;]+/));
}

export function formatMerchantUuidListInput(values = []) {
  return normalizeMerchantCuratedItemUuids(values).join("\n");
}

export function normalizeMerchantSourceType(value) {
  const sourceType = String(value ?? "").trim().toLowerCase();
  if (sourceType === MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK) return MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK;
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_FOLDER) return MERCHANT_SOURCE_TYPES.WORLD_FOLDER;
  return MERCHANT_SOURCE_TYPES.WORLD_ITEMS;
}

export function normalizeMerchantScarcity(value) {
  const scarcity = String(value ?? "").trim().toLowerCase();
  if (MERCHANT_SCARCITY_PROFILES.some((entry) => entry.value === scarcity)) return scarcity;
  if (scarcity === "veryscarce") return MERCHANT_SCARCITY_LEVELS.VERY_SCARCE;
  if (scarcity === "plenty") return MERCHANT_SCARCITY_LEVELS.PLENTIFUL;
  if (scarcity === "overflowing") return MERCHANT_SCARCITY_LEVELS.SURPLUS;
  return MERCHANT_SCARCITY_LEVELS.NORMAL;
}

export function getMerchantScarcityProfile(scarcityInput = MERCHANT_SCARCITY_LEVELS.NORMAL) {
  const scarcity = normalizeMerchantScarcity(scarcityInput);
  return MERCHANT_SCARCITY_PROFILES.find((entry) => entry.value === scarcity)
    ?? MERCHANT_SCARCITY_PROFILES.find((entry) => entry.value === MERCHANT_SCARCITY_LEVELS.NORMAL)
    ?? { value: MERCHANT_SCARCITY_LEVELS.NORMAL, label: "6 - Normal", multiplier: 1 };
}

export function normalizeMerchantRace(value) {
  return String(value ?? "").trim().slice(0, 60);
}

export function getMerchantRaceKey(value) {
  const race = normalizeMerchantRace(value).toLowerCase();
  if (!race) return "default";
  if (race.includes("aasimar")) return "celestial";
  if (race.includes("triton") || race.includes("sea elf") || race.includes("vedalken")) return "aquatic";
  if (race.includes("eladrin") || race.includes("fairy") || race.includes("satyr") || race.includes("harengon") || race.includes("centaur")) return "fey";
  if (race.includes("elf") || race.includes("shadar")) return "elf";
  if (race.includes("dwarf") || race.includes("duergar")) return "dwarf";
  if (race.includes("goliath") || race.includes("firbolg") || race.includes("giff") || race.includes("loxodon")) return "giantkin";
  if (race.includes("halfling")) return "halfling";
  if (race.includes("gnome") || race.includes("autognome") || race.includes("verdan")) return "gnome";
  if (race.includes("dragonborn")) return "dragonborn";
  if (race.includes("tiefling")) return "tiefling";
  if (race.includes("orc")) return "orc";
  if (race.includes("bugbear") || race.includes("goblin") || race.includes("hobgoblin")) return "goblin";
  if (race.includes("tabaxi") || race.includes("leonin")) return "feline";
  if (race.includes("aarakocra") || race.includes("kenku") || race.includes("owlin")) return "avian";
  if (race.includes("lizardfolk") || race.includes("kobold") || race.includes("yuan-ti") || race.includes("tortle")) return "reptile";
  if (race.includes("genasi")) return "elemental";
  if (race.includes("warforged")) return "construct";
  if (race.includes("plasmoid") || race.includes("thri-kreen") || race.includes("gith") || race.includes("kalashtar") || race.includes("changeling")) return "aberrant";
  return "default";
}

export function getMerchantEditorRaceOptions(selectedRaceInput = "") {
  const selectedRace = normalizeMerchantRace(selectedRaceInput);
  const selectedKey = selectedRace.toLowerCase();
  const options = MERCHANT_EDITOR_RACE_OPTIONS.map((label) => {
    const race = normalizeMerchantRace(label);
    return {
      value: race,
      label: race,
      selected: race.toLowerCase() === selectedKey
    };
  });
  if (selectedRace && !options.some((entry) => entry.value.toLowerCase() === selectedKey)) {
    options.push({
      value: selectedRace,
      label: `${selectedRace} (Custom)`,
      selected: true
    });
  }
  return options;
}

export function pickRandomMerchantNamePart(values = [], fallback = "") {
  if (!Array.isArray(values) || values.length <= 0) return fallback;
  const index = Math.floor(Math.random() * values.length);
  return String(values[index] ?? fallback).trim() || fallback;
}

export function pickRandomMerchantRace(fallback = "Human") {
  if (MERCHANT_EDITOR_RACE_OPTIONS.length <= 0) return fallback;
  return pickRandomMerchantNamePart(MERCHANT_EDITOR_RACE_OPTIONS, fallback);
}

export function pickRandomMerchantTitle(fallback = "Merchant") {
  return pickRandomMerchantNamePart(MERCHANT_RANDOM_TITLE_OPTIONS, fallback);
}

export function generateRandomMerchantName(raceInput = "") {
  const raceKey = getMerchantRaceKey(raceInput);
  const pool = MERCHANT_RANDOM_NAME_POOLS[raceKey] ?? MERCHANT_RANDOM_NAME_POOLS.default;
  const first = pickRandomMerchantNamePart(pool?.first, "Merchant");
  const last = pickRandomMerchantNamePart(pool?.last, "Trader");
  return `${first} ${last}`.trim();
}

export function generateRandomMerchantNameUnbound() {
  const first = pickRandomMerchantNamePart(MERCHANT_RANDOM_NAME_PARTS_FLAT.first, "Merchant");
  const last = pickRandomMerchantNamePart(MERCHANT_RANDOM_NAME_PARTS_FLAT.last, "Trader");
  return `${first} ${last}`.trim();
}

export function getMerchantEditorSourceTypeOptions(selected = MERCHANT_SOURCE_TYPES.WORLD_FOLDER) {
  const valueRaw = normalizeMerchantSourceType(selected);
  const value = valueRaw === MERCHANT_SOURCE_TYPES.WORLD_ITEMS ? MERCHANT_SOURCE_TYPES.WORLD_FOLDER : valueRaw;
  return [
    {
      value: MERCHANT_SOURCE_TYPES.WORLD_FOLDER,
      label: "World Item Folder",
      selected: value === MERCHANT_SOURCE_TYPES.WORLD_FOLDER
    },
    {
      value: MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK,
      label: "Compendium Pack",
      selected: value === MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK
    }
  ];
}

export function normalizeMerchantFolderAlias(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findMerchantFolderByAliases(aliases = [], folders = []) {
  const aliasRows = (Array.isArray(aliases) ? aliases : [])
    .map((entry) => normalizeMerchantFolderAlias(entry))
    .filter(Boolean);
  if (aliasRows.length <= 0) return { id: "", name: "" };
  const folderRows = (Array.isArray(folders) ? folders : [])
    .map((folder) => {
      const type = String(folder?.type ?? folder?.documentName ?? "").trim().toLowerCase();
      return {
        id: String(folder?.id ?? "").trim(),
        name: String(folder?.name ?? "").trim(),
        key: normalizeMerchantFolderAlias(folder?.name ?? ""),
        type
      };
    })
    .filter((entry) => entry.id && entry.key && entry.type === "item");
  if (folderRows.length <= 0) return { id: "", name: "" };
  for (const alias of aliasRows) {
    const exact = folderRows.find((entry) => entry.key === alias);
    if (exact) return { id: exact.id, name: exact.name };
  }
  for (const alias of aliasRows) {
    const fuzzy = folderRows.find((entry) => entry.key.includes(alias) || alias.includes(entry.key));
    if (fuzzy) return { id: fuzzy.id, name: fuzzy.name };
  }
  return { id: "", name: "" };
}

export function buildStarterMerchantPatch(blueprint = {}, index = 0, options = {}) {
  const resolver = typeof options?.resolveFolderByAliases === "function"
    ? options.resolveFolderByAliases
    : () => ({ id: "", name: "" });
  const sourceFolder = resolver(blueprint?.folderAliases ?? []);
  const id = String(blueprint?.id ?? `starter-merchant-${index + 1}`).trim() || `starter-merchant-${index + 1}`;
  const name = String(blueprint?.name ?? `Starter Merchant ${index + 1}`).trim() || `Starter Merchant ${index + 1}`;
  const title = String(blueprint?.title ?? "").trim();
  const race = normalizeMerchantRace(blueprint?.race ?? "Human");
  const img = String(blueprint?.img ?? "icons/svg/item-bag.svg").trim() || "icons/svg/item-bag.svg";
  const markupPercent = clampMerchantMarkupPercent(blueprint?.markupPercent, 20);
  const buyMarkup = Number((markupPercent / 100).toFixed(2));
  const maxItems = clampMerchantItemCount(blueprint?.maxItems, MERCHANT_DEFAULTS.stock.maxItems);
  return {
    id,
    name,
    title,
    race,
    img,
    settlement: "",
    accessMode: "all",
    isHidden: false,
    requiresContract: false,
    contractKey: "",
    socialGateEnabled: false,
    minSocialScore: 0,
    pricing: {
      buyMarkup,
      sellRate: MERCHANT_DEFAULTS.pricing.sellRate,
      sellEnabled: MERCHANT_DEFAULTS.pricing.sellEnabled,
      cashOnHandGp: MERCHANT_DEFAULTS.pricing.cashOnHandGp,
      buybackAllowedTypes: normalizeMerchantAllowedItemTypes(MERCHANT_DEFAULTS.pricing.buybackAllowedTypes),
      barterEnabled: MERCHANT_DEFAULTS.pricing.barterEnabled,
      barterDc: MERCHANT_DEFAULTS.pricing.barterDc,
      barterAbility: String(MERCHANT_DEFAULTS.pricing.barterAbility ?? "cha")
    },
    stock: {
      sourceType: MERCHANT_SOURCE_TYPES.WORLD_FOLDER,
      sourceRef: String(sourceFolder?.id ?? "").trim(),
      sourcePackIds: [],
      includeTags: [],
      excludeTags: [],
      keywordInclude: [],
      keywordExclude: [],
      allowedTypes: normalizeMerchantAllowedItemTypes(blueprint?.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST),
      curatedItemUuids: [],
      maxItems,
      targetValueGp: 0,
      scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
      duplicateChance: MERCHANT_DEFAULTS.stock.duplicateChance,
      maxStackSize: MERCHANT_DEFAULTS.stock.maxStackSize,
      rarityWeights: normalizeMerchantRarityWeights(MERCHANT_DEFAULTS.stock.rarityWeights)
    },
    actorId: ""
  };
}

export function buildMerchantDefinitionPatchFromEditorForm(formValues = {}) {
  const source = formValues && typeof formValues === "object" ? formValues : {};
  const existingStock = source?.existingStock && typeof source.existingStock === "object"
    ? source.existingStock
    : {};
  const existingPricing = source?.existingPricing && typeof source.existingPricing === "object"
    ? source.existingPricing
    : {};
  const markupPercentRaw = Number(
    source?.markupPercent
    ?? (Number(source?.buyMarkup ?? MERCHANT_DEFAULTS.pricing.buyMarkup) * 100)
  );
  const markupPercent = clampMerchantMarkupPercent(markupPercentRaw, Number(MERCHANT_DEFAULTS.pricing.buyMarkup) * 100);
  const buyMarkup = Number((markupPercent / 100).toFixed(2));
  const sellRatePercentRaw = Number(
    source?.sellRatePercent
    ?? source?.buybackRatePercent
    ?? (Number(source?.sellRate ?? existingPricing?.sellRate ?? MERCHANT_DEFAULTS.pricing.sellRate) * 100)
  );
  const sellRate = Number.isFinite(sellRatePercentRaw)
    ? Math.max(0, Math.min(10, Number((sellRatePercentRaw / 100).toFixed(2))))
    : Number(MERCHANT_DEFAULTS.pricing.sellRate);
  const sellEnabled = source?.sellEnabled === undefined
    ? Boolean(existingPricing?.sellEnabled ?? MERCHANT_DEFAULTS.pricing.sellEnabled)
    : Boolean(source?.sellEnabled);
  const cashOnHandGpRaw = Number(source?.cashOnHandGp ?? existingPricing?.cashOnHandGp ?? MERCHANT_DEFAULTS.pricing.cashOnHandGp);
  const cashOnHandGp = Number.isFinite(cashOnHandGpRaw)
    ? Math.max(0, Math.min(1000000, Number(cashOnHandGpRaw.toFixed(2))))
    : Number(MERCHANT_DEFAULTS.pricing.cashOnHandGp);
  const buybackAllowedTypes = normalizeMerchantAllowedItemTypes(
    source?.buybackAllowedTypes
    ?? existingPricing?.buybackAllowedTypes
    ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST
  );
  const barterEnabled = source?.barterEnabled === undefined
    ? Boolean(existingPricing?.barterEnabled ?? MERCHANT_DEFAULTS.pricing.barterEnabled)
    : Boolean(source?.barterEnabled);
  const barterDcRaw = Number(source?.barterDc ?? existingPricing?.barterDc ?? MERCHANT_DEFAULTS.pricing.barterDc);
  const barterDc = Number.isFinite(barterDcRaw)
    ? Math.max(1, Math.min(40, Math.floor(barterDcRaw)))
    : Number(MERCHANT_DEFAULTS.pricing.barterDc);
  const barterAbilityRaw = String(
    source?.barterAbility
    ?? existingPricing?.barterAbility
    ?? MERCHANT_DEFAULTS.pricing.barterAbility
  ).trim().toLowerCase();
  const barterAbility = ["str", "dex", "con", "int", "wis", "cha"].includes(barterAbilityRaw)
    ? barterAbilityRaw
    : String(MERCHANT_DEFAULTS.pricing.barterAbility ?? "cha");
  const accessModeRaw = String(source?.accessMode ?? source?.access?.mode ?? "all").trim().toLowerCase();
  const accessMode = accessModeRaw === "assigned" ? "assigned" : "all";
  const stockCount = clampMerchantItemCount(
    source?.stockCount ?? source?.maxItems ?? existingStock?.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems,
    MERCHANT_DEFAULTS.stock.maxItems
  );
  const sourceTypeRaw = normalizeMerchantSourceType(source?.sourceType ?? MERCHANT_SOURCE_TYPES.WORLD_FOLDER);
  const sourceType = sourceTypeRaw === MERCHANT_SOURCE_TYPES.WORLD_ITEMS
    ? MERCHANT_SOURCE_TYPES.WORLD_FOLDER
    : sourceTypeRaw;
  const sourceRef = String(source?.sourceRef ?? "").trim();
  const sourceRefs = sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS
    ? []
    : normalizeMerchantSourcePackIds(
      source?.sourceRefs ?? source?.sourcePackIds ?? [],
      sourceRef
    );
  const resolvedSourceRef = sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS
    ? ""
    : String(sourceRefs[0] ?? sourceRef).trim();
  const sourcePackIds = sourceRefs;
  const allowedTypes = normalizeMerchantAllowedItemTypes(source?.allowedTypes ?? existingStock?.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST);
  const includeTags = normalizeMerchantTagList(source?.includeTags ?? existingStock?.includeTags ?? []);
  const excludeTags = normalizeMerchantTagList(source?.excludeTags ?? existingStock?.excludeTags ?? []);
  const keywordInclude = normalizeMerchantKeywordList(source?.keywordInclude ?? existingStock?.keywordInclude ?? []);
  const keywordExclude = normalizeMerchantKeywordList(source?.keywordExclude ?? existingStock?.keywordExclude ?? []);
  const targetValueGpRaw = Number(source?.targetValueGp ?? existingStock?.targetValueGp ?? 0);
  const targetValueGp = Number.isFinite(targetValueGpRaw) ? Math.max(0, Number(targetValueGpRaw.toFixed(2))) : 0;
  const scarcity = normalizeMerchantScarcity(source?.scarcity ?? existingStock?.scarcity ?? MERCHANT_SCARCITY_LEVELS.NORMAL);
  const duplicateChance = clampMerchantDuplicateChance(
    MERCHANT_DEFAULTS.stock.duplicateChance,
    MERCHANT_DEFAULTS.stock.duplicateChance
  );
  const maxStackSize = clampMerchantMaxStackSize(
    MERCHANT_DEFAULTS.stock.maxStackSize,
    MERCHANT_DEFAULTS.stock.maxStackSize
  );
  const rarityWeights = normalizeMerchantRarityWeights(
    source?.rarityWeights ?? existingStock?.rarityWeights,
    MERCHANT_DEFAULTS.stock.rarityWeights
  );
  return {
    id: String(source?.id ?? "").trim(),
    name: String(source?.name ?? "").trim(),
    title: String(source?.title ?? "").trim(),
    race: normalizeMerchantRace(source?.race ?? ""),
    img: String(source?.img ?? "").trim(),
    settlement: String(source?.settlement ?? "").trim(),
    accessMode,
    isHidden: false,
    requiresContract: false,
    contractKey: "",
    socialGateEnabled: false,
    minSocialScore: 0,
    pricing: {
      buyMarkup,
      sellRate,
      sellEnabled,
      cashOnHandGp,
      buybackAllowedTypes,
      barterEnabled,
      barterDc,
      barterAbility
    },
    stock: {
      sourceType,
      sourceRef: resolvedSourceRef,
      sourcePackIds,
      includeTags,
      excludeTags,
      keywordInclude,
      keywordExclude,
      allowedTypes,
      curatedItemUuids: normalizeMerchantCuratedItemUuids(existingStock?.curatedItemUuids ?? []),
      maxItems: stockCount,
      targetValueGp,
      scarcity,
      duplicateChance,
      maxStackSize,
      rarityWeights
    },
    actorId: String(source?.actorId ?? "").trim()
  };
}

function getMerchantOfferTagDefinitionById(tagIdInput = "") {
  const tagId = String(tagIdInput ?? "").trim().toLowerCase();
  return MERCHANT_OFFER_TAG_DEFINITIONS.find((entry) => entry.id === tagId) ?? null;
}

function normalizeMerchantOfferTagIds(tagIds = []) {
  const source = Array.isArray(tagIds) ? tagIds : [];
  return source
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, rows) => entry.length > 0 && rows.indexOf(entry) === index)
    .filter((entry) => Boolean(getMerchantOfferTagDefinitionById(entry)));
}

export function buildMerchantOfferTagOptions(selectedTypes = []) {
  const allowedTypeSet = new Set(normalizeMerchantAllowedItemTypes(selectedTypes));
  const selectedAll = MERCHANT_ALLOWED_ITEM_TYPE_LIST.every((itemType) => allowedTypeSet.has(itemType));
  return MERCHANT_OFFER_TAG_DEFINITIONS.map((definition) => {
    const selected = definition.id === "all"
      ? selectedAll
      : (!selectedAll && definition.itemTypes.some((itemType) => allowedTypeSet.has(itemType)));
    return {
      id: definition.id,
      label: definition.label,
      selected
    };
  });
}

export function resolveMerchantAllowedTypesFromOfferTags(selectedTagIds = [], fallbackTypes = MERCHANT_ALLOWED_ITEM_TYPE_LIST) {
  const selectedTags = normalizeMerchantOfferTagIds(selectedTagIds);
  if (selectedTags.includes("all")) return [...MERCHANT_ALLOWED_ITEM_TYPE_LIST];
  const resolved = new Set();
  for (const tagId of selectedTags) {
    const definition = getMerchantOfferTagDefinitionById(tagId);
    if (!definition) continue;
    for (const itemType of definition.itemTypes) {
      if (MERCHANT_ALLOWED_ITEM_TYPES.has(itemType)) resolved.add(itemType);
    }
  }
  if (resolved.size > 0) return Array.from(resolved);
  return normalizeMerchantAllowedItemTypes(fallbackTypes);
}

export function buildMerchantCityOptions(cityList = [], selectedCityInput = "") {
  const selectedCity = String(selectedCityInput ?? "").trim().slice(0, MERCHANT_MAX_CITY_LENGTH);
  const normalized = normalizeMerchantCityList(cityList);
  const options = [
    { value: "", label: "Global", selected: false },
    ...normalized
      .slice()
      .sort((left, right) => String(left ?? "").localeCompare(String(right ?? "")))
      .map((value) => ({
        value,
        label: value,
        selected: false
      }))
  ];
  if (selectedCity && !options.some((entry) => String(entry.value ?? "").toLowerCase() === selectedCity.toLowerCase())) {
    options.push({
      value: selectedCity,
      label: `${selectedCity} (Custom)`,
      selected: false
    });
  }
  const normalizedSelected = selectedCity.toLowerCase();
  let matched = false;
  for (const option of options) {
    const isSelected = String(option.value ?? "").toLowerCase() === normalizedSelected;
    option.selected = isSelected;
    if (isSelected) matched = true;
  }
  if (!matched) options[0].selected = true;
  return options;
}

export function formatMerchantCp(totalCp) {
  const cp = Math.max(0, Math.floor(Number(totalCp ?? 0) || 0));
  return `${(cp / 100).toFixed(2)} gp`;
}

export function getMerchantItemUnitPriceCp(itemData = {}, rate = 1, options = {}) {
  const getItemGpValue = typeof options?.getItemGpValue === "function"
    ? options.getItemGpValue
    : (value) => Number(value ?? 0);
  const baseGp = Math.max(0, Number(getItemGpValue(itemData) || 0));
  const scalar = Number.isFinite(Number(rate)) ? Math.max(0, Number(rate)) : 1;
  return Math.max(0, Math.round(baseGp * scalar * 100));
}

export function getMerchantSourceRefOptionsForEditor(sourceTypeInput, selectedSourceRefs = [], sourcePackOptions = [], options = {}) {
  const sourceType = normalizeMerchantSourceType(sourceTypeInput);
  const selectedValues = normalizeMerchantSourcePackIds(selectedSourceRefs);
  const selectedSet = new Set(selectedValues);
  const selectedPrimary = String(selectedValues[0] ?? "").trim();
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS) {
    const worldOptions = [{
      value: "",
      label: "All World Items",
      selected: !selectedPrimary
    }];
    if (selectedPrimary) {
      worldOptions.push({
        value: selectedPrimary,
        label: `${selectedPrimary} (Custom)`,
        selected: true
      });
    }
    return worldOptions;
  }
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_FOLDER) {
    const getWorldFolderOptions = typeof options?.getWorldFolderOptions === "function"
      ? options.getWorldFolderOptions
      : () => [];
    const rows = getWorldFolderOptions(selectedValues);
    return Array.isArray(rows) ? rows : [];
  }
  const packOptions = (Array.isArray(sourcePackOptions) ? sourcePackOptions : [])
    .map((entry) => {
      const id = String(entry?.id ?? "").trim();
      const label = String(entry?.label ?? id).trim() || id;
      const available = entry?.available !== false;
      return {
        value: id,
        label: available ? label : `${label} (Unavailable)`,
        selected: selectedSet.has(id)
      };
    })
    .filter((entry) => entry.value)
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")));
  for (const selectedValue of selectedValues) {
    if (!selectedValue) continue;
    if (packOptions.some((entry) => entry.value === selectedValue)) continue;
    packOptions.push({
      value: selectedValue,
      label: `${selectedValue} (Unavailable)`,
      selected: true
    });
  }
  if (packOptions.length <= 0) {
    return [{
      value: "",
      label: "No Compendium Packs Available",
      selected: true,
      disabled: true
    }];
  }
  if (selectedValues.length <= 0) {
    packOptions.unshift({
      value: "",
      label: "Select one or more compendium packs",
      selected: true,
      disabled: true
    });
  }
  return packOptions;
}

export function getMerchantTargetStockCount(stock = {}) {
  const maxItemsRaw = Number(stock?.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems);
  const maxItems = Number.isFinite(maxItemsRaw)
    ? Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(maxItemsRaw)))
    : MERCHANT_DEFAULTS.stock.maxItems;
  const scarcityProfile = getMerchantScarcityProfile(stock?.scarcity ?? MERCHANT_DEFAULTS.stock.scarcity);
  const scaled = Math.round(maxItems * Math.max(0.05, Number(scarcityProfile?.multiplier ?? 1) || 1));
  return Math.max(1, Math.min(MERCHANT_MAX_GENERATED_ITEM_COUNT, scaled));
}

export function shuffleMerchantRows(values = [], randomFn = Math.random) {
  const rows = [...(Array.isArray(values) ? values : [])];
  for (let index = rows.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    const current = rows[index];
    rows[index] = rows[swapIndex];
    rows[swapIndex] = current;
  }
  return rows;
}

function chooseWeightedRow(entries = [], weightAccessor = () => 1, randomFn = Math.random) {
  if (!Array.isArray(entries) || entries.length <= 0) return null;
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  let total = 0;
  const weighted = entries.map((entry) => {
    const weightRaw = Number(weightAccessor(entry));
    const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
    total += weight;
    return { entry, weight };
  });
  if (total <= 0) return entries[0] ?? null;
  let cursor = random() * total;
  for (const row of weighted) {
    cursor -= row.weight;
    if (cursor <= 0) return row.entry;
  }
  return weighted[weighted.length - 1]?.entry ?? entries[0] ?? null;
}

export function selectMerchantStockRows(candidates = [], merchant = {}, options = {}) {
  const normalizeCuratedItemUuids = typeof options?.normalizeCuratedItemUuids === "function"
    ? options.normalizeCuratedItemUuids
    : normalizeMerchantCuratedItemUuids;
  const normalizeRarityWeights = typeof options?.normalizeRarityWeights === "function"
    ? options.normalizeRarityWeights
    : normalizeMerchantRarityWeights;
  const getTargetCount = typeof options?.getTargetStockCount === "function"
    ? options.getTargetStockCount
    : getMerchantTargetStockCount;
  const getRarityBucket = typeof options?.getRarityBucket === "function"
    ? options.getRarityBucket
    : getMerchantRarityBucket;
  const shuffleRows = typeof options?.shuffleRows === "function"
    ? options.shuffleRows
    : shuffleMerchantRows;
  const random = typeof options?.randomFn === "function" ? options.randomFn : Math.random;
  const stock = merchant?.stock ?? {};
  const curatedOrder = normalizeCuratedItemUuids(stock?.curatedItemUuids ?? []);
  const targetCount = Math.max(1, Number(getTargetCount(stock)) || 1);
  const targetValueGpRaw = Number(stock?.targetValueGp ?? 0);
  const targetValueGp = Number.isFinite(targetValueGpRaw) ? Math.max(0, targetValueGpRaw) : 0;
  const duplicateChance = clampMerchantDuplicateChance(stock?.duplicateChance, MERCHANT_DEFAULTS.stock.duplicateChance) / 100;
  const maxStackSize = clampMerchantMaxStackSize(stock?.maxStackSize, MERCHANT_DEFAULTS.stock.maxStackSize);
  const rarityWeights = normalizeRarityWeights(stock?.rarityWeights ?? MERCHANT_DEFAULTS.stock.rarityWeights);
  const shuffled = shuffleRows(Array.isArray(candidates) ? candidates : []);
  if (shuffled.length <= 0) return [];

  const candidateByKey = new Map();
  for (const row of shuffled) {
    const key = String(row?.key ?? "").trim();
    if (!key || candidateByKey.has(key)) continue;
    candidateByKey.set(key, row);
  }

  const selected = [];
  const selectedByKey = new Map();
  let totalUnits = 0;
  let runningValue = 0;
  const canAddUnits = () => totalUnits < targetCount;

  const addSelection = (candidate, quantity = 1) => {
    const key = String(candidate?.key ?? "").trim();
    if (!key || quantity <= 0) return false;
    const entry = selectedByKey.get(key);
    const gpValue = Math.max(0, Number(candidate?.gpValue ?? 0) || 0);
    if (entry) {
      const nextQuantity = Math.max(1, Number(entry.quantity ?? 1) + quantity);
      entry.quantity = nextQuantity;
      totalUnits += quantity;
      runningValue += gpValue * quantity;
      return true;
    }
    const created = {
      ...candidate,
      quantity: Math.max(1, quantity)
    };
    selected.push(created);
    selectedByKey.set(key, created);
    totalUnits += created.quantity;
    runningValue += gpValue * created.quantity;
    return true;
  };

  const getRarityWeight = (candidate) => {
    const bucket = getRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "");
    const raw = Number(rarityWeights?.[bucket] ?? rarityWeights?.common ?? 1);
    return Number.isFinite(raw) ? Math.max(0.01, raw) : 1;
  };

  const getBudgetWeight = (candidate) => {
    if (targetValueGp <= 0) return 1;
    const value = Math.max(0, Number(candidate?.gpValue ?? 0) || 0);
    const remainingValue = Math.max(0, targetValueGp - runningValue);
    const remainingSlots = Math.max(1, targetCount - totalUnits);
    const desiredValue = Math.max(0.01, remainingValue / remainingSlots);
    const distance = Math.abs(value - desiredValue) / Math.max(1, desiredValue);
    let weight = 1 / (1 + (distance * 1.45));
    if (totalUnits > 0 && remainingValue > 0 && value > (remainingValue * 1.45)) {
      weight *= 0.2;
    }
    return Math.max(0.01, weight);
  };

  const getSelectionWeight = (candidate) => {
    const curatedBoost = candidate?.isCurated ? 1.25 : 1;
    return getRarityWeight(candidate) * getBudgetWeight(candidate) * curatedBoost;
  };

  if (curatedOrder.length > 0) {
    for (const uuid of curatedOrder) {
      if (!canAddUnits()) break;
      const match = candidateByKey.get(String(uuid ?? "").trim());
      if (!match) continue;
      addSelection(match, 1);
    }
  }

  let safety = 0;
  while (canAddUnits() && safety < (targetCount * 30)) {
    safety += 1;
    const remainingCandidates = shuffled.filter((entry) => !selectedByKey.has(String(entry?.key ?? "").trim()));
    const duplicatePool = selected.filter((entry) => Number(entry?.quantity ?? 1) < maxStackSize);

    const canDuplicate = duplicatePool.length > 0;
    const shouldDuplicate = canDuplicate && duplicateChance > 0 && random() < duplicateChance;
    if (shouldDuplicate) {
      const duplicatePick = chooseWeightedRow(duplicatePool, (entry) => {
        const rarityWeight = getRarityWeight(entry);
        const valueWeight = getBudgetWeight(entry);
        const value = Math.max(0, Number(entry?.gpValue ?? 0) || 0);
        const affordableBoost = targetValueGp > 0 && value <= Math.max(0, targetValueGp - runningValue) ? 1.1 : 1;
        return rarityWeight * valueWeight * affordableBoost;
      }, random);
      if (duplicatePick) {
        addSelection(duplicatePick, 1);
        continue;
      }
    }

    if (remainingCandidates.length > 0) {
      const picked = chooseWeightedRow(remainingCandidates, getSelectionWeight, random);
      if (picked) {
        addSelection(picked, 1);
        continue;
      }
    }

    if (canDuplicate) {
      const fallbackDuplicate = chooseWeightedRow(duplicatePool, getSelectionWeight, random);
      if (fallbackDuplicate) {
        addSelection(fallbackDuplicate, 1);
        continue;
      }
    }
    break;
  }

  if (selected.length === 0 && shuffled.length > 0) {
    addSelection(shuffled[0], 1);
  }
  return selected;
}

export function buildMerchantStockCandidateRows(documents = [], merchant = {}, options = {}) {
  const getItemData = typeof options?.getItemData === "function" ? options.getItemData : (value) => value ?? {};
  const getItemTags = typeof options?.getItemTags === "function" ? options.getItemTags : () => [];
  const getItemKeywords = typeof options?.getItemKeywords === "function"
    ? options.getItemKeywords
    : (_data, tags) => tags;
  const matchesTagFilters = typeof options?.matchesTagFilters === "function" ? options.matchesTagFilters : () => true;
  const matchesKeywordFilters = typeof options?.matchesKeywordFilters === "function" ? options.matchesKeywordFilters : () => true;
  const getItemRarity = typeof options?.getItemRarity === "function" ? options.getItemRarity : () => "";
  const getRarityBucket = typeof options?.getRarityBucket === "function" ? options.getRarityBucket : getMerchantRarityBucket;
  const getItemGpValue = typeof options?.getItemGpValue === "function" ? options.getItemGpValue : () => 0;
  const allowedItemTypes = options?.allowedItemTypes instanceof Set ? options.allowedItemTypes : MERCHANT_ALLOWED_ITEM_TYPES;
  const normalizeCuratedUuids = typeof options?.normalizeCuratedItemUuids === "function"
    ? options.normalizeCuratedItemUuids
    : normalizeMerchantCuratedItemUuids;
  const normalizeAllowedTypes = typeof options?.normalizeAllowedItemTypes === "function"
    ? options.normalizeAllowedItemTypes
    : normalizeMerchantAllowedItemTypes;
  const normalizeTags = typeof options?.normalizeTagList === "function"
    ? options.normalizeTagList
    : normalizeMerchantTagList;
  const normalizeKeywords = typeof options?.normalizeKeywordList === "function"
    ? options.normalizeKeywordList
    : normalizeMerchantKeywordList;
  const stock = merchant?.stock ?? {};
  const curatedUuids = new Set(normalizeCuratedUuids(stock?.curatedItemUuids ?? []));
  const allowedTypes = new Set(normalizeAllowedTypes(stock?.allowedTypes ?? []));
  const includeTags = normalizeTags(stock?.includeTags ?? []);
  const excludeTags = normalizeTags(stock?.excludeTags ?? []);
  const includeKeywords = normalizeKeywords(stock?.keywordInclude ?? []);
  const excludeKeywords = normalizeKeywords(stock?.keywordExclude ?? []);
  const rows = [];
  for (const documentRef of (Array.isArray(documents) ? documents : [])) {
    const data = getItemData(documentRef);
    const itemType = String(data?.type ?? "").trim().toLowerCase();
    if (!allowedItemTypes.has(itemType)) continue;
    const itemName = String(data?.name ?? "").trim();
    if (!itemName) continue;
    const rowKey = String(documentRef?.uuid ?? data?.uuid ?? `${itemType}:${itemName}:${rows.length}`).trim();
    if (!rowKey) continue;
    const isCurated = curatedUuids.has(rowKey);
    if (!isCurated && allowedTypes.size > 0 && !allowedTypes.has(itemType)) continue;
    const tags = normalizeTags(getItemTags(data));
    if (!isCurated && !matchesTagFilters(tags, includeTags, excludeTags)) continue;
    const keywords = normalizeKeywords(getItemKeywords(data, tags));
    if (!isCurated && !matchesKeywordFilters(keywords, includeKeywords, excludeKeywords)) continue;
    const rarity = String(getItemRarity(data) ?? "").trim().toLowerCase();
    const gpValue = Math.max(0, Number(getItemGpValue(data) || 0));
    rows.push({
      key: rowKey,
      data,
      gpValue,
      isCurated,
      tags,
      keywords,
      rarity,
      rarityBucket: getRarityBucket(rarity)
    });
  }
  return rows;
}
