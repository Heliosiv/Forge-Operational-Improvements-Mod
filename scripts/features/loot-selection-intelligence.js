import { getRecentRollMalus } from "./loot-recent-rolls-cache.js";
import { getLootPracticalUsefulnessFactor, isLootCommodityLike } from "./loot-practicality.js";

function normalizeText(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeList(values = []) {
  return (Array.isArray(values) ? values : []).map((entry) => normalizeText(entry)).filter(Boolean);
}

function normalizeVariableTreasureKind(value = "") {
  const normalized = normalizeText(value);
  if (normalized === "gem" || normalized === "gems" || normalized === "gemstone" || normalized === "gemstones")
    return "gem";
  if (
    normalized === "art" ||
    normalized === "art-item" ||
    normalized === "art-items" ||
    normalized === "art-object" ||
    normalized === "art-objects"
  )
    return "art";
  return "";
}

function normalizeSourceClass(value = "") {
  const normalized = normalizeText(value);
  if (normalized === "curated" || normalized === "manual" || normalized === "table" || normalized === "generated")
    return normalized;
  return "generated";
}

function normalizeSourcePolicy(value = "") {
  const normalized = normalizeText(value).replace(/_/g, "-");
  if (normalized === "anchor" || normalized === "bonus" || normalized === "outside-budget" || normalized === "normal")
    return normalized;
  if (normalized === "outsidebudget") return "outside-budget";
  return "normal";
}

function normalizeCurationScore(value = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(10, numeric));
}

function normalizeStrictnessValue(value = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  const normalized = numeric > 10 ? numeric / 100 : numeric;
  return Math.max(0.5, Math.min(3, normalized));
}

function getEntryIdentity(entry = {}) {
  const uuid = normalizeText(entry?.uuid);
  if (uuid) return `uuid:${uuid}`;
  const name = normalizeText(entry?.name);
  const itemType = normalizeText(entry?.itemType);
  const rarity = normalizeText(entry?.rarityBucket ?? entry?.rarity);
  const sourceId = normalizeText(entry?.sourceId ?? entry?.sourceLabel);
  if (!name) return "";
  return `name:${name}|type:${itemType}|rarity:${rarity}|source:${sourceId}`;
}

function countCategoryOverlap(candidateCategories = [], selectedEntry = {}) {
  if (!candidateCategories.length) return 0;
  const selectedCategories = new Set(normalizeList(selectedEntry?.merchantCategories));
  let overlap = 0;
  for (const category of candidateCategories) {
    if (selectedCategories.has(category)) overlap += 1;
  }
  return overlap;
}

const _normalizedSelectedCache = new WeakMap();
function getCachedNormalizedSelected(entry) {
  if (_normalizedSelectedCache.has(entry)) return _normalizedSelectedCache.get(entry);
  const categories = normalizeList(entry?.merchantCategories);
  const normalized = {
    identity: getEntryIdentity(entry),
    type: normalizeText(entry?.itemType),
    source: normalizeText(entry?.sourceId ?? entry?.sourceLabel),
    kind: normalizeVariableTreasureKind(entry?.variableTreasureKind),
    categories,
    categorySet: new Set(categories),
    primaryCategory: categories[0] ?? "",
    sourceClass: normalizeSourceClass(entry?.sourceClass),
    sourcePolicy: normalizeSourcePolicy(entry?.sourcePolicy)
  };
  _normalizedSelectedCache.set(entry, normalized);
  return normalized;
}

