import {
  DOWNTIME_AREA_DISCOVERY_OPTIONS,
  DOWNTIME_AREA_ECONOMY_OPTIONS,
  DOWNTIME_AREA_RISK_OPTIONS,
  DOWNTIME_PHASE1_ACTION_SUBTYPES,
  DOWNTIME_BROWSING_ABILITY_OPTIONS,
  DOWNTIME_CRAFTING_CATEGORIES,
  DOWNTIME_CRAFTABLES,
  DOWNTIME_PHASE1_ACTIONS,
  DOWNTIME_PHASE1_RESULT_TIERS,
  DOWNTIME_PROFESSIONS,
  DOWNTIME_TOOL_PROFICIENCIES
} from "./downtime-phase1-data.js";

export const DOWNTIME_PHASE1_ACTOR_FLAG_KEYS = Object.freeze({
  craftingProjects: "craftingProjects",
  knownProfessions: "knownProfessions"
});

const ACTION_KEYS = new Set(DOWNTIME_PHASE1_ACTIONS.map((entry) => entry.key));
const RESULT_TIERS = new Set(DOWNTIME_PHASE1_RESULT_TIERS);
const BROWSING_ABILITIES = new Set(DOWNTIME_BROWSING_ABILITY_OPTIONS.map((entry) => entry.value));
const ECONOMY_VALUES = new Set(DOWNTIME_AREA_ECONOMY_OPTIONS.map((entry) => entry.value));
const RISK_VALUES = new Set(DOWNTIME_AREA_RISK_OPTIONS.map((entry) => entry.value));
const DISCOVERY_VALUES = new Set(DOWNTIME_AREA_DISCOVERY_OPTIONS.map((entry) => entry.value));
const ABILITY_KEYS = new Set(["str", "dex", "con", "int", "wis", "cha"]);

