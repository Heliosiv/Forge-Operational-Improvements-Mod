#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  enrichManifestItem,
  normalizeEffects,
  normalizeItemFlags,
  stampPartyOperationsMetadata
} from "./sync-dnd5e-items-into-manifest.js";

const MODULE_ID = "party-operations";
const DEFAULT_SOURCE_PATH = "C:/Users/Kyle/Downloads/party-ops-2026-03-09-export.json";
const DEFAULT_OUTPUT_PATH = "C:/Users/Kyle/Downloads/party-ops-2026-03-09-cleaned.json";
const DEFAULT_NDJSON_PATH = "C:/Users/Kyle/Downloads/party-ops-2026-03-09-cleaned.ndjson";
const DEFAULT_REPORT_PATH = "C:/Users/Kyle/Downloads/party-ops-2026-03-09-cleaned-report.json";
const DEFAULT_COLLECTION = "world.party-ops-2026-03-09";
const DEFAULT_FOUNDRY_DATA_PATH = "C:/Users/Kyle/AppData/Local/FoundryVTT/Data";

function parseArgs(argv) {
  const args = {
    source: DEFAULT_SOURCE_PATH,
    output: DEFAULT_OUTPUT_PATH,
    ndjson: DEFAULT_NDJSON_PATH,
    report: DEFAULT_REPORT_PATH,
    collection: DEFAULT_COLLECTION,
    foundryData: DEFAULT_FOUNDRY_DATA_PATH
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = String(argv[index] ?? "").trim();
    if (!token) continue;
    if (token === "--source") {
      args.source = String(argv[index + 1] ?? "").trim() || args.source;
      index += 1;
      continue;
    }
    if (token === "--output") {
      args.output = String(argv[index + 1] ?? "").trim() || args.output;
      index += 1;
      continue;
    }
    if (token === "--ndjson") {
      args.ndjson = String(argv[index + 1] ?? "").trim() || args.ndjson;
      index += 1;
      continue;
    }
    if (token === "--report") {
      args.report = String(argv[index + 1] ?? "").trim() || args.report;
      index += 1;
      continue;
    }
    if (token === "--collection") {
      args.collection = String(argv[index + 1] ?? "").trim() || args.collection;
      index += 1;
      continue;
    }
    if (token === "--foundry-data") {
      args.foundryData = String(argv[index + 1] ?? "").trim() || args.foundryData;
      index += 1;
    }
  }

  return args;
}

