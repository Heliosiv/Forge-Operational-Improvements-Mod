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

// Rarity-based price multipliers applied on top of the base buyMarkup / sellRate.
// C 1.0 | U 1.2 | R 1.5 | VR 2.0 | L 3.0
export const MERCHANT_RARITY_PRICE_MULTIPLIERS = Object.freeze({
  common: 1.0,
  uncommon: 1.2,
  rare: 1.5,
  "very-rare": 2.0,
  legendary: 3.0
});
export const MERCHANT_MIN_RARITY_PRICE_MULTIPLIER = 0.1;
export const MERCHANT_MAX_RARITY_PRICE_MULTIPLIER = 10;

export function normalizeFoundryAssetImagePath(value, { fallback = "icons/svg/item-bag.svg" } = {}) {
  const raw = String(value ?? "").trim();
  const fallbackPath = String(fallback ?? "").trim();
  if (!raw) return fallbackPath;
  if (!/^https?:\/\//i.test(raw)) return raw;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return fallbackPath;
  }
  if (!/assets\.forge-vtt\.com$/i.test(String(url.hostname ?? "").trim())) return raw;
  let pathname = String(url.pathname ?? "");
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    // Leave the encoded path in place; normal Forge Bazaar paths still match below.
  }
  const replacements = [
    ["/bazaar/core/", ""],
    ["/bazaar/systems/dnd5e/", "systems/dnd5e/"],
    ["/bazaar/modules/", "modules/"]
  ];
  for (const [prefix, replacement] of replacements) {
    if (!pathname.startsWith(prefix)) continue;
    const relative = `${replacement}${pathname.slice(prefix.length)}`.replace(/\/+/g, "/");
    return relative || fallbackPath;
  }
  return fallbackPath;
}

// Stock pressure: relative fill ratio triggers price adjustments on the buy side.
export const MERCHANT_STOCK_PRESSURE = Object.freeze({
  LOW_THRESHOLD: 0.33, // below 33% of target stock → merchant scarce → buy price up
  HIGH_THRESHOLD: 0.67, // above 67% of target stock → merchant flush → buy price down
  LOW_BUY_MODIFIER: 0.2,
  HIGH_BUY_MODIFIER: -0.15
});

// Merchant type/tag options (v1).
export const MERCHANT_TYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: "general", label: "General Goods" }),
  Object.freeze({ value: "magic", label: "Magic Items" }),
  Object.freeze({ value: "black-market", label: "Black Market" }),
  Object.freeze({ value: "faction", label: "Faction Vendor" }),
  Object.freeze({ value: "traveling", label: "Traveling Vendor" }),
  Object.freeze({ value: "quest", label: "Quest / Event Vendor" })
]);

export const MERCHANT_DISPOSITION_OPTIONS = Object.freeze([
  Object.freeze({ value: "hostile", label: "Hostile" }),
  Object.freeze({ value: "unfriendly", label: "Unfriendly" }),
  Object.freeze({ value: "neutral", label: "Neutral" }),
  Object.freeze({ value: "friendly", label: "Friendly" }),
  Object.freeze({ value: "helpful", label: "Helpful" })
]);

export const MERCHANT_ARCHETYPE_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: "general-goods",
    label: "General Goods",
    merchantType: "general",
    specialtyLabel: "Practical staples and broad adventuring stock.",
    pricePostureLabel: "Broad trade at steady town pricing.",
    stockCadenceLabel: "Dependable staples with a few rotating finds.",
    defaultTitle: "General Goods",
    allowedTypes: Object.freeze(["equipment", "consumable", "tool", "backpack", "loot", "trinket", "ammunition"]),
    buybackAllowedTypes: Object.freeze([
      "weapon",
      "equipment",
      "consumable",
      "loot",
      "tool",
      "backpack",
      "armor",
      "ammunition",
      "trinket"
    ]),
    preferredTypes: Object.freeze(["equipment", "consumable", "tool", "backpack", "ammunition", "loot", "trinket"]),
    avoidTypes: Object.freeze(["spell"]),
    focusKeywords: Object.freeze([
      "rope",
      "ration",
      "waterskin",
      "bedroll",
      "lamp",
      "kit",
      "pack",
      "torch",
      "potion",
      "ammo"
    ]),
    featuredKeywords: Object.freeze(["healing", "climber", "antitoxin", "quiver", "lantern", "pack"]),
    markupPercent: 20,
    sellRatePercent: 55,
    cashOnHandGp: 700,
    maxItems: 20,
    targetValueGp: 450,
    valueStrictness: 180,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
    coreRatio: 0.7
  }),
  Object.freeze({
    id: "outfitter",
    label: "Outfitter",
    merchantType: "general",
    specialtyLabel: "Field gear, containers, survival tools, and travel supplies.",
    pricePostureLabel: "Strong on dependable expedition gear.",
    stockCadenceLabel: "Large dependable gear wall with a few trail-ready features.",
    defaultTitle: "Trail Outfitter",
    allowedTypes: Object.freeze(["equipment", "backpack", "tool", "consumable", "ammunition"]),
    buybackAllowedTypes: Object.freeze(["equipment", "backpack", "tool", "consumable", "ammunition"]),
    preferredTypes: Object.freeze(["equipment", "backpack", "tool", "consumable", "ammunition"]),
    avoidTypes: Object.freeze(["trinket", "loot", "spell"]),
    focusKeywords: Object.freeze([
      "rope",
      "bedroll",
      "tent",
      "pack",
      "waterskin",
      "lantern",
      "torch",
      "climber",
      "piton",
      "travel"
    ]),
    featuredKeywords: Object.freeze(["healing", "climber", "lantern", "quiver", "survival"]),
    markupPercent: 18,
    sellRatePercent: 50,
    cashOnHandGp: 650,
    maxItems: 18,
    targetValueGp: 520,
    valueStrictness: 170,
    scarcity: MERCHANT_SCARCITY_LEVELS.STOCKED,
    coreRatio: 0.72
  }),
  Object.freeze({
    id: "armorer",
    label: "Armorer",
    merchantType: "general",
    specialtyLabel: "Armor, shields, repair pieces, and heavy field kit.",
    pricePostureLabel: "Specialist inventory with steadier armor pricing.",
    stockCadenceLabel: "Consistent defensive stock with a few standout pieces.",
    defaultTitle: "Armorer",
    allowedTypes: Object.freeze(["armor", "equipment", "backpack"]),
    buybackAllowedTypes: Object.freeze(["armor", "equipment", "backpack"]),
    preferredTypes: Object.freeze(["armor", "equipment", "backpack"]),
    avoidTypes: Object.freeze(["trinket", "loot", "spell", "consumable"]),
    focusKeywords: Object.freeze(["shield", "mail", "plate", "helmet", "gauntlet", "repair", "padding", "buckler"]),
    featuredKeywords: Object.freeze(["shield", "plate", "half plate", "breastplate"]),
    markupPercent: 24,
    sellRatePercent: 48,
    cashOnHandGp: 1100,
    maxItems: 14,
    targetValueGp: 1200,
    valueStrictness: 200,
    scarcity: MERCHANT_SCARCITY_LEVELS.MODEST,
    coreRatio: 0.76
  }),
  Object.freeze({
    id: "weaponsmith",
    label: "Weaponsmith",
    merchantType: "general",
    specialtyLabel: "Weapons, ammunition, and practical combat support.",
    pricePostureLabel: "Combat-first stock with reliable ammo support.",
    stockCadenceLabel: "Stable arms rack with rotating premium pieces.",
    defaultTitle: "Weaponsmith",
    allowedTypes: Object.freeze(["weapon", "ammunition", "equipment", "consumable"]),
    buybackAllowedTypes: Object.freeze(["weapon", "ammunition", "equipment"]),
    preferredTypes: Object.freeze(["weapon", "ammunition", "equipment", "consumable"]),
    avoidTypes: Object.freeze(["trinket", "loot", "spell", "backpack"]),
    focusKeywords: Object.freeze([
      "sword",
      "bow",
      "crossbow",
      "arrow",
      "bolt",
      "quiver",
      "blade",
      "hammer",
      "axe",
      "oil"
    ]),
    featuredKeywords: Object.freeze(["+1", "longbow", "crossbow", "arrow", "bolt", "quiver"]),
    markupPercent: 24,
    sellRatePercent: 48,
    cashOnHandGp: 950,
    maxItems: 16,
    targetValueGp: 980,
    valueStrictness: 190,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
    coreRatio: 0.72
  }),
  Object.freeze({
    id: "apothecary",
    label: "Apothecary / Alchemist",
    merchantType: "general",
    specialtyLabel: "Healing, remedies, alchemical supplies, and useful compounds.",
    pricePostureLabel: "Higher-value consumables with narrower buyback.",
    stockCadenceLabel: "Stable staples with a few rotating concoctions.",
    defaultTitle: "Apothecary",
    allowedTypes: Object.freeze(["consumable", "tool", "equipment", "loot"]),
    buybackAllowedTypes: Object.freeze(["consumable", "tool", "equipment", "loot"]),
    preferredTypes: Object.freeze(["consumable", "tool", "equipment", "loot"]),
    avoidTypes: Object.freeze(["weapon", "armor", "trinket", "spell"]),
    focusKeywords: Object.freeze([
      "potion",
      "healing",
      "antitoxin",
      "herbal",
      "alchemist",
      "elixir",
      "acid",
      "fire",
      "poison",
      "remedy"
    ]),
    featuredKeywords: Object.freeze(["healing", "greater", "antitoxin", "alchemy", "elixir"]),
    markupPercent: 26,
    sellRatePercent: 45,
    cashOnHandGp: 800,
    maxItems: 15,
    targetValueGp: 650,
    valueStrictness: 185,
    scarcity: MERCHANT_SCARCITY_LEVELS.MODEST,
    coreRatio: 0.68
  }),
  Object.freeze({
    id: "tool-merchant",
    label: "Tool Merchant",
    merchantType: "general",
    specialtyLabel: "Kits, implements, and practical support gear.",
    pricePostureLabel: "Focused workshop inventory with reliable utility.",
    stockCadenceLabel: "Stable kit catalogue with a few practical highlights.",
    defaultTitle: "Tool Merchant",
    allowedTypes: Object.freeze(["tool", "equipment", "backpack", "consumable"]),
    buybackAllowedTypes: Object.freeze(["tool", "equipment", "backpack"]),
    preferredTypes: Object.freeze(["tool", "equipment", "backpack", "consumable"]),
    avoidTypes: Object.freeze(["weapon", "armor", "spell", "trinket"]),
    focusKeywords: Object.freeze([
      "kit",
      "tools",
      "artisan",
      "smith",
      "thieves",
      "healer",
      "climber",
      "mess",
      "cook",
      "repair"
    ]),
    featuredKeywords: Object.freeze(["healer", "thieves", "artisan", "climber"]),
    markupPercent: 20,
    sellRatePercent: 50,
    cashOnHandGp: 650,
    maxItems: 16,
    targetValueGp: 500,
    valueStrictness: 175,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
    coreRatio: 0.72
  }),
  Object.freeze({
    id: "magic-dealer",
    label: "Magic Dealer",
    merchantType: "magic",
    specialtyLabel: "Fewer, better, more distinct arcane wares.",
    pricePostureLabel: "Premium stock with lighter quantity and stronger highlights.",
    stockCadenceLabel: "Small stable baseline with rotating signature finds.",
    defaultTitle: "Magic Dealer",
    allowedTypes: Object.freeze(["consumable", "spell", "equipment", "weapon", "armor", "loot", "trinket"]),
    buybackAllowedTypes: Object.freeze(["consumable", "spell", "equipment", "weapon", "armor", "loot", "trinket"]),
    preferredTypes: Object.freeze(["consumable", "spell", "equipment", "weapon", "armor", "loot", "trinket"]),
    avoidTypes: Object.freeze(["backpack", "tool", "ammunition"]),
    focusKeywords: Object.freeze([
      "scroll",
      "wand",
      "staff",
      "ring",
      "magic",
      "arcane",
      "enchanted",
      "+1",
      "spell",
      "focus"
    ]),
    featuredKeywords: Object.freeze(["rare", "very rare", "legendary", "+1", "scroll", "wand", "staff", "ring"]),
    markupPercent: 32,
    sellRatePercent: 40,
    cashOnHandGp: 1800,
    maxItems: 10,
    targetValueGp: 2400,
    valueStrictness: 220,
    scarcity: MERCHANT_SCARCITY_LEVELS.THIN,
    coreRatio: 0.6
  })
]);

// Maximum fractional price deviation that barter/haggling may produce (+/-20% of base).
export const MERCHANT_HAGGLE_CAP_PERCENT = 0.2;
export const MERCHANT_BARTER_STRONG_MARGIN = 5;
export const MERCHANT_BARTER_STRONG_MULTIPLIER = 2;

// Restock partial-reroll: retain about 60% of existing slots, weighted toward durable staples.
export const MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE = 0.6;

export const MERCHANT_EDITOR_MAX_CURATED_ITEMS = 200;
export const MERCHANT_EDITOR_CANDIDATE_LIMIT = 400;
export const MERCHANT_PREVIEW_ITEM_LIMIT = 240;
export const MERCHANT_ACCESS_LOG_LIMIT = 120;
export const MERCHANT_ACCESS_LOG_THROTTLE_MS = 45000;
export const MERCHANT_DEFAULT_VALUE_STRICTNESS = 180;
export const MERCHANT_VALUE_STRICTNESS_BANDS = Object.freeze([
  Object.freeze({ key: "very-strict", label: "Very Strict", min: 240, ratio: 0.05 }),
  Object.freeze({ key: "strict", label: "Strict", min: 180, ratio: 0.1 }),
  Object.freeze({ key: "normal", label: "Normal", min: 120, ratio: 0.2 }),
  Object.freeze({ key: "loose", label: "Loose", min: 0, ratio: 0.35 })
]);

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
const MERCHANT_MAX_MUNDANE_AMMO_WEIGHT_BOOST = 10;
const MERCHANT_MAX_MUNDANE_AMMO_STACK_SIZE = 200;
const MERCHANT_MAX_RARITY_WEIGHT = 100;
const MERCHANT_MAX_AUTO_REFRESH_INTERVAL_DAYS = 365;
const MERCHANT_MAX_GENERATED_ITEM_COUNT = 250;
const MERCHANT_RARITY_BUCKETS = Object.freeze(["common", "uncommon", "rare", "very-rare", "legendary"]);
const MERCHANT_ESTIMATED_GP_BY_RARITY = Object.freeze({
  common: 5,
  uncommon: 75,
  rare: 750,
  "very-rare": 7500,
  legendary: 25000
});
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
      .flatMap((pool) => (Array.isArray(pool?.first) ? pool.first : []))
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .filter((value, index, rows) => rows.indexOf(value) === index)
  ),
  last: Object.freeze(
    Object.values(MERCHANT_RANDOM_NAME_POOLS)
      .flatMap((pool) => (Array.isArray(pool?.last) ? pool.last : []))
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
  // Identity metadata
  archetype: "general-goods",
  customMode: false,
  type: "general",
  faction: "",
  location: "",
  disposition: "neutral",
  liquidationMode: false,
  permissions: Object.freeze({
    player: Object.freeze({
      buy: true,
      sell: true
    }),
    assistant: Object.freeze({
      edit: true,
      override: true
    }),
    gm: Object.freeze({
      edit: true,
      override: true
    })
  }),
  pricing: Object.freeze({
    // 0.25 = 25% markup over base value → player pays 125% of item base price
    buyMarkup: 0.25,
    sellRate: 0.5,
    sellEnabled: true,
    cashOnHandGp: 500,
    buybackAllowedTypes: Object.freeze([...MERCHANT_ALLOWED_ITEM_TYPE_LIST]),
    // Tax/fee appended on top of base × markup × rarityMult × stockPressure
    taxFeePercent: 0,
    // Whether rarity multipliers and stock pressure are applied to prices
    rarityPricingEnabled: true,
    rarityPriceMultipliers: Object.freeze({ ...MERCHANT_RARITY_PRICE_MULTIPLIERS }),
    stockPressureEnabled: true,
    barterEnabled: true,
    barterDc: 15,
    barterAbility: "cha",
    // +/-20% of buy/sell base is the maximum haggle effect (MERCHANT_HAGGLE_CAP_PERCENT)
    barterSuccessBuyModifier: -0.1,
    barterSuccessSellModifier: 0.1,
    barterFailureBuyModifier: 0.1,
    barterFailureSellModifier: -0.1
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
    valueStrictness: MERCHANT_DEFAULT_VALUE_STRICTNESS,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL,
    duplicateChance: 25,
    maxStackSize: 20,
    mundaneAmmoWeightBoost: 3,
    mundaneAmmoStackSize: 20,
    rarityWeights: Object.freeze({ ...MERCHANT_DEFAULT_RARITY_WEIGHTS }),
    autoRefresh: Object.freeze({
      enabled: false,
      intervalDays: 7
    })
  })
});