const CRAFTABLES_BY_ID = new Map(DOWNTIME_CRAFTABLES.map((entry) => [entry.id, entry]));
const PROFESSIONS_BY_ID = new Map(DOWNTIME_PROFESSIONS.map((entry) => [entry.id, entry]));
const ACTION_SUBTYPES_BY_ACTION = new Map(
  Object.entries(DOWNTIME_PHASE1_ACTION_SUBTYPES ?? {}).map(([actionKey, entries]) => [
    String(actionKey ?? "")
      .trim()
      .toLowerCase(),
    Array.isArray(entries) ? entries : []
  ])
);
const SUBTYPE_ENTRY_LOOKUP = new Map(
  Array.from(ACTION_SUBTYPES_BY_ACTION.entries()).flatMap(([actionKey, entries]) =>
    entries.map((entry) => [
      `${actionKey}.${String(entry?.key ?? "")
        .trim()
        .toLowerCase()}`,
      entry
    ])
  )
);
const ACTION_OUTCOME_PROFILES = Object.freeze({
  rougery: Object.freeze({
    baseDc: 13,
    tierGp: Object.freeze({ failure: 1, success: 3, "strong-success": 5, "exceptional-success": 8 }),
    tierRumors: Object.freeze({ failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 }),
    quality: Object.freeze({
      failure: "The attempt attracts trouble with limited immediate payoff.",
      success: "The job lands a usable return with manageable fallout.",
      "strong-success": "The run pays well and opens a profitable angle.",
      "exceptional-success": "A standout score with high-value momentum."
    }),
    baseTags: Object.freeze(["illicit opportunity", "heat"])
  }),
  commerce: Object.freeze({
    baseDc: 12,
    tierGp: Object.freeze({ failure: 1, success: 2, "strong-success": 4, "exceptional-success": 6 }),
    tierRumors: Object.freeze({ failure: 0, success: 0, "strong-success": 0, "exceptional-success": 1 }),
    quality: Object.freeze({
      failure: "The market move underperforms and mostly preserves position.",
      success: "A practical deal closes with modest value.",
      "strong-success": "A strong commercial window produces above-average value.",
      "exceptional-success": "An exceptional deal secures premium margins and supply leverage."
    }),
    baseTags: Object.freeze(["deal", "materials edge"])
  }),
  performing: Object.freeze({
    baseDc: 11,
    tierGp: Object.freeze({ failure: 1, success: 3, "strong-success": 5, "exceptional-success": 7 }),
    tierRumors: Object.freeze({ failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 }),
    quality: Object.freeze({
      failure: "The performance has limited reception and weak audience carryover.",
      success: "The set earns steady coin and a useful local lead.",
      "strong-success": "The show lands strongly with visible social traction.",
      "exceptional-success": "A breakout performance draws major attention and opportunities."
    }),
    baseTags: Object.freeze(["audience", "reputation"])
  }),
  carousing: Object.freeze({
    baseDc: 12,
    tierGp: Object.freeze({ failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 }),
    tierRumors: Object.freeze({ failure: 0, success: 1, "strong-success": 2, "exceptional-success": 2 }),
    quality: Object.freeze({
      failure: "The social effort burns time without meaningful leverage.",
      success: "You secure a modest lead and one actionable social angle.",
      "strong-success": "You gain multiple useful links and rumor leverage.",
      "exceptional-success": "You build high-value social momentum with repeatable access."
    }),
    baseTags: Object.freeze(["contact", "social lead"])
  })
});
const SUBTYPE_OUTCOME_RULES = Object.freeze({
  "rougery.pickpocketing": {
    dc: 13,
    gp: { failure: 1, success: 3, "strong-success": 5, "exceptional-success": 8 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["heat"],
      success: ["coin"],
      "strong-success": ["coin", "underworld-lead"],
      "exceptional-success": ["coin", "contact", "underworld-lead"]
    },
    effects: {
      failure: { heatDelta: 1 },
      success: {},
      "strong-success": { heatDelta: 1 },
      "exceptional-success": { contactTier: "minor", heatDelta: 1 }
    }
  },
  "rougery.burglary": {
    dc: 14,
    gp: { failure: 0, success: 4, "strong-success": 6, "exceptional-success": 9 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["legal-risk"],
      success: ["coin"],
      "strong-success": ["coin", "item-opportunity"],
      "exceptional-success": ["coin", "item-opportunity", "heat"]
    },
    effects: {
      failure: { heatDelta: 2 },
      success: { heatDelta: 1 },
      "strong-success": { heatDelta: 1 },
      "exceptional-success": { heatDelta: 2 }
    }
  },
  "rougery.fencing": {
    dc: 12,
    gp: { failure: 1, success: 3, "strong-success": 5, "exceptional-success": 7 },
    rumors: { failure: 0, success: 0, "strong-success": 0, "exceptional-success": 1 },
    tags: {
      failure: ["bad-buyer"],
      success: ["coin"],
      "strong-success": ["coin", "underworld-contact"],
      "exceptional-success": ["coin", "underworld-contact"]
    },
    effects: {
      failure: { reputationDelta: -1 },
      success: {},
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "medium" }
    }
  },
  "rougery.smuggling": {
    dc: 13,
    gp: { failure: 1, success: 3, "strong-success": 5, "exceptional-success": 7 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["heat"],
      success: ["coin", "materials-credit"],
      "strong-success": ["coin", "materials-credit"],
      "exceptional-success": ["coin", "materials-credit", "lead"]
    },
    effects: {
      failure: { heatDelta: 1 },
      success: { materialsCreditGp: 2 },
      "strong-success": { materialsCreditGp: 3, heatDelta: 1 },
      "exceptional-success": { materialsCreditGp: 5, heatDelta: 1 }
    }
  },
  "rougery.confidence-scam": {
    dc: 12,
    gp: { failure: 1, success: 4, "strong-success": 6, "exceptional-success": 8 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["reputation-risk"],
      success: ["coin"],
      "strong-success": ["coin", "social-lead"],
      "exceptional-success": ["coin", "social-lead", "contact"]
    },
    effects: {
      failure: { reputationDelta: -1 },
      success: {},
      "strong-success": {},
      "exceptional-success": { contactTier: "minor" }
    }
  },

  "commerce.local-materials-buying": {
    dc: 12,
    gp: { failure: 1, success: 2, "strong-success": 3, "exceptional-success": 4 },
    rumors: { failure: 0, success: 0, "strong-success": 0, "exceptional-success": 1 },
    tags: {
      failure: ["price-pressure"],
      success: ["materials-credit", "discount"],
      "strong-success": ["materials-credit", "discount"],
      "exceptional-success": ["materials-credit", "discount", "procurement-lead"]
    },
    effects: {
      failure: {},
      success: { discountPercent: 5, materialsCreditGp: 1 },
      "strong-success": { discountPercent: 10, materialsCreditGp: 2 },
      "exceptional-success": { discountPercent: 15, materialsCreditGp: 2 }
    }
  },
  "commerce.trade-arbitrage": {
    dc: 12,
    gp: { failure: 1, success: 3, "strong-success": 4, "exceptional-success": 6 },
    rumors: { failure: 0, success: 0, "strong-success": 0, "exceptional-success": 0 },
    tags: {
      failure: ["market-shift"],
      success: ["coin"],
      "strong-success": ["coin"],
      "exceptional-success": ["coin", "trade-lead"]
    },
    effects: { failure: {}, success: {}, "strong-success": {}, "exceptional-success": {} }
  },
  "commerce.contract-brokering": {
    dc: 13,
    gp: { failure: 1, success: 2, "strong-success": 4, "exceptional-success": 5 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["rival-broker"],
      success: ["contact"],
      "strong-success": ["coin", "contact"],
      "exceptional-success": ["coin", "contact", "recurring-lead"]
    },
    effects: {
      failure: {},
      success: { contactTier: "minor" },
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "medium" }
    }
  },
  "commerce.bulk-procurement": {
    dc: 11,
    gp: { failure: 1, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 0, "strong-success": 0, "exceptional-success": 0 },
    tags: {
      failure: ["stock-delay"],
      success: ["materials-credit"],
      "strong-success": ["materials-credit", "discount"],
      "exceptional-success": ["materials-credit", "discount"]
    },
    effects: {
      failure: {},
      success: { materialsCreditGp: 2 },
      "strong-success": { materialsCreditGp: 4, discountPercent: 5 },
      "exceptional-success": { materialsCreditGp: 6, discountPercent: 10 }
    }
  },
  "commerce.auction-flipping": {
    dc: 13,
    gp: { failure: 0, success: 3, "strong-success": 5, "exceptional-success": 8 },
    rumors: { failure: 0, success: 0, "strong-success": 0, "exceptional-success": 1 },
    tags: {
      failure: ["overbid"],
      success: ["coin"],
      "strong-success": ["coin"],
      "exceptional-success": ["coin", "collector-lead"]
    },
    effects: { failure: {}, success: {}, "strong-success": {}, "exceptional-success": {} }
  },

  "performing.street-busking": {
    dc: 11,
    gp: { failure: 1, success: 3, "strong-success": 4, "exceptional-success": 6 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["fatigue"],
      success: ["coin", "lead"],
      "strong-success": ["coin", "lead"],
      "exceptional-success": ["coin", "lead", "contact"]
    },
    effects: { failure: {}, success: {}, "strong-success": {}, "exceptional-success": { contactTier: "minor" } }
  },
  "performing.tavern-set": {
    dc: 11,
    gp: { failure: 1, success: 3, "strong-success": 5, "exceptional-success": 7 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["rowdy-crowd"],
      success: ["coin", "contact"],
      "strong-success": ["coin", "contact"],
      "exceptional-success": ["coin", "contact", "lodging"]
    },
    effects: {
      failure: {},
      success: { contactTier: "minor" },
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "minor" }
    }
  },
  "performing.court-recital": {
    dc: 13,
    gp: { failure: 0, success: 2, "strong-success": 4, "exceptional-success": 5 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["etiquette-risk"],
      success: ["prestige"],
      "strong-success": ["prestige", "contact"],
      "exceptional-success": ["prestige", "contact", "invitation"]
    },
    effects: {
      failure: { reputationDelta: -1 },
      success: { reputationDelta: 1 },
      "strong-success": { reputationDelta: 1, contactTier: "minor" },
      "exceptional-success": { reputationDelta: 2, contactTier: "medium" }
    }
  },
  "performing.festival-act": {
    dc: 12,
    gp: { failure: 1, success: 3, "strong-success": 5, "exceptional-success": 8 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["schedule-slip"],
      success: ["coin"],
      "strong-success": ["coin", "reputation"],
      "exceptional-success": ["coin", "reputation", "event-contact"]
    },
    effects: {
      failure: {},
      success: {},
      "strong-success": { reputationDelta: 1 },
      "exceptional-success": { reputationDelta: 2, contactTier: "minor" }
    }
  },
  "performing.ceremonial-performance": {
    dc: 12,
    gp: { failure: 1, success: 2, "strong-success": 3, "exceptional-success": 4 },
    rumors: { failure: 0, success: 0, "strong-success": 1, "exceptional-success": 1 },
    tags: {
      failure: ["obligation"],
      success: ["favor"],
      "strong-success": ["favor", "lead"],
      "exceptional-success": ["favor", "contact"]
    },
    effects: { failure: {}, success: {}, "strong-success": {}, "exceptional-success": { contactTier: "minor" } }
  },

  "carousing.common-taverns": {
    dc: 11,
    gp: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 2 },
    tags: {
      failure: ["minor-debt"],
      success: ["lead"],
      "strong-success": ["lead", "contact"],
      "exceptional-success": ["lead", "contact", "network"]
    },
    effects: {
      failure: {},
      success: {},
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "minor" }
    }
  },
  "carousing.guild-halls": {
    dc: 12,
    gp: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["dues"],
      success: ["trade-lead"],
      "strong-success": ["trade-lead", "contact"],
      "exceptional-success": ["trade-lead", "contact", "procurement-lead"]
    },
    effects: {
      failure: {},
      success: {},
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "medium" }
    }
  },
  "carousing.noble-salons": {
    dc: 13,
    gp: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["social-gaffe"],
      success: ["noble-lead"],
      "strong-success": ["noble-lead", "contact"],
      "exceptional-success": ["noble-lead", "contact", "invitation"]
    },
    effects: {
      failure: { reputationDelta: -1 },
      success: {},
      "strong-success": { contactTier: "minor" },
      "exceptional-success": { contactTier: "medium" }
    }
  },
  "carousing.underworld-circles": {
    dc: 13,
    gp: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 2 },
    tags: {
      failure: ["heat"],
      success: ["underworld-lead"],
      "strong-success": ["underworld-lead", "contact"],
      "exceptional-success": ["underworld-lead", "contact", "opportunity"]
    },
    effects: {
      failure: { heatDelta: 1 },
      success: { heatDelta: 1 },
      "strong-success": { heatDelta: 1, contactTier: "minor" },
      "exceptional-success": { heatDelta: 1, contactTier: "medium" }
    }
  },
  "carousing.temple-gatherings": {
    dc: 11,
    gp: { failure: 0, success: 1, "strong-success": 2, "exceptional-success": 3 },
    rumors: { failure: 0, success: 1, "strong-success": 1, "exceptional-success": 2 },
    tags: {
      failure: ["obligation"],
      success: ["community-lead"],
      "strong-success": ["community-lead", "favor"],
      "exceptional-success": ["community-lead", "favor", "contact"]
    },
    effects: { failure: {}, success: {}, "strong-success": {}, "exceptional-success": { contactTier: "minor" } }
  }
});

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStringList(values = [], max = 12) {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean)
    .slice(0, max);
}