function ensureDirectory(filePath) {
  const dirPath = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureObject(parent, key) {
  if (!isPlainObject(parent[key])) parent[key] = {};
  return parent[key];
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
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

function slugify(value) {
  const normalized = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "item";
}

function normalizeRuleTag(value) {
  const text = String(value ?? "").trim();
  if (text === "2014" || text === "2024") return text;
  return "";
}

function dedupeKeyForItem(item = {}) {
  const type = normalizeWhitespace(item?.type).toLowerCase() || "item";
  const name = normalizeWhitespace(item?.name).toLowerCase() || "unnamed-item";
  const rules = normalizeRuleTag(item?.system?.source?.rules);
  return `${type}::${name}::${rules || "any"}`;
}

function getMeaningfulIdentifier(item = {}) {
  const identifier = normalizeWhitespace(item?.system?.identifier).toLowerCase();
  if (!identifier || identifier === "new-item") return "";
  return identifier;
}

function getSourceRank(sourceId = "") {
  const text = String(sourceId ?? "").trim();
  if (!text) return 0;
  if (text.startsWith("Compendium.dnd5e.")) return 400;
  if (text.startsWith("Compendium.party-operations.")) return 320;
  if (text.startsWith("Compendium.world.party-ops-2026-03-09.")) return 300;
  if (text.startsWith("Compendium.world.terranor-c1-items-pack.")) return 260;
  if (text.startsWith("Compendium.world.dandd-items-pack.")) return 240;
  if (text.startsWith("Compendium.world.spells-list.")) return 220;
  if (text.startsWith("Compendium.world.new.")) return 180;
  if (text.startsWith("Compendium.world.")) return 140;
  if (text.startsWith("Compendium.")) return 80;
  return 10;
}

function getImageRank(img = "") {
  const text = String(img ?? "").trim();
  if (!text) return 0;
  if (text.startsWith("icons/")) return 100;
  if (text.startsWith("systems/dnd5e/")) return 95;
  if (text.startsWith("modules/")) return 90;
  if (text.startsWith("https://assets.forge-vtt.com/bazaar/core/")) return 85;
  if (text.startsWith("https://assets.forge-vtt.com/bazaar/systems/dnd5e/")) return 80;
  if (text.startsWith("https://assets.forge-vtt.com/bazaar/modules/")) return 75;
  if (text.startsWith("https://assets.forge-vtt.com/")) return 60;
  return 40;
}

function getItemQualityScore(item = {}) {
  const descriptionLength = String(item?.system?.description?.value ?? "").trim().length;
  const activityCount = Object.keys(item?.system?.activities ?? {}).length;
  const effectCount = Array.isArray(item?.effects) ? item.effects.length : 0;
  const keywords = Array.isArray(item?.flags?.[MODULE_ID]?.keywords) ? item.flags[MODULE_ID].keywords.length : 0;
  const book = normalizeWhitespace(item?.system?.source?.book);
  const identifier = getMeaningfulIdentifier(item);
  const sourceId = normalizeWhitespace(item?.flags?.core?.sourceId);
  const priceValue = Number(item?.system?.price?.value ?? 0) || 0;
  const weightValue = Number(item?.system?.weight?.value ?? 0) || 0;

  return (
    Math.min(descriptionLength, 4000)
    + (activityCount * 250)
    + (effectCount * 300)
    + Math.min(keywords, 40) * 10
    + (book ? 60 : 0)
    + (identifier ? 50 : 0)
    + (priceValue > 0 ? 20 : 0)
    + (weightValue > 0 ? 10 : 0)
    + getSourceRank(sourceId)
    + getImageRank(item?.img)
  );
}

function choosePreferredItem(items = []) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return [...items].sort((left, right) => {
    const scoreDelta = getItemQualityScore(right) - getItemQualityScore(left);
    if (scoreDelta !== 0) return scoreDelta;

    const descDelta = String(right?.system?.description?.value ?? "").length - String(left?.system?.description?.value ?? "").length;
    if (descDelta !== 0) return descDelta;

    const activityDelta = Object.keys(right?.system?.activities ?? {}).length - Object.keys(left?.system?.activities ?? {}).length;
    if (activityDelta !== 0) return activityDelta;

    const effectDelta = (Array.isArray(right?.effects) ? right.effects.length : 0) - (Array.isArray(left?.effects) ? left.effects.length : 0);
    if (effectDelta !== 0) return effectDelta;

    return String(left?._id ?? "").localeCompare(String(right?._id ?? ""));
  })[0];
}

function copyIfMissing(target, source, pathSegments = []) {
  if (!pathSegments.length) return;
  let targetRef = target;
  let sourceRef = source;
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const key = pathSegments[index];
    if (!isPlainObject(targetRef?.[key]) || !isPlainObject(sourceRef?.[key])) return;
    targetRef = targetRef[key];
    sourceRef = sourceRef[key];
  }
  const leaf = pathSegments[pathSegments.length - 1];
  if (targetRef[leaf] !== undefined && targetRef[leaf] !== null && String(targetRef[leaf]).trim() !== "") return;
  if (sourceRef[leaf] === undefined || sourceRef[leaf] === null || String(sourceRef[leaf]).trim() === "") return;
  targetRef[leaf] = clone(sourceRef[leaf]);
}

function pickCanonicalSourceId(items = []) {
  return [...items]
    .map((item) => normalizeWhitespace(item?.flags?.core?.sourceId))
    .filter(Boolean)
    .sort((left, right) => getSourceRank(right) - getSourceRank(left) || left.localeCompare(right))[0] ?? "";
}

