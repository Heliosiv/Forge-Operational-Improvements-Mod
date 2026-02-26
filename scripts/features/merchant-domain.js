export const MERCHANT_SOURCE_TYPES = Object.freeze({
  COMPENDIUM_PACK: "compendium-pack",
  WORLD_FOLDER: "world-folder",
  WORLD_ITEMS: "world-items"
});

export const MERCHANT_SCARCITY_LEVELS = Object.freeze({
  ABUNDANT: "abundant",
  NORMAL: "normal",
  SCARCE: "scarce"
});

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

export const MERCHANT_DEFAULTS = Object.freeze({
  settlement: "",
  pricing: Object.freeze({
    buyMarkup: 1,
    sellRate: 0.5
  }),
  stock: Object.freeze({
    sourceType: MERCHANT_SOURCE_TYPES.WORLD_ITEMS,
    sourceRef: "",
    sourcePackIds: Object.freeze([]),
    includeTags: [],
    excludeTags: [],
    allowedTypes: Object.freeze([...MERCHANT_ALLOWED_ITEM_TYPE_LIST]),
    curatedItemUuids: Object.freeze([]),
    maxItems: 8,
    targetValueGp: 0,
    scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL
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

export function normalizeMerchantTagList(values = []) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter((entry, index, rows) => entry.length > 0 && entry.length <= MERCHANT_MAX_TAG_LENGTH && rows.indexOf(entry) === index)
    .slice(0, MERCHANT_MAX_TAG_COUNT);
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
  if (scarcity === MERCHANT_SCARCITY_LEVELS.ABUNDANT) return MERCHANT_SCARCITY_LEVELS.ABUNDANT;
  if (scarcity === MERCHANT_SCARCITY_LEVELS.SCARCE) return MERCHANT_SCARCITY_LEVELS.SCARCE;
  return MERCHANT_SCARCITY_LEVELS.NORMAL;
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

export function generateRandomMerchantName(raceInput = "") {
  const raceKey = getMerchantRaceKey(raceInput);
  const pool = MERCHANT_RANDOM_NAME_POOLS[raceKey] ?? MERCHANT_RANDOM_NAME_POOLS.default;
  const first = pickRandomMerchantNamePart(pool?.first, "Merchant");
  const last = pickRandomMerchantNamePart(pool?.last, "Trader");
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
    isHidden: false,
    requiresContract: false,
    contractKey: "",
    socialGateEnabled: false,
    minSocialScore: 0,
    pricing: {
      buyMarkup,
      sellRate: MERCHANT_DEFAULTS.pricing.sellRate
    },
    stock: {
      sourceType: MERCHANT_SOURCE_TYPES.WORLD_FOLDER,
      sourceRef: String(sourceFolder?.id ?? "").trim(),
      sourcePackIds: [],
      includeTags: [],
      excludeTags: [],
      allowedTypes: normalizeMerchantAllowedItemTypes(blueprint?.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST),
      curatedItemUuids: [],
      maxItems,
      targetValueGp: 0,
      scarcity: MERCHANT_SCARCITY_LEVELS.NORMAL
    },
    actorId: ""
  };
}

export function buildMerchantDefinitionPatchFromEditorForm(formValues = {}) {
  const source = formValues && typeof formValues === "object" ? formValues : {};
  const existingStock = source?.existingStock && typeof source.existingStock === "object"
    ? source.existingStock
    : {};
  const markupPercentRaw = Number(
    source?.markupPercent
    ?? (Number(source?.buyMarkup ?? MERCHANT_DEFAULTS.pricing.buyMarkup) * 100)
  );
  const markupPercent = clampMerchantMarkupPercent(markupPercentRaw, Number(MERCHANT_DEFAULTS.pricing.buyMarkup) * 100);
  const buyMarkup = Number((markupPercent / 100).toFixed(2));
  const stockCount = clampMerchantItemCount(source?.stockCount ?? source?.maxItems, MERCHANT_DEFAULTS.stock.maxItems);
  const sourceTypeRaw = normalizeMerchantSourceType(source?.sourceType ?? MERCHANT_SOURCE_TYPES.WORLD_FOLDER);
  const sourceType = sourceTypeRaw === MERCHANT_SOURCE_TYPES.WORLD_ITEMS
    ? MERCHANT_SOURCE_TYPES.WORLD_FOLDER
    : sourceTypeRaw;
  const sourceRef = String(source?.sourceRef ?? "").trim();
  const sourcePackIds = sourceType === MERCHANT_SOURCE_TYPES.COMPENDIUM_PACK && sourceRef
    ? [sourceRef]
    : [];
  return {
    id: String(source?.id ?? "").trim(),
    name: String(source?.name ?? "").trim(),
    title: String(source?.title ?? "").trim(),
    race: normalizeMerchantRace(source?.race ?? ""),
    img: String(source?.img ?? "").trim(),
    settlement: String(source?.settlement ?? "").trim(),
    isHidden: false,
    requiresContract: false,
    contractKey: "",
    socialGateEnabled: false,
    minSocialScore: 0,
    pricing: {
      buyMarkup,
      sellRate: MERCHANT_DEFAULTS.pricing.sellRate
    },
    stock: {
      sourceType,
      sourceRef,
      sourcePackIds,
      includeTags: normalizeMerchantTagList(existingStock?.includeTags ?? []),
      excludeTags: normalizeMerchantTagList(existingStock?.excludeTags ?? []),
      allowedTypes: normalizeMerchantAllowedItemTypes(existingStock?.allowedTypes ?? MERCHANT_ALLOWED_ITEM_TYPE_LIST),
      curatedItemUuids: normalizeMerchantCuratedItemUuids(existingStock?.curatedItemUuids ?? []),
      maxItems: stockCount,
      targetValueGp: Math.max(0, Number(existingStock?.targetValueGp ?? 0) || 0),
      scarcity: normalizeMerchantScarcity(existingStock?.scarcity ?? MERCHANT_SCARCITY_LEVELS.NORMAL)
    },
    actorId: String(source?.actorId ?? "").trim()
  };
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

export function getMerchantSourceRefOptionsForEditor(sourceTypeInput, selectedSourceRef = "", sourcePackOptions = [], options = {}) {
  const sourceType = normalizeMerchantSourceType(sourceTypeInput);
  const selected = String(selectedSourceRef ?? "").trim();
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_ITEMS) {
    const worldOptions = [{
      value: "",
      label: "All World Items",
      selected: !selected
    }];
    if (selected) {
      worldOptions.push({
        value: selected,
        label: `${selected} (Custom)`,
        selected: true
      });
    }
    return worldOptions;
  }
  if (sourceType === MERCHANT_SOURCE_TYPES.WORLD_FOLDER) {
    const getWorldFolderOptions = typeof options?.getWorldFolderOptions === "function"
      ? options.getWorldFolderOptions
      : () => [];
    const rows = getWorldFolderOptions(selected);
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
        selected: id === selected
      };
    })
    .filter((entry) => entry.value)
    .sort((a, b) => String(a.label ?? "").localeCompare(String(b.label ?? "")));
  packOptions.unshift({
    value: "",
    label: packOptions.length > 0 ? "Select Primary Pack" : "No Compendium Packs Available",
    selected: !selected
  });
  if (selected && !packOptions.some((entry) => entry.value === selected)) {
    packOptions.push({
      value: selected,
      label: `${selected} (Unavailable)`,
      selected: true
    });
  }
  return packOptions;
}

export function getMerchantTargetStockCount(stock = {}) {
  const maxItemsRaw = Number(stock?.maxItems ?? MERCHANT_DEFAULTS.stock.maxItems);
  const maxItems = Number.isFinite(maxItemsRaw)
    ? Math.max(1, Math.min(MERCHANT_MAX_ITEM_COUNT, Math.floor(maxItemsRaw)))
    : MERCHANT_DEFAULTS.stock.maxItems;
  const scarcity = normalizeMerchantScarcity(stock?.scarcity ?? MERCHANT_DEFAULTS.stock.scarcity);
  if (scarcity === MERCHANT_SCARCITY_LEVELS.ABUNDANT) return maxItems;
  if (scarcity === MERCHANT_SCARCITY_LEVELS.SCARCE) return Math.max(1, Math.floor(maxItems * 0.6));
  return Math.max(1, Math.floor(maxItems * 0.85));
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

export function selectMerchantStockRows(candidates = [], merchant = {}, options = {}) {
  const normalizeCuratedItemUuids = typeof options?.normalizeCuratedItemUuids === "function"
    ? options.normalizeCuratedItemUuids
    : normalizeMerchantCuratedItemUuids;
  const getTargetCount = typeof options?.getTargetStockCount === "function"
    ? options.getTargetStockCount
    : getMerchantTargetStockCount;
  const shuffleRows = typeof options?.shuffleRows === "function"
    ? options.shuffleRows
    : shuffleMerchantRows;
  const stock = merchant?.stock ?? {};
  const curatedOrder = normalizeCuratedItemUuids(stock?.curatedItemUuids ?? []);
  const targetCount = getTargetCount(stock);
  const targetValueGpRaw = Number(stock?.targetValueGp ?? 0);
  const targetValueGp = Number.isFinite(targetValueGpRaw) ? Math.max(0, targetValueGpRaw) : 0;
  const shuffled = shuffleRows(Array.isArray(candidates) ? candidates : []);
  const selected = [];
  let runningValue = 0;
  const selectedKeys = new Set();
  if (curatedOrder.length > 0) {
    for (const uuid of curatedOrder) {
      if (selected.length >= targetCount) break;
      const match = shuffled.find((entry) => String(entry?.key ?? "") === uuid);
      if (!match || selectedKeys.has(match.key)) continue;
      selected.push(match);
      selectedKeys.add(match.key);
      runningValue += Math.max(0, Number(match?.gpValue ?? 0) || 0);
    }
  }
  for (const candidate of shuffled) {
    if (selected.length >= targetCount) break;
    if (selectedKeys.has(candidate.key)) continue;
    const candidateValue = Math.max(0, Number(candidate?.gpValue ?? 0) || 0);
    if (targetValueGp > 0 && selected.length > 0) {
      const softCap = targetValueGp * 1.15;
      const closeEnough = runningValue >= (targetValueGp * 0.75);
      if ((runningValue + candidateValue) > softCap && closeEnough) continue;
    }
    selected.push(candidate);
    selectedKeys.add(candidate.key);
    runningValue += candidateValue;
  }
  if (selected.length < targetCount) {
    for (const candidate of shuffled) {
      if (selected.length >= targetCount) break;
      if (selectedKeys.has(candidate.key)) continue;
      selected.push(candidate);
      selectedKeys.add(candidate.key);
    }
  }
  if (selected.length === 0 && shuffled.length > 0) selected.push(shuffled[0]);
  return selected;
}

export function buildMerchantStockCandidateRows(documents = [], merchant = {}, options = {}) {
  const getItemData = typeof options?.getItemData === "function" ? options.getItemData : (value) => value ?? {};
  const getItemTags = typeof options?.getItemTags === "function" ? options.getItemTags : () => [];
  const matchesTagFilters = typeof options?.matchesTagFilters === "function" ? options.matchesTagFilters : () => true;
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
  const stock = merchant?.stock ?? {};
  const curatedUuids = new Set(normalizeCuratedUuids(stock?.curatedItemUuids ?? []));
  const allowedTypes = new Set(normalizeAllowedTypes(stock?.allowedTypes ?? []));
  const includeTags = normalizeTags(stock?.includeTags ?? []);
  const excludeTags = normalizeTags(stock?.excludeTags ?? []);
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
    const tags = getItemTags(data);
    if (!isCurated && !matchesTagFilters(tags, includeTags, excludeTags)) continue;
    const gpValue = Math.max(0, Number(getItemGpValue(data) || 0));
    rows.push({
      key: rowKey,
      data,
      gpValue,
      isCurated
    });
  }
  return rows;
}