export function normalizePhase1MaterialDrops(rawDrops = []) {
  const source =
    typeof rawDrops === "string"
      ? (() => {
          try {
            return JSON.parse(rawDrops);
          } catch {
            return [];
          }
        })()
      : rawDrops;
  if (!Array.isArray(source)) return [];
  return source
    .map((entry) => {
      const item = entry && typeof entry === "object" ? entry : {};
      const name = String(item.name ?? "").trim();
      if (!name) return null;
      const quantity = Number.isFinite(Number(item.quantity)) ? Math.max(1, Math.floor(Number(item.quantity))) : 1;
      return {
        id: String(item.id ?? slugify(`${name}-${quantity}`)).trim() || slugify(name),
        uuid: String(item.uuid ?? "").trim(),
        name,
        img: String(item.img ?? "icons/svg/item-bag.svg").trim() || "icons/svg/item-bag.svg",
        itemType: String(item.itemType ?? item.type ?? "loot").trim() || "loot",
        quantity
      };
    })
    .filter(Boolean)
    .slice(0, 10);
}

export function normalizePhase1ActionKey(value, fallback = DOWNTIME_PHASE1_ACTIONS[0]?.key ?? "browsing") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ACTION_KEYS.has(normalized) ? normalized : fallback;
}

export function normalizeDowntimeResultTier(value, fallback = "success") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return RESULT_TIERS.has(normalized) ? normalized : fallback;
}

export function getDowntimePhase1ActionDefinition(actionKey = "") {
  const key = normalizePhase1ActionKey(actionKey);
  return DOWNTIME_PHASE1_ACTIONS.find((entry) => entry.key === key) ?? DOWNTIME_PHASE1_ACTIONS[0];
}

export function getDowntimePhase1ActionSubtypeDefinitions(actionKey = "") {
  const key = normalizePhase1ActionKey(actionKey);
  return ACTION_SUBTYPES_BY_ACTION.get(key) ?? [];
}

export function normalizePhase1ActionSubtypeKey(actionKey = "", value = "", fallback = "") {
  const normalizedActionKey = normalizePhase1ActionKey(actionKey);
  const entries = getDowntimePhase1ActionSubtypeDefinitions(normalizedActionKey);
  if (entries.length <= 0) return "";
  const defaultKey = String(entries[0]?.key ?? "")
    .trim()
    .toLowerCase();
  const fallbackKey =
    String(fallback ?? "")
      .trim()
      .toLowerCase() || defaultKey;
  const normalizedValue = String(value ?? "")
    .trim()
    .toLowerCase();
  const validKeys = new Set(
    entries
      .map((entry) =>
        String(entry?.key ?? "")
          .trim()
          .toLowerCase()
      )
      .filter(Boolean)
  );
  if (validKeys.has(normalizedValue)) return normalizedValue;
  if (validKeys.has(fallbackKey)) return fallbackKey;
  return defaultKey;
}

export function getPhase1ActionSubtypeDefinition(actionKey = "", subtypeKey = "") {
  const normalizedActionKey = normalizePhase1ActionKey(actionKey);
  const normalizedSubtypeKey = normalizePhase1ActionSubtypeKey(normalizedActionKey, subtypeKey);
  return SUBTYPE_ENTRY_LOOKUP.get(`${normalizedActionKey}.${normalizedSubtypeKey}`) ?? null;
}

export function normalizePhase1AreaSettings(raw = {}, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const economy = String(source.economy ?? base.economy ?? "standard")
    .trim()
    .toLowerCase();
  const risk = String(source.risk ?? base.risk ?? "standard")
    .trim()
    .toLowerCase();
  const discovery = String(source.discovery ?? base.discovery ?? "standard")
    .trim()
    .toLowerCase();
  return {
    economy: ECONOMY_VALUES.has(economy) ? economy : "standard",
    risk: RISK_VALUES.has(risk) ? risk : "standard",
    discovery: DISCOVERY_VALUES.has(discovery) ? discovery : "standard"
  };
}

export function formatPhase1AreaSettingsLabel(areaSettings = {}) {
  const normalized = normalizePhase1AreaSettings(areaSettings);
  return `${normalized.economy} economy, ${normalized.risk} risk, ${normalized.discovery} discovery`;
}

export function normalizeBrowsingAbility(value, fallback = "int") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return BROWSING_ABILITIES.has(normalized) ? normalized : fallback;
}

export function getCraftableById(craftableId = "") {
  return CRAFTABLES_BY_ID.get(String(craftableId ?? "").trim()) ?? null;
}

export function getProfessionById(professionId = "") {
  return PROFESSIONS_BY_ID.get(String(professionId ?? "").trim()) ?? null;
}

export function getDowntimeCraftingCatalog() {
  return DOWNTIME_CRAFTABLES.slice();
}

export function getDowntimeProfessionCatalog() {
  return DOWNTIME_PROFESSIONS.slice();
}

export function buildCraftingCategoryViews(selectedCraftableId = "") {
  const selectedId = String(selectedCraftableId ?? "").trim();
  return DOWNTIME_CRAFTING_CATEGORIES.map((category) => {
    const items = DOWNTIME_CRAFTABLES.filter((entry) => entry.category === category.id).map((entry) => ({
      ...entry,
      selected: entry.id === selectedId
    }));
    return {
      ...category,
      itemCount: items.length,
      items,
      hasItems: items.length > 0,
      selected: items.some((entry) => entry.selected)
    };
  });
}

export function getActorAbilityMod(actor, ability) {
  const key = String(ability ?? "")
    .trim()
    .toLowerCase();
  const raw = actor?.system?.abilities?.[key]?.mod;
  return Number.isFinite(Number(raw)) ? Math.floor(Number(raw)) : 0;
}

export function getActorProficiencyBonus(actor) {
  const raw = actor?.system?.attributes?.prof ?? actor?.system?.bonuses?.prof ?? 0;
  return Number.isFinite(Number(raw)) ? Math.max(0, Math.floor(Number(raw))) : 0;
}

function normalizeSubmittedCheckSnapshot(raw = {}, fallbackAbility = "int") {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallback = ABILITY_KEYS.has(
    String(fallbackAbility ?? "")
      .trim()
      .toLowerCase()
  )
    ? String(fallbackAbility ?? "")
        .trim()
        .toLowerCase()
    : "int";
  const d20 = Math.floor(Number(source.d20 ?? source.natural ?? 0) || 0);
  if (!Number.isFinite(d20) || d20 <= 0) return null;
  const abilityKeyRaw = String(source.abilityKey ?? source.ability ?? fallback)
    .trim()
    .toLowerCase();
  const abilityKey = ABILITY_KEYS.has(abilityKeyRaw) ? abilityKeyRaw : fallback;
  const abilityMod = Number.isFinite(Number(source.abilityMod)) ? Math.floor(Number(source.abilityMod)) : 0;
  const proficiencyBonus = Number.isFinite(Number(source.proficiencyBonus))
    ? Math.max(0, Math.floor(Number(source.proficiencyBonus)))
    : 0;
  const computedTotal = d20 + abilityMod + proficiencyBonus;
  const total = Number.isFinite(Number(source.total)) ? Math.max(1, Math.floor(Number(source.total))) : computedTotal;
  return {
    abilityKey,
    d20: Math.max(1, d20),
    abilityMod,
    proficiencyBonus,
    total
  };
}

function buildDowntimeCheckSnapshot({
  entry,
  actionData,
  fallbackAbility,
  abilityMod = 0,
  proficiencyBonus = 0,
  d20 = 1
} = {}) {
  const submitted = normalizeSubmittedCheckSnapshot(
    entry?.submittedCheck ?? actionData?.submittedCheck ?? {},
    fallbackAbility
  );
  const breakdown = buildCheckBreakdown({
    d20: submitted?.d20 ?? d20,
    abilityMod: submitted?.abilityMod ?? abilityMod,
    proficiencyBonus: submitted?.proficiencyBonus ?? proficiencyBonus
  });
  if (submitted) breakdown.total = submitted.total;
  return breakdown;
}