export const MERCHANT_STARTER_BLUEPRINTS = Object.freeze([
  Object.freeze({
    id: "starter-sundries",
    archetype: "general-goods",
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
    archetype: "tool-merchant",
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
    archetype: "armorer",
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
    archetype: "weaponsmith",
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
    archetype: "magic-dealer",
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

function deepCloneValue(value, foundryRef = globalThis.foundry) {
  const deepClone = foundryRef?.utils?.deepClone;
  if (typeof deepClone === "function") return deepClone(value);
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function buildMerchantArchetypeMap() {
  return new Map(
    MERCHANT_ARCHETYPE_DEFINITIONS.map((entry) => [
      String(entry.id ?? "")
        .trim()
        .toLowerCase(),
      entry
    ])
  );
}

const MERCHANT_ARCHETYPE_MAP = buildMerchantArchetypeMap();

export function normalizeMerchantArchetype(value = "") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (MERCHANT_ARCHETYPE_MAP.has(normalized)) return normalized;
  return MERCHANT_DEFAULTS.archetype;
}

export function getMerchantArchetypeDefinition(archetypeInput = MERCHANT_DEFAULTS.archetype) {
  return (
    MERCHANT_ARCHETYPE_MAP.get(normalizeMerchantArchetype(archetypeInput)) ??
    MERCHANT_ARCHETYPE_MAP.get(MERCHANT_DEFAULTS.archetype) ??
    MERCHANT_ARCHETYPE_DEFINITIONS[0]
  );
}

export function getMerchantArchetypeOptions(selectedInput = MERCHANT_DEFAULTS.archetype) {
  const selected = normalizeMerchantArchetype(selectedInput);
  return MERCHANT_ARCHETYPE_DEFINITIONS.map((definition) => ({
    value: definition.id,
    label: definition.label,
    specialtyLabel: definition.specialtyLabel,
    selected: definition.id === selected
  }));
}

function merchantHasAdvancedStockConfig(source = {}) {
  const stock = source?.stock && typeof source.stock === "object" ? source.stock : source;
  const sourceType = normalizeMerchantSourceType(
    stock?.sourceType ?? source?.sourceType ?? MERCHANT_DEFAULTS.stock.sourceType
  );
  const sourceRef = String(stock?.sourceRef ?? source?.sourceRef ?? "").trim();
  const sourcePackIds = normalizeMerchantSourcePackIds(stock?.sourcePackIds ?? source?.sourcePackIds ?? [], sourceRef);
  if (sourceType !== MERCHANT_SOURCE_TYPES.WORLD_ITEMS) return true;
  if (sourcePackIds.length > 0) return true;
  if (normalizeMerchantTagList(stock?.includeTags ?? source?.includeTags ?? []).length > 0) return true;
  if (normalizeMerchantTagList(stock?.excludeTags ?? source?.excludeTags ?? []).length > 0) return true;
  if (normalizeMerchantKeywordList(stock?.keywordInclude ?? source?.keywordInclude ?? []).length > 0) return true;
  if (normalizeMerchantKeywordList(stock?.keywordExclude ?? source?.keywordExclude ?? []).length > 0) return true;
  if (normalizeMerchantCuratedItemUuids(stock?.curatedItemUuids ?? source?.curatedItemUuids ?? []).length > 0)
    return true;
  return false;
}

function getMerchantArchetypeDefaults(archetypeInput = MERCHANT_DEFAULTS.archetype) {
  const definition = getMerchantArchetypeDefinition(archetypeInput);
  return {
    archetype: definition.id,
    type: normalizeMerchantType(definition.merchantType ?? MERCHANT_DEFAULTS.type),
    title: String(definition.defaultTitle ?? "").trim(),
    customMode: false,
    pricing: {
      buyMarkup: Number((Number(definition.markupPercent ?? 0) / 100).toFixed(2)),
      sellRate: Number((Number(definition.sellRatePercent ?? 0) / 100).toFixed(2)),
      cashOnHandGp: Number(definition.cashOnHandGp ?? MERCHANT_DEFAULTS.pricing.cashOnHandGp),
      rarityPriceMultipliers: normalizeMerchantRarityPriceMultipliers(
        definition.rarityPriceMultipliers,
        MERCHANT_DEFAULTS.pricing.rarityPriceMultipliers
      ),
      buybackAllowedTypes: normalizeMerchantAllowedItemTypes(
        definition.buybackAllowedTypes ?? MERCHANT_DEFAULTS.pricing.buybackAllowedTypes
      )
    },
    stock: {
      sourceType: MERCHANT_SOURCE_TYPES.WORLD_ITEMS,
      sourceRef: "",
      sourcePackIds: [],
      allowedTypes: normalizeMerchantAllowedItemTypes(definition.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST),
      maxItems: clampMerchantItemCount(
        definition.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems,
        MERCHANT_DEFAULTS.stock.maxItems
      ),
      targetValueGp: Math.max(0, Number(definition.targetValueGp ?? MERCHANT_DEFAULTS.stock.targetValueGp) || 0),
      valueStrictness: clampMerchantValueStrictness(
        definition.valueStrictness ?? MERCHANT_DEFAULTS.stock.valueStrictness,
        MERCHANT_DEFAULTS.stock.valueStrictness
      ),
      scarcity: normalizeMerchantScarcity(definition.scarcity ?? MERCHANT_DEFAULTS.stock.scarcity)
    }
  };
}

function mergeMerchantArchetypeDefaults(
  source = {},
  archetypeInput = source?.archetype ?? MERCHANT_DEFAULTS.archetype,
  customModeInput = source?.customMode
) {
  const archetype = normalizeMerchantArchetype(archetypeInput);
  const definitionDefaults = getMerchantArchetypeDefaults(archetype);
  const customMode = customModeInput === undefined ? merchantHasAdvancedStockConfig(source) : Boolean(customModeInput);
  const stockSource = source?.stock && typeof source.stock === "object" ? source.stock : {};
  const pricingSource = source?.pricing && typeof source.pricing === "object" ? source.pricing : {};
  const merged = {
    ...definitionDefaults,
    ...source,
    archetype,
    customMode,
    type: normalizeMerchantType(source?.type ?? definitionDefaults.type ?? MERCHANT_DEFAULTS.type),
    title: String(source?.title ?? definitionDefaults.title ?? "").trim(),
    pricing: {
      ...definitionDefaults.pricing,
      ...pricingSource
    },
    stock: {
      ...definitionDefaults.stock,
      ...stockSource
    }
  };
  if (!customMode) {
    merged.stock.sourceType = MERCHANT_SOURCE_TYPES.WORLD_ITEMS;
    merged.stock.sourceRef = "";
    merged.stock.sourcePackIds = [];
    merged.stock.includeTags = [];
    merged.stock.excludeTags = [];
    merged.stock.keywordInclude = [];
    merged.stock.keywordExclude = [];
    merged.stock.curatedItemUuids = [];
    merged.stock.allowedTypes = normalizeMerchantAllowedItemTypes(
      stockSource?.allowedTypes ?? definitionDefaults.stock.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST
    );
    merged.pricing.buybackAllowedTypes = normalizeMerchantAllowedItemTypes(
      pricingSource?.buybackAllowedTypes ??
        definitionDefaults.pricing.buybackAllowedTypes ??
        MERCHANT_ALLOWED_ITEM_TYPE_LIST
    );
  }
  return merged;
}

function clampMerchantMarkupPercent(value, fallback = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(0, Math.min(MERCHANT_MAX_MARKUP_PERCENT, Number(fallback) || 0));
  return Math.max(0, Math.min(MERCHANT_MAX_MARKUP_PERCENT, Number(raw.toFixed(2))));
}

export function normalizeMerchantBarterModifier(value, fallback = 0) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return Number(Math.max(-10, Math.min(10, Number(fallback) || 0)).toFixed(2));
  }
  return Number(Math.max(-10, Math.min(10, raw)).toFixed(2));
}

function clampMerchantItemCount(value, fallback = MERCHANT_DEFAULTS.stock.maxItems) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(Number(fallback) || 1)));
  return Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(raw)));
}

function clampMerchantDuplicateChance(value, fallback = MERCHANT_DEFAULTS.stock.duplicateChance) {
  const raw = Number(value);
  if (!Number.isFinite(raw))
    return Math.max(0, Math.min(MERCHANT_MAX_DUPLICATE_CHANCE, Math.floor(Number(fallback) || 0)));
  return Math.max(0, Math.min(MERCHANT_MAX_DUPLICATE_CHANCE, Math.floor(raw)));
}

function clampMerchantMaxStackSize(value, fallback = MERCHANT_DEFAULTS.stock.maxStackSize) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(1, Math.min(MERCHANT_MAX_STACK_SIZE, Math.floor(Number(fallback) || 1)));
  return Math.max(1, Math.min(MERCHANT_MAX_STACK_SIZE, Math.floor(raw)));
}

function clampMerchantMundaneAmmoWeightBoost(value, fallback = MERCHANT_DEFAULTS.stock.mundaneAmmoWeightBoost) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return Math.max(1, Math.min(MERCHANT_MAX_MUNDANE_AMMO_WEIGHT_BOOST, Number(fallback) || 1));
  }
  return Math.max(1, Math.min(MERCHANT_MAX_MUNDANE_AMMO_WEIGHT_BOOST, Number(raw.toFixed(2))));
}

function clampMerchantMundaneAmmoStackSize(value, fallback = MERCHANT_DEFAULTS.stock.mundaneAmmoStackSize) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return Math.max(1, Math.min(MERCHANT_MAX_MUNDANE_AMMO_STACK_SIZE, Math.floor(Number(fallback) || 1)));
  }
  return Math.max(1, Math.min(MERCHANT_MAX_MUNDANE_AMMO_STACK_SIZE, Math.floor(raw)));
}

export function clampMerchantValueStrictness(value, fallback = MERCHANT_DEFAULT_VALUE_STRICTNESS) {
  const raw = Number(value);
  if (!Number.isFinite(raw))
    return Math.max(50, Math.min(300, Math.round(Number(fallback) || MERCHANT_DEFAULT_VALUE_STRICTNESS)));
  return Math.max(50, Math.min(300, Math.round(raw)));
}

function clampMerchantAutoRefreshIntervalDays(value, fallback = MERCHANT_DEFAULTS.stock.autoRefresh.intervalDays) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) {
    return Math.max(
      1,
      Math.min(
        MERCHANT_MAX_AUTO_REFRESH_INTERVAL_DAYS,
        Math.floor(Number(fallback) || MERCHANT_DEFAULTS.stock.autoRefresh.intervalDays)
      )
    );
  }
  return Math.max(1, Math.min(MERCHANT_MAX_AUTO_REFRESH_INTERVAL_DAYS, Math.floor(raw)));
}

export function normalizeMerchantAutoRefreshConfig(raw = {}, fallback = MERCHANT_DEFAULTS.stock.autoRefresh) {
  const fallbackSource =
    fallback && typeof fallback === "object" && !Array.isArray(fallback)
      ? fallback
      : MERCHANT_DEFAULTS.stock.autoRefresh;
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : { enabled: raw };
  const enabled =
    source.enabled === undefined
      ? Boolean(fallbackSource.enabled ?? MERCHANT_DEFAULTS.stock.autoRefresh.enabled)
      : Boolean(source.enabled);
  const intervalDays = clampMerchantAutoRefreshIntervalDays(
    source.intervalDays ?? source.days ?? source.refreshIntervalDays ?? fallbackSource.intervalDays,
    fallbackSource.intervalDays
  );
  return {
    enabled,
    intervalDays
  };
}

export function normalizeMerchantTagList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) =>
      String(entry ?? "")
        .trim()
        .toLowerCase()
    )
    .filter(
      (entry, index, rows) =>
        entry.length > 0 && entry.length <= MERCHANT_MAX_TAG_LENGTH && rows.indexOf(entry) === index
    )
    .slice(0, MERCHANT_MAX_TAG_COUNT);
}

export function normalizeMerchantKeywordList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) =>
      String(entry ?? "")
        .trim()
        .toLowerCase()
    )
    .filter(
      (entry, index, rows) =>
        entry.length > 0 && entry.length <= MERCHANT_MAX_KEYWORD_LENGTH && rows.indexOf(entry) === index
    )
    .slice(0, MERCHANT_MAX_KEYWORD_COUNT);
}

export function normalizeMerchantRarity(value) {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (["artifact", "artifacts", "artefact", "artefacts", "superrare", "super-rare", "super rare"].includes(raw))
    return "very-rare";
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
    const fallbackValue =
      bucket === "very-rare" ? (fallbackWeights[bucket] ?? fallbackWeights.veryRare) : fallbackWeights[bucket];
    const parsed = Number(sourceValue ?? fallbackValue ?? MERCHANT_DEFAULT_RARITY_WEIGHTS[bucket] ?? 1);
    normalized[bucket] = Number.isFinite(parsed)
      ? Math.max(0, Math.min(MERCHANT_MAX_RARITY_WEIGHT, Number(parsed.toFixed(2))))
      : Number(MERCHANT_DEFAULT_RARITY_WEIGHTS[bucket] ?? 1);
  }
  return normalized;
}

export function normalizeMerchantRarityPriceMultipliers(raw = {}, fallback = MERCHANT_RARITY_PRICE_MULTIPLIERS) {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallbackMultipliers = fallback && typeof fallback === "object" ? fallback : MERCHANT_RARITY_PRICE_MULTIPLIERS;
  const normalized = {};
  for (const bucket of MERCHANT_RARITY_BUCKETS) {
    const sourceValue = bucket === "very-rare" ? (source[bucket] ?? source.veryRare) : source[bucket];
    const fallbackValue =
      bucket === "very-rare"
        ? (fallbackMultipliers[bucket] ?? fallbackMultipliers.veryRare)
        : fallbackMultipliers[bucket];
    const parsed = Number(sourceValue ?? fallbackValue ?? MERCHANT_RARITY_PRICE_MULTIPLIERS[bucket] ?? 1);
    normalized[bucket] = Number.isFinite(parsed)
      ? Math.max(
          MERCHANT_MIN_RARITY_PRICE_MULTIPLIER,
          Math.min(MERCHANT_MAX_RARITY_PRICE_MULTIPLIER, Number(parsed.toFixed(4)))
        )
      : Number(MERCHANT_RARITY_PRICE_MULTIPLIERS[bucket] ?? 1);
  }
  return normalized;
}

export function normalizeMerchantCityList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim())
    .filter(
      (entry, index, rows) =>
        entry.length > 0 && entry.length <= MERCHANT_MAX_CITY_LENGTH && rows.indexOf(entry) === index
    )
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
    .filter(
      (entry, index, all) =>
        entry.length > 0 && entry.length <= MERCHANT_MAX_PACK_ID_LENGTH && all.indexOf(entry) === index
    )
    .slice(0, MERCHANT_MAX_PACK_ID_COUNT);
}

export function normalizeMerchantAllowedItemTypes(values = []) {
  const source = Array.isArray(values) ? values : [];
  const normalized = source
    .map((entry) =>
      String(entry ?? "")
        .trim()
        .toLowerCase()
    )
    .filter((entry, index, all) => MERCHANT_ALLOWED_ITEM_TYPES.has(entry) && all.indexOf(entry) === index);
  if (normalized.length > 0) return normalized;
  return [...MERCHANT_ALLOWED_ITEM_TYPE_LIST];
}

export function normalizeMerchantCuratedItemUuids(values = []) {
  const source = Array.isArray(values) ? values : [];
  return source
    .map((entry) => String(entry ?? "").trim())
    .filter(
      (entry, index, all) =>
        entry.length > 0 && entry.length <= MERCHANT_MAX_CURATED_UUID_LENGTH && all.indexOf(entry) === index
    )
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
  const sourceType = String(value ?? "")
    .trim()
    .toLowerCase();
  if (sourceType === MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK) return MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK;
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_FOLDER) return MERCHANT_SOURCE_TYPES.WORLD_FOLDER;
  return MERCHANT_SOURCE_TYPES.WORLD_ITEMS;
}

export function normalizeMerchantScarcity(value) {
  const scarcity = String(value ?? "")
    .trim()
    .toLowerCase();
  if (MERCHANT_SCARCITY_PROFILES.some((entry) => entry.value === scarcity)) return scarcity;
  if (scarcity === "veryscarce") return MERCHANT_SCARCITY_LEVELS.VERY_SCARCE;
  if (scarcity === "plenty") return MERCHANT_SCARCITY_LEVELS.PLENTIFUL;
  if (scarcity === "overflowing") return MERCHANT_SCARCITY_LEVELS.SURPLUS;
  return MERCHANT_SCARCITY_LEVELS.NORMAL;
}

export function getMerchantScarcityProfile(scarcityInput = MERCHANT_SCARCITY_LEVELS.NORMAL) {
  const scarcity = normalizeMerchantScarcity(scarcityInput);
  return (
    MERCHANT_SCARCITY_PROFILES.find((entry) => entry.value === scarcity) ??
    MERCHANT_SCARCITY_PROFILES.find((entry) => entry.value === MERCHANT_SCARCITY_LEVELS.NORMAL) ?? {
      value: MERCHANT_SCARCITY_LEVELS.NORMAL,
      label: "6 - Normal",
      multiplier: 1
    }
  );
}

export function resolveMerchantValueTolerance(targetValueGp = 0, strictnessInput = MERCHANT_DEFAULT_VALUE_STRICTNESS) {
  const strictness = clampMerchantValueStrictness(strictnessInput, MERCHANT_DEFAULT_VALUE_STRICTNESS);
  const band = MERCHANT_VALUE_STRICTNESS_BANDS.find((entry) => strictness >= entry.min) ??
    MERCHANT_VALUE_STRICTNESS_BANDS[MERCHANT_VALUE_STRICTNESS_BANDS.length - 1] ?? {
      key: "normal",
      label: "Normal",
      ratio: 0.2
    };
  const target = Math.max(1, Number(targetValueGp) || 1);
  const ratio = Math.max(0.01, Number(band?.ratio ?? 0.2) || 0.2);
  const toleranceGp = Math.max(1, Number((target * ratio).toFixed(2)));
  const minGp = Math.max(0, Number((target - toleranceGp).toFixed(2)));
  const maxGp = Math.max(minGp, Number((target + toleranceGp).toFixed(2)));
  return {
    strictness,
    bandKey: String(band?.key ?? "normal"),
    bandLabel: String(band?.label ?? "Normal"),
    ratio,
    percent: Math.max(1, Math.round(ratio * 100)),
    toleranceGp,
    minGp,
    maxGp
  };
}