function mergeDuplicateGroup(items = [], summary) {
  const preferred = choosePreferredItem(items);
  if (!preferred) return null;

  const result = clone(preferred);
  const mergedIds = [];
  const mergedSourceIds = [];

  for (const candidate of items) {
    const candidateId = normalizeWhitespace(candidate?._id);
    if (candidateId && candidateId !== normalizeWhitespace(result?._id)) mergedIds.push(candidateId);

    const sourceId = normalizeWhitespace(candidate?.flags?.core?.sourceId);
    if (sourceId) mergedSourceIds.push(sourceId);

    if (!String(result?.system?.description?.value ?? "").trim() && String(candidate?.system?.description?.value ?? "").trim()) {
      ensureObject(result, "system").description = clone(candidate.system.description);
    }

    if (Object.keys(result?.system?.activities ?? {}).length < Object.keys(candidate?.system?.activities ?? {}).length) {
      ensureObject(result, "system").activities = clone(candidate.system?.activities ?? {});
    }

    if ((Array.isArray(result?.effects) ? result.effects.length : 0) < (Array.isArray(candidate?.effects) ? candidate.effects.length : 0)) {
      result.effects = clone(candidate.effects ?? []);
    }

    if (getImageRank(result?.img) < getImageRank(candidate?.img)) result.img = String(candidate?.img ?? "");
    copyIfMissing(result, candidate, ["system", "source", "book"]);
    copyIfMissing(result, candidate, ["system", "source", "license"]);
    copyIfMissing(result, candidate, ["system", "source", "rules"]);
    copyIfMissing(result, candidate, ["system", "source", "revision"]);
  }

  const flags = ensureObject(result, "flags");
  const coreFlags = ensureObject(flags, "core");
  const canonicalSourceId = pickCanonicalSourceId(items);
  if (canonicalSourceId) coreFlags.sourceId = canonicalSourceId;

  const poFlags = ensureObject(flags, MODULE_ID);
  poFlags.dedupe = {
    dedupeKey: dedupeKeyForItem(result),
    mergedItemIds: Array.from(new Set(mergedIds)).sort((left, right) => left.localeCompare(right)),
    mergedSourceIds: Array.from(new Set(mergedSourceIds)).sort((left, right) => left.localeCompare(right)),
    mergedCount: Math.max(0, items.length - 1),
    canonicalSourceId,
    cleanedAt: new Date().toISOString()
  };

  if (summary && items.length > 1) {
    summary.groupsCollapsed += 1;
    summary.itemsRemoved += (items.length - 1);
  }

  return result;
}

function normalizeDescriptionHtml(item = {}, summary) {
  const system = ensureObject(item, "system");
  const description = ensureObject(system, "description");
  const current = String(description?.value ?? "").trim();
  if (!current) return;

  let next = current.replace(/\r\n/g, "\n").trim();
  if (!/<[a-z][\s\S]*>/i.test(next)) {
    const paragraphs = next
      .split(/\n{2,}/)
      .map((entry) => normalizeWhitespace(entry))
      .filter(Boolean)
      .map((entry) => `<p>${escapeHtml(entry)}</p>`);
    next = paragraphs.join("");
  }

  const inlineImageMatches = next.match(/<img\b[^>]*\/?>/gi) ?? [];
  if (inlineImageMatches.length > 0) {
    next = next.replace(/\s*<img\b[^>]*\/?>\s*/gi, "");
    summary.descriptionImagesRemoved += inlineImageMatches.length;
  }

  let paragraphPasses = 0;
  let deduped = next;
  do {
    next = deduped;
    deduped = next.replace(/(<p\b[^>]*>[\s\S]*?<\/p>)(\s*\1)+/gi, "$1");
    if (deduped !== next) paragraphPasses += 1;
  } while (deduped !== next);
  next = deduped;
  summary.descriptionParagraphsDeduped += paragraphPasses;

  next = next
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (next !== current) {
    description.value = next;
    summary.descriptionHtmlNormalized += 1;
  }
}

