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

function normalizeRarity(value = "") {
  const normalized = normalizeText(value).replace(/\s+/g, "").replace(/_/g, "-");
  if (normalized === "veryrare") return "very-rare";
  if (normalized === "legendary" || normalized === "very-rare" || normalized === "rare" || normalized === "uncommon" || normalized === "common") {
    return normalized;
  }
  return "";
}

function getEntryTags(entry = {}) {
  return new Set([
    ...normalizeList(entry?.merchantCategories),
    ...normalizeList(entry?.keywords),
    ...normalizeList(entry?.properties)
  ]);
}

export function isLootCommodityLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const variableTreasureKind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  if (variableTreasureKind) return true;
  if (itemType === "loot" || itemType === "consumable" || itemType === "ammo" || itemType === "ammunition") return true;
  const tags = getEntryTags(entry);
  return tags.has("treasure")
    || tags.has("loot")
    || tags.has("luxury")
    || tags.has("art")
    || tags.has("gem");
}

export function isLootContainerLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const tags = getEntryTags(entry);
  if (itemType === "container" || itemType === "backpack") return true;
  return tags.has("container")
    || tags.has("storage")
    || tags.has("loot.container")
    || tags.has("merchant.container")
    || tags.has("merchant.storage")
    || tags.has("foundrytype.container");
}

export function isLootToolLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const tags = getEntryTags(entry);
  if (itemType === "tool") return true;
  return tags.has("tool")
    || tags.has("kit")
    || tags.has("merchant.tool")
    || tags.has("merchant.kit");
}

export function isLootAmmoLike(entry = {}) {
  if (isLootContainerLike(entry)) return false;
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  if (itemType === "ammunition" || itemType === "ammo") return true;
  return /\barrows?\b/.test(name)
    || /\bbolts?\b/.test(name)
    || /\bbullets?\b/.test(name)
    || /\bsling stones?\b/.test(name);
}

export function isLootAmmoSupportLike(entry = {}) {
  const name = normalizeText(entry?.name);
  const tags = getEntryTags(entry);
  if (/\bquiver\b/.test(name) || /\bbolt case\b/.test(name) || /\bammo pouch\b/.test(name) || /\barrow case\b/.test(name)) {
    return true;
  }
  return tags.has("merchant.container")
    || tags.has("loot.container")
    || tags.has("storage");
}

export function isLootHealingConsumableLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  const tags = getEntryTags(entry);
  if (itemType !== "consumable") return false;
  return /\bhealing\b/.test(name)
    || /\bpotion of healing\b/.test(name)
    || /\bhealer'?s kit\b/.test(name)
    || /\bantitoxin\b/.test(name)
    || tags.has("healing")
    || tags.has("merchant.alchemy")
    || tags.has("merchant.medicine");
}

export function isLootUtilityConsumableLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  const tags = getEntryTags(entry);
  if (itemType !== "consumable") return false;
  if (isLootHealingConsumableLike(entry)) return true;
  return /\bscroll\b/.test(name)
    || /\bantitoxin\b/.test(name)
    || /\balchemist'?s fire\b/.test(name)
    || /\bholy water\b/.test(name)
    || /\bacid\b/.test(name)
    || /\boil\b/.test(name)
    || /\btorch\b/.test(name)
    || /\brations?\b/.test(name)
    || /\bwaterskin\b/.test(name)
    || tags.has("alchemy")
    || tags.has("utility")
    || tags.has("survival")
    || tags.has("merchant.alchemy")
    || tags.has("merchant.survival");
}

export function isLootPracticalEquipmentLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  const tags = getEntryTags(entry);
  if (isLootContainerLike(entry) || isLootToolLike(entry) || isLootAmmoSupportLike(entry)) return true;
  if (itemType === "equipment" || itemType === "backpack" || itemType === "tool" || itemType === "armor") {
    return true;
  }
  return /\brope\b/.test(name)
    || /\btorch\b/.test(name)
    || /\bgrappling hook\b/.test(name)
    || /\bcrowbar\b/.test(name)
    || /\bbedroll\b/.test(name)
    || /\bwaterskin\b/.test(name)
    || /\brations?\b/.test(name)
    || /\bpitons?\b/.test(name)
    || tags.has("outfitting")
    || tags.has("survival")
    || tags.has("merchant.outfitting")
    || tags.has("merchant.survival")
    || tags.has("equipment");
}

export function isLootLowImpactFiller(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  const tags = getEntryTags(entry);
  if (isLootHealingConsumableLike(entry) || isLootUtilityConsumableLike(entry) || isLootPracticalEquipmentLike(entry) || isLootToolLike(entry) || isLootAmmoLike(entry)) {
    return false;
  }
  if (itemType === "trinket") return true;
  return tags.has("trinket")
    || tags.has("luxury")
    || tags.has("novelty")
    || tags.has("curio")
    || /\btrinket\b/.test(name)
    || /\bcurio\b/.test(name)
    || /\bfigurine\b/.test(name)
    || /\bbrooch\b/.test(name)
    || /\bbracelet\b/.test(name)
    || /\bring\b/.test(name)
    || /\bpendant\b/.test(name);
}

