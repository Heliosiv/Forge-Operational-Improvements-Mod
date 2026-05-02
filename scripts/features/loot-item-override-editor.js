import {
  LOOT_ITEM_OVERRIDE_FILTERS,
  normalizeLootItemOverrideFilter,
  normalizeLootItemOverrideKey,
  normalizeLootItemOverridePrice,
  normalizeLootItemOverrides,
  resolveLootItemOverrideKey
} from "./loot-item-overrides.js";

const DEFAULT_ITEM_IMAGE = "icons/svg/item-bag.svg";

function defaultSearchNormalizer(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function defaultQuickFilterNormalizer(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === LOOT_ITEM_OVERRIDE_FILTERS.MODIFIED || normalized === LOOT_ITEM_OVERRIDE_FILTERS.DISABLED
    ? normalized
    : LOOT_ITEM_OVERRIDE_FILTERS.ALL;
}

function defaultAssetImageNormalizer(value, { fallback = DEFAULT_ITEM_IMAGE } = {}) {
  return String(value ?? "").trim() || fallback;
}

function defaultRarityLabel(value = "") {
  return String(value ?? "").trim() || "Unspecified";
}

export function formatLootOverrideGpLabel(value = 0) {
  const numeric = Math.max(0, Number(value) || 0);
  return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 4 })} gp`;
}

export function buildLootItemOverrideRowsForEditor({
  documents = [],
  overrides = {},
  uiState = {},
  sourceId = "",
  normalizeSearch = defaultSearchNormalizer,
  normalizeQuickFilter = defaultQuickFilterNormalizer,
  getMerchantItemData = (documentRef) => documentRef,
  getLootItemGpValueFromData = () => 0,
  getLootRarityFromData = () => "",
  getLootKeywordsFromData = () => [],
  normalizeAssetImagePath = defaultAssetImageNormalizer,
  itemTypeLabels = {},
  getLootRarityLabel = defaultRarityLabel
} = {}) {
  const normalizedOverrides = normalizeLootItemOverrides(overrides);
  const search = normalizeSearch(uiState?.search);
  const filter = normalizeLootItemOverrideFilter(normalizeQuickFilter(uiState?.filter), LOOT_ITEM_OVERRIDE_FILTERS.ALL);
  const searchNeedle = search.toLowerCase();
  const rows = (Array.isArray(documents) ? documents : [])
    .map((documentRef) => {
      const data = getMerchantItemData(documentRef);
      const overrideKey = normalizeLootItemOverrideKey(resolveLootItemOverrideKey(documentRef, { sourceId }));
      if (!overrideKey) return null;

      const override = normalizedOverrides[overrideKey] ?? null;
      const basePriceGp = Math.max(0, Number(getLootItemGpValueFromData(data, { raw: true }) || 0));
      const overridePriceGp = normalizeLootItemOverridePrice(override?.priceGp);
      const disabled = override?.disabled === true;
      const modified = overridePriceGp !== null || disabled;
      const itemType = String(data?.type ?? "")
        .trim()
        .toLowerCase();
      const rarity = getLootRarityFromData(data);
      const keywords = getLootKeywordsFromData(data);
      const name = String(data?.name ?? overrideKey).trim() || overrideKey;
      const searchBlob = [name, itemType, rarity, overrideKey, basePriceGp, overridePriceGp ?? "", ...keywords]
        .join(" ")
        .toLowerCase();

      return {
        overrideKey,
        name,
        img: normalizeAssetImagePath(data?.img, { fallback: DEFAULT_ITEM_IMAGE }),
        itemType,
        itemTypeLabel: String(itemTypeLabels[itemType] ?? itemType).trim() || "Item",
        rarity,
        rarityLabel: getLootRarityLabel(rarity),
        basePriceGp,
        basePriceLabel: formatLootOverrideGpLabel(basePriceGp),
        overridePriceInput: overridePriceGp === null ? "" : String(overridePriceGp),
        effectivePriceLabel: formatLootOverrideGpLabel(overridePriceGp ?? basePriceGp),
        disabled,
        enabled: !disabled,
        modified,
        resetDisabled: !modified,
        searchBlob
      };
    })
    .filter(Boolean);

  const modifiedCount = rows.filter((entry) => entry.modified).length;
  const disabledCount = rows.filter((entry) => entry.disabled).length;
  const filteredRows = rows
    .filter((entry) => {
      if (filter === LOOT_ITEM_OVERRIDE_FILTERS.MODIFIED && !entry.modified) return false;
      if (filter === LOOT_ITEM_OVERRIDE_FILTERS.DISABLED && !entry.disabled) return false;
      if (searchNeedle && !entry.searchBlob.includes(searchNeedle)) return false;
      return true;
    })
    .sort((a, b) => {
      const modifiedDelta = Number(Boolean(b.modified)) - Number(Boolean(a.modified));
      if (modifiedDelta !== 0) return modifiedDelta;
      return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

  const visibleRows = filteredRows.slice(0, 300);
  return {
    rows: visibleRows,
    search,
    filter,
    filterAll: filter === LOOT_ITEM_OVERRIDE_FILTERS.ALL,
    filterModified: filter === LOOT_ITEM_OVERRIDE_FILTERS.MODIFIED,
    filterDisabled: filter === LOOT_ITEM_OVERRIDE_FILTERS.DISABLED,
    totalCount: rows.length,
    filteredCount: filteredRows.length,
    visibleCount: visibleRows.length,
    hiddenCount: Math.max(0, filteredRows.length - visibleRows.length),
    modifiedCount,
    disabledCount,
    hasRows: visibleRows.length > 0
  };
}

export function pruneLootItemOverrideRecord(record = {}, { nowMs = Date.now(), userName = "GM" } = {}) {
  const priceGp = normalizeLootItemOverridePrice(record?.priceGp);
  const disabled = record?.disabled === true;
  if (priceGp === null && !disabled) return null;
  return {
    priceGp,
    disabled,
    updatedAt: Number(record?.updatedAt ?? nowMs) || nowMs,
    updatedBy: String(record?.updatedBy ?? userName).trim() || "GM"
  };
}

export function normalizeLootItemOverrideKeyList(keys = []) {
  const source = Array.isArray(keys) ? keys : [];
  return Array.from(new Set(source.map((entry) => normalizeLootItemOverrideKey(entry)).filter(Boolean)));
}

export function createLootItemOverrideEditorActions({
  canConfigure = () => false,
  notifyWarn = () => {},
  updateLootSourceConfig = async () => {},
  setLootItemOverridesUiState = () => {},
  refreshScope = "",
  now = () => Date.now(),
  getUserName = () => "GM"
} = {}) {
  function warnConfigurationBlocked() {
    notifyWarn("Only the GM can configure item overrides.");
  }

  function buildDefaultRecord() {
    return {
      priceGp: null,
      disabled: false,
      updatedAt: 0,
      updatedBy: ""
    };
  }

  function getAuditContext() {
    return {
      nowMs: Number(now()) || Date.now(),
      userName: String(getUserName() ?? "GM").trim() || "GM"
    };
  }

  async function updateLootItemOverrideFromElement(element, mutator) {
    if (!canConfigure()) {
      warnConfigurationBlocked();
      return;
    }
    const overrideKey = normalizeLootItemOverrideKey(element?.dataset?.overrideKey);
    if (!overrideKey || typeof mutator !== "function") return;
    await updateLootSourceConfig(
      (config) => {
        const overrides = normalizeLootItemOverrides(config.itemOverrides ?? {});
        const auditContext = getAuditContext();
        const nextDraft = {
          ...(overrides[overrideKey] ?? buildDefaultRecord()),
          updatedAt: auditContext.nowMs,
          updatedBy: auditContext.userName
        };
        mutator(nextDraft);
        const nextRecord = pruneLootItemOverrideRecord(nextDraft, auditContext);
        if (nextRecord) overrides[overrideKey] = nextRecord;
        else delete overrides[overrideKey];
        config.itemOverrides = overrides;
      },
      { refreshScope, skipLocalRefresh: true }
    );
  }

  async function updateLootItemOverridesByKeys(keys = [], mutator) {
    if (!canConfigure()) {
      warnConfigurationBlocked();
      return false;
    }
    const overrideKeys = normalizeLootItemOverrideKeyList(keys);
    if (overrideKeys.length < 1 || typeof mutator !== "function") {
      notifyWarn("Select one or more item rows first.");
      return false;
    }
    await updateLootSourceConfig(
      (config) => {
        const overrides = normalizeLootItemOverrides(config.itemOverrides ?? {});
        const auditContext = getAuditContext();
        for (const overrideKey of overrideKeys) {
          const nextDraft = {
            ...(overrides[overrideKey] ?? buildDefaultRecord()),
            updatedAt: auditContext.nowMs,
            updatedBy: auditContext.userName
          };
          mutator(nextDraft, overrideKey);
          const nextRecord = pruneLootItemOverrideRecord(nextDraft, auditContext);
          if (nextRecord) overrides[overrideKey] = nextRecord;
          else delete overrides[overrideKey];
        }
        config.itemOverrides = overrides;
      },
      { refreshScope, skipLocalRefresh: true }
    );
    return true;
  }

  return {
    setLootItemOverrideSearch(element) {
      setLootItemOverridesUiState({ search: element?.value ?? "" });
    },

    setLootItemOverrideFilter(element) {
      setLootItemOverridesUiState({
        filter: element?.dataset?.filter ?? element?.value ?? LOOT_ITEM_OVERRIDE_FILTERS.ALL
      });
    },

    async setLootItemOverridePrice(element) {
      await updateLootItemOverrideFromElement(element, (record) => {
        record.priceGp = normalizeLootItemOverridePrice(element?.value);
      });
    },

    async toggleLootItemOverrideEnabled(element) {
      await updateLootItemOverrideFromElement(element, (record) => {
        record.disabled = element?.checked !== true;
      });
    },

    async resetLootItemOverride(element) {
      if (!canConfigure()) {
        warnConfigurationBlocked();
        return;
      }
      const overrideKey = normalizeLootItemOverrideKey(element?.dataset?.overrideKey);
      if (!overrideKey) return;
      await updateLootSourceConfig(
        (config) => {
          const overrides = normalizeLootItemOverrides(config.itemOverrides ?? {});
          delete overrides[overrideKey];
          config.itemOverrides = overrides;
        },
        { refreshScope, skipLocalRefresh: true }
      );
    },

    async setLootItemOverridesEnabledByKeys(keys = [], enabled = true) {
      return updateLootItemOverridesByKeys(keys, (record) => {
        record.disabled = enabled !== true;
      });
    },

    async resetLootItemOverridesByKeys(keys = []) {
      if (!canConfigure()) {
        warnConfigurationBlocked();
        return false;
      }
      const overrideKeys = normalizeLootItemOverrideKeyList(keys);
      if (overrideKeys.length < 1) {
        notifyWarn("Select one or more item rows first.");
        return false;
      }
      await updateLootSourceConfig(
        (config) => {
          const overrides = normalizeLootItemOverrides(config.itemOverrides ?? {});
          for (const overrideKey of overrideKeys) delete overrides[overrideKey];
          config.itemOverrides = overrides;
        },
        { refreshScope, skipLocalRefresh: true }
      );
      return true;
    }
  };
}