function collectExternalAssetBasenames(items = []) {
  const basenames = new Set();
  for (const item of items) {
    const current = String(item?.img ?? "").trim();
    if (!current.startsWith("https://assets.forge-vtt.com/")) continue;
    const basename = path.basename(decodeURIComponent(current)).toLowerCase();
    if (basename) basenames.add(basename);
  }
  return basenames;
}

function buildBasenameIndex(rootPath, targetBasenames = new Set()) {
  const index = new Map();
  const root = path.resolve(rootPath);
  if (!fs.existsSync(root) || targetBasenames.size === 0) return index;

  const walk = (currentPath) => {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      const basename = String(entry.name ?? "").toLowerCase();
      if (!targetBasenames.has(basename)) continue;
      if (!index.has(basename)) index.set(basename, []);
      index.get(basename).push(fullPath);
    }
  };

  walk(root);
  return index;
}

function normalizePortableImage(item = {}, summary, assetReviewItems, assetPathIndex, foundryDataRoot) {
  const current = String(item?.img ?? "").trim();
  if (!current) return;

  const replacements = [
    ["https://assets.forge-vtt.com/bazaar/core/", ""],
    ["https://assets.forge-vtt.com/bazaar/systems/dnd5e/", "systems/dnd5e/"],
    ["https://assets.forge-vtt.com/bazaar/modules/", "modules/"]
  ];

  for (const [prefix, replacement] of replacements) {
    if (!current.startsWith(prefix)) continue;
    item.img = decodeURIComponent(`${replacement}${current.slice(prefix.length)}`);
    summary.imagesNormalized += 1;
    return;
  }

  if (current.startsWith("https://assets.forge-vtt.com/")) {
    const basename = path.basename(decodeURIComponent(current)).toLowerCase();
    const matches = Array.isArray(assetPathIndex?.get(basename)) ? assetPathIndex.get(basename) : [];
    if (matches.length === 1) {
      item.img = path.relative(path.resolve(foundryDataRoot), matches[0]).replace(/\\/g, "/");
      summary.imagesRelinkedLocal += 1;
      return;
    }
    assetReviewItems.push({
      name: String(item?.name ?? ""),
      type: String(item?.type ?? ""),
      img: current
    });
  }
}

function normalizeIdentifier(item = {}, summary) {
  const system = ensureObject(item, "system");
  const current = normalizeWhitespace(system.identifier).toLowerCase();
  const next = current && current !== "new-item" ? current : slugify(item?.name);
  if (next !== current) {
    system.identifier = next;
    summary.identifiersNormalized += 1;
  }
}

function buildCollectionSourceId(collection = "", itemId = "") {
  const collectionText = String(collection ?? "").trim();
  const itemIdText = String(itemId ?? "").trim();
  if (!collectionText || !itemIdText) return "";
  return `Compendium.${collectionText}.Item.${itemIdText}`;
}

function resolveSourceIdConflicts(items = [], summary, collection = DEFAULT_COLLECTION) {
  const groups = new Map();
  for (const item of items) {
    const sourceId = normalizeWhitespace(item?.flags?.core?.sourceId);
    if (!sourceId) continue;
    if (!groups.has(sourceId)) groups.set(sourceId, []);
    groups.get(sourceId).push(item);
  }

  const conflicts = [];
  for (const [sourceId, groupedItems] of groups.entries()) {
    const distinctKeys = new Set(groupedItems.map((item) => `${String(item?.type ?? "").trim().toLowerCase()}::${normalizeWhitespace(item?.name).toLowerCase()}`));
    if (distinctKeys.size <= 1) continue;

    const affected = [];
    for (const item of groupedItems) {
      const itemId = normalizeWhitespace(item?._id);
      const nextSourceId = buildCollectionSourceId(collection, itemId);
      if (!nextSourceId) continue;
      const flags = ensureObject(item, "flags");
      const coreFlags = ensureObject(flags, "core");
      const poFlags = ensureObject(flags, MODULE_ID);
      if (!normalizeWhitespace(poFlags.upstreamSourceId)) poFlags.upstreamSourceId = sourceId;
      if (coreFlags.sourceId !== nextSourceId) {
        coreFlags.sourceId = nextSourceId;
        summary.sourceIdConflictsResolved += 1;
      }
      affected.push({
        id: itemId,
        name: String(item?.name ?? ""),
        type: String(item?.type ?? ""),
        identifier: String(item?.system?.identifier ?? ""),
        reassignedSourceId: nextSourceId
      });
    }

    conflicts.push({ originalSourceId: sourceId, affectedItems: affected });
  }

  summary.sourceIdConflictGroups += conflicts.length;
  return conflicts;
}