export function getLootSelectionIntelligenceWeight(entry = {}, state = {}, phase = "spend") {
  const selected = Array.isArray(state?.selected) ? state.selected : [];
  const recentRollMalus = getRecentRollMalus(entry);

  const mode = normalizeText(state?.draft?.mode ?? state?.budgetContext?.mode ?? "horde") || "horde";
  const phaseKey = normalizeText(phase) === "fill" ? "fill" : "spend";
  const phaseInfluence = phaseKey === "fill" ? 0.65 : 1;
  const candidateIdentity = getEntryIdentity(entry);
  const candidateType = normalizeText(entry?.itemType);
  const candidateSource = normalizeText(entry?.sourceId ?? entry?.sourceLabel);
  const candidateKind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  const candidateCategories = normalizeList(entry?.merchantCategories);
  const candidatePrimaryCategory = candidateCategories[0] ?? "";
  const candidateSourceClass = normalizeSourceClass(entry?.sourceClass);
  const candidateSourcePolicy = normalizeSourcePolicy(entry?.sourcePolicy);
  const candidateCurationScore = normalizeCurationScore(entry?.curationScore);
  const practicalUsefulnessFactor = getLootPracticalUsefulnessFactor(entry, state, phaseKey);
  const usefulnessDelta = practicalUsefulnessFactor - 1;

  const selectedTypes = new Set();
  const selectedCategories = new Set();
  const selectedSourceClasses = new Set();
  const selectedSourcePolicies = new Set();
  let exactDuplicateCount = 0;
  let sameTypeCount = 0;
  let sameKindCount = 0;
  let sameSourceCount = 0;
  let sameSourceClassCount = 0;
  let sameSourcePolicyCount = 0;
  let overlappingCategoryCount = 0;
  let samePrimaryCategoryCount = 0;

  for (const selectedEntry of selected) {
    const sel = getCachedNormalizedSelected(selectedEntry);
    const selectedIdentity = sel.identity;
    const selectedType = sel.type;
    const selectedSource = sel.source;
    const selectedKind = sel.kind;
    const selectedEntryCategories = sel.categories;
    const selectedPrimaryCategory = sel.primaryCategory;
    const selectedSourceClass = sel.sourceClass;
    const selectedSourcePolicy = sel.sourcePolicy;

    if (selectedType) selectedTypes.add(selectedType);
    for (const category of selectedEntryCategories) selectedCategories.add(category);
    if (selectedSourceClass) selectedSourceClasses.add(selectedSourceClass);
    if (selectedSourcePolicy) selectedSourcePolicies.add(selectedSourcePolicy);
    if (candidateIdentity && selectedIdentity === candidateIdentity) exactDuplicateCount += 1;
    if (candidateType && selectedType === candidateType) sameTypeCount += 1;
    if (candidateKind && selectedKind === candidateKind) sameKindCount += 1;
    if (candidateSource && selectedSource === candidateSource) sameSourceCount += 1;
    if (candidateSourceClass && selectedSourceClass === candidateSourceClass) sameSourceClassCount += 1;
    if (candidateSourcePolicy && selectedSourcePolicy === candidateSourcePolicy) sameSourcePolicyCount += 1;
    if (candidateCategories.length > 0) {
      for (const category of candidateCategories) {
        if (sel.categorySet.has(category)) overlappingCategoryCount += 1;
      }
    }
    if (candidatePrimaryCategory && selectedPrimaryCategory === candidatePrimaryCategory) samePrimaryCategoryCount += 1;
  }

  let weight = 1;
  const commodityLike = isLootCommodityLike(entry);
  if (exactDuplicateCount > 0) {
    const duplicatePenalty = commodityLike ? 0.58 : 0.16;
    weight *= Math.pow(duplicatePenalty, exactDuplicateCount);
  }

  if (sameTypeCount > 0) {
    const typePenalty = mode === "horde" ? 0.18 : 0.28;
    weight *= 1 / (1 + sameTypeCount * typePenalty * phaseInfluence);
  }

  if (sameKindCount > 0) {
    weight *= 1 / (1 + sameKindCount * 0.12 * phaseInfluence);
  }

  if (overlappingCategoryCount > 0) {
    weight *= 1 / (1 + overlappingCategoryCount * 0.08 * phaseInfluence);
  }

  if (samePrimaryCategoryCount > 0) {
    weight *= 1 / (1 + samePrimaryCategoryCount * 0.16 * phaseInfluence);
  }

  if (sameSourceCount > 0) {
    weight *= 1 / (1 + sameSourceCount * 0.05 * phaseInfluence);
  }

  if (sameSourceClassCount > 0) {
    weight *= 1 / (1 + sameSourceClassCount * 0.07 * phaseInfluence);
  }

  if (sameSourcePolicyCount > 0) {
    weight *= 1 / (1 + sameSourcePolicyCount * 0.06 * phaseInfluence);
  }

  if (candidateType && !selectedTypes.has(candidateType)) {
    weight *= 1 + 0.16 * phaseInfluence;
  }

  if (candidatePrimaryCategory && !selectedCategories.has(candidatePrimaryCategory)) {
    weight *= 1 + 0.12 * phaseInfluence;
  }

  if (
    candidateKind &&
    selected.every(
      (selectedEntry) => normalizeVariableTreasureKind(selectedEntry?.variableTreasureKind) !== candidateKind
    )
  ) {
    weight *= 1 + 0.08 * phaseInfluence;
  }

  if (candidateSourceClass === "curated") {
    weight *= 1 + 0.08 * phaseInfluence;
  } else if (candidateSourceClass === "manual") {
    weight *= 0.96;
  } else if (candidateSourceClass === "table") {
    weight *= 1 + 0.03 * phaseInfluence;
  }

  if (candidateSourceClass && !selectedSourceClasses.has(candidateSourceClass)) {
    weight *= 1 + 0.05 * phaseInfluence;
  }

  if (candidateSourcePolicy === "anchor") {
    weight *= sameSourcePolicyCount > 0 ? 1.04 : 1.22;
  } else if (candidateSourcePolicy === "bonus") {
    weight *= phaseKey === "fill" ? 1.25 : 1.1;
  } else if (candidateSourcePolicy === "outside-budget") {
    weight *= phaseKey === "fill" ? 1.35 : 0.88;
  }

  const curationFactor = 0.9 + (candidateCurationScore / 10) * 0.2;
  const usefulnessCurationLift = usefulnessDelta > 0 ? 1 + usefulnessDelta * ((candidateCurationScore / 10) * 0.32) : 1;
  const generatedFillerPenalty =
    candidateSourceClass === "generated" && usefulnessDelta < 0 ? Math.max(0.72, 1 + usefulnessDelta * 0.32) : 1;
  weight *= curationFactor * practicalUsefulnessFactor * usefulnessCurationLift * generatedFillerPenalty;

  // Apply recently-rolled item penalty to reduce repetition across multiple horde rolls in same scene
  weight *= recentRollMalus;

  // Apply scale-based weight profiles for horde mode
  // Small hordes: reduce high-weight items to favor cheaper/common treasures
  // Major hordes: unlock full weight for rare/unique items
  if (mode === "horde") {
    const scale = normalizeText(state?.draft?.scale ?? state?.budgetContext?.scale ?? "medium");
    const strictness = normalizeStrictnessValue(
      state?.draft?.valueStrictness ?? state?.budgetContext?.valueStrictness ?? 100
    );
    const strictnessPressure = Math.max(0, Math.min(1, (strictness - 1) / 2));
    if (strictnessPressure > 0) {
      const lowCurationGap = Math.max(0, 5 - candidateCurationScore);
      if (candidateSourceClass === "generated" && lowCurationGap > 0) {
        const penaltyStrength = (lowCurationGap / 5) * (0.42 * strictnessPressure);
        weight *= Math.max(0.45, 1 - penaltyStrength);
      }
      if (candidateSourceClass === "curated") {
        weight *= 1 + 0.1 * strictnessPressure;
      }
      if (candidateSourcePolicy === "anchor") {
        weight *= 1 + 0.12 * strictnessPressure;
      }
      if (candidateSourcePolicy === "outside-budget" && phaseKey === "spend") {
        weight *= Math.max(0.6, 1 - 0.22 * strictnessPressure);
      }
    }

    if (scale === "small") {
      // Small scale: penalize high-value or high-weight items
      if (Number(entry?.lootWeight ?? 1) > 1.2) {
        weight *= 0.85; // Reduce high-weight items by 15%
      }
      if (Number(entry?.gpValue ?? 0) > 100) {
        weight *= 0.9; // Reduce 100gp+ items by 10%
      }
    } else if (scale === "medium") {
      // Medium scale: gentle penalty on high-weight art to favor more variety
      if (Number(entry?.lootWeight ?? 1) > 1.3 && candidateKind === "art") {
        weight *= 0.88;
      }
    }
    // Major scale: no adjustments, full weight power
  }

  return Math.max(0.000001, Number(weight.toFixed(6)));
}
