#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DEFAULT_PACK_PATH = path.resolve(process.cwd(), "packs", "party-operations-loot-manifest.db");

const MIDI_QOL_EFFECT_DEFAULTS = Object.freeze({
  rollAttackPerTarget: "default",
  removeAttackDamageButtons: "default",
  effectActivation: false,
  itemCondition: "",
  reactionCondition: "",
  otherCondition: "",
  effectCondition: ""
});

const DAE_EFFECT_DEFAULTS = Object.freeze({
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

const SEMANTIC_CUE_TERMS = Object.freeze([
  "you gain",
  "resistance to",
  "immunity to",
  "bonus to ac",
  "saving throws",
  "advantage on",
  "base armor class is",
  "your strength score",
  "your dexterity score",
  "your constitution score",
  "your intelligence score",
  "your wisdom score",
  "your charisma score"
]);

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultValue(value) {
  if (Array.isArray(value)) return [...value];
  if (isPlainObject(value)) return { ...value };
  return value;
}

function applyDefaultObject(target, defaults) {
  let changed = 0;
  for (const [key, fallback] of Object.entries(defaults)) {
    const current = target[key];
    if (current === undefined || current === null) {
      target[key] = cloneDefaultValue(fallback);
      changed += 1;
      continue;
    }
    if (Array.isArray(fallback) && !Array.isArray(current)) {
      target[key] = [...fallback];
      changed += 1;
      continue;
    }
    if (isPlainObject(fallback) && !isPlainObject(current)) {
      target[key] = { ...fallback };
      changed += 1;
      continue;
    }
  }
  return changed;
}

function parseArgs(argv) {
  const args = {
    pack: DEFAULT_PACK_PATH,
    write: false,
    report: "",
    backup: true
  };
  for (let index = 0; index < argv.length; index += 1) {
    const entry = String(argv[index] ?? "").trim();
    if (!entry) continue;
    if (entry === "--write") {
      args.write = true;
      continue;
    }
    if (entry === "--no-backup") {
      args.backup = false;
      continue;
    }
    if (entry === "--pack") {
      args.pack = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
    if (entry === "--report") {
      args.report = path.resolve(process.cwd(), String(argv[index + 1] ?? ""));
      index += 1;
      continue;
    }
  }
  return args;
}

function readPack(packPath) {
  const raw = fs.readFileSync(packPath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, lineIndex) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON line ${lineIndex + 1}: ${error.message}`);
    }
  });
}

function writePack(packPath, rows) {
  const output = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.writeFileSync(packPath, `${output}\n`, "utf8");
}

function normalizeItem(item, summary) {
  if (!isPlainObject(item)) return;
  summary.totalItems += 1;

  const itemFlags = isPlainObject(item.flags) ? item.flags : {};
  if (!isPlainObject(item.flags)) item.flags = itemFlags;

  const effects = Array.isArray(item.effects) ? item.effects : [];
  if (!Array.isArray(item.effects)) item.effects = effects;

  if (effects.length > 0) {
    summary.itemsWithEffects += 1;
    if (!isPlainObject(itemFlags["midi-qol"])) {
      itemFlags["midi-qol"] = {};
      summary.itemLevelMidiFlagsAdded += 1;
    }
    if (!isPlainObject(itemFlags.dae)) {
      itemFlags.dae = {};
      summary.itemLevelDaeFlagsAdded += 1;
    }
  }

  for (const effect of effects) {
    if (!isPlainObject(effect)) continue;
    summary.totalEffects += 1;
    const flags = isPlainObject(effect.flags) ? effect.flags : {};
    if (!isPlainObject(effect.flags)) effect.flags = flags;

    if (!isPlainObject(flags["midi-qol"])) {
      flags["midi-qol"] = {};
      summary.effectLevelMidiFlagsAdded += 1;
    }
    if (!isPlainObject(flags.dae)) {
      flags.dae = {};
      summary.effectLevelDaeFlagsAdded += 1;
    }

    summary.effectMidiDefaultsApplied += applyDefaultObject(flags["midi-qol"], MIDI_QOL_EFFECT_DEFAULTS);
    summary.effectDaeDefaultsApplied += applyDefaultObject(flags.dae, DAE_EFFECT_DEFAULTS);
  }
}

function findSemanticGapCandidates(items) {
  const rows = [];
  for (const item of items) {
    if (!isPlainObject(item)) continue;
    const effects = Array.isArray(item.effects) ? item.effects : [];
    if (effects.length > 0) continue;
    const description = String(item?.system?.description?.value ?? "").toLowerCase();
    if (!description) continue;
    const hasCue = SEMANTIC_CUE_TERMS.some((cue) => description.includes(cue));
    if (!hasCue) continue;
    rows.push({
      id: String(item._id ?? ""),
      name: String(item.name ?? "Unknown Item"),
      type: String(item.type ?? ""),
      sourceId: String(item?.flags?.core?.sourceId ?? "")
    });
  }
  return rows;
}

function ensureDirectoryForFile(filePath) {
  const dirPath = path.dirname(filePath);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.pack)) {
    throw new Error(`Pack file not found: ${args.pack}`);
  }

  const items = readPack(args.pack);
  const summary = {
    packPath: args.pack,
    writeMode: Boolean(args.write),
    totalItems: 0,
    itemsWithEffects: 0,
    totalEffects: 0,
    itemLevelMidiFlagsAdded: 0,
    itemLevelDaeFlagsAdded: 0,
    effectLevelMidiFlagsAdded: 0,
    effectLevelDaeFlagsAdded: 0,
    effectMidiDefaultsApplied: 0,
    effectDaeDefaultsApplied: 0
  };

  for (const item of items) normalizeItem(item, summary);
  const semanticGapCandidates = findSemanticGapCandidates(items);
  summary.semanticGapCandidateCount = semanticGapCandidates.length;
  summary.semanticGapCandidateSample = semanticGapCandidates.slice(0, 120);

  if (args.write) {
    if (args.backup) {
      const backupPath = `${args.pack}.bak`;
      if (!fs.existsSync(backupPath)) fs.copyFileSync(args.pack, backupPath);
      summary.backupPath = backupPath;
    }
    writePack(args.pack, items);
  }

  if (args.report) {
    ensureDirectoryForFile(args.report);
    const reportPayload = {
      generatedAt: new Date().toISOString(),
      summary,
      semanticGapCandidates
    };
    fs.writeFileSync(args.report, JSON.stringify(reportPayload, null, 2), "utf8");
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ensure-loot-midi-dae failed: ${error.message}\n`);
  process.exit(1);
}

