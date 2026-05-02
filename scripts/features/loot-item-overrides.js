export const LOOT_ITEM_OVERRIDE_FILTERS = Object.freeze({
  ALL: "all",
  MODIFIED: "modified",
  DISABLED: "disabled",
  ENABLED: "enabled"
});

export const LOOT_ITEM_OVERRIDE_PRICE_MAX_GP = 1000000;

function clonePlainObject(value) {
  if (!value || typeof value !== "object") return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function normalizeLootItemOverrideFilter(value, fallback = LOOT_ITEM_OVERRIDE_FILTERS.ALL) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return Object.values(LOOT_ITEM_OVERRIDE_FILTERS).includes(normalized)
    ? normalized
    : normalizeLootItemOverrideFilter(fallback, LOOT_ITEM_OVERRIDE_FILTERS.ALL);
}

export function normalizeLootItemOverrideKey(value) {
  const key = String(value ?? "").trim();
  return key.startsWith("Compendium.") && key.includes(".Item.") ? key : "";
}

export function normalizeLootItemOverridePrice(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.min(LOOT_ITEM_OVERRIDE_PRICE_MAX_GP, Number(numeric.toFixed(4)));
}

export function hasLootItemOverrideChange(record = {}) {
  return record?.disabled === true || normalizeLootItemOverridePrice(record?.priceGp) !== null;
}

export function normalizeLootItemOverrideRecord(record = {}, fallback = {}) {
  const priceGp = normalizeLootItemOverridePrice(record?.priceGp ?? record?.price ?? fallback?.priceGp);
  const disabled = record?.disabled === true;
  if (priceGp === null && !disabled) return null;
  return {
    priceGp,
    disabled,
    updatedAt: Number(record?.updatedAt ?? fallback?.updatedAt ?? 0) || 0,
    updatedBy: String(record?.updatedBy ?? fallback?.updatedBy ?? "").trim()
  };
}

export function normalizeLootItemOverrides(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const entries = Array.isArray(source)
    ? source.map((entry) => [entry?.uuid ?? entry?.key, entry])
    : Object.entries(source);
  const normalized = {};
  for (const [rawKey, rawRecord] of entries) {
    const key = normalizeLootItemOverrideKey(rawKey);
    if (!key) continue;
    const record = normalizeLootItemOverrideRecord(rawRecord);
    if (!record) continue;
    normalized[key] = record;
  }
  return normalized;
}

export function resolveLootItemOverrideKey(itemLike = {}, { sourceId = "", documentId = "" } = {}) {
  const item = itemLike && typeof itemLike === "object" ? itemLike : {};
  const data = typeof item?.toObject === "function" ? item.toObject() : item;
  const explicit = normalizeLootItemOverrideKey(item?.uuid ?? data?.uuid);
  if (explicit) return explicit;
  const id = String(data?._id ?? data?.id ?? documentId ?? "").trim();
  const packId = String(sourceId ?? "").trim();
  if (!packId || !id) return "";
  return `Compendium.${packId}.Item.${id}`;
}

export function applyLootItemOverrideToData(data = {}, override = null, { moduleId = "party-operations" } = {}) {
  if (!data || typeof data !== "object") return null;
  const normalized = normalizeLootItemOverrideRecord(override);
  if (normalized?.disabled === true) return null;
  const copy = clonePlainObject(data) ?? {};
  if (normalized?.priceGp !== null && normalized?.priceGp !== undefined) {
    copy.system = copy.system && typeof copy.system === "object" ? copy.system : {};
    copy.system.price = copy.system.price && typeof copy.system.price === "object" ? copy.system.price : {};
    copy.system.price.value = normalized.priceGp;
    copy.system.price.denomination = "gp";
    copy.flags = copy.flags && typeof copy.flags === "object" ? copy.flags : {};
    copy.flags[moduleId] = copy.flags[moduleId] && typeof copy.flags[moduleId] === "object" ? copy.flags[moduleId] : {};
    copy.flags[moduleId].gpValue = normalized.priceGp;
    copy.flags[moduleId].priceDenomination = "gp";
  }
  return copy;
}

export function applyLootItemOverridesToDocuments(
  documents = [],
  overrides = {},
  { sourceId = "", moduleId = "party-operations" } = {}
) {
  const normalizedOverrides = normalizeLootItemOverrides(overrides);
  return (Array.isArray(documents) ? documents : [])
    .map((documentRef) => {
      if (!documentRef || typeof documentRef !== "object") return null;
      const sourceData = typeof documentRef?.toObject === "function" ? documentRef.toObject() : documentRef;
      const key = resolveLootItemOverrideKey(documentRef, { sourceId });
      const override = key ? normalizedOverrides[key] : null;
      const data = applyLootItemOverrideToData(sourceData, override, { moduleId });
      if (!data) return null;
      if (key && !data.uuid) data.uuid = key;
      if (key) data._partyOperationsOverrideKey = key;
      if (documentRef?._merchantSourceLabel && !data._merchantSourceLabel) {
        data._merchantSourceLabel = documentRef._merchantSourceLabel;
      }
      return data;
    })
    .filter(Boolean);
}