function getToolAliases(toolId = "", label = "") {
  const definition = DOWNTIME_TOOL_PROFICIENCIES[String(toolId ?? "").trim()] ?? null;
  const aliases = new Set([String(label ?? "").trim(), String(toolId ?? "").trim()].filter(Boolean).map(slugify));
  for (const alias of definition?.aliases ?? []) aliases.add(slugify(alias));
  if (definition?.label) aliases.add(slugify(definition.label));
  return aliases;
}

export function actorHasToolProficiency(actor, toolId = "", toolLabel = "") {
  if (!actor) return false;
  const aliases = getToolAliases(toolId, toolLabel);
  if (!aliases.size) return false;

  const systemTools =
    actor?.system?.tools && typeof actor.system.tools === "object" ? Object.entries(actor.system.tools) : [];
  for (const [key, value] of systemTools) {
    const toolSource = value && typeof value === "object" ? value : {};
    const candidates = [
      key,
      toolSource.label,
      toolSource.name,
      toolSource.custom,
      toolSource.toolId,
      toolSource.identifier
    ].map(slugify);
    if (!candidates.some((candidate) => aliases.has(candidate))) continue;
    const profRaw = Number(toolSource.prof ?? toolSource.proficient ?? toolSource.value ?? 0);
    if (Number.isFinite(profRaw) && profRaw > 0) return true;
    if (toolSource.proficient === true) return true;
  }

  for (const item of Array.from(actor?.items ?? [])) {
    if (
      String(item?.type ?? "")
        .trim()
        .toLowerCase() !== "tool"
    )
      continue;
    const candidates = [
      item?.name,
      item?.system?.identifier,
      item?.system?.slug,
      item?.system?.toolType,
      item?.system?.baseItem
    ].map(slugify);
    if (!candidates.some((candidate) => aliases.has(candidate))) continue;
    const proficientRaw = Number(item?.system?.proficient ?? item?.system?.prof ?? 1);
    if (item?.system?.proficient === true) return true;
    if (Number.isFinite(proficientRaw) && proficientRaw > 0) return true;
  }

  return false;
}

function readActorFlag(actor, moduleId, flagKey) {
  if (!actor || !moduleId || !flagKey) return null;
  if (typeof actor.getFlag === "function") {
    try {
      return actor.getFlag(moduleId, flagKey);
    } catch {
      return null;
    }
  }
  return actor?.flags?.[moduleId]?.[flagKey] ?? null;
}

export function getActorKnownProfessionIds(actor, { moduleId = "party-operations" } = {}) {
  const raw = readActorFlag(actor, moduleId, DOWNTIME_PHASE1_ACTOR_FLAG_KEYS.knownProfessions);
  const entries = Array.isArray(raw) ? raw : [];
  return entries
    .map((entry) => {
      if (typeof entry === "string") return slugify(entry);
      if (entry && typeof entry === "object") return slugify(entry.id ?? entry.key ?? entry.name);
      return "";
    })
    .filter(Boolean);
}

export function actorKnowsProfession(actor, professionId, options = {}) {
  const knownIds = new Set(getActorKnownProfessionIds(actor, options));
  const normalizedId = slugify(professionId);
  if (knownIds.has(normalizedId)) return true;
  const profession = getProfessionById(professionId);
  if (!profession) return false;
  return knownIds.has(slugify(profession.name));
}

export function getActorCraftingProjects(actor, { moduleId = "party-operations" } = {}) {
  const raw = readActorFlag(actor, moduleId, DOWNTIME_PHASE1_ACTOR_FLAG_KEYS.craftingProjects);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .map(([key, value]) => {
        const project = value && typeof value === "object" ? value : {};
        const craftable = getCraftableById(project.itemId ?? key);
        const progressRequired = Number(project.progressRequired ?? craftable?.progressRequired ?? 0);
        return [
          String(project.itemId ?? key).trim(),
          {
            itemId: String(project.itemId ?? key).trim(),
            itemName: String(project.itemName ?? craftable?.name ?? "").trim(),
            progress: Number.isFinite(Number(project.progress)) ? Math.max(0, Math.floor(Number(project.progress))) : 0,
            progressRequired: Number.isFinite(progressRequired) ? Math.max(0, Math.floor(progressRequired)) : 0,
            materialsSecured: project.materialsSecured === true,
            updatedAt: Number.isFinite(Number(project.updatedAt)) ? Number(project.updatedAt) : 0
          }
        ];
      })
      .filter(([key]) => key)
  );
}

export function getActorCraftingProject(actor, craftableId, options = {}) {
  const projects = getActorCraftingProjects(actor, options);
  return projects[String(craftableId ?? "").trim()] ?? null;
}

export function buildNextCraftingProjects(currentProjects = {}, craftingOutcome = {}, now = Date.now()) {
  const source =
    currentProjects && typeof currentProjects === "object" && !Array.isArray(currentProjects) ? currentProjects : {};
  const next = { ...source };
  const itemId = String(craftingOutcome?.itemId ?? "").trim();
  if (!itemId) return next;
  if (craftingOutcome?.complete === true) {
    delete next[itemId];
    return next;
  }
  next[itemId] = {
    itemId,
    itemName: String(craftingOutcome?.itemName ?? "").trim(),
    progress: Math.max(0, Math.floor(Number(craftingOutcome?.progressAfter ?? 0) || 0)),
    progressRequired: Math.max(0, Math.floor(Number(craftingOutcome?.progressRequired ?? 0) || 0)),
    materialsSecured: craftingOutcome?.materialsSecured === true,
    updatedAt: Number.isFinite(Number(now)) ? Number(now) : Date.now()
  };
  return next;
}

export function normalizePhase1ActionData(actionKey, raw = {}, options = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const actor = options.actor ?? null;
  const moduleId = options.moduleId ?? "party-operations";
  const normalizedAction = normalizePhase1ActionKey(actionKey);
  const areaSettings = normalizePhase1AreaSettings(source.areaSettings ?? options.areaSettings ?? {});

  if (normalizedAction === "browsing") {
    return {
      browsingAbility: normalizeBrowsingAbility(source.browsingAbility ?? source.ability),
      areaSettings
    };
  }

  if (normalizedAction === "crafting") {
    const craftable = getCraftableById(source.craftItemId ?? source.itemId ?? source.craftableId);
    const existingProject = craftable ? getActorCraftingProject(actor, craftable.id, { moduleId }) : null;
    const materialDrops = normalizePhase1MaterialDrops(
      source.materialDrops ?? source.materialDropsJson ?? source.craftMaterialDrops ?? source.craftMaterialDropsJson
    );
    const materialsOwned =
      source.materialsOwned === true ||
      String(source.materialsOwned ?? "")
        .trim()
        .toLowerCase() === "true" ||
      source.materialsOwned === "owned";
    return {
      craftItemId: String(craftable?.id ?? "").trim(),
      craftItemName: String(craftable?.name ?? source.craftItemName ?? "").trim(),
      materialsOwned,
      materialsSecured: existingProject?.materialsSecured === true || materialsOwned || materialDrops.length > 0,
      materialDrops,
      areaSettings
    };
  }

  if (normalizedAction === "profession") {
    const profession = getProfessionById(source.professionId ?? source.id ?? source.professionKey);
    return {
      professionId: String(profession?.id ?? "").trim(),
      professionName: String(profession?.name ?? source.professionName ?? "").trim(),
      knownProfession: profession ? actorKnowsProfession(actor, profession.id, { moduleId }) : false,
      areaSettings
    };
  }

  const subtypeKey = normalizePhase1ActionSubtypeKey(
    normalizedAction,
    source.subtypeKey ?? source.actionSubtypeKey ?? source.subtype
  );
  const subtypeDef = getPhase1ActionSubtypeDefinition(normalizedAction, subtypeKey);
  return {
    subtypeKey,
    subtypeLabel: String(subtypeDef?.label ?? "").trim(),
    subtypeAbility: String(subtypeDef?.ability ?? "")
      .trim()
      .toLowerCase(),
    subtypeGuidance: String(subtypeDef?.guidance ?? "").trim(),
    areaSettings
  };
}

