#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const DEFAULT_MANIFEST_PATH = path.resolve(process.cwd(), "packs", "party-operations-loot-manifest.db");
const OWNER_ID = "GFVfiCPdpln7qZBb";
const TAGGED_AT = "2026-03-12T08:00:00.000Z";
const STATS = Object.freeze({
  compendiumSource: null,
  duplicateSource: null,
  coreVersion: "12.343",
  systemId: "dnd5e",
  systemVersion: "4.4.4",
  createdTime: 1771268199232,
  modifiedTime: 1771268199232,
  lastModifiedBy: OWNER_ID
});

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

const LEAF_DEFINITIONS = Object.freeze({
  "wall-art": Object.freeze({ label: "Wall Art", sort: 6260 }),
  "sculptures-idols": Object.freeze({ label: "Sculptures & Idols", sort: 6270 }),
  "decorative-finery": Object.freeze({ label: "Decorative Finery", sort: 6280 })
});

const ART_ITEMS = Object.freeze([
  Object.freeze({
    _id: "aRt01MNiP0rc5Qx2",
    name: "Miniature Court Portrait",
    identifier: "miniature-court-portrait",
    img: "icons/sundries/documents/document-bound-white.webp",
    weight: 0.5,
    price: 25,
    leaf: "wall-art",
    description:
      "<p>A tiny painted portrait of a noble courtier set in a lacquered frame. The piece is small enough to slip into a satchel, measuring roughly 6 by 8 inches.</p><p>Size: Tiny display piece. Weight: 0.5 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt02Gblt1Vw6Sy3",
    name: "Etched Ceremonial Chalice",
    identifier: "etched-ceremonial-chalice",
    img: "icons/commodities/treasure/goblet-worn-gold.webp",
    weight: 1,
    price: 100,
    leaf: "decorative-finery",
    description:
      "<p>A hand-sized ceremonial chalice etched with winding floral bands and tiny devotional scenes. It stands about 8 inches tall and is intended for display more than use.</p><p>Size: Small tabletop art object. Weight: 1 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt03Pntg2Xz7Ua4",
    name: "Framed Pastoral Painting",
    identifier: "framed-pastoral-painting",
    img: "icons/sundries/documents/document-symbol-circle-gold-red.webp",
    weight: 6,
    price: 250,
    leaf: "wall-art",
    description:
      "<p>A framed landscape painting of rolling farmland and a distant keep. The wooden frame spans roughly 2 feet by 3 feet, making it easy to hang but awkward to carry.</p><p>Size: Medium wall piece. Weight: 6 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt04UrnB3Yb8Vc5",
    name: "Bronze Ritual Urn",
    identifier: "bronze-ritual-urn",
    img: "icons/commodities/treasure/goblet-worn-gold.webp",
    weight: 12,
    price: 250,
    leaf: "decorative-finery",
    description:
      "<p>A broad bronze urn with repousse scenes of processions and harvest rites. It is about 18 inches tall and better suited to a plinth than a backpack.</p><p>Size: Medium decorative vessel. Weight: 12 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt05Bust4Cd9Wd6",
    name: "Marble Funerary Bust",
    identifier: "marble-funerary-bust",
    img: "icons/commodities/treasure/statue-carved-figurehead.webp",
    weight: 45,
    price: 750,
    leaf: "sculptures-idols",
    description:
      "<p>A finely carved marble bust of a solemn ancestor mounted on a square plinth. The sculpture stands nearly 2 feet high and must be padded carefully in transit.</p><p>Size: Large sculpture. Weight: 45 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt06Tps7Ef0Xe7",
    name: "Court Tapestry",
    identifier: "court-tapestry",
    img: "icons/sundries/flags/banner-worn-red.webp",
    weight: 14,
    price: 750,
    leaf: "wall-art",
    description:
      "<p>A richly woven tapestry showing a coronation scene in bright dyes and metallic thread. When unfurled, it measures roughly 6 feet by 4 feet.</p><p>Size: Large hanging textile artwork. Weight: 14 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt07Rlqy5Fg1Yh8",
    name: "Carved Reliquary Casket",
    identifier: "carved-reliquary-casket",
    img: "icons/commodities/treasure/token-runed-os-grey.webp",
    weight: 8,
    price: 2500,
    leaf: "decorative-finery",
    description:
      "<p>A carved casket with inlaid saints, beasts, and knotwork along its sides. The reliquary is about the size of a bread loaf and displays best on an altar or shelf.</p><p>Size: Medium ceremonial display piece. Weight: 8 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt08Idol6Gh2Zi9",
    name: "Jade Ancestral Idol",
    identifier: "jade-ancestral-idol",
    img: "icons/commodities/treasure/statue-carved-figurehead.webp",
    weight: 18,
    price: 2500,
    leaf: "sculptures-idols",
    description:
      "<p>A knee-high jade idol of an ancestral guardian with polished obsidian eyes. It is dense for its size and carried like a precious stone monument.</p><p>Size: Medium sculpture. Weight: 18 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt09Trip7Hj3Ak0",
    name: "Ancestral Hero Triptych",
    identifier: "ancestral-hero-triptych",
    img: "icons/sundries/documents/document-symbol-circle-gold-red.webp",
    weight: 18,
    price: 7500,
    leaf: "wall-art",
    description:
      "<p>A three-paneled devotional painting showing the victories of a revered dynasty founder. The hinged panels unfold to nearly 5 feet across.</p><p>Size: Large folding wall piece. Weight: 18 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt10Mosc8Kl4Bm1",
    name: "Gilded Mosaic Tablet",
    identifier: "gilded-mosaic-tablet",
    img: "icons/commodities/treasure/token-engraved-blue.webp",
    weight: 28,
    price: 7500,
    leaf: "wall-art",
    description:
      "<p>A heavy stone tablet faced with tiny glass tiles and gilt accents that form a radiant celestial scene. The slab is roughly 3 feet tall and requires two hands to move safely.</p><p>Size: Large mounted mosaic. Weight: 28 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt11Pilg9Lm5Cn2",
    name: "Silver Pilgrim Icon",
    identifier: "silver-pilgrim-icon",
    img: "icons/commodities/treasure/token-runed-os-grey.webp",
    weight: 1,
    price: 75,
    leaf: "decorative-finery",
    description:
      "<p>A palm-sized silver devotional icon showing a road-worn saint with a walking staff. The relief work is crisp enough to catch candlelight on every fold and border.</p><p>Size: Small altar piece. Weight: 1 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt12Bann0No6Dp3",
    name: "Embroidered Processional Banner",
    identifier: "embroidered-processional-banner",
    img: "icons/sundries/flags/banner-symbol-sun-gold-red.webp",
    weight: 5,
    price: 150,
    leaf: "wall-art",
    description:
      "<p>A ceremonial banner of deep blue cloth embroidered with gold thread and tassels. Hung from a rod, it measures roughly 4 feet long and sways dramatically when carried.</p><p>Size: Medium hanging textile artwork. Weight: 5 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt13Ivry1Op7Eq4",
    name: "Ivory Dice Reliquary",
    identifier: "ivory-dice-reliquary",
    img: "icons/commodities/treasure/box-gem-encrusted.webp",
    weight: 2,
    price: 200,
    leaf: "decorative-finery",
    description:
      "<p>A tiny ivory casket carved with gaming scenes and fitted with polished brass corners. It is the size of a thick book and prized as much for display as for storage.</p><p>Size: Small luxury container. Weight: 2 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt14Mask2Pq8Fr5",
    name: "Basalt Temple Mask",
    identifier: "basalt-temple-mask",
    img: "icons/equipment/head/mask-carved-bone-white.webp",
    weight: 9,
    price: 300,
    leaf: "wall-art",
    description:
      "<p>A dark basalt mask with stylized eyes and a severe ceremonial expression. The carving is broad and angular, meant to hang on a shrine wall rather than be worn in comfort.</p><p>Size: Medium mounted mask. Weight: 9 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt15Rivr3Qr9Gs6",
    name: "Soapstone River Spirit",
    identifier: "soapstone-river-spirit",
    img: "icons/commodities/treasure/statue-carved-face.webp",
    weight: 16,
    price: 350,
    leaf: "sculptures-idols",
    description:
      "<p>A smooth soapstone figure of a river spirit with flowing hair and folded hands. The statuette stands about a foot tall and has a cool, river-polished finish.</p><p>Size: Medium figurine. Weight: 16 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt16Scn4Rs0Ht7",
    name: "Lacquered Genealogy Screen",
    identifier: "lacquered-genealogy-screen",
    img: "icons/sundries/documents/document-sealed-red-tan.webp",
    weight: 11,
    price: 500,
    leaf: "wall-art",
    description:
      "<p>A folding lacquer screen painted with branching family trees and heraldic medallions. Opened fully, it spans nearly 4 feet across and works as either hanging art or a tabletop display.</p><p>Size: Large painted screen. Weight: 11 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt17Gong5St1Ju8",
    name: "Gilded Festival Gong Miniature",
    identifier: "gilded-festival-gong-miniature",
    img: "icons/commodities/treasure/bell-gold-blue.webp",
    weight: 7,
    price: 650,
    leaf: "decorative-finery",
    description:
      "<p>A miniature bronze festival gong suspended in a gilded display frame. Though playable, its bright finish and decorative chasing make it more suited to a collector's shelf.</p><p>Size: Medium tabletop display. Weight: 7 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt18Lion6Tu2Kv9",
    name: "Sandstone Lion Statuette",
    identifier: "sandstone-lion-statuette",
    img: "icons/commodities/treasure/statue-carved-lion.webp",
    weight: 24,
    price: 750,
    leaf: "sculptures-idols",
    description:
      "<p>A crouching lion carved from warm sandstone with a weathered mane and careful paw details. The statue is about 18 inches long and heavier than it first appears.</p><p>Size: Medium stone sculpture. Weight: 24 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt19Glas7Uv3Lw0",
    name: "Stained Glass Shrine Panel",
    identifier: "stained-glass-shrine-panel",
    img: "icons/magic/light/window-stained-glass-blue.webp",
    weight: 14,
    price: 1000,
    leaf: "wall-art",
    description:
      "<p>A leaded glass panel showing a haloed figure beneath a spray of colored stars. Sunlight through the pane throws jewel-bright patches across any room where it is hung.</p><p>Size: Medium shrine window panel. Weight: 14 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt20Brzr8Vw4Mx1",
    name: "Gold-Leaf Incense Brazier",
    identifier: "gold-leaf-incense-brazier",
    img: "icons/commodities/treasure/incense-burner-gold.webp",
    weight: 10,
    price: 1250,
    leaf: "decorative-finery",
    description:
      "<p>A domed brass brazier washed in gold leaf and pierced with floral vents. Delicate chains let it hang above an altar or a hall while scented smoke curls from its lid.</p><p>Size: Medium ceremonial burner. Weight: 10 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt21Bust9Wx5Ny2",
    name: "Serpentine Oracle Bust",
    identifier: "serpentine-oracle-bust",
    img: "icons/commodities/treasure/statue-carved-figurehead.webp",
    weight: 38,
    price: 1500,
    leaf: "sculptures-idols",
    description:
      "<p>A bust of a blindfolded oracle carved from green serpentine stone streaked with white veins. It rests on a polished plinth and weighs enough to require deliberate handling.</p><p>Size: Large bust. Weight: 38 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt22Pano0Xy6Oz3",
    name: "Illuminated Battle Panorama",
    identifier: "illuminated-battle-panorama",
    img: "icons/sundries/documents/document-symbol-skull-tan.webp",
    weight: 9,
    price: 1800,
    leaf: "wall-art",
    description:
      "<p>A long painted panorama of a famous battlefield edged with gilt notation and tiny heraldic markers. Rolled on twin rods, it stretches nearly 5 feet when displayed.</p><p>Size: Large hanging scroll painting. Weight: 9 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt23Coff1Yz7Pa4",
    name: "Mother-of-Pearl Jewelry Coffer",
    identifier: "mother-of-pearl-jewelry-coffer",
    img: "icons/commodities/treasure/chest-worn-oak-gold.webp",
    weight: 6,
    price: 2200,
    leaf: "decorative-finery",
    description:
      "<p>A lacquered coffer inlaid with mother-of-pearl vines that shimmer from white to green in the light. The interior is lined with velvet and fitted with tiny trays.</p><p>Size: Medium luxury coffer. Weight: 6 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt24Ebny2Za8Qb5",
    name: "Ebony Harvest Idol",
    identifier: "ebony-harvest-idol",
    img: "icons/commodities/treasure/statue-idol.webp",
    weight: 14,
    price: 2500,
    leaf: "sculptures-idols",
    description:
      "<p>An ebony idol of a harvest patron holding grain and a crescent sickle. The carving is dark, glossy, and dense, with tiny silver seeds set into the hem of its robes.</p><p>Size: Medium devotional idol. Weight: 14 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt25Map3Ab9Rc6",
    name: "Silk Cartographer Hanging",
    identifier: "silk-cartographer-hanging",
    img: "icons/sundries/documents/document-map-plain-blue.webp",
    weight: 4,
    price: 3000,
    leaf: "wall-art",
    description:
      "<p>A broad silk wall hanging painted with sea routes, winds, and compass roses in mineral dyes. Fine tassels and weighted corners keep the map cloth taut when displayed.</p><p>Size: Large textile map artwork. Weight: 4 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt26Lant4Bc0Sd7",
    name: "Crystal Ossuary Lantern",
    identifier: "crystal-ossuary-lantern",
    img: "icons/sundries/lights/lantern-iron-yellow.webp",
    weight: 9,
    price: 3500,
    leaf: "decorative-finery",
    description:
      "<p>A faceted crystal lantern framed in silver and etched with tiny memorial names. Even unlit, it throws fractured light around a room like a deliberate memorial piece.</p><p>Size: Medium display lantern. Weight: 9 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt27Aqla5Cd1Te8",
    name: "Bronze Griffin Aquila",
    identifier: "bronze-griffin-aquila",
    img: "icons/commodities/treasure/statue-winged.webp",
    weight: 32,
    price: 4000,
    leaf: "sculptures-idols",
    description:
      "<p>A proud bronze griffin mounted on a staff-and-globe base, fashioned as a military standard top. The wings flare wide enough that it dominates a shelf or command tent display.</p><p>Size: Large bronze sculpture. Weight: 32 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt28Plaq6De2Uf9",
    name: "Enamel Victory Plaque",
    identifier: "enamel-victory-plaque",
    img: "icons/commodities/treasure/plaque-pendant-gold.webp",
    weight: 13,
    price: 4500,
    leaf: "wall-art",
    description:
      "<p>A copper victory plaque coated in rich enamel blues and reds that depict a triumphal procession. It is designed for wall mounting and bears a narrow border of silver studs.</p><p>Size: Medium commemorative plaque. Weight: 13 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt29Cens7Ef3Vg0",
    name: "Silver Filigree Censer",
    identifier: "silver-filigree-censer",
    img: "icons/commodities/treasure/incense-burner-silver.webp",
    weight: 8,
    price: 5000,
    leaf: "decorative-finery",
    description:
      "<p>A hanging silver censer woven through with lace-fine filigree and tiny moon motifs. The workmanship is delicate enough that collectors often keep it on a stand rather than suspend it.</p><p>Size: Medium devotional finery. Weight: 8 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt30Judg8Fg4Wh1",
    name: "Porphyry Judge Effigy",
    identifier: "porphyry-judge-effigy",
    img: "icons/commodities/treasure/statue-carved-faceless.webp",
    weight: 41,
    price: 5500,
    leaf: "sculptures-idols",
    description:
      "<p>A seated magistrate carved from red porphyry with folded tablets on the lap. White flecks in the stone make the solemn expression seem to shift when viewed from different angles.</p><p>Size: Large seated figure. Weight: 41 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt31Frsc9Gh5Xi2",
    name: "Royal Hunt Fresco Panel",
    identifier: "royal-hunt-fresco-panel",
    img: "icons/sundries/documents/document-symbol-holy-blue.webp",
    weight: 26,
    price: 6000,
    leaf: "wall-art",
    description:
      "<p>A cut panel of painted plaster salvaged from a palace wall, preserving a mounted royal hunt in vivid ochres and greens. The fragment is fragile but visually striking.</p><p>Size: Large fresco section. Weight: 26 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt32Dipt0Hi6Yj3",
    name: "Amber Reliquary Diptych",
    identifier: "amber-reliquary-diptych",
    img: "icons/commodities/treasure/token-amber.webp",
    weight: 7,
    price: 6500,
    leaf: "decorative-finery",
    description:
      "<p>A hinged diptych of carved amber panels backed by gold leaf and tiny silver hinges. Held to the light, the resin glows warm as fire and reveals minute trapped imperfections.</p><p>Size: Medium folding devotional piece. Weight: 7 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt33Idol1Ij7Zk4",
    name: "Verdigris Atlas Idol",
    identifier: "verdigris-atlas-idol",
    img: "icons/commodities/treasure/statue-carved-runic.webp",
    weight: 29,
    price: 7000,
    leaf: "sculptures-idols",
    description:
      "<p>A bronze idol of a stooped giant carrying a globe across its shoulders, now patinated with deep green verdigris. The piece feels ancient and monument-like despite its manageable size.</p><p>Size: Large bronze idol. Weight: 29 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt34Velv2Jk8Al5",
    name: "Velvet Throne Backdrop",
    identifier: "velvet-throne-backdrop",
    img: "icons/sundries/flags/banner-fabric-gold-red.webp",
    weight: 16,
    price: 8000,
    leaf: "wall-art",
    description:
      "<p>A massive crimson velvet backdrop embroidered with lions, suns, and knotwork medallions. It is intended to hang behind a dais or throne and immediately claims the eye in any hall.</p><p>Size: Large ceremonial backdrop. Weight: 16 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt35Bowl3Kl9Bm6",
    name: "Pearl-Inlaid Libation Bowl",
    identifier: "pearl-inlaid-libation-bowl",
    img: "icons/commodities/treasure/bowl-gold.webp",
    weight: 5,
    price: 9000,
    leaf: "decorative-finery",
    description:
      "<p>A broad libation bowl of gold-toned bronze inlaid with seed pearls around the rim and base. The basin is polished to a mirror shine and meant for ritual display as much as use.</p><p>Size: Medium ceremonial bowl. Weight: 5 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt36Phnx4Lm0Cn7",
    name: "Alabaster Phoenix Figure",
    identifier: "alabaster-phoenix-figure",
    img: "icons/commodities/treasure/statue-bird.webp",
    weight: 22,
    price: 10000,
    leaf: "sculptures-idols",
    description:
      "<p>An alabaster phoenix rising from stylized flames, carved thin enough at the feathers to glow at the edges under bright light. It rests on a black stone base for contrast.</p><p>Size: Medium monument figure. Weight: 22 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt37Ceil5Mn1Do8",
    name: "Gilded Chapel Ceiling Panel",
    identifier: "gilded-chapel-ceiling-panel",
    img: "icons/sundries/documents/document-symbol-sun-yellow.webp",
    weight: 24,
    price: 12000,
    leaf: "wall-art",
    description:
      "<p>A square wooden ceiling panel painted with cherubs and clouds, then edged in leaf-gilded rays. Once mounted overhead, it would have formed the centerpiece of a small chapel canopy.</p><p>Size: Large painted architectural panel. Weight: 24 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt38Scep6No2Ep9",
    name: "Jeweled Coronation Scepter Display",
    identifier: "jeweled-coronation-scepter-display",
    img: "icons/commodities/treasure/scepter-gold-blue.webp",
    weight: 6,
    price: 15000,
    leaf: "decorative-finery",
    description:
      "<p>A jeweled ceremonial scepter laid into a fitted presentation case lined with blue velvet. The display is clearly intended to be admired as regalia rather than carried in day-to-day rule.</p><p>Size: Medium regalia display. Weight: 6 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt39Sraf7Op3Fq0",
    name: "Obsidian Seraph Torso",
    identifier: "obsidian-seraph-torso",
    img: "icons/commodities/treasure/statue-winged-purple.webp",
    weight: 36,
    price: 18000,
    leaf: "sculptures-idols",
    description:
      "<p>A torso-length seraph carved from glossy obsidian with folded wings and a faceless helm. The polished stone reflects candles in sharp points across its dark surface.</p><p>Size: Large black-glass sculpture. Weight: 36 lb.</p>"
  }),
  Object.freeze({
    _id: "aRt40Tapt8Pq4Gr1",
    name: "Sun-King Tapestry",
    identifier: "sun-king-tapestry",
    img: "icons/sundries/flags/banner-symbol-sun-gold.webp",
    weight: 20,
    price: 25000,
    leaf: "wall-art",
    description:
      "<p>A grand tapestry woven with metallic thread to depict a radiant monarch seated beneath a blazing disk. When hung full-length, it dominates a chamber at nearly 8 feet tall.</p><p>Size: Grand hanging tapestry. Weight: 20 lb.</p>"
  })
]);