export function normalizeMerchantRace(value) {
  return String(value ?? "")
    .trim()
    .slice(0, 60);
}

export function getMerchantRaceKey(value) {
  const race = normalizeMerchantRace(value).toLowerCase();
  if (!race) return "default";
  if (race.includes("aasimar")) return "celestial";
  if (race.includes("triton") || race.includes("sea elf") || race.includes("vedalken")) return "aquatic";
  if (
    race.includes("eladrin") ||
    race.includes("fairy") ||
    race.includes("satyr") ||
    race.includes("harengon") ||
    race.includes("centaur")
  )
    return "fey";
  if (race.includes("elf") || race.includes("shadar")) return "elf";
  if (race.includes("dwarf") || race.includes("duergar")) return "dwarf";
  if (race.includes("goliath") || race.includes("firbolg") || race.includes("giff") || race.includes("loxodon"))
    return "giantkin";
  if (race.includes("halfling")) return "halfling";
  if (race.includes("gnome") || race.includes("autognome") || race.includes("verdan")) return "gnome";
  if (race.includes("dragonborn")) return "dragonborn";
  if (race.includes("tiefling")) return "tiefling";
  if (race.includes("orc")) return "orc";
  if (race.includes("bugbear") || race.includes("goblin") || race.includes("hobgoblin")) return "goblin";
  if (race.includes("tabaxi") || race.includes("leonin")) return "feline";
  if (race.includes("aarakocra") || race.includes("kenku") || race.includes("owlin")) return "avian";
  if (race.includes("lizardfolk") || race.includes("kobold") || race.includes("yuan-ti") || race.includes("tortle"))
    return "reptile";
  if (race.includes("genasi")) return "elemental";
  if (race.includes("warforged")) return "construct";
  if (
    race.includes("plasmoid") ||
    race.includes("thri-kreen") ||
    race.includes("gith") ||
    race.includes("kalashtar") ||
    race.includes("changeling")
  )
    return "aberrant";
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

export function getMerchantEditorSourceTypeOptions(_selected = MERCHANT_SOURCE_TYPES.WORLD_FOLDER) {
  const value = MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK;
  return [
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
      const type = String(folder?.type ?? folder?.documentName ?? "")
        .trim()
        .toLowerCase();
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
  const resolver =
    typeof options?.resolveFolderByAliases === "function"
      ? options.resolveFolderByAliases
      : () => ({ id: "", name: "" });
  const sourceFolder = resolver(blueprint?.folderAliases ?? []);
  const archetype = normalizeMerchantArchetype(blueprint?.archetype ?? MERCHANT_DEFAULTS.archetype);
  const archetypeDefaults = getMerchantArchetypeDefaults(archetype);
  const id = String(blueprint?.id ?? `starter-merchant-${index + 1}`).trim() || `starter-merchant-${index + 1}`;
  const name = String(blueprint?.name ?? `Starter Merchant ${index + 1}`).trim() || `Starter Merchant ${index + 1}`;
  const title = String(blueprint?.title ?? archetypeDefaults?.title ?? "").trim();
  const race = normalizeMerchantRace(blueprint?.race ?? "Human");
  const img = normalizeFoundryAssetImagePath(blueprint?.img, { fallback: "icons/svg/item-bag.svg" });
  const markupPercent = clampMerchantMarkupPercent(
    blueprint?.markupPercent,
    Number(archetypeDefaults?.pricing?.buyMarkup ?? MERCHANT_DEFAULTS.pricing.buyMarkup) * 100
  );
  const buyMarkup = Number((markupPercent / 100).toFixed(2));
  const maxItems = clampMerchantItemCount(
    blueprint?.maxItems,
    archetypeDefaults?.stock?.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems
  );
  const customMode = Boolean(blueprint?.customMode ?? false);
  const allowedTypes = normalizeMerchantAllowedItemTypes(
    blueprint?.allowedTypes ?? archetypeDefaults?.stock?.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST
  );
  const buybackAllowedTypes = normalizeMerchantAllowedItemTypes(
    blueprint?.buybackAllowedTypes ??
      archetypeDefaults?.pricing?.buybackAllowedTypes ??
      MERCHANT_DEFAULTS.pricing.buybackAllowedTypes
  );
  const sourceType = customMode
    ? normalizeMerchantSourceType(blueprint?.sourceType ?? MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK)
    : MERCHANT_SOURCE_TYPES.WORLD_ITEMS;
  return {
    id,
    name,
    title,
    race,
    img,
    settlement: "",
    archetype,
    customMode,
    type: normalizeMerchantType(blueprint?.type ?? archetypeDefaults?.type ?? MERCHANT_DEFAULTS.type),
    faction: normalizeMerchantFaction(blueprint?.faction ?? MERCHANT_DEFAULTS.faction),
    location: normalizeMerchantLocation(blueprint?.location ?? MERCHANT_DEFAULTS.location),
    disposition: normalizeMerchantDisposition(blueprint?.disposition ?? MERCHANT_DEFAULTS.disposition),
    liquidationMode: Boolean(blueprint?.liquidationMode ?? MERCHANT_DEFAULTS.liquidationMode),
    permissions: deepCloneValue(MERCHANT_DEFAULTS.permissions),
    accessMode: "all",
    isHidden: false,
    requiresContract: false,
    contractKey: "",
    socialGateEnabled: false,
    minSocialScore: 0,
    pricing: {
      buyMarkup,
      sellRate: Number(
        blueprint?.sellRate ?? archetypeDefaults?.pricing?.sellRate ?? MERCHANT_DEFAULTS.pricing.sellRate
      ),
      sellEnabled: MERCHANT_DEFAULTS.pricing.sellEnabled,
      cashOnHandGp: Number(
        blueprint?.cashOnHandGp ?? archetypeDefaults?.pricing?.cashOnHandGp ?? MERCHANT_DEFAULTS.pricing.cashOnHandGp
      ),
      buybackAllowedTypes,
      taxFeePercent: normalizeMerchantTaxFeePercent(
        blueprint?.taxFeePercent ?? MERCHANT_DEFAULTS.pricing.taxFeePercent
      ),
      rarityPricingEnabled: Boolean(MERCHANT_DEFAULTS.pricing.rarityPricingEnabled),
      rarityPriceMultipliers: normalizeMerchantRarityPriceMultipliers(
        blueprint?.rarityPriceMultipliers,
        archetypeDefaults?.pricing?.rarityPriceMultipliers ?? MERCHANT_DEFAULTS.pricing.rarityPriceMultipliers
      ),
      stockPressureEnabled: Boolean(MERCHANT_DEFAULTS.pricing.stockPressureEnabled),
      barterEnabled: MERCHANT_DEFAULTS.pricing.barterEnabled,
      barterDc: MERCHANT_DEFAULTS.pricing.barterDc,
      barterAbility: String(MERCHANT_DEFAULTS.pricing.barterAbility ?? "cha"),
      barterSuccessBuyModifier: normalizeMerchantBarterModifier(
        MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier,
        -0.1
      ),
      barterSuccessSellModifier: normalizeMerchantBarterModifier(
        MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier,
        0.1
      ),
      barterFailureBuyModifier: normalizeMerchantBarterModifier(
        MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier,
        0.1
      ),
      barterFailureSellModifier: normalizeMerchantBarterModifier(
        MERCHANT_DEFAULTS.pricing.barterFailureSellModifier,
        -0.1
      )
    },
    stock: {
      sourceType,
      sourceRef: sourceType === MERCHANT_SOURCE_TYPES.WORLD_FOLDER ? String(sourceFolder?.id ?? "").trim() : "",
      sourcePackIds:
        sourceType === MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK
          ? normalizeMerchantSourcePackIds(blueprint?.sourcePackIds ?? [], "")
          : [],
      includeTags: [],
      excludeTags: [],
      keywordInclude: [],
      keywordExclude: [],
      allowedTypes,
      curatedItemUuids: [],
      maxItems,
      targetValueGp: Math.max(
        0,
        Number(
          blueprint?.targetValueGp ?? archetypeDefaults?.stock?.targetValueGp ?? MERCHANT_DEFAULTS.stock.targetValueGp
        ) || 0
      ),
      valueStrictness: clampMerchantValueStrictness(
        blueprint?.valueStrictness ??
          archetypeDefaults?.stock?.valueStrictness ??
          MERCHANT_DEFAULTS.stock.valueStrictness,
        MERCHANT_DEFAULTS.stock.valueStrictness
      ),
      scarcity: normalizeMerchantScarcity(
        blueprint?.scarcity ?? archetypeDefaults?.stock?.scarcity ?? MERCHANT_SCARCITY_LEVELS.NORMAL
      ),
      duplicateChance: MERCHANT_DEFAULTS.stock.duplicateChance,
      maxStackSize: MERCHANT_DEFAULTS.stock.maxStackSize,
      mundaneAmmoWeightBoost: MERCHANT_DEFAULTS.stock.mundaneAmmoWeightBoost,
      mundaneAmmoStackSize: MERCHANT_DEFAULTS.stock.mundaneAmmoStackSize,
      rarityWeights: normalizeMerchantRarityWeights(MERCHANT_DEFAULTS.stock.rarityWeights),
      autoRefresh: normalizeMerchantAutoRefreshConfig(MERCHANT_DEFAULTS.stock.autoRefresh)
    },
    actorId: ""
  };
}

export function buildMerchantDefinitionPatchFromEditorForm(formValues = {}) {
  const source = formValues && typeof formValues === "object" ? formValues : {};
  const existingStock = source?.existingStock && typeof source.existingStock === "object" ? source.existingStock : {};
  const existingPricing =
    source?.existingPricing && typeof source.existingPricing === "object" ? source.existingPricing : {};
  const archetype = normalizeMerchantArchetype(
    source?.archetype ?? source?.existingArchetype ?? source?.existingMerchant?.archetype ?? MERCHANT_DEFAULTS.archetype
  );
  const archetypeDefaults = getMerchantArchetypeDefaults(archetype);
  const customMode =
    source?.customMode === undefined
      ? Boolean(
          source?.existingCustomMode ??
          source?.existingMerchant?.customMode ??
          merchantHasAdvancedStockConfig({ stock: existingStock, pricing: existingPricing })
        )
      : Boolean(source?.customMode);
  const markupPercentRaw = Number(
    source?.markupPercent ??
      Number(source?.buyMarkup ?? archetypeDefaults?.pricing?.buyMarkup ?? MERCHANT_DEFAULTS.pricing.buyMarkup) * 100
  );
  const markupPercent = clampMerchantMarkupPercent(
    markupPercentRaw,
    Number(archetypeDefaults?.pricing?.buyMarkup ?? MERCHANT_DEFAULTS.pricing.buyMarkup) * 100
  );
  const buyMarkup = Number((markupPercent / 100).toFixed(2));
  const sellRatePercentRaw = Number(
    source?.sellRatePercent ??
      source?.buybackRatePercent ??
      Number(
        source?.sellRate ??
          existingPricing?.sellRate ??
          archetypeDefaults?.pricing?.sellRate ??
          MERCHANT_DEFAULTS.pricing.sellRate
      ) * 100
  );
  const sellRate = Number.isFinite(sellRatePercentRaw)
    ? Math.max(0, Math.min(10, Number((sellRatePercentRaw / 100).toFixed(2))))
    : Number(MERCHANT_DEFAULTS.pricing.sellRate);
  const sellEnabled =
    source?.sellEnabled === undefined
      ? Boolean(existingPricing?.sellEnabled ?? MERCHANT_DEFAULTS.pricing.sellEnabled)
      : Boolean(source?.sellEnabled);
  const cashOnHandGpRaw = Number(
    source?.cashOnHandGp ??
      existingPricing?.cashOnHandGp ??
      archetypeDefaults?.pricing?.cashOnHandGp ??
      MERCHANT_DEFAULTS.pricing.cashOnHandGp
  );
  const cashOnHandGp = Number.isFinite(cashOnHandGpRaw)
    ? Math.max(0, Math.min(1000000, Number(cashOnHandGpRaw.toFixed(2))))
    : Number(MERCHANT_DEFAULTS.pricing.cashOnHandGp);
  const barterEnabled =
    source?.barterEnabled === undefined
      ? Boolean(existingPricing?.barterEnabled ?? MERCHANT_DEFAULTS.pricing.barterEnabled)
      : Boolean(source?.barterEnabled);
  const barterDcRaw = Number(source?.barterDc ?? existingPricing?.barterDc ?? MERCHANT_DEFAULTS.pricing.barterDc);
  const barterDc = Number.isFinite(barterDcRaw)
    ? Math.max(1, Math.min(40, Math.floor(barterDcRaw)))
    : Number(MERCHANT_DEFAULTS.pricing.barterDc);
  const barterAbilityRaw = String(
    source?.barterAbility ?? existingPricing?.barterAbility ?? MERCHANT_DEFAULTS.pricing.barterAbility
  )
    .trim()
    .toLowerCase();
  const barterAbility = ["str", "dex", "con", "int", "wis", "cha"].includes(barterAbilityRaw)
    ? barterAbilityRaw
    : String(MERCHANT_DEFAULTS.pricing.barterAbility ?? "cha");
  const barterSuccessBuyModifierPercentRaw = Number(
    source?.barterSuccessBuyModifierPercent ??
      Number(
        source?.barterSuccessBuyModifier ??
          existingPricing?.barterSuccessBuyModifier ??
          MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier
      ) * 100
  );
  const barterSuccessBuyModifier = Number.isFinite(barterSuccessBuyModifierPercentRaw)
    ? normalizeMerchantBarterModifier(
        barterSuccessBuyModifierPercentRaw / 100,
        MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier
      )
    : Number(MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier);
  const barterSuccessSellModifierPercentRaw = Number(
    source?.barterSuccessSellModifierPercent ??
      Number(
        source?.barterSuccessSellModifier ??
          existingPricing?.barterSuccessSellModifier ??
          MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier
      ) * 100
  );
  const barterSuccessSellModifier = Number.isFinite(barterSuccessSellModifierPercentRaw)
    ? normalizeMerchantBarterModifier(
        barterSuccessSellModifierPercentRaw / 100,
        MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier
      )
    : Number(MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier);
  const barterFailureBuyModifierPercentRaw = Number(
    source?.barterFailureBuyModifierPercent ??
      Number(
        source?.barterFailureBuyModifier ??
          existingPricing?.barterFailureBuyModifier ??
          MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier
      ) * 100
  );
  const barterFailureBuyModifier = Number.isFinite(barterFailureBuyModifierPercentRaw)
    ? normalizeMerchantBarterModifier(
        barterFailureBuyModifierPercentRaw / 100,
        MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier
      )
    : Number(MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier);
  const barterFailureSellModifierPercentRaw = Number(
    source?.barterFailureSellModifierPercent ??
      Number(
        source?.barterFailureSellModifier ??
          existingPricing?.barterFailureSellModifier ??
          MERCHANT_DEFAULTS.pricing.barterFailureSellModifier
      ) * 100
  );
  const barterFailureSellModifier = Number.isFinite(barterFailureSellModifierPercentRaw)
    ? normalizeMerchantBarterModifier(
        barterFailureSellModifierPercentRaw / 100,
        MERCHANT_DEFAULTS.pricing.barterFailureSellModifier
      )
    : Number(MERCHANT_DEFAULTS.pricing.barterFailureSellModifier);
  const accessModeRaw = String(source?.accessMode ?? source?.access?.mode ?? "all")
    .trim()
    .toLowerCase();
  const accessMode = accessModeRaw === "assigned" ? "assigned" : "all";
  const stockCount = clampMerchantItemCount(
    source?.stockCount ?? source?.maxItems ?? existingStock?.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems,
    MERCHANT_DEFAULTS.stock.maxItems
  );
  const sourceType = customMode
    ? normalizeMerchantSourceType(
        source?.sourceType ?? existingStock?.sourceType ?? MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK
      )
    : MERCHANT_SOURCE_TYPES.WORLD_ITEMS;
  const sourceRef = String(source?.sourceRef ?? "").trim();
  const sourceRefs =
    sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS
      ? []
      : normalizeMerchantSourcePackIds(source?.sourceRefs ?? source?.sourcePackIds ?? [], sourceRef);
  const resolvedSourceRef =
    sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS ? "" : String(sourceRefs[0] ?? sourceRef).trim();
  const sourcePackIds = sourceRefs;
  const allowedTypes = normalizeMerchantAllowedItemTypes(
    source?.allowedTypes ??
      existingStock?.allowedTypes ??
      archetypeDefaults?.stock?.allowedTypes ??
      MERCHANT_ALLOWED_ITEM_TYPE_LIST
  );
  const buybackAllowedTypes = normalizeMerchantAllowedItemTypes(
    source?.buybackAllowedTypes ??
      (source?.allowedTypes !== undefined
        ? allowedTypes
        : (existingPricing?.buybackAllowedTypes ?? archetypeDefaults?.pricing?.buybackAllowedTypes ?? allowedTypes))
  );
  const includeTags = customMode
    ? normalizeMerchantTagList(source?.includeTags ?? existingStock?.includeTags ?? [])
    : [];
  const excludeTags = customMode
    ? normalizeMerchantTagList(source?.excludeTags ?? existingStock?.excludeTags ?? [])
    : [];
  const keywordInclude = customMode
    ? normalizeMerchantKeywordList(source?.keywordInclude ?? existingStock?.keywordInclude ?? [])
    : [];
  const keywordExclude = customMode
    ? normalizeMerchantKeywordList(source?.keywordExclude ?? existingStock?.keywordExclude ?? [])
    : [];
  const targetValueGpRaw = Number(
    source?.targetValueGp ?? existingStock?.targetValueGp ?? archetypeDefaults?.stock?.targetValueGp ?? 0
  );
  const targetValueGp = Number.isFinite(targetValueGpRaw) ? Math.max(0, Number(targetValueGpRaw.toFixed(2))) : 0;
  const valueStrictness = clampMerchantValueStrictness(
    source?.valueStrictness ?? existingStock?.valueStrictness ?? MERCHANT_DEFAULTS.stock.valueStrictness,
    MERCHANT_DEFAULTS.stock.valueStrictness
  );
  const scarcity = normalizeMerchantScarcity(
    source?.scarcity ?? existingStock?.scarcity ?? MERCHANT_SCARCITY_LEVELS.NORMAL
  );
  const duplicateChance = clampMerchantDuplicateChance(
    source?.duplicateChance ?? existingStock?.duplicateChance ?? MERCHANT_DEFAULTS.stock.duplicateChance,
    MERCHANT_DEFAULTS.stock.duplicateChance
  );
  const maxStackSize = clampMerchantMaxStackSize(
    source?.maxStackSize ?? existingStock?.maxStackSize ?? MERCHANT_DEFAULTS.stock.maxStackSize,
    MERCHANT_DEFAULTS.stock.maxStackSize
  );
  const mundaneAmmoWeightBoost = clampMerchantMundaneAmmoWeightBoost(
    source?.mundaneAmmoWeightBoost ??
      existingStock?.mundaneAmmoWeightBoost ??
      MERCHANT_DEFAULTS.stock.mundaneAmmoWeightBoost,
    MERCHANT_DEFAULTS.stock.mundaneAmmoWeightBoost
  );
  const mundaneAmmoStackSize = clampMerchantMundaneAmmoStackSize(
    source?.mundaneAmmoStackSize ?? existingStock?.mundaneAmmoStackSize ?? MERCHANT_DEFAULTS.stock.mundaneAmmoStackSize,
    MERCHANT_DEFAULTS.stock.mundaneAmmoStackSize
  );
  const rarityWeights = normalizeMerchantRarityWeights(
    source?.rarityWeights ?? existingStock?.rarityWeights,
    MERCHANT_DEFAULTS.stock.rarityWeights
  );
  const autoRefresh = normalizeMerchantAutoRefreshConfig(
    source?.autoRefresh ?? {
      enabled: source?.autoRefreshEnabled ?? existingStock?.autoRefresh?.enabled,
      intervalDays:
        source?.autoRefreshIntervalDays ?? source?.refreshIntervalDays ?? existingStock?.autoRefresh?.intervalDays
    },
    existingStock?.autoRefresh ?? MERCHANT_DEFAULTS.stock.autoRefresh
  );
  const taxFeePercent = normalizeMerchantTaxFeePercent(
    source?.taxFeePercent ?? existingPricing?.taxFeePercent ?? MERCHANT_DEFAULTS.pricing.taxFeePercent
  );
  const rarityPricingEnabled =
    source?.rarityPricingEnabled === undefined
      ? Boolean(existingPricing?.rarityPricingEnabled ?? MERCHANT_DEFAULTS.pricing.rarityPricingEnabled)
      : Boolean(source?.rarityPricingEnabled);
  const rarityPriceMultipliers = normalizeMerchantRarityPriceMultipliers(
    source?.rarityPriceMultipliers ?? existingPricing?.rarityPriceMultipliers,
    archetypeDefaults?.pricing?.rarityPriceMultipliers ?? MERCHANT_DEFAULTS.pricing.rarityPriceMultipliers
  );
  const stockPressureEnabled =
    source?.stockPressureEnabled === undefined
      ? Boolean(existingPricing?.stockPressureEnabled ?? MERCHANT_DEFAULTS.pricing.stockPressureEnabled)
      : Boolean(source?.stockPressureEnabled);
  const permissionsSource = source?.permissions && typeof source.permissions === "object" ? source.permissions : {};
  const patch = {
    id: String(source?.id ?? "").trim(),
    name: String(source?.name ?? "").trim(),
    title: String(source?.title ?? archetypeDefaults?.title ?? "").trim(),
    race: normalizeMerchantRace(source?.race ?? ""),
    img: normalizeFoundryAssetImagePath(source?.img, { fallback: "" }),
    settlement: String(source?.settlement ?? "").trim(),
    archetype,
    customMode,
    type: normalizeMerchantType(source?.type ?? archetypeDefaults?.type ?? MERCHANT_DEFAULTS.type),
    faction: normalizeMerchantFaction(source?.faction ?? MERCHANT_DEFAULTS.faction),
    location: normalizeMerchantLocation(source?.location ?? MERCHANT_DEFAULTS.location),
    disposition: normalizeMerchantDisposition(source?.disposition ?? MERCHANT_DEFAULTS.disposition),
    liquidationMode: Boolean(source?.liquidationMode ?? MERCHANT_DEFAULTS.liquidationMode),
    permissions: {
      player: {
        buy:
          permissionsSource?.player?.buy === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.player.buy)
            : Boolean(permissionsSource.player.buy),
        sell:
          permissionsSource?.player?.sell === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.player.sell)
            : Boolean(permissionsSource.player.sell)
      },
      assistant: {
        edit:
          permissionsSource?.assistant?.edit === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.assistant.edit)
            : Boolean(permissionsSource.assistant.edit),
        override:
          permissionsSource?.assistant?.override === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.assistant.override)
            : Boolean(permissionsSource.assistant.override)
      },
      gm: {
        edit:
          permissionsSource?.gm?.edit === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.gm.edit)
            : Boolean(permissionsSource.gm.edit),
        override:
          permissionsSource?.gm?.override === undefined
            ? Boolean(MERCHANT_DEFAULTS.permissions.gm.override)
            : Boolean(permissionsSource.gm.override)
      }
    },
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
      taxFeePercent,
      rarityPricingEnabled,
      rarityPriceMultipliers,
      stockPressureEnabled,
      barterEnabled,
      barterDc,
      barterAbility,
      barterSuccessBuyModifier,
      barterSuccessSellModifier,
      barterFailureBuyModifier,
      barterFailureSellModifier
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
      curatedItemUuids: customMode ? normalizeMerchantCuratedItemUuids(existingStock?.curatedItemUuids ?? []) : [],
      maxItems: stockCount,
      targetValueGp,
      valueStrictness,
      scarcity,
      duplicateChance,
      maxStackSize,
      mundaneAmmoWeightBoost,
      mundaneAmmoStackSize,
      rarityWeights,
      autoRefresh
    },
    actorId: String(source?.actorId ?? "").trim()
  };
  return mergeMerchantArchetypeDefaults(patch, archetype, customMode);
}

