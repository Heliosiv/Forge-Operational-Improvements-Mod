function normalizeText(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeQuantity(value = 1) {
  return Math.max(1, Math.floor(Number(value ?? 1) || 1));
}

function roundWeightLb(value = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(4));
}

function isCoinLikeName(name = "") {
  const normalized = normalizeText(name);
  if (!normalized) return false;
  return /\b(copper|silver|electrum|gold|platinum)\b/.test(normalized)
    || /\b(cp|sp|ep|gp|pp)\b/.test(normalized)
    || /\bcoins?\b/.test(normalized);
}

function isLegacyStackable(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "ammunition" || itemType === "ammo") return true;
  return isCoinLikeName(entry?.name);
}

function isLootEntryStackingDisabled(entry = {}) {
  return entry?.noLootStack === true;
}

function buildExactDuplicateStackKey(entry = {}) {
  const uuid = normalizeText(entry?.uuid);
  if (uuid) return `uuid:${uuid}`;
  const name = normalizeText(entry?.name);
  if (!name) return "";
  const itemType = normalizeText(entry?.itemType);
  const rarity = normalizeText(entry?.rarityBucket ?? entry?.rarity);
  const sourceLabel = normalizeText(entry?.sourceLabel);
  const variableTreasureKind = normalizeText(entry?.variableTreasureKind);
  return `name:${name}|type:${itemType}|rarity:${rarity}|source:${sourceLabel}|kind:${variableTreasureKind}`;
}

export function getLootEntryStackKey(entry = {}) {
  if (isLootEntryStackingDisabled(entry)) return "";
  const exactDuplicateKey = buildExactDuplicateStackKey(entry);
  if (exactDuplicateKey) return exactDuplicateKey;
  if (!isLegacyStackable(entry)) return "";
  const name = normalizeText(entry?.name);
  const itemType = normalizeText(entry?.itemType);
  const rarity = normalizeText(entry?.rarityBucket ?? entry?.rarity);
  const sourceLabel = normalizeText(entry?.sourceLabel);
  return `name:${name}|type:${itemType}|rarity:${rarity}|source:${sourceLabel}`;
}

export function aggregateLootEntriesForStacks(values = []) {
  const source = Array.isArray(values) ? values : [];
  if (source.length <= 1) {
    return source.map((entry) => ({
      ...entry,
      quantity: normalizeQuantity(entry?.quantity)
    }));
  }

  const aggregated = [];
  const byKey = new Map();
  for (const raw of source) {
    if (!raw || typeof raw !== "object") continue;
    const entry = {
      ...raw,
      quantity: normalizeQuantity(raw?.quantity)
    };
    const stackKey = getLootEntryStackKey(entry);
    if (!stackKey) {
      aggregated.push(entry);
      continue;
    }
    const existingIndex = byKey.get(stackKey);
    if (existingIndex === undefined) {
      byKey.set(stackKey, aggregated.length);
      aggregated.push(entry);
      continue;
    }
    const existing = aggregated[existingIndex];
    existing.quantity += entry.quantity;
    existing.itemValueGp = Math.max(0, Number(existing.itemValueGp ?? 0) || 0) + Math.max(0, Number(entry.itemValueGp ?? 0) || 0);
    if (existing.itemWeightLb !== undefined || entry.itemWeightLb !== undefined) {
      existing.itemWeightLb = roundWeightLb(
        Math.max(0, Number(existing.itemWeightLb ?? 0) || 0) + Math.max(0, Number(entry.itemWeightLb ?? 0) || 0)
      );
    }
    if (existing.baseItemValueGp !== undefined || entry.baseItemValueGp !== undefined) {
      existing.baseItemValueGp = Math.max(0, Number(existing.baseItemValueGp ?? 0) || 0) + Math.max(0, Number(entry.baseItemValueGp ?? 0) || 0);
    }
    if (existing.baseItemWeightLb !== undefined || entry.baseItemWeightLb !== undefined) {
      existing.baseItemWeightLb = roundWeightLb(
        Math.max(0, Number(existing.baseItemWeightLb ?? 0) || 0) + Math.max(0, Number(entry.baseItemWeightLb ?? 0) || 0)
      );
    }
    aggregated[existingIndex] = existing;
  }

  return aggregated;
}