export function buildPhase1SubmitOptions({
  actor = null,
  selectedActionKey = "",
  actionData = {},
  areaSettings = {},
  moduleId = "party-operations"
} = {}) {
  const normalizedAction = normalizePhase1ActionKey(selectedActionKey);
  const normalizedActionData = normalizePhase1ActionData(normalizedAction, actionData, {
    actor,
    moduleId,
    areaSettings
  });
  const knownProfessionIds = new Set(getActorKnownProfessionIds(actor, { moduleId }));
  const selectableCraftables = DOWNTIME_CRAFTABLES.filter((entry) =>
    actorHasToolProficiency(actor, entry.requiredToolId, entry.requiredToolProficiency)
  );
  const selectedCraftable = selectableCraftables.find((entry) => entry.id === normalizedActionData.craftItemId) ?? null;
  const selectableCraftingCategoryViews = DOWNTIME_CRAFTING_CATEGORIES.map((category) => {
    const items = selectableCraftables
      .filter((entry) => entry.category === category.id)
      .map((entry) => ({
        ...entry,
        selected: entry.id === selectedCraftable?.id
      }));
    return {
      ...category,
      itemCount: items.length,
      items,
      hasItems: items.length > 0,
      selected: items.some((entry) => entry.selected)
    };
  }).filter((entry) => entry.hasItems);
  const knownProfessionEntries = DOWNTIME_PROFESSIONS.filter(
    (entry) => knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name))
  );
  const fallbackProfessionIds = new Set(["laborer", "cook"]);
  const availableProfessionEntries =
    knownProfessionEntries.length > 0
      ? knownProfessionEntries
      : DOWNTIME_PROFESSIONS.filter((entry) => fallbackProfessionIds.has(entry.id));
  const selectedProfession =
    availableProfessionEntries.find((entry) => entry.id === normalizedActionData.professionId) ??
    availableProfessionEntries[0] ??
    null;
  const materialDrops = normalizePhase1MaterialDrops(normalizedActionData.materialDrops ?? []);
  const subtypeDefinitions = getDowntimePhase1ActionSubtypeDefinitions(normalizedAction);
  const selectedSubtypeKey = normalizePhase1ActionSubtypeKey(normalizedAction, normalizedActionData.subtypeKey);
  const selectedSubtype = getPhase1ActionSubtypeDefinition(normalizedAction, selectedSubtypeKey);

  return {
    actionKey: normalizedAction,
    showBrowsingFields: normalizedAction === "browsing",
    showCraftingFields: normalizedAction === "crafting",
    showProfessionFields: normalizedAction === "profession",
    showSubtypeFields: subtypeDefinitions.length > 0,
    subtypeOptions: subtypeDefinitions.map((entry) => ({
      ...entry,
      selected:
        String(entry?.key ?? "")
          .trim()
          .toLowerCase() === selectedSubtypeKey
    })),
    selectedSubtype,
    areaSettings: normalizePhase1AreaSettings(areaSettings),
    browsingAbilityOptions: DOWNTIME_BROWSING_ABILITY_OPTIONS.map((entry) => ({
      ...entry,
      selected: entry.value === normalizeBrowsingAbility(normalizedActionData.browsingAbility)
    })),
    craftingCategoryViews: selectableCraftingCategoryViews,
    craftingCatalogCategoryViews: buildCraftingCategoryViews(selectedCraftable?.id ?? ""),
    selectedCraftable,
    craftingProject: selectedCraftable ? getActorCraftingProject(actor, selectedCraftable.id, { moduleId }) : null,
    materialDrops,
    hasMaterialDrops: materialDrops.length > 0,
    showMaterialDropZone:
      normalizedAction === "crafting" &&
      (normalizedActionData.materialsOwned === true || normalizedActionData.materialsSecured === true),
    materialsOwnedOptions: [
      {
        value: "true",
        label: "Materials On Hand",
        selected: normalizedActionData.materialsOwned === true || normalizedActionData.materialsSecured === true
      },
      {
        value: "false",
        label: "Buy Materials",
        selected: normalizedActionData.materialsOwned !== true && normalizedActionData.materialsSecured !== true
      }
    ],
    professionOptions: availableProfessionEntries.map((entry) => ({
      ...entry,
      selected: entry.id === selectedProfession?.id,
      known: knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name))
    })),
    selectedProfession,
    knownProfessionNames: DOWNTIME_PROFESSIONS.filter(
      (entry) => knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name))
    ).map((entry) => entry.name)
  };
}

function getTierLabel(tier) {
  const value = normalizeDowntimeResultTier(tier);
  if (value === "exceptional-success") return "Exceptional Success";
  if (value === "strong-success") return "Strong Success";
  if (value === "success") return "Success";
  return "Failure";
}

function getTierFromMargin(margin) {
  if (margin >= 10) return "exceptional-success";
  if (margin >= 5) return "strong-success";
  if (margin >= 0) return "success";
  return "failure";
}

function buildBrowsingDc(hours, areaSettings) {
  const normalized = normalizePhase1AreaSettings(areaSettings);
  const baseHoursModifier = Math.max(0, Math.floor(Math.max(1, hours) / 4) - 1);
  return Math.max(
    8,
    Math.min(
      22,
      13 +
        (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0) +
        (normalized.risk === "high" ? 2 : normalized.risk === "low" ? -1 : 0) +
        (normalized.discovery === "sparse" ? 2 : normalized.discovery === "rich" ? -2 : 0) -
        baseHoursModifier
    )
  );
}

function buildCraftingDc(craftable, hours, areaSettings) {
  const normalized = normalizePhase1AreaSettings(areaSettings);
  const tierBase = craftable?.tier === "specialist" ? 16 : craftable?.tier === "uncommon" ? 13 : 11;
  return Math.max(
    8,
    Math.min(
      24,
      tierBase +
        (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0) +
        (normalized.risk === "high" ? 1 : normalized.risk === "low" ? -1 : 0) -
        Math.max(0, Math.floor(Math.max(1, hours) / 8))
    )
  );
}

function buildProfessionDc(profession, hours, areaSettings) {
  const normalized = normalizePhase1AreaSettings(areaSettings);
  const base = Number(profession?.difficulty ?? 11) || 11;
  return Math.max(
    8,
    Math.min(
      22,
      base +
        (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0) +
        (normalized.risk === "high" ? 1 : normalized.risk === "low" ? -1 : 0) -
        Math.max(0, Math.floor(Math.max(1, hours) / 8))
    )
  );
}

function getBrowsingTagsByTier(tier, areaSettings) {
  const normalized = normalizePhase1AreaSettings(areaSettings);
  const tags = [];
  if (tier === "failure") tags.push("local event");
  if (tier === "failure" && normalized.risk !== "low") tags.push("local danger");
  if (tier === "success") tags.push("rumor", "npc contact");
  if (tier === "strong-success") tags.push("rumor", "quest hook", "market opportunity");
  if (tier === "exceptional-success") tags.push("hidden shop", "quest hook", "market opportunity", "npc contact");
  if (normalized.discovery === "rich" && !tags.includes("hidden shop")) tags.push("hidden shop");
  if (normalized.risk === "high" && !tags.includes("local danger")) tags.push("local danger");
  return tags.slice(0, 6);
}

function buildBrowsingQuality(tier) {
  if (tier === "exceptional-success") return "A standout lead with leverage, access, or a highly actionable opening.";
  if (tier === "strong-success") return "A solid, specific lead that should move play forward quickly.";
  if (tier === "success") return "A usable lead that needs a little GM framing before it hits the table.";
  return "Only weak chatter or partial context surfaces; use it as color, warning, or misdirection if desired.";
}