function getMerchantOfferTagDefinitionById(tagIdInput = "") {
  const tagId = String(tagIdInput ?? "")
    .trim()
    .toLowerCase();
  return MERCHANT_OFFER_TAG_DEFINITIONS.find((entry) => entry.id === tagId) ?? null;
}

function normalizeMerchantOfferTagIds(tagIds = []) {
  const source = Array.isArray(tagIds) ? tagIds : [];
  return source
    .map((entry) =>
      String(entry ?? "")
        .trim()
        .toLowerCase()
    )
    .filter((entry, index, rows) => entry.length > 0 && rows.indexOf(entry) === index)
    .filter((entry) => Boolean(getMerchantOfferTagDefinitionById(entry)));
}

export function buildMerchantOfferTagOptions(selectedTypes = []) {
  const allowedTypeSet = new Set(normalizeMerchantAllowedItemTypes(selectedTypes));
  const selectedAll = MERCHANT_ALLOWED_ITEM_TYPE_LIST.every((itemType) => allowedTypeSet.has(itemType));
  return MERCHANT_OFFER_TAG_DEFINITIONS.map((definition) => {
    const selected =
      definition.id === "all"
        ? selectedAll
        : !selectedAll && definition.itemTypes.some((itemType) => allowedTypeSet.has(itemType));
    return {
      id: definition.id,
      label: definition.label,
      selected
    };
  });
}