function resolveIdentifierConflicts(items = [], summary) {
  const groups = new Map();
  for (const item of items) {
    const identifier = normalizeWhitespace(item?.system?.identifier).toLowerCase();
    const type = normalizeWhitespace(item?.type).toLowerCase();
    if (!identifier || !type) continue;
    const key = `${type}::${identifier}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const conflicts = [];
  for (const [groupKey, groupedItems] of groups.entries()) {
    const distinctNames = new Set(groupedItems.map((item) => normalizeWhitespace(item?.name).toLowerCase()));
    if (distinctNames.size <= 1) continue;

    const affected = [];
    for (const item of groupedItems) {
      const system = ensureObject(item, "system");
      const nextIdentifier = slugify(item?.name);
      if (!nextIdentifier || system.identifier === nextIdentifier) continue;
      system.identifier = nextIdentifier;
      summary.identifierConflictsResolved += 1;
      affected.push({
        id: String(item?._id ?? ""),
        name: String(item?.name ?? ""),
        type: String(item?.type ?? ""),
        identifier: nextIdentifier
      });
    }

    conflicts.push({ key: groupKey, affectedItems: affected });
  }

  summary.identifierConflictGroups += conflicts.length;
  return conflicts;
}

function normalizePortableFields(item = {}, summary, assetReviewItems, assetPathIndex, foundryDataRoot) {
  if (item.folder !== null) {
    item.folder = null;
    summary.folderIdsCleared += 1;
  }

  const system = ensureObject(item, "system");
  if (String(system.container ?? "").trim()) {
    system.container = "";
    summary.containerRefsCleared += 1;
  }

  normalizePortableImage(item, summary, assetReviewItems, assetPathIndex, foundryDataRoot);
  normalizeIdentifier(item, summary);
  normalizeDescriptionHtml(item, summary);
}

function buildSummarySkeleton(args, inputCount) {
  return {
    sourcePath: args.source,
    outputPath: args.output,
    ndjsonPath: args.ndjson,
    reportPath: args.report,
    sourceCollection: args.collection,
    foundryDataPath: args.foundryData,
    sourceItemCount: inputCount,
    groupsCollapsed: 0,
    itemsRemoved: 0,
    identifiersNormalized: 0,
    descriptionHtmlNormalized: 0,
    descriptionImagesRemoved: 0,
    descriptionParagraphsDeduped: 0,
    imagesNormalized: 0,
    imagesRelinkedLocal: 0,
    folderIdsCleared: 0,
    containerRefsCleared: 0,
    sourceIdConflictsResolved: 0,
    sourceIdConflictGroups: 0,
    identifierConflictsResolved: 0,
    identifierConflictGroups: 0,
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
    activityNamesInferred: 0,
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
    detailFieldsFilled: 0,
    manifestBalanceAdjustments: 0,
    manualPricingOverrides: 0,
    derivedPricingOverrides: 0,
    legacyEffectKeysNormalized: 0,
    folderProfilesStamped: 0,
    usabilityProfilesStamped: 0
  };
}

function sortItems(items = []) {
  return [...items].sort((left, right) => {
    const leftPath = String(left?.flags?.[MODULE_ID]?.folder?.pathKey ?? "");
    const rightPath = String(right?.flags?.[MODULE_ID]?.folder?.pathKey ?? "");
    if (leftPath !== rightPath) return leftPath.localeCompare(rightPath);

    const leftType = String(left?.type ?? "");
    const rightType = String(right?.type ?? "");
    if (leftType !== rightType) return leftType.localeCompare(rightType);

    return String(left?.name ?? "").localeCompare(String(right?.name ?? ""));
  });
}

function loadSourceItems(sourcePath) {
  const text = fs.readFileSync(path.resolve(sourcePath), "utf8");
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("Expected source JSON to be an array of item documents.");
  return parsed;
}

function writeArrayJson(filePath, items) {
  ensureDirectory(filePath);
  fs.writeFileSync(path.resolve(filePath), `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

function writeNdjson(filePath, items) {
  ensureDirectory(filePath);
  fs.writeFileSync(path.resolve(filePath), `${items.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceItems = loadSourceItems(args.source);
  const summary = buildSummarySkeleton(args, sourceItems.length);
  const assetBasenames = collectExternalAssetBasenames(sourceItems);
  const assetPathIndex = buildBasenameIndex(args.foundryData, assetBasenames);
  const groups = new Map();

  for (const item of sourceItems) {
    const key = dedupeKeyForItem(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const dedupeGroups = [];
  const assetReviewItems = [];
  const dedupedItems = [];

  for (const [key, items] of groups.entries()) {
    const merged = mergeDuplicateGroup(items, summary);
    if (!merged) continue;
    normalizePortableFields(merged, summary, assetReviewItems, assetPathIndex, args.foundryData);
    normalizeItemFlags(merged, summary);
    enrichManifestItem(merged, summary);
    normalizeEffects(merged, summary);
    dedupedItems.push(merged);

    if (items.length > 1) {
      dedupeGroups.push({
        dedupeKey: key,
        keptItemId: String(merged?._id ?? ""),
        keptName: String(merged?.name ?? ""),
        keptType: String(merged?.type ?? ""),
        keptSourceId: String(merged?.flags?.core?.sourceId ?? ""),
        droppedItems: items
          .filter((item) => String(item?._id ?? "") !== String(merged?._id ?? ""))
          .map((item) => ({
            id: String(item?._id ?? ""),
            name: String(item?.name ?? ""),
            type: String(item?.type ?? ""),
            sourceId: String(item?.flags?.core?.sourceId ?? "")
          }))
      });
    }
  }

  const sourceIdConflicts = resolveSourceIdConflicts(dedupedItems, summary, args.collection);
  const identifierConflicts = resolveIdentifierConflicts(dedupedItems, summary);
  for (const item of dedupedItems) {
    stampPartyOperationsMetadata(item, summary, { collection: args.collection });
  }

  const itemById = new Map(dedupedItems.map((item) => [String(item?._id ?? ""), item]));
  for (const group of dedupeGroups) {
    const kept = itemById.get(String(group?.keptItemId ?? ""));
    if (kept) group.keptSourceId = String(kept?.flags?.core?.sourceId ?? "");
  }

  const sortedItems = sortItems(dedupedItems).map((item, index) => ({
    ...item,
    sort: (index + 1) * 10
  }));

  writeArrayJson(args.output, sortedItems);
  writeNdjson(args.ndjson, sortedItems);

  const byType = {};
  for (const item of sortedItems) {
    const type = String(item?.type ?? "item");
    byType[type] = (byType[type] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      cleanedItemCount: sortedItems.length,
      duplicateGroupCount: dedupeGroups.length,
      assetReviewCount: assetReviewItems.length,
      byType
    },
    assetReviewItems,
    sourceIdConflicts,
    identifierConflicts,
    dedupeGroups
  };

  ensureDirectory(args.report);
  fs.writeFileSync(path.resolve(args.report), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`normalize-partyops-export failed: ${error.message}\n`);
  process.exit(1);
});
