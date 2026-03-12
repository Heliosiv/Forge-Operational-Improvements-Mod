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
        chat: ""
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
        description: ""
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