export function resolveMerchantAllowedTypesFromOfferTags(
  selectedTagIds = [],
  fallbackTypes = MERCHANT_ALLOWED_ITEM_TYPE_LIST
) {
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
  const selectedCity = String(selectedCityInput ?? "")
    .trim()
    .slice(0, MERCHANT_MAX_CITY_LENGTH);
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
  if (
    selectedCity &&
    !options.some((entry) => String(entry.value ?? "").toLowerCase() === selectedCity.toLowerCase())
  ) {
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
  const getItemGpValue =
    typeof options?.getItemGpValue === "function" ? options.getItemGpValue : (value) => Number(value ?? 0);
  const baseGp = Math.max(0, Number(getItemGpValue(itemData) || 0));
  const scalar = Number.isFinite(Number(rate)) ? Math.max(0, Number(rate)) : 1;
  return Math.max(0, Math.round(baseGp * scalar * 100));
}

export function getMerchantSourceRefOptionsForEditor(
  sourceTypeInput,
  selectedSourceRefs = [],
  sourcePackOptions = [],
  options = {}
) {
  const sourceType = normalizeMerchantSourceType(sourceTypeInput);
  const selectedValues = normalizeMerchantSourcePackIds(selectedSourceRefs);
  const selectedSet = new Set(selectedValues);
  const selectedPrimary = String(selectedValues[0] ?? "").trim();
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS) {
    const worldOptions = [
      {
        value: "",
        label: "All World Items",
        selected: !selectedPrimary
      }
    ];
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
    const getWorldFolderOptions =
      typeof options?.getWorldFolderOptions === "function" ? options.getWorldFolderOptions : () => [];
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
    return [
      {
        value: "",
        label: "No Compendium Packs Available",
        selected: true,
        disabled: true
      }
    ];
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
  const weights = [];
  for (const entry of entries) {
    const weightRaw = Number(weightAccessor(entry));
    const weight = Number.isFinite(weightRaw) ? Math.max(0, weightRaw) : 0;
    weights.push(weight);
    total += weight;
  }
  if (total <= 0) return entries[0] ?? null;
  let cursor = random() * total;
  for (let index = 0; index < entries.length; index += 1) {
    const weight = weights[index] ?? 0;
    cursor -= weight;
    if (cursor <= 0) return entries[index] ?? entries[0] ?? null;
  }
  return entries[entries.length - 1] ?? entries[0] ?? null;
}

function isAmmoCandidate(candidate = {}) {
  const dataType = String(candidate?.data?.type ?? "")
    .trim()
    .toLowerCase();
  if (dataType === "ammunition") return true;
  const itemType = String(candidate?.itemType ?? "")
    .trim()
    .toLowerCase();
  return itemType === "ammunition";
}

function getAmmoEnchantmentLevel(candidate = {}) {
  if (!isAmmoCandidate(candidate)) return 0;
  const candidateName = String(candidate?.name ?? candidate?.data?.name ?? "").trim();
  const plusMatch = candidateName.match(/\+(\d+)/);
  if (plusMatch) {
    const parsed = Number.parseInt(String(plusMatch[1] ?? "0"), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const keywords = Array.isArray(candidate?.keywords) ? candidate.keywords : [];
  const hasMagicKeyword = keywords.some((value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .includes("magic")
  );
  return hasMagicKeyword ? 1 : 0;
}

function isMundaneAmmoCandidate(candidate = {}) {
  return isAmmoCandidate(candidate) && getAmmoEnchantmentLevel(candidate) <= 0;
}

function isCommonMundaneAmmoCandidate(candidate = {}, getRarityBucket = getMerchantRarityBucket) {
  if (!isMundaneAmmoCandidate(candidate)) return false;
  return getRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "") === "common";
}

function getMerchantCandidateTokenSet(candidate = {}) {
  const rows = [
    String(candidate?.name ?? candidate?.data?.name ?? ""),
    ...(Array.isArray(candidate?.keywords) ? candidate.keywords : []),
    ...(Array.isArray(candidate?.tags) ? candidate.tags : [])
  ];
  return new Set(
    rows
      .flatMap((entry) =>
        String(entry ?? "")
          .trim()
          .toLowerCase()
          .split(/[^a-z0-9+]+/)
      )
      .filter(Boolean)
  );
}

function hasMerchantTokenKeywordMatch(tokenSet, keywords = []) {
  if (!(tokenSet instanceof Set) || tokenSet.size <= 0) return false;
  const tokens = Array.from(tokenSet);
  return (Array.isArray(keywords) ? keywords : []).some((keyword) => {
    const normalized = String(keyword ?? "")
      .trim()
      .toLowerCase();
    if (!normalized) return false;
    if (tokenSet.has(normalized)) return true;
    return tokens.some((token) => token.includes(normalized) || normalized.includes(token));
  });
}

function getMerchantSectionMetaForCandidate(
  candidate = {},
  archetypeDefinition = getMerchantArchetypeDefinition(),
  tokenSet = getMerchantCandidateTokenSet(candidate)
) {
  const itemType = String(candidate?.data?.type ?? candidate?.itemType ?? "")
    .trim()
    .toLowerCase();
  const rareItem = ["rare", "very-rare", "legendary"].includes(
    getMerchantRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "")
  );
  const featuredHit =
    rareItem ||
    candidate?.isCurated ||
    hasMerchantTokenKeywordMatch(tokenSet, archetypeDefinition?.featuredKeywords ?? []);
  if (featuredHit) return { key: "featured", label: "Featured Finds" };
  if (archetypeDefinition?.id === "apothecary" && itemType === "consumable") {
    return { key: "elixirs", label: "Elixirs & Remedies" };
  }
  if (archetypeDefinition?.id === "magic-dealer" && ["consumable", "spell"].includes(itemType)) {
    return { key: "arcana", label: "Arcane Curios" };
  }
  if (itemType === "weapon") return { key: "weapons", label: "Arms Rack" };
  if (itemType === "ammunition") return { key: "ammunition", label: "Ammunition" };
  if (itemType === "armor") return { key: "armor", label: "Protection" };
  if (itemType === "tool") return { key: "tools", label: "Tools & Kits" };
  if (itemType === "backpack") return { key: "packs", label: "Packs & Containers" };
  if (itemType === "equipment") return { key: "gear", label: "Field Gear" };
  if (itemType === "consumable") return { key: "consumables", label: "Supplies & Tonics" };
  if (itemType === "spell") return { key: "spells", label: "Arcane Stock" };
  return { key: "misc", label: "Shop Stock" };
}

function getMerchantArchetypeCandidateScore(
  candidate = {},
  merchant = {},
  getRarityBucket = getMerchantRarityBucket,
  tokenSet = getMerchantCandidateTokenSet(candidate)
) {
  const definition = getMerchantArchetypeDefinition(merchant?.archetype ?? MERCHANT_DEFAULTS.archetype);
  const itemType = String(candidate?.data?.type ?? candidate?.itemType ?? "")
    .trim()
    .toLowerCase();
  const preferredTypes = Array.isArray(definition?.preferredTypes) ? definition.preferredTypes : [];
  const avoidTypes = new Set(Array.isArray(definition?.avoidTypes) ? definition.avoidTypes : []);
  const typeIndex = preferredTypes.indexOf(itemType);
  let score = typeIndex >= 0 ? Math.max(0.3, 2.4 - typeIndex * 0.23) : 0.55;
  if (avoidTypes.has(itemType)) score *= 0.18;
  if (hasMerchantTokenKeywordMatch(tokenSet, definition?.focusKeywords ?? [])) score *= 1.5;
  if (hasMerchantTokenKeywordMatch(tokenSet, definition?.featuredKeywords ?? [])) score *= 1.2;
  const rarityBucket = getRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "");
  if (definition?.id === "magic-dealer") {
    if (rarityBucket === "common") score *= 0.65;
    if (["uncommon", "rare", "very-rare", "legendary"].includes(rarityBucket)) score *= 1.35;
  } else if (["very-rare", "legendary"].includes(rarityBucket)) {
    score *= 0.75;
  }
  if (["trinket", "loot"].includes(itemType) && definition?.id !== "magic-dealer") score *= 0.5;
  if (candidate?.isCurated) score *= 1.15;
  return Math.max(0.01, Number(score.toFixed(4)));
}

function enrichMerchantCandidateForSelection(candidate = {}, merchant = {}, getRarityBucket = getMerchantRarityBucket) {
  const definition = getMerchantArchetypeDefinition(merchant?.archetype ?? MERCHANT_DEFAULTS.archetype);
  const tokenSet = getMerchantCandidateTokenSet(candidate);
  const section = getMerchantSectionMetaForCandidate(candidate, definition, tokenSet);
  const archetypeScore = getMerchantArchetypeCandidateScore(candidate, merchant, getRarityBucket, tokenSet);
  const featuredWeight = section.key === "featured" ? archetypeScore * 1.35 : archetypeScore;
  return {
    ...candidate,
    merchantArchetype: definition.id,
    merchantSectionKey: section.key,
    merchantSectionLabel: section.label,
    merchantArchetypeScore: archetypeScore,
    merchantFeaturedWeight: Number(featuredWeight.toFixed(4))
  };
}

function getMerchantSectionPriority(sectionKey = "") {
  const normalized = String(sectionKey ?? "")
    .trim()
    .toLowerCase();
  if (normalized === "featured") return 99;
  const order = [
    "gear",
    "packs",
    "tools",
    "weapons",
    "ammunition",
    "armor",
    "consumables",
    "elixirs",
    "arcana",
    "spells",
    "misc"
  ];
  const index = order.indexOf(normalized);
  return index >= 0 ? index : 50;
}

export function selectMerchantStockRows(candidates = [], merchant = {}, options = {}) {
  const customMode = Boolean(merchant?.customMode);
  const normalizeCuratedItemUuids =
    typeof options?.normalizeCuratedItemUuids === "function"
      ? options.normalizeCuratedItemUuids
      : normalizeMerchantCuratedItemUuids;
  const normalizeRarityWeights =
    typeof options?.normalizeRarityWeights === "function"
      ? options.normalizeRarityWeights
      : normalizeMerchantRarityWeights;
  const getTargetCount =
    typeof options?.getTargetStockCount === "function" ? options.getTargetStockCount : getMerchantTargetStockCount;
  const getRarityBucket =
    typeof options?.getRarityBucket === "function" ? options.getRarityBucket : getMerchantRarityBucket;
  const shuffleRows = typeof options?.shuffleRows === "function" ? options.shuffleRows : shuffleMerchantRows;
  const random = typeof options?.randomFn === "function" ? options.randomFn : Math.random;
  const stock = merchant?.stock ?? {};
  const curatedOrder = customMode ? normalizeCuratedItemUuids(stock?.curatedItemUuids ?? []) : [];
  const targetCount = Math.max(1, Number(getTargetCount(stock)) || 1);
  const targetValueGpRaw = Number(stock?.targetValueGp ?? 0);
  const targetValueGp = Number.isFinite(targetValueGpRaw) ? Math.max(0, targetValueGpRaw) : 0;
  const valueTolerance = resolveMerchantValueTolerance(
    targetValueGp,
    stock?.valueStrictness ?? MERCHANT_DEFAULTS.stock.valueStrictness
  );
  const valueStrictnessScale = Math.max(
    0.5,
    Math.min(3, Number(valueTolerance?.strictness ?? MERCHANT_DEFAULT_VALUE_STRICTNESS) / 100)
  );
  const duplicateChance =
    clampMerchantDuplicateChance(stock?.duplicateChance, MERCHANT_DEFAULTS.stock.duplicateChance) / 100;
  const maxStackSize = clampMerchantMaxStackSize(stock?.maxStackSize, MERCHANT_DEFAULTS.stock.maxStackSize);
  const rarityWeights = normalizeRarityWeights(stock?.rarityWeights ?? MERCHANT_DEFAULTS.stock.rarityWeights);
  const shuffled = shuffleRows(Array.isArray(candidates) ? candidates : []).map((entry) =>
    enrichMerchantCandidateForSelection(entry, merchant, getRarityBucket)
  );
  if (shuffled.length <= 0) return [];

  const candidateByKey = new Map();
  for (const row of shuffled) {
    const key = String(row?.key ?? "").trim();
    if (!key || candidateByKey.has(key)) continue;
    candidateByKey.set(key, row);
  }

  const selected = [];
  const selectedByKey = new Map();
  const selectedBaseKeys = new Set();
  const selectedStacksByBaseKey = new Map();
  let remainingCandidatePool = null;
  let totalUnits = 0;
  let runningValue = 0;
  const budgetEnabled = targetValueGp > 0;
  const budgetTolerance = budgetEnabled ? valueTolerance.toleranceGp : Infinity;
  const budgetHardCap = budgetEnabled ? valueTolerance.maxGp : Infinity;
  const maxGeneratedRows = MERCHANT_MAX_GENERATED_ITEM_COUNT;
  const mundaneAmmoWeightBoost = clampMerchantMundaneAmmoWeightBoost(
    stock?.mundaneAmmoWeightBoost,
    MERCHANT_DEFAULTS.stock.mundaneAmmoWeightBoost
  );
  const mundaneAmmoRollQuantity = clampMerchantMundaneAmmoStackSize(
    stock?.mundaneAmmoStackSize,
    MERCHANT_DEFAULTS.stock.mundaneAmmoStackSize
  );
  const archetypeDefinition = getMerchantArchetypeDefinition(merchant?.archetype ?? MERCHANT_DEFAULTS.archetype);
  const coreTarget = Math.max(
    1,
    Math.min(
      targetCount,
      Math.round(targetCount * Math.max(0.45, Number(archetypeDefinition?.coreRatio ?? 0.7) || 0.7))
    )
  );
  const canAddRows = () => selected.length < targetCount;
  const canAddRowsBeyondTarget = () =>
    budgetEnabled && runningValue < targetValueGp && selected.length < maxGeneratedRows;

  const resolveBaseKey = (entry) => String(entry?.sourceKey ?? entry?.key ?? "").trim();
  const getStacksForBaseKey = (baseKey) => selectedStacksByBaseKey.get(baseKey) ?? [];
  const canDuplicateBaseKey = (baseKey) => {
    const stacks = getStacksForBaseKey(baseKey);
    if (stacks.length <= 0) return false;
    if (stacks.some((entry) => Number(entry?.quantity ?? 1) < maxStackSize)) return true;
    return selected.length < maxGeneratedRows;
  };
  const canDuplicateAnySelected = () => selected.some((entry) => canDuplicateBaseKey(resolveBaseKey(entry)));
  const shouldContinueSelection = () =>
    canAddRows() ||
    canAddRowsBeyondTarget() ||
    (budgetEnabled && runningValue < targetValueGp && canDuplicateAnySelected());

  const getCandidateBudgetValue = (candidate) => {
    const cachedBudgetValue = Number(candidate?.merchantBudgetValue);
    if (Number.isFinite(cachedBudgetValue) && cachedBudgetValue > 0) return cachedBudgetValue;
    const base = Math.max(0, Number(candidate?.gpValue ?? 0) || 0);
    if (base > 0) return base;
    const bucket = getRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "");
    const estimated = Number(MERCHANT_ESTIMATED_GP_BY_RARITY[bucket] ?? MERCHANT_ESTIMATED_GP_BY_RARITY.common);
    return Number.isFinite(estimated) ? Math.max(0.01, estimated) : 0.01;
  };

  const canAffordCandidate = (candidate, quantity = 1, bypassBudget = false) => {
    if (!budgetEnabled || bypassBudget) return true;
    const qty = Math.max(1, Number(quantity) || 1);
    const candidateValue = getCandidateBudgetValue(candidate) * qty;
    if (candidateValue <= 0) return true;
    if (selected.length <= 0) return true;
    if (runningValue >= budgetHardCap) return false;
    const projectedValue = runningValue + candidateValue;
    return projectedValue <= budgetHardCap;
  };

  const addSelection = (candidate, quantity = 1, addOptions = {}) => {
    const baseKey = String(candidate?.key ?? "").trim();
    if (!baseKey || quantity <= 0) return false;
    const bypassBudget = addOptions?.bypassBudget === true;
    if (!canAffordCandidate(candidate, quantity, bypassBudget)) return false;
    const stacks = getStacksForBaseKey(baseKey);
    const entry = stacks.find((stack) => Number(stack?.quantity ?? 1) < maxStackSize) ?? null;
    const budgetValue = getCandidateBudgetValue(candidate);
    if (entry) {
      const nextQuantity = Math.max(1, Number(entry.quantity ?? 1) + quantity);
      entry.quantity = nextQuantity;
      totalUnits += quantity;
      runningValue += budgetValue * quantity;
      return true;
    }
    if (selected.length >= maxGeneratedRows) return false;
    const stackKey = stacks.length <= 0 ? baseKey : `${baseKey}::stack-${stacks.length + 1}`;
    const created = {
      ...candidate,
      key: stackKey,
      sourceKey: baseKey,
      quantity: Math.max(1, quantity),
      merchantStockRole: String(addOptions?.stockRole ?? candidate?.merchantStockRole ?? "core"),
      merchantSectionKey: String(candidate?.merchantSectionKey ?? "misc"),
      merchantSectionLabel: String(candidate?.merchantSectionLabel ?? "Shop Stock"),
      merchantArchetype: String(candidate?.merchantArchetype ?? merchant?.archetype ?? MERCHANT_DEFAULTS.archetype)
    };
    delete created.merchantBudgetValue;
    delete created.merchantRollQuantity;
    delete created.merchantSelectionStaticWeight;
    delete created.merchantDuplicateStaticWeight;
    selected.push(created);
    selectedByKey.set(stackKey, created);
    selectedBaseKeys.add(baseKey);
    if (remainingCandidatePool) {
      const remainingIndex = remainingCandidatePool.findIndex((entry) => String(entry?.key ?? "").trim() === baseKey);
      if (remainingIndex >= 0) remainingCandidatePool.splice(remainingIndex, 1);
    }
    selectedStacksByBaseKey.set(baseKey, [...stacks, created]);
    totalUnits += created.quantity;
    runningValue += budgetValue * created.quantity;
    return true;
  };

  const getRarityWeight = (candidate) => {
    const bucket = getRarityBucket(candidate?.rarityBucket ?? candidate?.rarity ?? "");
    const raw = Number(rarityWeights?.[bucket] ?? rarityWeights?.common ?? 1);
    return Number.isFinite(raw) ? Math.max(0.01, raw) : 1;
  };

  const getBudgetWeight = (candidate) => {
    if (targetValueGp <= 0) return 1;
    const value = getCandidateBudgetValue(candidate);
    const remainingValue = Math.max(0, targetValueGp - runningValue);
    const remainingSlots = Math.max(1, targetCount - totalUnits);
    const desiredValue = Math.max(
      0.01,
      remainingValue > 0 ? remainingValue / remainingSlots : targetValueGp / Math.max(1, targetCount)
    );
    const ratio = Math.max(0.01, value / Math.max(0.01, desiredValue));
    const logDistance = Math.abs(Math.log(ratio));
    let weight = Math.exp(-(logDistance * (2.35 * valueStrictnessScale)));
    const acceptableCeiling = Math.max(desiredValue, remainingValue + budgetTolerance);
    if (value > acceptableCeiling) {
      const overshootRatio = value / Math.max(0.01, acceptableCeiling);
      weight *= Math.exp(-((overshootRatio - 1) * (3.8 * valueStrictnessScale)));
    }
    const lateSelection = remainingSlots <= Math.max(2, Math.ceil(targetCount * 0.25));
    if (lateSelection && value < desiredValue) {
      const shortfallRatio = (desiredValue - value) / Math.max(0.01, desiredValue);
      weight *= Math.exp(-(shortfallRatio * (1.8 * valueStrictnessScale)));
    }
    if (remainingValue > 0 && value <= Math.max(0.01, remainingValue + budgetTolerance)) {
      const closenessToGap = 1 - Math.min(1, Math.abs(remainingValue - value) / Math.max(1, remainingValue));
      weight *= 1 + Math.max(0, closenessToGap) * 0.45 * valueStrictnessScale;
    }
    return Math.max(0.01, weight);
  };

  const getSelectionWeight = (candidate) => {
    const staticWeight = Number(candidate?.merchantSelectionStaticWeight);
    if (Number.isFinite(staticWeight) && staticWeight > 0) return staticWeight * getBudgetWeight(candidate);
    const curatedBoost = candidate?.isCurated ? 1.25 : 1;
    const ammoBoost = isCommonMundaneAmmoCandidate(candidate, getRarityBucket) ? mundaneAmmoWeightBoost : 1;
    const archetypeBoost = Math.max(0.01, Number(candidate?.merchantArchetypeScore ?? 1) || 1);
    return getRarityWeight(candidate) * getBudgetWeight(candidate) * curatedBoost * ammoBoost * archetypeBoost;
  };

  const getRollQuantity = (candidate) => {
    const cachedRollQuantity = Number(candidate?.merchantRollQuantity);
    if (Number.isFinite(cachedRollQuantity) && cachedRollQuantity > 0) return cachedRollQuantity;
    if (isCommonMundaneAmmoCandidate(candidate, getRarityBucket)) return mundaneAmmoRollQuantity;
    return 1;
  };

  for (const candidate of shuffled) {
    candidate.merchantBudgetValue = getCandidateBudgetValue(candidate);
    candidate.merchantRollQuantity = isCommonMundaneAmmoCandidate(candidate, getRarityBucket)
      ? mundaneAmmoRollQuantity
      : 1;
    const curatedBoost = candidate?.isCurated ? 1.25 : 1;
    const ammoBoost = candidate.merchantRollQuantity > 1 ? mundaneAmmoWeightBoost : 1;
    const archetypeBoost = Math.max(0.01, Number(candidate?.merchantArchetypeScore ?? 1) || 1);
    const featuredBoost = Math.max(
      0.01,
      Number(candidate?.merchantFeaturedWeight ?? candidate?.merchantArchetypeScore ?? 1) || 1
    );
    const rarityWeight = getRarityWeight(candidate);
    candidate.merchantSelectionStaticWeight = rarityWeight * curatedBoost * ammoBoost * archetypeBoost;
    candidate.merchantDuplicateStaticWeight = rarityWeight * featuredBoost;
  }

  if (curatedOrder.length > 0) {
    for (const uuid of curatedOrder) {
      if (!canAddRows() && !canAddRowsBeyondTarget()) break;
      const match = candidateByKey.get(String(uuid ?? "").trim());
      if (!match) continue;
      addSelection(match, getRollQuantity(match), {
        bypassBudget: true,
        stockRole: selected.length < coreTarget ? "core" : "featured"
      });
    }
  }

  const deterministicCorePool = shuffled
    .filter((entry) => !selectedBaseKeys.has(String(entry?.key ?? "").trim()))
    .sort((left, right) => {
      const rightScore = Number(right?.merchantArchetypeScore ?? 0) + (right?.isCurated ? 0.4 : 0);
      const leftScore = Number(left?.merchantArchetypeScore ?? 0) + (left?.isCurated ? 0.4 : 0);
      if (rightScore !== leftScore) return rightScore - leftScore;
      const sectionDiff =
        getMerchantSectionPriority(left?.merchantSectionKey) - getMerchantSectionPriority(right?.merchantSectionKey);
      if (sectionDiff !== 0) return sectionDiff;
      return String(left?.key ?? "").localeCompare(String(right?.key ?? ""));
    });
  for (const candidate of deterministicCorePool) {
    if (selected.length >= coreTarget) break;
    addSelection(candidate, getRollQuantity(candidate), { stockRole: "core" });
  }

  remainingCandidatePool = shuffled.filter((entry) => !selectedBaseKeys.has(String(entry?.key ?? "").trim()));
  let safety = 0;
  const budgetSafetyFloor = budgetEnabled ? Math.max(120, Math.ceil(targetValueGp * 25)) : 0;
  const safetyLimit = Math.max(targetCount * 30, Math.min(5000, budgetSafetyFloor));
  while (shouldContinueSelection() && safety < safetyLimit) {
    safety += 1;
    const canAddNewCandidate = canAddRows() || canAddRowsBeyondTarget();
    const duplicatePool = selected.filter((entry) => canDuplicateBaseKey(resolveBaseKey(entry)));
    const affordableCandidates = canAddNewCandidate
      ? remainingCandidatePool.filter((entry) => canAffordCandidate(entry, getRollQuantity(entry)))
      : [];
    const affordableDuplicates = duplicatePool.filter((entry) => canAffordCandidate(entry, getRollQuantity(entry)));

    const canDuplicate = affordableDuplicates.length > 0;
    const shouldDuplicate = canDuplicate && duplicateChance > 0 && random() < duplicateChance;
    if (shouldDuplicate) {
      const duplicatePick = chooseWeightedRow(
        affordableDuplicates,
        (entry) => {
          const rarityWeight = getRarityWeight(entry);
          const valueWeight = getBudgetWeight(entry);
          const value = getCandidateBudgetValue(entry);
          const affordableBoost = targetValueGp > 0 && value <= Math.max(0, targetValueGp - runningValue) ? 1.1 : 1;
          const duplicateStaticWeight =
            Number(entry?.merchantDuplicateStaticWeight) ||
            rarityWeight *
              Math.max(0.01, Number(entry?.merchantFeaturedWeight ?? entry?.merchantArchetypeScore ?? 1) || 1);
          return duplicateStaticWeight * valueWeight * affordableBoost;
        },
        random
      );
      if (duplicatePick) {
        addSelection(duplicatePick, getRollQuantity(duplicatePick), { stockRole: "featured" });
        continue;
      }
    }

    if (affordableCandidates.length > 0) {
      const picked = chooseWeightedRow(
        affordableCandidates,
        (entry) => {
          const baseWeight = getSelectionWeight(entry);
          const featuredWeight = Math.max(0.01, Number(entry?.merchantFeaturedWeight ?? 1) || 1);
          return baseWeight * featuredWeight;
        },
        random
      );
      if (picked) {
        addSelection(picked, getRollQuantity(picked), { stockRole: "featured" });
        continue;
      }
    }

    if (canDuplicate) {
      const fallbackDuplicate = chooseWeightedRow(affordableDuplicates, getSelectionWeight, random);
      if (fallbackDuplicate) {
        addSelection(fallbackDuplicate, getRollQuantity(fallbackDuplicate), { stockRole: "featured" });
        continue;
      }
    }
    break;
  }

  if (selected.length === 0 && shuffled.length > 0) {
    addSelection(shuffled[0], getRollQuantity(shuffled[0]), { stockRole: "core" });
  }
  return selected;
}