function parseArgs(argv) {
  const args = {
    manifest: DEFAULT_MANIFEST_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] ?? "").trim();
    if (!token) continue;
    if (token === "--manifest") {
      args.manifest = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
    }
  }

  return args;
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

function getValueBand(price) {
  const gp = Math.max(0, Number(price) || 0);
  if (gp < 5) return "value.v0";
  if (gp <= 49) return "value.v1";
  if (gp <= 149) return "value.v2";
  if (gp <= 749) return "value.v3";
  if (gp <= 2999) return "value.v4";
  return "value.v5";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateWords(value, maxWords = 30) {
  const words = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function getArtSummaryText(spec) {
  const text = stripHtml(spec.description);
  const firstSentenceMatch = text.match(/.+?[.!?](?:\s|$)/);
  return truncateWords(String(firstSentenceMatch?.[0] ?? text).trim(), 30);
}

function buildArtChatDescription(spec) {
  return `<p><strong>${escapeHtml(spec.name)}</strong></p><p>${escapeHtml(getArtSummaryText(spec))}</p>`;
}

function buildArtUnidentifiedDescription(spec) {
  return `<p>${escapeHtml(getArtSummaryText(spec))}</p><p>Its provenance and exact market value require closer inspection.</p>`;
}

function buildItem(spec) {
  const leaf = LEAF_DEFINITIONS[String(spec.leaf ?? "").trim()];
  if (!leaf) throw new Error(`Unknown art leaf: ${String(spec.leaf ?? "")}`);

  const sourceId = `Compendium.party-operations.party-operations-loot-manifest.Item.${spec._id}`;
  const pathNodes = [
    { key: "sundries", label: "Sundries", sort: 6000 },
    { key: "art-objects", label: "Art Objects", sort: 6250 },
    { key: spec.leaf, label: leaf.label, sort: leaf.sort }
  ];
  const valueBand = getValueBand(spec.price);

  return {
    _id: spec._id,
    name: spec.name,
    type: "loot",
    img: spec.img,
    system: {
      description: {
        value: spec.description,
        chat: buildArtChatDescription(spec)
      },
      source: {
        rules: "2014",
        revision: 1
      },
      quantity: 1,
      weight: {
        value: spec.weight,
        units: "lb"
      },
      price: {
        value: spec.price,
        denomination: "gp"
      },
      rarity: "",
      identified: true,
      type: {
        value: "treasure",
        subtype: ""
      },
      identifier: spec.identifier,
      unidentified: {
        description: buildArtUnidentifiedDescription(spec)
      },
      container: null,
      properties: [],
      activities: {
        dnd5eactivity000: {
          _id: "dnd5eactivity000",
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
            chatFlavor: `Use ${spec.name}`
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
          sort: 0,
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
        }
      }
    },
    effects: [],
    folder: null,
    flags: {
      "party-operations": {
        keywords: [
          "activation.action",
          "automation.activity",
          "automation.activity.utility",
          "automation.mode.usable",
          "folder.family.sundries",
          `folder.leaf.${spec.leaf}`,
          `folder.path.sundries.art-objects.${spec.leaf}`,
          "folder.section.art-objects",
          "foundryType.loot",
          "loot",
          "loot.loot",
          "merchant.art",
          "merchant.loot",
          "merchant.luxury",
          "merchant.treasure",
          "price.gp",
          "sale.luxury",
          "source.party.operations.party.operations.loot.manifest",
          "subtype.treasure",
          "tier.t1",
          valueBand
        ],
        lootType: "loot.loot",
        tier: "tier.t1",
        rarityNormalized: "",
        gpValue: spec.price,
        valueBand,
        taggedAt: TAGGED_AT,
        tagSchema: "po-loot-v3",
        details: {
          schema: "po-item-enrichment-v3",
          itemType: "loot",
          activityCount: 1,
          effectCount: 0,
          hasDescription: true,
          coreSourceId: sourceId,
          folderPathKey: `sundries/art-objects/${spec.leaf}`,
          folderLabels: ["Sundries", "Art Objects", leaf.label],
          primaryMode: "usable",
          activityTypes: ["utility"],
          activationTypes: ["action"],
          transferEffectCount: 0,
          appliedEffectCount: 0
        },
        pricingSource: "system",
        priceDenomination: "gp",
        merchantCategories: ["art", "loot", "luxury", "treasure"],
        saleLiquidity: "sale.luxury",
        lootWeight: 1.6,
        maxRecommendedQty: 2,
        lootEligible: true,
        sellValueGp: Number((Number(spec.price) * 0.5).toFixed(2)),
        folder: {
          schema: "po-loot-folder-v1",
          familyKey: "sundries",
          familyLabel: "Sundries",
          sectionKey: "art-objects",
          sectionLabel: "Art Objects",
          leafKey: spec.leaf,
          leafLabel: leaf.label,
          path: pathNodes,
          pathLabels: pathNodes.map((entry) => entry.label),
          pathKeys: pathNodes.map((entry) => entry.key),
          pathKey: `sundries/art-objects/${spec.leaf}`
        },
        usability: {
          schema: "po-loot-usage-v1",
          isUsable: true,
          primaryMode: "usable",
          activityCount: 1,
          activityTypes: ["utility"],
          primaryActivityType: "utility",
          activationTypes: ["action"],
          targetTypes: [],
          effectCount: 0,
          transferEffectCount: 0,
          appliedEffectCount: 0,
          hasPassiveEffects: false,
          hasAppliedEffects: false,
          integrations: []
        }
      },
      "midi-qol": { ...DEFAULT_MIDI_QOL },
      dae: { ...DEFAULT_DAE },
      midiProperties: { ...DEFAULT_MIDI_PROPERTIES },
      core: {
        sourceId
      }
    },
    _stats: { ...STATS },
    sort: 0,
    ownership: {
      default: 0,
      [OWNER_ID]: 3
    }
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.manifest)) {
    throw new Error(`Manifest pack not found: ${args.manifest}`);
  }

  const currentItems = readManifestItems(args.manifest);
  const seededIds = new Set(ART_ITEMS.map((item) => item._id));
  const nextItems = currentItems.filter((item) => !seededIds.has(String(item?._id ?? "").trim()));
  const seededItems = ART_ITEMS.map((item) => buildItem(item));
  nextItems.push(...seededItems);
  writeManifestItems(args.manifest, nextItems);

  const summary = {
    manifestPath: args.manifest,
    appendedCount: seededItems.length,
    manifestItemCountBefore: currentItems.length,
    manifestItemCountAfter: nextItems.length,
    ids: seededItems.map((item) => item._id)
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main();