function buildBrowsingGuidance(tier, tags = []) {
  const tagText = tags.length > 0 ? tags.join(", ") : "rumor";
  if (tier === "exceptional-success")
    return `Offer one premium lead or access point. Build around tags like ${tagText}.`;
  if (tier === "strong-success") return `Offer one concrete lead and one secondary angle. Favor tags like ${tagText}.`;
  if (tier === "success")
    return `Offer one modest lead, overheard detail, or contact prompt. Suggested tags: ${tagText}.`;
  return `Keep it light. Surface atmosphere, caution, or low-value chatter. Suggested tags: ${tagText}.`;
}

function buildCraftingQuality(tier) {
  if (tier === "exceptional-success") return "Superb workmanship";
  if (tier === "strong-success") return "Reliable workmanship";
  if (tier === "success") return "Serviceable workmanship";
  return "Rough workmanship";
}

function buildProfessionPerformance(tier, trained) {
  if (tier === "exceptional-success") return trained ? "Sought-after performance" : "Impressively capable";
  if (tier === "strong-success") return trained ? "Strong day on the job" : "Solid work";
  if (tier === "success") return trained ? "Dependable work" : "Adequate work";
  return trained ? "An off day" : "Barely sufficient labor";
}

function clampNonNegativeInteger(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function buildCheckBreakdown({ d20 = 1, abilityMod = 0, proficiencyBonus = 0, extraBonus = 0 }) {
  const total =
    Math.max(1, Math.floor(Number(d20) || 1)) +
    Math.floor(Number(abilityMod) || 0) +
    Math.floor(Number(proficiencyBonus) || 0) +
    Math.floor(Number(extraBonus) || 0);
  return {
    d20: Math.max(1, Math.floor(Number(d20) || 1)),
    abilityMod: Math.floor(Number(abilityMod) || 0),
    proficiencyBonus: Math.floor(Number(proficiencyBonus) || 0),
    extraBonus: Math.floor(Number(extraBonus) || 0),
    total
  };
}

function resolveBrowsingEntry({ actor, entry, actionData, d20 }) {
  const hours = Math.max(1, Math.floor(Number(entry?.hours ?? 1) || 1));
  const ability = normalizeBrowsingAbility(actionData?.browsingAbility);
  const dc = buildBrowsingDc(hours, actionData.areaSettings);
  const check = buildDowntimeCheckSnapshot({
    entry,
    actionData,
    fallbackAbility: ability,
    abilityMod: getActorAbilityMod(actor, ability),
    proficiencyBonus: 0,
    d20
  });
  const tier = getTierFromMargin(check.total - dc);
  const suggestedTags = getBrowsingTagsByTier(tier, actionData.areaSettings);
  const expectedQuality = buildBrowsingQuality(tier);

  let rumorCount = 0;
  let rewardEffects = { contactTier: "", discountPercent: 0, materialsCreditGp: 0, heatDelta: 0, reputationDelta: 0 };
  let outcomeNote;

  if (tier === "exceptional-success") {
    rumorCount = 3;
    rewardEffects = {
      contactTier: "medium",
      discountPercent: 10,
      materialsCreditGp: 0,
      heatDelta: 0,
      reputationDelta: 1
    };
    outcomeNote =
      "Exceptional browsing: found a key contact (medium), uncovered 3 leads, and built local standing (+1 reputation, -10% shop discount).";
  } else if (tier === "strong-success") {
    rumorCount = 2;
    rewardEffects = {
      contactTier: "minor",
      discountPercent: 5,
      materialsCreditGp: 0,
      heatDelta: 0,
      reputationDelta: 0
    };
    outcomeNote =
      "Strong browsing: found a minor contact, uncovered 2 leads, earned a 5% local discount for the session.";
  } else if (tier === "success") {
    rumorCount = 1;
    rewardEffects = {
      contactTier: "minor",
      discountPercent: 0,
      materialsCreditGp: 0,
      heatDelta: 0,
      reputationDelta: 0
    };
    outcomeNote =
      "Browsing succeeded: found a minor contact and 1 usable lead. GM will describe the contact and rumor.";
  } else {
    outcomeNote =
      "Browsing failed: no actionable leads found. The area may have been too guarded or the contacts too tight-lipped.";
  }

  const detailLines = [
    `Browsing check ${check.total} vs DC ${dc} (${check.d20} on d20, ${ability.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}).`,
    `Expected quality: ${expectedQuality}`,
    outcomeNote,
    `GM guidance: ${buildBrowsingGuidance(tier, suggestedTags)}`,
    `Suggested tags: ${suggestedTags.length > 0 ? suggestedTags.join(", ") : "none"}`
  ];

  return {
    tier,
    summary: `Browsing resolved as ${getTierLabel(tier).toLowerCase()}.`,
    details: detailLines,
    rollTotal: check.total,
    dc,
    gpAward: 0,
    gpCost: 0,
    progress: 0,
    rumorCount,
    itemRewards: [],
    itemRewardDrops: [],
    expectedQuality,
    suggestedTags,
    rewardEffects,
    browsing: {
      ability,
      dc,
      checkTotal: check.total,
      expectedQuality,
      gmGuidance: buildBrowsingGuidance(tier, suggestedTags)
    }
  };
}

function resolveCraftingEntry({ actor, entry, actionData, d20, moduleId }) {
  const craftable = getCraftableById(actionData?.craftItemId);
  if (!craftable) {
    return {
      tier: "failure",
      summary: "Crafting could not begin because no craftable item was selected.",
      details: ["Select a craftable item before resolving crafting."],
      rollTotal: 0,
      gpAward: 0,
      gpCost: 0,
      progress: 0,
      itemRewards: [],
      itemRewardDrops: [],
      crafting: null
    };
  }

  const project = getActorCraftingProject(actor, craftable.id, { moduleId });
  const hasTool = actorHasToolProficiency(actor, craftable.requiredToolId, craftable.requiredToolProficiency);
  if (!hasTool) {
    return {
      tier: "failure",
      summary: `Crafting ${craftable.name} failed because the actor lacks ${craftable.requiredToolProficiency}.`,
      details: [`Required proficiency: ${craftable.requiredToolProficiency}.`, "No crafting progress was granted."],
      rollTotal: 0,
      gpAward: 0,
      gpCost: 0,
      progress: 0,
      itemRewards: [],
      itemRewardDrops: [],
      expectedQuality: "No progress",
      crafting: {
        itemId: craftable.id,
        itemName: craftable.name,
        progressBefore: clampNonNegativeInteger(project?.progress),
        progressGained: 0,
        progressAfter: clampNonNegativeInteger(project?.progress),
        progressRequired: clampNonNegativeInteger(craftable.progressRequired),
        complete: false,
        materialsSecured: project?.materialsSecured === true || actionData?.materialsOwned === true
      }
    };
  }

  const hours = Math.max(1, Math.floor(Number(actionData?.hours ?? actionData?.submittedHours ?? 0) || 0)) || 1;
  const check = buildDowntimeCheckSnapshot({
    entry,
    actionData,
    fallbackAbility: craftable.checkAbility,
    abilityMod: getActorAbilityMod(actor, craftable.checkAbility),
    proficiencyBonus: getActorProficiencyBonus(actor),
    d20
  });
  const dc = buildCraftingDc(craftable, hours, actionData.areaSettings);
  const tier = getTierFromMargin(check.total - dc);
  const progressBefore = clampNonNegativeInteger(project?.progress);
  const baseProgress = Math.max(1, Math.ceil(hours / 2));
  const progressBonus = tier === "exceptional-success" ? 3 : tier === "strong-success" ? 2 : tier === "success" ? 1 : 0;
  const failureFloor = tier === "failure" ? Math.max(0, Math.floor(baseProgress / 2)) : 0;
  const progressGained = tier === "failure" ? failureFloor : baseProgress + progressBonus;
  const progressAfter = progressBefore + progressGained;
  const progressRequired = clampNonNegativeInteger(craftable.progressRequired);
  const complete = progressAfter >= progressRequired;
  const materialsSecured = project?.materialsSecured === true || actionData?.materialsOwned === true;
  const gpCost = materialsSecured ? 0 : clampNonNegativeInteger(craftable.materialCost);
  const itemRewardDrops = complete
    ? [
        {
          id: craftable.id,
          name: craftable.name,
          uuid: "",
          img: "icons/svg/item-bag.svg",
          itemType: craftable.itemType ?? "loot",
          quantity: 1
        }
      ]
    : [];

  return {
    tier,
    summary: complete ? `${craftable.name} was completed.` : `${craftable.name} gained ${progressGained} progress.`,
    details: [
      `Crafting check ${check.total} vs DC ${dc} (${check.d20} on d20, ${craftable.checkAbility.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}, proficiency +${check.proficiencyBonus}).`,
      `Required tool proficiency: ${craftable.requiredToolProficiency}.`,
      gpCost > 0
        ? `Materials purchased for ${gpCost} gp.`
        : project?.materialsSecured === true
          ? "Existing project materials were already secured."
          : "Materials were already on hand.",
      `${progressBefore}/${progressRequired} progress before the attempt; ${progressAfter}/${progressRequired} after the attempt.`,
      complete
        ? "The item is complete and can be collected."
        : "The item is incomplete and remains available for continuation."
    ],
    rollTotal: check.total,
    dc,
    gpAward: 0,
    gpCost,
    progress: progressGained,
    itemRewards: complete ? [craftable.name] : [],
    itemRewardDrops,
    expectedQuality: buildCraftingQuality(tier),
    crafting: {
      itemId: craftable.id,
      itemName: craftable.name,
      progressBefore,
      progressGained,
      progressAfter,
      progressRequired,
      complete,
      materialsSecured: true
    }
  };
}

function resolveProfessionEntry({ actor, entry, actionData, d20, hours, moduleId }) {
  const profession = getProfessionById(actionData?.professionId);
  if (!profession) {
    return {
      tier: "failure",
      summary: "Profession work could not begin because no profession was selected.",
      details: ["Select a profession before resolving work."],
      rollTotal: 0,
      gpAward: 0,
      gpCost: 0,
      progress: 0,
      profession: null
    };
  }

  const trained = actorKnowsProfession(actor, profession.id, { moduleId });
  const check = buildDowntimeCheckSnapshot({
    entry,
    actionData,
    fallbackAbility: profession.checkAbility,
    abilityMod: getActorAbilityMod(actor, profession.checkAbility),
    proficiencyBonus: trained ? getActorProficiencyBonus(actor) : 0,
    d20
  });
  const dc = buildProfessionDc(profession, hours, actionData.areaSettings);
  let tier = getTierFromMargin(check.total - dc);
  if (!trained && tier === "exceptional-success") tier = "strong-success";

  const normalizedArea = normalizePhase1AreaSettings(actionData.areaSettings);
  const rate = trained ? profession.trainedRateGpPer4h : profession.untrainedRateGpPer4h;
  const blocks = Math.max(1, Math.ceil(hours / 4));
  const tierMultiplier =
    tier === "exceptional-success" ? 2 : tier === "strong-success" ? 1.5 : tier === "success" ? 1 : 0.5;
  const economyMultiplier = normalizedArea.economy === "stingy" ? 0.8 : normalizedArea.economy === "generous" ? 1.2 : 1;
  const gpAward = clampNonNegativeInteger(Math.floor(rate * blocks * tierMultiplier * economyMultiplier));
  const performanceLabel = buildProfessionPerformance(tier, trained);

  return {
    tier,
    summary:
      gpAward > 0
        ? `${profession.name} work earned ${gpAward} gp.`
        : `${profession.name} work produced no meaningful earnings.`,
    details: [
      `Work check ${check.total} vs DC ${dc} (${check.d20} on d20, ${profession.checkAbility.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}${trained ? `, proficiency +${check.proficiencyBonus}` : ""}).`,
      `Profession status: ${trained ? "trained" : "untrained"}.`,
      `Performance tier: ${performanceLabel}.`,
      gpAward > 0 ? `Earnings awarded: ${gpAward} gp.` : "The actor mainly covered obligations and routine expenses."
    ],
    rollTotal: check.total,
    dc,
    gpAward,
    gpCost: 0,
    progress: blocks,
    itemRewards: [],
    itemRewardDrops: [],
    performanceLabel,
    profession: {
      professionId: profession.id,
      professionName: profession.name,
      trained,
      performanceLabel
    }
  };
}

function resolveSubtypeEntry({ actor, entry, actionData, d20, hours, actionKey }) {
  const profile = ACTION_OUTCOME_PROFILES[actionKey] ?? ACTION_OUTCOME_PROFILES.carousing;
  const subtypeDef = getPhase1ActionSubtypeDefinition(actionKey, actionData?.subtypeKey);
  const subtypeLabel = String(subtypeDef?.label ?? "Standard").trim() || "Standard";
  const subtypeAbility = String(subtypeDef?.ability ?? "cha")
    .trim()
    .toLowerCase();
  const subtypeKey = String(subtypeDef?.key ?? "")
    .trim()
    .toLowerCase();
  const subtypeRule = SUBTYPE_OUTCOME_RULES[`${actionKey}.${subtypeKey}`] ?? null;
  const normalizedArea = normalizePhase1AreaSettings(actionData?.areaSettings ?? entry?.areaSettings ?? {});
  const units = Math.max(1, Math.ceil(Math.max(1, hours) / 4));
  const check = buildDowntimeCheckSnapshot({
    entry,
    actionData,
    fallbackAbility: subtypeAbility,
    abilityMod: getActorAbilityMod(actor, subtypeAbility),
    proficiencyBonus: 0,
    d20
  });
  const dc = Math.max(
    8,
    Math.min(
      22,
      (Number(subtypeRule?.dc ?? profile.baseDc ?? 12) || 12) +
        (normalizedArea.economy === "stingy" ? 1 : normalizedArea.economy === "generous" ? -1 : 0) +
        (normalizedArea.risk === "high" ? 1 : normalizedArea.risk === "low" ? -1 : 0) -
        Math.max(0, Math.floor(hours / 8))
    )
  );
  const tier = getTierFromMargin(check.total - dc);
  const tierGp = Math.max(0, Number(subtypeRule?.gp?.[tier] ?? profile.tierGp?.[tier] ?? 0) || 0);
  const tierRumors = Math.max(0, Number(subtypeRule?.rumors?.[tier] ?? profile.tierRumors?.[tier] ?? 0) || 0);
  const baseTierTags = Array.isArray(subtypeRule?.tags?.[tier]) ? subtypeRule.tags[tier] : [];
  const baseEffects =
    subtypeRule?.effects?.[tier] && typeof subtypeRule.effects[tier] === "object" ? subtypeRule.effects[tier] : {};
  const economyMultiplier = normalizedArea.economy === "stingy" ? 0.9 : normalizedArea.economy === "generous" ? 1.1 : 1;
  const gpAward = clampNonNegativeInteger(Math.floor(tierGp * units * economyMultiplier));
  const rumorCount = clampNonNegativeInteger(tierRumors + (normalizedArea.discovery === "rich" ? 1 : 0));
  const expectedQuality = String(profile.quality?.[tier] ?? "A workable result is generated.").trim();
  const rewardEffects = {
    discountPercent: clampNonNegativeInteger(baseEffects.discountPercent),
    materialsCreditGp: clampNonNegativeInteger(baseEffects.materialsCreditGp),
    heatDelta: clampNonNegativeInteger(baseEffects.heatDelta),
    reputationDelta: Number.isFinite(Number(baseEffects.reputationDelta))
      ? Math.floor(Number(baseEffects.reputationDelta))
      : 0,
    contactTier: String(baseEffects.contactTier ?? "")
      .trim()
      .toLowerCase()
  };
  const rewardTags = [
    ...baseTierTags,
    rewardEffects.discountPercent > 0 ? "discount" : "",
    rewardEffects.materialsCreditGp > 0 ? "materials-credit" : "",
    rewardEffects.heatDelta > 0 ? "heat" : "",
    rewardEffects.contactTier ? `contact-${rewardEffects.contactTier}` : ""
  ]
    .filter(Boolean)
    .slice(0, 8);
  const suggestedTags = [
    ...(Array.isArray(profile.baseTags) ? profile.baseTags : []),
    ...rewardTags,
    subtypeLabel.toLowerCase()
  ].slice(0, 6);
  const effectSummaryParts = [
    rewardEffects.discountPercent > 0 ? `Discount ${rewardEffects.discountPercent}%` : "",
    rewardEffects.materialsCreditGp > 0 ? `Materials credit ${rewardEffects.materialsCreditGp} gp` : "",
    rewardEffects.heatDelta > 0 ? `Heat +${rewardEffects.heatDelta}` : "",
    rewardEffects.reputationDelta !== 0
      ? `Reputation ${rewardEffects.reputationDelta > 0 ? "+" : ""}${rewardEffects.reputationDelta}`
      : "",
    rewardEffects.contactTier ? `Contact tier ${rewardEffects.contactTier}` : ""
  ].filter(Boolean);

  return {
    tier,
    summary: `${subtypeLabel} resolved as ${getTierLabel(tier).toLowerCase()}.`,
    details: [
      `${subtypeLabel} check ${check.total} vs DC ${dc} (${check.d20} on d20, ${subtypeAbility.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}).`,
      `Estimated payout: ${gpAward} gp over ${units} downtime block(s).`,
      effectSummaryParts.length > 0 ? `Effects: ${effectSummaryParts.join(", ")}.` : "",
      expectedQuality
    ].filter(Boolean),
    rollTotal: check.total,
    dc,
    gpAward,
    gpCost: 0,
    progress: units,
    rumorCount,
    itemRewards: [],
    itemRewardDrops: [],
    expectedQuality,
    suggestedTags,
    rewardTags,
    rewardEffects,
    subtype: {
      key: subtypeKey,
      label: subtypeLabel,
      ability: subtypeAbility
    },
    performanceLabel:
      actionKey === "performing"
        ? tier === "exceptional-success"
          ? "Crowd favorite"
          : tier === "strong-success"
            ? "Strong reception"
            : tier === "success"
              ? "Steady reception"
              : "Muted reception"
        : ""
  };
}

export function resolvePhase1DowntimeEntry({ actor = null, entry = {}, d20 = 10, moduleId = "party-operations" } = {}) {
  const hours = Math.max(1, Math.floor(Number(entry?.hours ?? 1) || 1));
  const actionKey = normalizePhase1ActionKey(entry?.actionKey);
  const actionData = normalizePhase1ActionData(
    actionKey,
    {
      ...(entry?.actionData && typeof entry.actionData === "object" ? entry.actionData : {}),
      areaSettings: entry?.areaSettings
    },
    {
      actor,
      moduleId,
      areaSettings: entry?.areaSettings
    }
  );

  let resolved;
  if (actionKey === "browsing") {
    resolved = resolveBrowsingEntry({ actor, entry, actionData, d20 });
  } else if (actionKey === "crafting") {
    resolved = resolveCraftingEntry({
      actor,
      entry,
      actionData: {
        ...actionData,
        submittedHours: hours
      },
      d20,
      moduleId
    });
  } else if (actionKey === "profession") {
    resolved = resolveProfessionEntry({ actor, entry, actionData, d20, hours, moduleId });
  } else {
    resolved = resolveSubtypeEntry({ actor, entry, actionData, d20, hours, actionKey });
  }

  return {
    actionKey,
    actionLabel: getDowntimePhase1ActionDefinition(actionKey).label,
    tier: normalizeDowntimeResultTier(resolved?.tier, "failure"),
    tierLabel: getTierLabel(resolved?.tier),
    summary: String(resolved?.summary ?? "").trim(),
    details: normalizeStringList(resolved?.details ?? [], 12),
    rollTotal: clampNonNegativeInteger(resolved?.rollTotal),
    dc: clampNonNegativeInteger(resolved?.dc),
    gpAward: clampNonNegativeInteger(resolved?.gpAward),
    gpCost: clampNonNegativeInteger(resolved?.gpCost),
    progress: clampNonNegativeInteger(resolved?.progress),
    rumorCount: clampNonNegativeInteger(resolved?.rumorCount),
    itemRewards: normalizeStringList(resolved?.itemRewards ?? [], 12),
    itemRewardDrops: Array.isArray(resolved?.itemRewardDrops) ? resolved.itemRewardDrops : [],
    expectedQuality: String(resolved?.expectedQuality ?? "").trim(),
    suggestedTags: normalizeStringList(resolved?.suggestedTags ?? [], 8),
    rewardTags: normalizeStringList(resolved?.rewardTags ?? [], 8),
    rewardEffects:
      resolved?.rewardEffects && typeof resolved.rewardEffects === "object"
        ? {
            discountPercent: clampNonNegativeInteger(resolved.rewardEffects.discountPercent),
            materialsCreditGp: clampNonNegativeInteger(resolved.rewardEffects.materialsCreditGp),
            heatDelta: clampNonNegativeInteger(resolved.rewardEffects.heatDelta),
            reputationDelta: Number.isFinite(Number(resolved.rewardEffects.reputationDelta))
              ? Math.floor(Number(resolved.rewardEffects.reputationDelta))
              : 0,
            contactTier: String(resolved.rewardEffects.contactTier ?? "")
              .trim()
              .toLowerCase()
          }
        : {
            discountPercent: 0,
            materialsCreditGp: 0,
            heatDelta: 0,
            reputationDelta: 0,
            contactTier: ""
          },
    actionData,
    areaSettings: normalizePhase1AreaSettings(actionData.areaSettings),
    browsing: resolved?.browsing ?? null,
    crafting: resolved?.crafting ?? null,
    profession: resolved?.profession ?? null,
    subtype: resolved?.subtype ?? null,
    performanceLabel: String(resolved?.performanceLabel ?? "").trim()
  };
}

export function buildDowntimeEntryActionSummary(entry = {}, { moduleId = "party-operations" } = {}) {
  const actionKey = normalizePhase1ActionKey(entry?.actionKey);
  const actionData = normalizePhase1ActionData(actionKey, entry?.actionData ?? {}, {
    actor: entry?.actor ?? null,
    moduleId,
    areaSettings: entry?.areaSettings
  });
  const parts = [`Area: ${formatPhase1AreaSettingsLabel(entry?.areaSettings ?? actionData.areaSettings)}`];
  if (actionKey === "browsing") {
    const ability = normalizeBrowsingAbility(actionData.browsingAbility);
    parts.push(`Browsing ability: ${ability.toUpperCase()}`);
  } else if (actionKey === "crafting") {
    const craftable = getCraftableById(actionData.craftItemId);
    if (craftable) parts.push(`Craft item: ${craftable.name}`);
    parts.push(
      actionData.materialsOwned === true || actionData.materialsSecured === true
        ? "Materials secured"
        : "Buy materials if needed"
    );
    if (Array.isArray(actionData.materialDrops) && actionData.materialDrops.length > 0)
      parts.push(`Materials offered: ${actionData.materialDrops.length}`);
  } else {
    if (actionKey === "profession") {
      const profession = getProfessionById(actionData.professionId);
      if (profession) parts.push(`Profession: ${profession.name}`);
      parts.push(actionData.knownProfession === true ? "Profession known" : "Profession untrained");
    } else {
      const subtype = getPhase1ActionSubtypeDefinition(actionKey, actionData.subtypeKey);
      if (subtype) parts.push(`Subtype: ${subtype.label}`);
      if (subtype?.ability) parts.push(`Check ability: ${String(subtype.ability).toUpperCase()}`);
    }
  }
  return parts;
}