export function buildMerchantStockCandidateRows(documents = [], merchant = {}, options = {}) {
  const getItemData = typeof options?.getItemData === "function" ? options.getItemData : (value) => value ?? {};
  const getItemTags = typeof options?.getItemTags === "function" ? options.getItemTags : () => [];
  const getItemKeywords =
    typeof options?.getItemKeywords === "function" ? options.getItemKeywords : (_data, tags) => tags;
  const matchesTagFilters = typeof options?.matchesTagFilters === "function" ? options.matchesTagFilters : () => true;
  const matchesKeywordFilters =
    typeof options?.matchesKeywordFilters === "function" ? options.matchesKeywordFilters : () => true;
  const getItemRarity = typeof options?.getItemRarity === "function" ? options.getItemRarity : () => "";
  const getRarityBucket =
    typeof options?.getRarityBucket === "function" ? options.getRarityBucket : getMerchantRarityBucket;
  const getItemGpValue = typeof options?.getItemGpValue === "function" ? options.getItemGpValue : () => 0;
  const allowedItemTypes =
    options?.allowedItemTypes instanceof Set ? options.allowedItemTypes : MERCHANT_ALLOWED_ITEM_TYPES;
  const normalizeCuratedUuids =
    typeof options?.normalizeCuratedItemUuids === "function"
      ? options.normalizeCuratedItemUuids
      : normalizeMerchantCuratedItemUuids;
  const normalizeAllowedTypes =
    typeof options?.normalizeAllowedItemTypes === "function"
      ? options.normalizeAllowedItemTypes
      : normalizeMerchantAllowedItemTypes;
  const normalizeTags =
    typeof options?.normalizeTagList === "function" ? options.normalizeTagList : normalizeMerchantTagList;
  const normalizeKeywords =
    typeof options?.normalizeKeywordList === "function" ? options.normalizeKeywordList : normalizeMerchantKeywordList;
  const customMode = Boolean(merchant?.customMode);
  const stock = merchant?.stock ?? {};
  const archetypeDefaults = getMerchantArchetypeDefaults(merchant?.archetype ?? MERCHANT_DEFAULTS.archetype);
  const curatedUuids = new Set(customMode ? normalizeCuratedUuids(stock?.curatedItemUuids ?? []) : []);
  const allowedTypes = new Set(
    normalizeAllowedTypes(
      customMode ? (stock?.allowedTypes ?? []) : (archetypeDefaults?.stock?.allowedTypes ?? stock?.allowedTypes ?? [])
    )
  );
  const includeTags = customMode ? normalizeTags(stock?.includeTags ?? []) : [];
  const excludeTags = customMode ? normalizeTags(stock?.excludeTags ?? []) : [];
  const includeKeywords = customMode ? normalizeKeywords(stock?.keywordInclude ?? []) : [];
  const excludeKeywords = customMode ? normalizeKeywords(stock?.keywordExclude ?? []) : [];
  const rows = [];
  for (const documentRef of Array.isArray(documents) ? documents : []) {
    const data = getItemData(documentRef);
    const itemType = String(data?.type ?? "")
      .trim()
      .toLowerCase();
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
    const rarity = String(getItemRarity(data) ?? "")
      .trim()
      .toLowerCase();
    const gpValue = Math.max(0, Number(getItemGpValue(data) || 0));
    rows.push({
      key: rowKey,
      name: itemName,
      itemType,
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

// ─── Merchant Rework v1 helpers ──────────────────────────────────────────────

/** Returns the rarity price multiplier for an item, optionally using merchant-specific overrides. */
export function getMerchantRarityPriceMultiplier(rarityInput = "", overrides = null) {
  const rarity = normalizeMerchantRarity(rarityInput) || "common";
  const multipliers =
    overrides && typeof overrides === "object"
      ? normalizeMerchantRarityPriceMultipliers(overrides, MERCHANT_RARITY_PRICE_MULTIPLIERS)
      : MERCHANT_RARITY_PRICE_MULTIPLIERS;
  return Number(multipliers[rarity] ?? multipliers.common ?? MERCHANT_RARITY_PRICE_MULTIPLIERS.common);
}

/**
 * Returns a stock-pressure buy-price multiplier:
 * - Below LOW_THRESHOLD fill ratio → +20% (merchant holds fewer items → scarcity premium)
 * - Above HIGH_THRESHOLD fill ratio → -15% (merchant overstocked → clearance discount)
 * - Between thresholds → 1.0 (no effect)
 */
export function getMerchantStockPressureMultiplier(currentCount = 0, targetMax = 20) {
  const current = Math.max(0, Number(currentCount ?? 0) || 0);
  const max = Math.max(1, Number(targetMax ?? 20) || 20);
  const ratio = current / max;
  if (ratio < MERCHANT_STOCK_PRESSURE.LOW_THRESHOLD) {
    return 1 + MERCHANT_STOCK_PRESSURE.LOW_BUY_MODIFIER;
  }
  if (ratio > MERCHANT_STOCK_PRESSURE.HIGH_THRESHOLD) {
    return 1 + MERCHANT_STOCK_PRESSURE.HIGH_BUY_MODIFIER;
  }
  return 1.0;
}

/** Normalizes a merchant type to a known value or "general". */
export function normalizeMerchantType(value = "") {
  const type = String(value ?? "")
    .trim()
    .toLowerCase();
  if (MERCHANT_TYPE_OPTIONS.some((opt) => opt.value === type)) return type;
  return "general";
}

/** Normalizes merchant disposition. */
export function normalizeMerchantDisposition(value = "") {
  const disp = String(value ?? "")
    .trim()
    .toLowerCase();
  if (MERCHANT_DISPOSITION_OPTIONS.some((opt) => opt.value === disp)) return disp;
  return "neutral";
}

export function normalizeMerchantFaction(value = "") {
  return String(value ?? "")
    .trim()
    .slice(0, 80);
}

export function normalizeMerchantLocation(value = "") {
  return String(value ?? "")
    .trim()
    .slice(0, 120);
}

export function normalizeMerchantTaxFeePercent(value = 0, fallback = 0) {
  const raw = Number(value ?? fallback);
  if (!Number.isFinite(raw)) return Math.max(0, Math.min(100, Number(fallback) || 0));
  return Math.max(0, Math.min(100, Number(raw.toFixed(2))));
}

/**
 * Computes the final effective buy-price multiplier for a single item.
 * buy price (cp) = base × effectiveMultiplier × (1 + taxFeePercent/100)
 *
 * Barter delta is clamped so the adjusted base never strays more than
 * MERCHANT_HAGGLE_CAP_PERCENT away from baseBuyMarkup.
 */
export function computeMerchantEffectiveBuyMultiplier(options = {}) {
  const {
    baseBuyMarkup = 1.25,
    rarityMultiplier = 1.0,
    stockPressureMultiplier = 1.0,
    taxFeePercent = 0,
    barterBuyDelta = 0,
    haggleCapPercent = MERCHANT_HAGGLE_CAP_PERCENT
  } = options;
  const base = Math.max(0, Number(baseBuyMarkup) || 1.25);
  const cap = Math.max(0, Number(haggleCapPercent) || MERCHANT_HAGGLE_CAP_PERCENT);
  const minBase = base * (1 - cap);
  const maxBase = base * (1 + cap);
  const adjustedBase = Math.max(minBase, Math.min(maxBase, base + Number(barterBuyDelta || 0)));
  const taxFactor = 1 + Math.max(0, Math.min(1, Number(taxFeePercent || 0) / 100));
  const effective =
    adjustedBase *
    Math.max(0.01, Number(rarityMultiplier || 1)) *
    Math.max(0.01, Number(stockPressureMultiplier || 1)) *
    taxFactor;
  return Math.max(0, Math.min(50, Number(effective.toFixed(4))));
}

/**
 * Computes effective sell-rate multiplier (what player receives).
 * Barter delta is capped at haggleCapPercent from the base sell rate.
 */
export function computeMerchantEffectiveSellMultiplier(options = {}) {
  const { baseSellRate = 0.5, barterSellDelta = 0, haggleCapPercent = MERCHANT_HAGGLE_CAP_PERCENT } = options;
  const base = Math.max(0, Number(baseSellRate) || 0.5);
  const cap = Math.max(0, Number(haggleCapPercent) || MERCHANT_HAGGLE_CAP_PERCENT);
  const minRate = base * (1 - cap);
  const maxRate = base * (1 + cap);
  return Math.max(
    0,
    Math.min(10, Number(Math.max(minRate, Math.min(maxRate, base + Number(barterSellDelta || 0))).toFixed(4)))
  );
}

export function getMerchantTypeOptions(selectedTypeInput = "") {
  const selected = normalizeMerchantType(selectedTypeInput);
  return MERCHANT_TYPE_OPTIONS.map((opt) => ({
    ...opt,
    selected: opt.value === selected
  }));
}

export function getMerchantDispositionOptions(selectedInput = "") {
  const selected = normalizeMerchantDisposition(selectedInput);
  return MERCHANT_DISPOSITION_OPTIONS.map((opt) => ({
    ...opt,
    selected: opt.value === selected
  }));
}

function getMerchantRestockRetentionWeight(item = {}) {
  const itemType = String(item?.itemType ?? item?.type ?? item?.data?.type ?? "")
    .trim()
    .toLowerCase();
  const stockRole = String(item?.stockRole ?? item?.merchantStockRole ?? "")
    .trim()
    .toLowerCase();
  const sectionKey = String(item?.sectionKey ?? item?.merchantSectionKey ?? "")
    .trim()
    .toLowerCase();
  const rarityBucket = getMerchantRarityBucket(item?.rarityBucket ?? item?.rarity ?? "");
  const quantity = Math.max(1, Math.floor(Number(item?.quantity ?? 1) || 1));
  let weight = 1;

  if (stockRole === "core") weight *= 1.35;
  if (stockRole === "featured") weight *= 0.7;
  if (sectionKey === "featured") weight *= 0.75;
  if (["weapon", "armor", "equipment", "tool", "backpack"].includes(itemType)) weight *= 1.2;
  if (itemType === "ammunition") weight *= quantity > 1 ? 1.05 : 0.9;
  if (itemType === "consumable") weight *= 0.55;
  if (["loot", "trinket", "spell"].includes(itemType)) weight *= 0.75;

  const rarityRetention = {
    common: 1.15,
    uncommon: 1,
    rare: 0.82,
    "very-rare": 0.58,
    legendary: 0.42
  };
  weight *= Number(rarityRetention[rarityBucket] ?? 1);

  if (quantity >= 10 && ["ammunition", "consumable"].includes(itemType)) weight *= 0.8;
  return Math.max(0.01, Number(weight.toFixed(4)));
}

function chooseMerchantRetentionRows(items = [], retainCount = 0, random = Math.random) {
  const retained = [];
  const pool = [...items];
  while (retained.length < retainCount && pool.length > 0) {
    const picked = chooseWeightedRow(pool, getMerchantRestockRetentionWeight, random);
    if (!picked) break;
    retained.push(picked);
    const index = pool.indexOf(picked);
    if (index >= 0) pool.splice(index, 1);
  }
  return retained;
}

/**
 * Selects items to RETAIN when performing a partial restock.
 * @param {Array} currentItems - current stock item rows (each with unique key)
 * @param {number} retainRate - fraction to keep (default: MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE = 0.60)
 * @param {{randomFn?: Function}} options
 * @returns {{ retainedKeys: Set<string>, retainCount: number, rerollCount: number }}
 */
export function computeMerchantPartialRestockPlan(
  currentItems = [],
  retainRate = MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE,
  options = {}
) {
  const items = Array.isArray(currentItems) ? currentItems : [];
  const rate = Math.max(
    0,
    Math.min(1, Number(retainRate ?? MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE) || MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE)
  );
  const totalCount = items.length;
  const requestedRetainCount = Math.round(totalCount * rate);
  const retainCount = totalCount > 1 ? Math.min(totalCount - 1, requestedRetainCount) : 0;
  const random = typeof options?.randomFn === "function" ? options.randomFn : Math.random;
  const retained = chooseMerchantRetentionRows(items, retainCount, random);
  const retainedKeys = new Set(retained.map((entry) => String(entry?.key ?? entry?.id ?? "")).filter(Boolean));
  return {
    retainedKeys,
    retainCount: retainedKeys.size,
    rerollCount: Math.max(0, totalCount - retainedKeys.size)
  };
}

const MERCHANT_STOCK_VALUE_FALLBACK_BY_RARITY = Object.freeze({
  common: 5,
  uncommon: 75,
  rare: 750,
  "very-rare": 7500,
  legendary: 25000
});

function getMerchantStockTargetValueGp(merchant = {}) {
  const raw = Number(merchant?.stock?.targetValueGp ?? 0);
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

function getMerchantStockBudgetValueForCandidate(candidate = {}) {
  const directValue = Number(candidate?.gpValue ?? 0);
  if (Number.isFinite(directValue) && directValue > 0) return Math.max(0, directValue);
  const itemData = getMerchantItemData(candidate?.data ?? candidate);
  const itemGpValue = Math.max(0, Number(getLootItemGpValueFromData(itemData) || 0));
  if (itemGpValue > 0) return itemGpValue;
  const rarityBucket = getMerchantRarityBucket(
    candidate?.rarityBucket ?? candidate?.rarity ?? getLootRarityFromData(itemData)
  );
  const fallbackValue = Number(
    MERCHANT_STOCK_VALUE_FALLBACK_BY_RARITY[rarityBucket] ?? MERCHANT_STOCK_VALUE_FALLBACK_BY_RARITY.common
  );
  return Number.isFinite(fallbackValue) ? Math.max(0.01, fallbackValue) : 0.01;
}

function constrainMerchantStockSelectionByBudget(selectedRowsInput = [], merchant = {}) {
  const selectedRows = Array.isArray(selectedRowsInput) ? selectedRowsInput : [];
  const targetValueGp = getMerchantStockTargetValueGp(merchant);
  const valueTolerance = resolveMerchantValueTolerance(
    targetValueGp,
    merchant?.stock?.valueStrictness ?? MERCHANT_DEFAULTS.stock.valueStrictness
  );
  const buildTotals = (rows) =>
    rows.reduce((sum, row) => {
      const quantity = Math.max(1, Math.floor(Number(row?.quantity ?? 1) || 1));
      return sum + getMerchantStockBudgetValueForCandidate(row) * quantity;
    }, 0);
  if (selectedRows.length <= 0 || targetValueGp <= 0) {
    return {
      rows: selectedRows,
      targetValueGp,
      hardCapGp: targetValueGp > 0 ? Number(valueTolerance?.maxGp ?? targetValueGp) : 0,
      tolerancePercent: Math.max(1, Number(valueTolerance?.percent ?? 10) || 10),
      strictnessBandLabel: String(valueTolerance?.bandLabel ?? "Strict"),
      totalValueGp: buildTotals(selectedRows),
      constrained: false
    };
  }

  const hardCapGp = Math.max(targetValueGp, Number(valueTolerance?.maxGp ?? targetValueGp));
  const unitRows = [];
  for (const row of selectedRows) {
    const quantity = Math.max(1, Math.floor(Number(row?.quantity ?? 1) || 1));
    const unitValue = getMerchantStockBudgetValueForCandidate(row);
    for (let index = 0; index < quantity; index += 1) {
      unitRows.push({ row, unitValue });
    }
  }
  if (unitRows.length <= 0) {
    return { rows: selectedRows, targetValueGp, hardCapGp, totalValueGp: 0, constrained: false };
  }

  const constrainedRows = [];
  const constrainedMap = new Map();
  let runningValueGp = 0;
  const addRowUnit = (sourceRow) => {
    const key = String(sourceRow?.key ?? "").trim();
    if (!key) return false;
    const existing = constrainedMap.get(key);
    if (existing) {
      existing.quantity = Math.max(1, Number(existing.quantity ?? 1) + 1);
      return true;
    }
    const created = {
      ...sourceRow,
      quantity: 1
    };
    constrainedRows.push(created);
    constrainedMap.set(key, created);
    return true;
  };

  for (const unit of unitRows) {
    const projected = runningValueGp + Math.max(0, Number(unit?.unitValue ?? 0) || 0);
    if (projected > hardCapGp) continue;
    if (!addRowUnit(unit.row)) continue;
    runningValueGp = projected;
  }

  if (constrainedRows.length <= 0) {
    const cheapest = [...unitRows].sort(
      (left, right) => Number(left?.unitValue ?? 0) - Number(right?.unitValue ?? 0)
    )[0];
    if (cheapest?.row) {
      addRowUnit(cheapest.row);
      runningValueGp = Math.max(0, Number(cheapest?.unitValue ?? 0) || 0);
    }
  }

  const totalValueGp = Math.max(0, Number(runningValueGp || 0));
  const constrained =
    JSON.stringify(
      selectedRows.map((row) => [String(row?.key ?? ""), Math.max(1, Math.floor(Number(row?.quantity ?? 1) || 1))])
    ) !==
    JSON.stringify(
      constrainedRows.map((row) => [String(row?.key ?? ""), Math.max(1, Math.floor(Number(row?.quantity ?? 1) || 1))])
    );
  return {
    rows: constrainedRows.length > 0 ? constrainedRows : selectedRows,
    targetValueGp,
    hardCapGp,
    tolerancePercent: Math.max(1, Number(valueTolerance?.percent ?? 10) || 10),
    strictnessBandLabel: String(valueTolerance?.bandLabel ?? "Strict"),
    totalValueGp,
    constrained
  };
}

function createMerchantOwnershipDefaults() {
  const observerLevel = CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
  const ownership = {
    default: CONST?.DOCUMENT_OWNERSHIP_LEVELS?.NONE ?? 0
  };
  for (const user of game.users?.contents ?? []) {
    if (!user?.id) continue;
    ownership[String(user.id)] = user?.isGM ? (CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3) : observerLevel;
  }
  return ownership;
}

async function syncMerchantActorOwnership(actor) {
  if (!actor || !game.user?.isGM) return actor;
  const nextOwnership = createMerchantOwnershipDefaults();
  const currentOwnership = actor.ownership && typeof actor.ownership === "object" ? actor.ownership : {};
  if (JSON.stringify(currentOwnership) === JSON.stringify(nextOwnership)) return actor;
  await actor.update({ ownership: nextOwnership });
  return actor;
}

async function syncAllMerchantActorOwnerships() {
  if (!game.user?.isGM) return;
  const merchants = ensureMerchantsState(getOperationsLedger());
  const actorIds = new Set(
    (Array.isArray(merchants?.definitions) ? merchants.definitions : [])
      .map((entry) => String(entry?.actorId ?? "").trim())
      .filter(Boolean)
  );
  for (const actorId of actorIds) {
    const actor = game.actors.get(actorId);
    if (!actor) continue;
    // eslint-disable-next-line no-await-in-loop
    await syncMerchantActorOwnership(actor);
  }
}

async function ensureMerchantActor(merchantInput, options = {}) {
  const merchant = merchantInput && typeof merchantInput === "object" ? merchantInput : getMerchantById(merchantInput);
  if (!merchant) return null;
  const existing = merchant.actorId ? game.actors.get(String(merchant.actorId ?? "")) : null;
  if (existing) {
    await syncMerchantActorOwnership(existing);
    return existing;
  }
  if (!canAccessGmPage()) return null;

  const actorName = String(merchant.name ?? "Merchant").trim() || "Merchant";
  const actorImg = normalizeFoundryAssetImagePath(merchant.img, { fallback: "icons/svg/item-bag.svg" });
  const actorData = {
    name: `Merchant Stock: ${actorName}`,
    type: "npc",
    img: actorImg,
    ownership: createMerchantOwnershipDefaults(),
    flags: {
      [MODULE_ID]: {
        merchantId: String(merchant.id ?? "").trim()
      }
    }
  };
  const created = await Actor.create(actorData, { renderSheet: false });
  if (!created) return null;
  await syncMerchantActorOwnership(created);

  if (options?.skipLedgerUpdate !== true) {
    await updateOperationsLedger((ledger) => {
      const merchants = ensureMerchantsState(ledger);
      const entry = merchants.definitions.find((row) => String(row?.id ?? "") === String(merchant.id ?? ""));
      if (entry) entry.actorId = String(created.id ?? "");
      merchants.stockStateById[String(merchant.id ?? "")] = normalizeMerchantStockStateEntry(
        merchants.stockStateById?.[String(merchant.id ?? "")],
        String(created.id ?? "")
      );
    });
  }
  return created;
}

async function refreshMerchantStock(merchantIdInput, options = {}) {
  if (!canAccessGmPage()) return { ok: false, message: "Only the GM can refresh merchant stock." };
  const merchantId = String(merchantIdInput ?? "").trim();
  if (!merchantId) return { ok: false, message: "Merchant id is required." };
  const currentWorldTimestamp = Number(options?.currentWorldTimestamp ?? getCurrentWorldTimestamp());
  const refreshedWorldTs = Number.isFinite(currentWorldTimestamp)
    ? Math.max(0, Math.floor(currentWorldTimestamp))
    : getCurrentWorldTimestamp();
  const refreshedDayKey = getGatherDayKey(refreshedWorldTs);
  const ledger = getOperationsLedger();
  const merchant = getMerchantById(merchantId, ledger);
  if (!merchant) return { ok: false, message: "Merchant not found." };
  const merchantActor = await ensureMerchantActor(merchant, { skipLedgerUpdate: true });
  if (!merchantActor) return { ok: false, message: "Merchant actor could not be created." };

  const sourceDocuments = await getMerchantSourceDocuments(merchant);
  const candidates = buildMerchantCandidateRows(sourceDocuments, merchant);
  const selected = selectMerchantStockRows(candidates, merchant);
  const budgetedSelection = constrainMerchantStockSelectionByBudget(selected, merchant);
  let selectedRows = Array.isArray(budgetedSelection?.rows) ? budgetedSelection.rows : selected;
  const generatedItems = (merchantActor.items?.contents ?? []).filter(
    (item) => item?.flags?.[MODULE_ID]?.merchantGenerated === true
  );
  let retainedCount = 0;
  let rerollCount = 0;
  let partialRestock = false;
  let generatedItemIds = generatedItems.map((item) => String(item?.id ?? "")).filter(Boolean);
  if (options?.partialRestock === true && generatedItems.length > 0) {
    partialRestock = true;
    const restockPlan = computeMerchantPartialRestockPlan(
      generatedItems.map((item) => {
        const itemData = getMerchantItemData(item);
        const flags = item?.flags?.[MODULE_ID] ?? {};
        return {
          key: String(item?.id ?? ""),
          itemType: String(item?.type ?? itemData?.type ?? "")
            .trim()
            .toLowerCase(),
          rarityBucket: getLootRarityFromData(itemData),
          quantity: getMerchantItemDataQuantity(itemData),
          stockRole: String(flags?.merchantStockRole ?? "").trim(),
          sectionKey: String(flags?.merchantStockSectionKey ?? "").trim()
        };
      }),
      MERCHANT_PARTIAL_RESTOCK_RETAIN_RATE
    );
    const retainedItemIdSet = restockPlan.retainedKeys;
    retainedCount = Number(restockPlan.retainCount ?? 0) || 0;
    rerollCount = Number(restockPlan.rerollCount ?? 0) || 0;
    generatedItemIds = generatedItems
      .filter((item) => !retainedItemIdSet.has(String(item?.id ?? "")))
      .map((item) => String(item?.id ?? ""))
      .filter(Boolean);
    const desiredCreateCount = Math.max(0, Number(merchant?.stock?.maxItems ?? 20) - retainedCount);
    selectedRows = selectedRows.slice(0, desiredCreateCount);
  }
  if (generatedItemIds.length > 0) {
    await merchantActor.deleteEmbeddedDocuments("Item", generatedItemIds);
  }

  const createData = [];
  for (const candidate of selectedRows) {
    const data = coerceMerchantCandidateDataToStockItemData(candidate.data ?? {});
    if (!data || typeof data !== "object") continue;
    if (Object.prototype.hasOwnProperty.call(data, "_id")) delete data._id;
    const requestedQuantity = Number(candidate?.quantity ?? getMerchantItemDataQuantity(data));
    const quantity = Number.isFinite(requestedQuantity) ? Math.max(1, Math.floor(requestedQuantity)) : 1;
    setMerchantItemDataQuantity(data, quantity);
    if (!data.flags || typeof data.flags !== "object") data.flags = {};
    if (!data.flags[MODULE_ID] || typeof data.flags[MODULE_ID] !== "object") data.flags[MODULE_ID] = {};
    data.flags[MODULE_ID].merchantGenerated = true;
    data.flags[MODULE_ID].merchantId = merchantId;
    data.flags[MODULE_ID].merchantArchetype = String(
      candidate?.merchantArchetype ?? merchant?.archetype ?? MERCHANT_DEFAULTS.archetype
    );
    data.flags[MODULE_ID].merchantStockRole = String(candidate?.merchantStockRole ?? "core");
    data.flags[MODULE_ID].merchantStockSectionKey = String(candidate?.merchantSectionKey ?? "misc");
    data.flags[MODULE_ID].merchantStockSectionLabel = String(candidate?.merchantSectionLabel ?? "Shop Stock");
    createData.push(data);
  }
  if (createData.length > 0) {
    await merchantActor.createEmbeddedDocuments("Item", createData);
  }

  const refreshedAt = Date.now();
  const refreshedBy = String(game.user?.name ?? "GM").trim() || "GM";
  await updateOperationsLedger(
    (nextLedger) => {
      const merchants = ensureMerchantsState(nextLedger);
      const entry = merchants.definitions.find((row) => String(row?.id ?? "") === merchantId);
      if (entry) entry.actorId = String(merchantActor.id ?? "");
      merchants.stockStateById[merchantId] = {
        lastRefreshedAt: refreshedAt,
        lastRefreshedBy: refreshedBy,
        actorId: String(merchantActor.id ?? ""),
        lastRefreshedWorldTs: refreshedWorldTs,
        lastRefreshedDayKey: refreshedDayKey
      };
    },
    {
      skipLocalRefresh: Boolean(options?.skipLocalRefresh),
      skipSocketRefresh: Boolean(options?.skipSocketRefresh)
    }
  );

  const createdCount = createData.length;
  if (!options?.silent) {
    const targetValueGp = Math.max(0, Number(budgetedSelection?.targetValueGp ?? 0) || 0);
    const stockValueGp = Math.max(0, Number(budgetedSelection?.totalValueGp ?? 0) || 0);
    const budgetLabel =
      targetValueGp > 0 ? ` | Est Value ${stockValueGp.toFixed(0)} gp / Target ${targetValueGp.toFixed(0)} gp` : "";
    ui.notifications?.info(
      `Refreshed stock for ${merchant.name} (${createdCount} item${createdCount === 1 ? "" : "s"}${budgetLabel}).`
    );
  }
  return {
    ok: true,
    merchantId,
    merchantName: String(merchant.name ?? "Merchant"),
    actorId: String(merchantActor.id ?? ""),
    createdCount,
    retainedCount,
    rerollCount,
    partialRestock,
    generatedStockValueGp: Math.max(0, Number(budgetedSelection?.totalValueGp ?? 0) || 0),
    targetStockValueGp: Math.max(0, Number(budgetedSelection?.targetValueGp ?? 0) || 0),
    stockConstrainedToBudget: Boolean(budgetedSelection?.constrained),
    refreshedAt,
    refreshedBy,
    refreshedWorldTs,
    refreshedDayKey
  };
}

async function refreshAllMerchantStocks(options = {}) {
  if (!canAccessGmPage()) return { ok: false, refreshed: 0, failed: 0, results: [] };
  const merchants = getMerchants();
  const results = [];
  for (const merchant of merchants) {
    const result = await refreshMerchantStock(merchant.id, { silent: true });
    results.push(result);
  }
  const refreshed = results.filter((entry) => entry?.ok).length;
  const failed = results.length - refreshed;
  if (!options?.silent) {
    ui.notifications?.info(`Merchant stock refresh complete: ${refreshed} succeeded, ${failed} failed.`);
  }
  return { ok: failed === 0, refreshed, failed, results };
}

function getMerchantAutoRefreshElapsedDays(lastRefreshedWorldTs, currentTimestamp = getCurrentWorldTimestamp()) {
  return getElapsedCalendarDaysBridge(lastRefreshedWorldTs, currentTimestamp, {
    gameRef: game,
    globalRef: globalThis
  });
}

export async function handleAutomaticMerchantAutoRefreshTick() {
  if (!canAccessGmPage()) return null;
  if (!isPrimaryActiveGmClient()) return null;
  if (merchantAutoRefreshTickInFlight) return null;
  merchantAutoRefreshTickInFlight = true;

  try {
    const currentTimestamp = getCurrentWorldTimestamp();
    const dayKey = getGatherDayKey(currentTimestamp);
    const lastProcessedDayKey = String(game.settings.get(MODULE_ID, SETTINGS.MERCHANT_AUTO_REFRESH_DAY) ?? "").trim();
    if (dayKey === lastProcessedDayKey) return null;

    const ledger = getOperationsLedger();
    const merchantsState = ensureMerchantsState(ledger);
    const initializeMerchantIds = [];
    const dueMerchantIds = [];

    for (const merchant of merchantsState.definitions ?? []) {
      const merchantId = String(merchant?.id ?? "").trim();
      if (!merchantId) continue;
      const autoRefresh = normalizeMerchantAutoRefreshConfig(
        merchant?.stock?.autoRefresh ?? {},
        MERCHANT_DEFAULTS.stock.autoRefresh
      );
      if (!autoRefresh.enabled || Number(autoRefresh.intervalDays ?? 0) <= 0) continue;
      const stockState = normalizeMerchantStockStateEntry(
        merchantsState.stockStateById?.[merchantId],
        merchant.actorId
      );
      const lastRefreshedWorldTs = Number(stockState?.lastRefreshedWorldTs ?? 0);
      if (!Number.isFinite(lastRefreshedWorldTs) || lastRefreshedWorldTs <= 0) {
        initializeMerchantIds.push(merchantId);
        continue;
      }
      if (getMerchantAutoRefreshElapsedDays(lastRefreshedWorldTs, currentTimestamp) < Number(autoRefresh.intervalDays))
        continue;
      dueMerchantIds.push(merchantId);
    }

    if (initializeMerchantIds.length > 0) {
      await updateOperationsLedger(
        (nextLedger) => {
          const merchants = ensureMerchantsState(nextLedger);
          for (const merchantId of initializeMerchantIds) {
            const definition = merchants.definitions.find((entry) => String(entry?.id ?? "") === merchantId);
            const stockState = normalizeMerchantStockStateEntry(
              merchants.stockStateById?.[merchantId],
              definition?.actorId ?? ""
            );
            stockState.lastRefreshedWorldTs = currentTimestamp;
            stockState.lastRefreshedDayKey = dayKey;
            merchants.stockStateById[merchantId] = stockState;
          }
        },
        {
          skipLocalRefresh: true,
          skipSocketRefresh: true
        }
      );
    }

    // Run the refresh loop off the same day timestamp in PARALLEL to meet sub-300ms performance targets.
    const refreshPromises = dueMerchantIds.map((merchantId) =>
      refreshMerchantStock(merchantId, {
        silent: true,
        skipLocalRefresh: true,
        skipSocketRefresh: true,
        currentWorldTimestamp: currentTimestamp,
        partialRestock: true
      }).catch((error) => {
        console.warn(`${MODULE_ID}: merchant auto-restock failed for ${merchantId}`, error);
        return {
          ok: false,
          merchantId,
          message: String(error?.message ?? "Merchant auto-restock failed.")
        };
      })
    );

    const promiseResults = await Promise.allSettled(refreshPromises);
    const results = promiseResults.map((p) =>
      p.status === "fulfilled" ? p.value : { ok: false, message: "Unhandled promise rejection" }
    );

    await setModuleSettingWithLocalRefreshSuppressed(SETTINGS.MERCHANT_AUTO_REFRESH_DAY, dayKey);

    const refreshed = results.filter((entry) => entry?.ok).length;
    const failed = results.length - refreshed;
    if (initializeMerchantIds.length > 0 || results.length > 0) {
      refreshOpenApps({ scope: REFRESH_SCOPE_KEYS.OPERATIONS });
      emitSocketRefresh({ scope: REFRESH_SCOPE_KEYS.OPERATIONS });
    }
    if (refreshed > 0 || failed > 0) {
      ui.notifications?.info(`Merchant auto-restock: ${refreshed} refreshed${failed > 0 ? `, ${failed} failed` : ""}.`);
    }
    return {
      dayKey,
      initialized: initializeMerchantIds.length,
      refreshed,
      failed,
      results
    };
  } finally {
    merchantAutoRefreshTickInFlight = false;
  }
}

function findTradeTargetItem(actor, sourceItem) {
  const name = String(sourceItem?.name ?? "")
    .trim()
    .toLowerCase();
  const type = String(sourceItem?.type ?? "")
    .trim()
    .toLowerCase();
  if (!actor || !name || !type) return null;
  return (
    (actor.items?.contents ?? []).find((item) => {
      if (!item) return false;
      return (
        String(item.name ?? "")
          .trim()
          .toLowerCase() === name &&
        String(item.type ?? "")
          .trim()
          .toLowerCase() === type
      );
    }) ?? null
  );
}

function buildTradeItemData(sourceItem, quantity, options = {}) {
  const data = getMerchantItemData(sourceItem);
  if (!data || typeof data !== "object") return null;
  const clone = foundry.utils.deepClone(data);
  if (Object.prototype.hasOwnProperty.call(clone, "_id")) delete clone._id;
  setMerchantItemDataQuantity(clone, Math.max(1, Math.floor(Number(quantity ?? 1) || 1)));
  if (!clone.flags || typeof clone.flags !== "object") clone.flags = {};
  if (!clone.flags[MODULE_ID] || typeof clone.flags[MODULE_ID] !== "object") clone.flags[MODULE_ID] = {};
  if (options?.clearGeneratedFlag) delete clone.flags[MODULE_ID].merchantGenerated;
  return clone;
}

async function transferItemBetweenActors(sourceActor, targetActor, sourceItem, quantity, options = {}) {
  const qty = Math.max(0, Math.floor(Number(quantity ?? 0) || 0));
  if (!sourceActor || !targetActor || !sourceItem || qty <= 0) return false;
  const sourceCurrent = Math.max(0, Math.floor(getItemTrackedQuantity(sourceItem)));
  if (sourceCurrent < qty) return false;

  const targetExisting = findTradeTargetItem(targetActor, sourceItem);
  if (targetExisting) {
    const existingQty = Math.max(0, Math.floor(getItemTrackedQuantity(targetExisting)));
    await setItemTrackedQuantity(targetExisting, existingQty + qty);
  } else {
    const itemData = buildTradeItemData(sourceItem, qty, options);
    if (!itemData) return false;
    await targetActor.createEmbeddedDocuments("Item", [itemData]);
  }

  const sourceNext = sourceCurrent - qty;
  if (sourceNext <= 0) await sourceItem.delete();
  else await setItemTrackedQuantity(sourceItem, sourceNext);
  return true;
}

async function rollbackMerchantTradeTransfers(transfers = []) {
  const entries = Array.isArray(transfers) ? [...transfers].reverse() : [];
  const failures = [];
  for (const entry of entries) {
    const sourceActor = entry?.sourceActor ?? null;
    const targetActor = entry?.targetActor ?? null;
    const referenceItem = entry?.referenceItem ?? null;
    const qty = Math.max(0, Math.floor(Number(entry?.qty ?? 0) || 0));
    if (!sourceActor || !targetActor || !referenceItem || qty <= 0) continue;
    const rollbackSource = findTradeTargetItem(targetActor, referenceItem);
    if (!rollbackSource) {
      failures.push({
        itemName: String(referenceItem?.name ?? "Item"),
        qty
      });
      continue;
    }
    // Reverse previously completed item moves if the trade fails after transfer.
    // eslint-disable-next-line no-await-in-loop
    const ok = await transferItemBetweenActors(targetActor, sourceActor, rollbackSource, qty);
    if (!ok) {
      failures.push({
        itemName: String(referenceItem?.name ?? "Item"),
        qty
      });
    }
  }
  return {
    ok: failures.length === 0,
    failures
  };
}

function getMerchantBarterResolutionKey({ userId, actorId, merchantId, settlement } = {}) {
  const normalizedUserId = String(userId ?? "").trim();
  const normalizedActorId = String(actorId ?? "").trim();
  const normalizedMerchantId = String(merchantId ?? "").trim();
  const normalizedSettlement = normalizeMerchantSettlementSelection(settlement ?? "");
  if (!normalizedUserId || !normalizedActorId || !normalizedMerchantId) return "";
  return `${normalizedUserId}:${normalizedActorId}:${normalizedMerchantId}:${normalizedSettlement}`;
}

function getMerchantBarterResolutionEntryByKey(keyInput = "") {
  const key = String(keyInput ?? "").trim();
  if (!key) return null;
  const entry = merchantBarterResolutionByKey.get(key);
  return entry && typeof entry === "object" ? foundry.utils.deepClone(entry) : null;
}

function setMerchantBarterResolutionEntry(entry = {}) {
  const key = getMerchantBarterResolutionKey(entry);
  if (!key) return "";
  const stored = {
    key,
    userId: String(entry?.userId ?? "").trim(),
    actorId: String(entry?.actorId ?? "").trim(),
    merchantId: String(entry?.merchantId ?? "").trim(),
    settlement: normalizeMerchantSettlementSelection(entry?.settlement ?? ""),
    applied: entry?.applied !== false,
    source: String(entry?.source ?? "").trim(),
    ability: normalizeMerchantBarterAbility(entry?.ability ?? "cha", "cha"),
    abilityLabel: String(
      entry?.abilityLabel ??
        MERCHANT_BARTER_ABILITY_LABELS[normalizeMerchantBarterAbility(entry?.ability ?? "cha", "cha")] ??
        "Charisma"
    ),
    checkTotal: Number.isFinite(Number(entry?.checkTotal)) ? Math.floor(Number(entry.checkTotal)) : null,
    margin: Number.isFinite(Number(entry?.margin)) ? Math.floor(Number(entry.margin)) : 0,
    success: Boolean(entry?.success),
    delta: normalizeMerchantBarterModifier(entry?.delta, 0),
    buyMarkupDelta: normalizeMerchantBarterModifier(entry?.buyMarkupDelta, 0),
    sellRateDelta: normalizeMerchantBarterModifier(entry?.sellRateDelta, 0),
    createdAt: Math.max(0, Number(entry?.createdAt ?? Date.now()) || Date.now())
  };
  merchantBarterResolutionByKey.set(key, stored);
  return key;
}

function clearMerchantBarterResolutionEntryByKey(keyInput = "") {
  const key = String(keyInput ?? "").trim();
  if (!key) return;
  merchantBarterResolutionByKey.delete(key);
}

function formatMerchantSignedPercentLabel(value = 0) {
  const percent = Number((Math.abs(Number(value) || 0) * 100).toFixed(2));
  const formatted = percent.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${Number(value) >= 0 ? "+" : "-"}${formatted}%`;
}

function getMerchantBarterOutcomeEffectSummary(buyMarkupDelta = 0, sellRateDelta = 0) {
  const parts = [];
  if (Math.abs(Number(buyMarkupDelta) || 0) > 0.0001) {
    parts.push(`buy price ${formatMerchantSignedPercentLabel(buyMarkupDelta)}`);
  }
  if (Math.abs(Number(sellRateDelta) || 0) > 0.0001) {
    parts.push(`sell value ${formatMerchantSignedPercentLabel(sellRateDelta)}`);
  }
  return parts.join(", ") || "no price change";
}

function getMerchantBarterPricingModifiers(pricing = {}) {
  return {
    successBuyModifier: normalizeMerchantBarterModifier(
      pricing?.barterSuccessBuyModifier,
      MERCHANT_DEFAULTS.pricing.barterSuccessBuyModifier ?? -0.1
    ),
    successSellModifier: normalizeMerchantBarterModifier(
      pricing?.barterSuccessSellModifier,
      MERCHANT_DEFAULTS.pricing.barterSuccessSellModifier ?? 0.1
    ),
    failureBuyModifier: normalizeMerchantBarterModifier(
      pricing?.barterFailureBuyModifier,
      MERCHANT_DEFAULTS.pricing.barterFailureBuyModifier ?? 0.1
    ),
    failureSellModifier: normalizeMerchantBarterModifier(
      pricing?.barterFailureSellModifier,
      MERCHANT_DEFAULTS.pricing.barterFailureSellModifier ?? -0.1
    )
  };
}

function getMerchantBarterConfigSummaryText(pricing = {}) {
  const modifiers = getMerchantBarterPricingModifiers(pricing);
  const successSummary = getMerchantBarterOutcomeEffectSummary(
    modifiers.successBuyModifier,
    modifiers.successSellModifier
  );
  const failureSummary = getMerchantBarterOutcomeEffectSummary(
    modifiers.failureBuyModifier,
    modifiers.failureSellModifier
  );
  return `Success: ${successSummary}. Failure: ${failureSummary}.`;
}

function getMerchantBarterUiSummaryText(barter = {}, options = {}) {
  if (!barter || barter.applied === false) return String(options?.fallback ?? "No barter adjustment applied.");
  const verdict = barter?.success ? "Success" : "Failure";
  const total = Number.isFinite(Number(barter?.checkTotal)) ? ` (${Math.floor(Number(barter.checkTotal))})` : "";
  return `${verdict}${total}: ${getMerchantBarterOutcomeEffectSummary(
    barter?.buyMarkupDelta ?? 0,
    barter?.sellRateDelta ?? 0
  )}`;
}

function getMerchantTradeDialogRoot(htmlOrRoot) {
  if (!htmlOrRoot) return null;
  if (htmlOrRoot instanceof HTMLElement && htmlOrRoot.classList?.contains("po-merchant-trade-dialog"))
    return htmlOrRoot;
  const htmlRoot = htmlOrRoot?.[0]?.querySelector?.(".po-merchant-trade-dialog");
  if (htmlRoot) return htmlRoot;
  const jQueryRoot = htmlOrRoot?.find?.(".po-merchant-trade-dialog")?.[0];
  if (jQueryRoot) return jQueryRoot;
  return null;
}

function readMerchantTradeMetaFromDialogRoot(root) {
  if (!(root instanceof HTMLElement)) return null;
  const merchantId = String(root.dataset?.merchantId ?? "").trim();
  const actorId = String(root.dataset?.actorId ?? "").trim();
  const settlement = normalizeMerchantSettlementSelection(root.dataset?.settlement ?? "");
  if (!merchantId || !actorId) return null;
  return { merchantId, actorId, settlement };
}

function setMerchantTradeDialogBarterStatus(root, options = {}) {
  if (!(root instanceof HTMLElement)) return;
  const statusNode = root.querySelector("[data-merchant-barter-status]");
  if (!statusNode) return;
  if (options.pending) {
    statusNode.dataset.state = "pending";
    statusNode.textContent = String(options.pendingLabel ?? "Barter pending GM resolution...");
    return;
  }
  if (options.error) {
    statusNode.dataset.state = "error";
    statusNode.textContent = String(options.errorLabel ?? "Barter request failed.");
    return;
  }
  const summary = String(options.summary ?? "").trim();
  statusNode.dataset.state = summary ? "applied" : "ready";
  statusNode.textContent = summary || "No barter adjustment applied.";
}

async function postMerchantTradeToChat(outcome = {}) {
  const actorName = String(outcome?.actorName ?? "Actor").trim() || "Actor";
  const merchantName = String(outcome?.merchantName ?? "Merchant").trim() || "Merchant";
  const buyRows = Array.isArray(outcome?.buyLines) ? outcome.buyLines : [];
  const sellRows = Array.isArray(outcome?.sellLines) ? outcome.sellLines : [];
  const buyHtml =
    buyRows.length > 0
      ? `<p><strong>Bought:</strong> ${buyRows.map((row) => `${poEscapeHtml(row.itemName)} x${row.qty}`).join(", ")}</p>`
      : "";
  const sellHtml =
    sellRows.length > 0
      ? `<p><strong>Sold:</strong> ${sellRows.map((row) => `${poEscapeHtml(row.itemName)} x${row.qty}`).join(", ")}</p>`
      : "";
  const netCp = Math.floor(Number(outcome?.netCp ?? 0) || 0);
  const netLabel =
    netCp > 0
      ? `${formatMerchantCp(netCp)} paid`
      : netCp < 0
        ? `${formatMerchantCp(Math.abs(netCp))} received`
        : "Even trade";
  const barter = outcome?.barter && typeof outcome.barter === "object" ? outcome.barter : null;
  const barterHtml = barter?.applied
    ? `<p><strong>Barter:</strong> ${poEscapeHtml(getMerchantBarterUiSummaryText(barter))}</p>`
    : "";
  // Rework v1: include pricing modifiers in chat log
  const stockPressureMult = Number(outcome?.stockPressureMult ?? 1) || 1;
  const taxFeePercent = Number(outcome?.taxFeePercent ?? 0) || 0;
  const liquidationMode = Boolean(outcome?.liquidationMode);
  const stockPressurePct = Math.round((stockPressureMult - 1) * 100);
  const modifierParts = [];
  if (stockPressurePct > 0) modifierParts.push(`+${stockPressurePct}% low-stock`);
  else if (stockPressurePct < 0) modifierParts.push(`${stockPressurePct}% stocked`);
  if (taxFeePercent > 0) modifierParts.push(`+${taxFeePercent}% tax`);
  if (liquidationMode) modifierParts.push("liquidation");
  const modifierHtml =
    modifierParts.length > 0 ? `<p><em>Pricing: ${poEscapeHtml(modifierParts.join(", "))}</em></p>` : "";
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ alias: "Party Operations" }),
    content: `
      <div class="po-chat-claim">
        <p><strong>Merchant Trade</strong></p>
        <p>${poEscapeHtml(actorName)} traded with ${poEscapeHtml(merchantName)}.</p>
        ${barterHtml}
        ${modifierHtml}
        ${buyHtml}
        ${sellHtml}
        <p><strong>Net:</strong> ${poEscapeHtml(netLabel)}</p>
      </div>
    `
  });
}

export function computeMerchantBarterAdjustment(checkTotalInput, dcInput, pricing = {}) {
  const checkTotal = Math.floor(Number(checkTotalInput ?? 0) || 0);
  const dc = Math.max(1, Math.floor(Number(dcInput ?? 10) || 10));
  const margin = checkTotal - dc;
  const success = margin >= 0;
  const tierMultiplier = Math.abs(margin) >= MERCHANT_BARTER_STRONG_MARGIN ? MERCHANT_BARTER_STRONG_MULTIPLIER : 1;
  const modifiers = getMerchantBarterPricingModifiers(pricing);
  const buyMarkupDelta = Number(
    ((success ? modifiers.successBuyModifier : modifiers.failureBuyModifier) * tierMultiplier).toFixed(2)
  );
  const sellRateDelta = Number(
    ((success ? modifiers.successSellModifier : modifiers.failureSellModifier) * tierMultiplier).toFixed(2)
  );
  const delta = Math.max(Math.abs(buyMarkupDelta), Math.abs(sellRateDelta));
  return {
    checkTotal,
    dc,
    margin,
    success,
    tierMultiplier,
    delta,
    buyMarkupDelta,
    sellRateDelta
  };
}

async function rollMerchantBarterCheck(actor, merchant = {}, options = {}) {
  const pricing = merchant?.pricing ?? {};
  const enabled = pricing?.barterEnabled !== false;
  if (!enabled || !actor) return { enabled, applied: false };
  const ability = normalizeMerchantBarterAbility(pricing?.barterAbility ?? options?.ability ?? "cha", "cha");
  const abilityLabel = String(MERCHANT_BARTER_ABILITY_LABELS[ability] ?? "Charisma");
  const dc = Math.max(1, Math.min(40, Math.floor(Number(pricing?.barterDc ?? options?.dc ?? 15) || 15)));
  const flavor = `Barter Check (${abilityLabel})`;
  const showDc = options?.showDc === true;
  let total = null;
  let source = "none";

  try {
    const monksResult = await requestMonksActorCheck(actor, `ability:${ability}`, dc, flavor, { showDc });
    const monksTotal = Number(monksResult?.total);
    if (Number.isFinite(monksTotal)) {
      total = monksTotal;
      source = "monks";
    }
  } catch (error) {
    console.warn(`${MODULE_ID}: barter monks check failed`, error);
  }

  if (!Number.isFinite(total) && typeof actor?.rollAbilityTest === "function") {
    try {
      const rollResult = await actor.rollAbilityTest(ability, { fastForward: true, chatMessage: false });
      const nativeTotal = Number(rollResult?.total ?? rollResult?.roll?.total);
      if (Number.isFinite(nativeTotal)) {
        total = nativeTotal;
        source = "native";
      }
    } catch (error) {
      console.warn(`${MODULE_ID}: barter ability check failed`, error);
    }
  }

  if (!Number.isFinite(total)) {
    const abilityMod = Number(actor?.system?.abilities?.[ability]?.mod ?? 0);
    const roll = await new Roll("1d20 + @mod", { mod: abilityMod }).evaluate();
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor
    });
    total = Number(roll.total ?? 0);
    source = "fallback";
  }

  const adjustment = computeMerchantBarterAdjustment(total, dc, pricing);
  return {
    enabled: true,
    applied: true,
    source,
    ability,
    abilityLabel,
    ...adjustment
  };
}

function normalizeMerchantTradeBarterResolution(barterInput, merchant = {}) {
  const pricing = merchant?.pricing ?? {};
  const enabled = pricing?.barterEnabled !== false;
  if (!enabled) return { enabled: false, applied: false };
  const payload = barterInput && typeof barterInput === "object" ? barterInput : null;
  const checkTotalRaw = Number(payload?.checkTotal);
  if (!payload || !payload.applied || !Number.isFinite(checkTotalRaw)) {
    return { enabled: true, applied: false };
  }
  const ability = normalizeMerchantBarterAbility(payload?.ability ?? pricing?.barterAbility ?? "cha", "cha");
  const abilityLabel = String(MERCHANT_BARTER_ABILITY_LABELS[ability] ?? "Charisma");
  const dc = Math.max(
    1,
    Math.min(40, Math.floor(Number(pricing?.barterDc ?? MERCHANT_DEFAULTS.pricing.barterDc ?? 15) || 15))
  );
  const computed = computeMerchantBarterAdjustment(Math.floor(checkTotalRaw), dc, pricing);
  const buyMarkupDelta = Number.isFinite(Number(payload?.buyMarkupDelta))
    ? normalizeMerchantBarterModifier(payload?.buyMarkupDelta, computed.buyMarkupDelta)
    : Number(computed.buyMarkupDelta ?? 0);
  const sellRateDelta = Number.isFinite(Number(payload?.sellRateDelta))
    ? normalizeMerchantBarterModifier(payload?.sellRateDelta, computed.sellRateDelta)
    : Number(computed.sellRateDelta ?? 0);
  const delta = Number.isFinite(Number(payload?.delta))
    ? normalizeMerchantBarterModifier(payload?.delta, computed.delta)
    : Number(Math.max(Math.abs(buyMarkupDelta), Math.abs(sellRateDelta)).toFixed(2));
  return {
    enabled: true,
    applied: true,
    source: String(payload?.source ?? "resolved").trim() || "resolved",
    ability,
    abilityLabel,
    checkTotal: computed.checkTotal,
    dc: computed.dc,
    margin: Number.isFinite(Number(payload?.margin)) ? Math.floor(Number(payload.margin)) : computed.margin,
    success: typeof payload?.success === "boolean" ? Boolean(payload.success) : computed.success,
    delta,
    buyMarkupDelta,
    sellRateDelta
  };
}