function getSelectedTags(selected = []) {
  return new Set((Array.isArray(selected) ? selected : []).flatMap((entry) => [
    ...normalizeList(entry?.merchantCategories),
    ...normalizeList(entry?.keywords)
  ]));
}

export function getLootPracticalUsefulnessFactor(entry = {}, state = {}, phase = "spend") {
  const mode = normalizeText(state?.draft?.mode ?? state?.budgetContext?.mode ?? "horde") || "horde";
  const phaseKey = normalizeText(phase) === "fill" ? "fill" : "spend";
  const rarity = normalizeRarity(entry?.rarityBucket ?? entry?.rarity);
  const itemType = normalizeText(entry?.itemType);
  const gpValue = Math.max(0, Number(entry?.gpValue ?? entry?.itemValueGp ?? 0) || 0);
  const selectedTags = getSelectedTags(state?.selected);
  let factor = 1;

  if (isLootHealingConsumableLike(entry)) factor *= 1.42;
  else if (isLootUtilityConsumableLike(entry)) factor *= 1.26;
  else if (isLootAmmoLike(entry)) factor *= 1.18;
  else if (isLootAmmoSupportLike(entry)) factor *= 1.14;
  else if (isLootToolLike(entry)) factor *= 1.16;
  else if (isLootPracticalEquipmentLike(entry)) factor *= 1.14;

  if ((itemType === "weapon" || itemType === "equipment" || itemType === "armor") && (rarity === "common" || rarity === "uncommon" || !rarity)) {
    factor *= 1.08;
  }

  if (isLootLowImpactFiller(entry)) factor *= mode === "horde" ? 0.82 : 0.7;

  if (isLootCommodityLike(entry) && !isLootHealingConsumableLike(entry) && !isLootUtilityConsumableLike(entry) && !isLootAmmoLike(entry)) {
    factor *= mode === "horde" ? 0.88 : 0.76;
  }

  if (gpValue > 0 && gpValue <= 10 && isLootLowImpactFiller(entry)) factor *= 0.9;
  if (gpValue > 0 && gpValue <= 75 && (isLootHealingConsumableLike(entry) || isLootUtilityConsumableLike(entry) || isLootPracticalEquipmentLike(entry))) {
    factor *= 1.06;
  }

  if (selectedTags.has("arms") && (isLootAmmoLike(entry) || isLootAmmoSupportLike(entry))) factor *= 1.08;
  if ((selectedTags.has("tool") || selectedTags.has("kit")) && isLootUtilityConsumableLike(entry)) factor *= 1.06;
  if ((selectedTags.has("outfitting") || selectedTags.has("survival")) && isLootPracticalEquipmentLike(entry)) factor *= 1.05;
  if (phaseKey === "fill" && isLootLowImpactFiller(entry)) factor *= 0.92;

  return Math.max(0.55, Math.min(1.75, Number(factor.toFixed(4))));
}

export function getLootPracticalHoardScore(entry = {}) {
  const rarity = normalizeRarity(entry?.rarityBucket ?? entry?.rarity);
  const itemType = normalizeText(entry?.itemType);
  const gpValue = Math.max(0, Number(entry?.gpValue ?? entry?.itemValueGp ?? 0) || 0);
  let score = 0;

  if (isLootHealingConsumableLike(entry)) score += 7;
  else if (isLootUtilityConsumableLike(entry)) score += 6;
  else if (isLootAmmoLike(entry)) score += 5;
  else if (isLootAmmoSupportLike(entry)) score += 4;
  else if (isLootToolLike(entry)) score += 5;
  else if (isLootPracticalEquipmentLike(entry)) score += 4;

  if ((itemType === "weapon" || itemType === "equipment" || itemType === "armor") && (rarity === "common" || rarity === "uncommon" || !rarity)) {
    score += 2;
  }

  if (isLootLowImpactFiller(entry)) score -= 5;
  if (isLootCommodityLike(entry) && !isLootHealingConsumableLike(entry) && !isLootUtilityConsumableLike(entry) && !isLootAmmoLike(entry)) score -= 2;
  if (gpValue > 0 && gpValue <= 10 && isLootLowImpactFiller(entry)) score -= 1;
  if (gpValue > 0 && gpValue <= 75 && (isLootHealingConsumableLike(entry) || isLootUtilityConsumableLike(entry) || isLootPracticalEquipmentLike(entry))) score += 1;

  return score;
}

export function isLootPracticalHoardCandidate(entry = {}) {
  return getLootPracticalHoardScore(entry) > 0;
}
