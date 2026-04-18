export const LOOT_PREVIEW_SORT_OPTIONS = Object.freeze([
  Object.freeze({ value: "generated", label: "Generated Order" }),
  Object.freeze({ value: "value-desc", label: "Value High to Low" }),
  Object.freeze({ value: "value-asc", label: "Value Low to High" }),
  Object.freeze({ value: "name-asc", label: "Name A-Z" }),
  Object.freeze({ value: "type-asc", label: "Type A-Z" })
]);

const LOOT_PREVIEW_SORT_ALLOWED = new Set(LOOT_PREVIEW_SORT_OPTIONS.map((entry) => entry.value));

function normalizeText(value = "") {
  return String(value ?? "").trim().toLowerCase();
}

function compareDisplayText(left = "", right = "") {
  return normalizeText(left).localeCompare(normalizeText(right), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function getItemTotalValue(entry = {}) {
  const unitValue = Math.max(0, Number(entry?.itemValueGp ?? 0) || 0);
  const quantity = Math.max(1, Math.floor(Number(entry?.quantity ?? 1) || 1));
  return unitValue * quantity;
}

export function normalizeLootPreviewSort(value = "") {
  const normalized = normalizeText(value);
  return LOOT_PREVIEW_SORT_ALLOWED.has(normalized) ? normalized : "generated";
}

export function sortLootPreviewItems(items = [], sort = "generated") {
  const normalizedSort = normalizeLootPreviewSort(sort);
  const rows = Array.isArray(items)
    ? items.map((entry, index) => ({ ...entry, _displayIndex: index }))
    : [];
  rows.sort((left, right) => {
    switch (normalizedSort) {
      case "generated":
        return Number(left?._displayIndex ?? 0) - Number(right?._displayIndex ?? 0);
      case "value-desc": {
        const delta = getItemTotalValue(right) - getItemTotalValue(left);
        if (delta !== 0) return delta;
        break;
      }
      case "value-asc": {
        const delta = getItemTotalValue(left) - getItemTotalValue(right);
        if (delta !== 0) return delta;
        break;
      }
      case "name-asc": {
        const delta = compareDisplayText(left?.name, right?.name);
        if (delta !== 0) return delta;
        break;
      }
      case "type-asc": {
        const delta = compareDisplayText(left?.itemType, right?.itemType);
        if (delta !== 0) return delta;
        break;
      }
      default:
        break;
    }
    const nameDelta = compareDisplayText(left?.name, right?.name);
    if (nameDelta !== 0) return nameDelta;
    return Number(left?._displayIndex ?? 0) - Number(right?._displayIndex ?? 0);
  });
  return rows.map(({ _displayIndex, ...entry }) => entry);
}
