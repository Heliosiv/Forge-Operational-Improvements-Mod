function normalizeText(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeList(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((entry) => normalizeText(entry))
    .filter(Boolean);
}

function normalizeVariableTreasureKind(value = "") {
  const normalized = normalizeText(value);
  if (normalized === "gem" || normalized === "gems" || normalized === "gemstone" || normalized === "gemstones") return "gem";
  if (normalized === "art" || normalized === "art-item" || normalized === "art-items" || normalized === "art-object" || normalized === "art-objects") return "art";
  return "";
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

function getEntryPrimaryCategory(entry = {}) {
  return normalizeList(entry?.merchantCategories)[0] ?? "";
}

function isCommodityLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const variableTreasureKind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  if (variableTreasureKind) return true;
  if (itemType === "loot" || itemType === "consumable" || itemType === "ammo" || itemType === "ammunition") return true;
  const categories = new Set(normalizeList(entry?.merchantCategories));
  return categories.has("treasure")
    || categories.has("loot")
    || categories.has("luxury")
    || categories.has("art")
    || categories.has("gem");
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

export function getLootSelectionIntelligenceWeight(entry = {}, state = {}, phase = "spend") {
  const selected = Array.isArray(state?.selected) ? state.selected : [];
  if (!selected.length) return 1;

  const mode = normalizeText(state?.draft?.mode ?? state?.budgetContext?.mode ?? "horde") || "horde";
  const phaseKey = normalizeText(phase) === "fill" ? "fill" : "spend";
  const phaseInfluence = phaseKey === "fill" ? 0.65 : 1;
  const candidateIdentity = getEntryIdentity(entry);
  const candidateType = normalizeText(entry?.itemType);
  const candidateSource = normalizeText(entry?.sourceId ?? entry?.sourceLabel);
  const candidateKind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  const candidateCategories = normalizeList(entry?.merchantCategories);
  const candidatePrimaryCategory = candidateCategories[0] ?? "";

  const selectedTypes = new Set();
  const selectedCategories = new Set();
  let exactDuplicateCount = 0;
  let sameTypeCount = 0;
  let sameKindCount = 0;
  let sameSourceCount = 0;
  let overlappingCategoryCount = 0;
  let samePrimaryCategoryCount = 0;

  for (const selectedEntry of selected) {
    const selectedIdentity = getEntryIdentity(selectedEntry);
    const selectedType = normalizeText(selectedEntry?.itemType);
    const selectedSource = normalizeText(selectedEntry?.sourceId ?? selectedEntry?.sourceLabel);
    const selectedKind = normalizeVariableTreasureKind(selectedEntry?.variableTreasureKind);
    const selectedEntryCategories = normalizeList(selectedEntry?.merchantCategories);
    const selectedPrimaryCategory = selectedEntryCategories[0] ?? "";

    if (selectedType) selectedTypes.add(selectedType);
    for (const category of selectedEntryCategories) selectedCategories.add(category);
    if (candidateIdentity && selectedIdentity === candidateIdentity) exactDuplicateCount += 1;
    if (candidateType && selectedType === candidateType) sameTypeCount += 1;
    if (candidateKind && selectedKind === candidateKind) sameKindCount += 1;
    if (candidateSource && selectedSource === candidateSource) sameSourceCount += 1;
    overlappingCategoryCount += countCategoryOverlap(candidateCategories, selectedEntry);
    if (candidatePrimaryCategory && selectedPrimaryCategory === candidatePrimaryCategory) samePrimaryCategoryCount += 1;
  }

  let weight = 1;
  const commodityLike = isCommodityLike(entry);
  if (exactDuplicateCount > 0) {
    const duplicatePenalty = commodityLike ? 0.58 : 0.16;
    weight *= Math.pow(duplicatePenalty, exactDuplicateCount);
  }

  if (sameTypeCount > 0) {
    const typePenalty = mode === "horde" ? 0.18 : 0.28;
    weight *= 1 / (1 + (sameTypeCount * typePenalty * phaseInfluence));
  }

  if (sameKindCount > 0) {
    weight *= 1 / (1 + (sameKindCount * 0.12 * phaseInfluence));
  }

  if (overlappingCategoryCount > 0) {
    weight *= 1 / (1 + (overlappingCategoryCount * 0.08 * phaseInfluence));
  }

  if (samePrimaryCategoryCount > 0) {
    weight *= 1 / (1 + (samePrimaryCategoryCount * 0.16 * phaseInfluence));
  }

  if (sameSourceCount > 0) {
    weight *= 1 / (1 + (sameSourceCount * 0.05 * phaseInfluence));
  }

  if (candidateType && !selectedTypes.has(candidateType)) {
    weight *= 1 + (0.16 * phaseInfluence);
  }

  if (candidatePrimaryCategory && !selectedCategories.has(candidatePrimaryCategory)) {
    weight *= 1 + (0.12 * phaseInfluence);
  }

  if (candidateKind && selected.every((selectedEntry) => normalizeVariableTreasureKind(selectedEntry?.variableTreasureKind) !== candidateKind)) {
    weight *= 1 + (0.08 * phaseInfluence);
  }

  return Math.max(0.000001, Number(weight.toFixed(6)));
}
