import {
  DOWNTIME_AREA_DISCOVERY_OPTIONS,
  DOWNTIME_AREA_ECONOMY_OPTIONS,
  DOWNTIME_AREA_RISK_OPTIONS,
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
  const source = typeof rawDrops === "string"
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
  const normalized = String(value ?? "").trim().toLowerCase();
  return ACTION_KEYS.has(normalized) ? normalized : fallback;
}

export function normalizeDowntimeResultTier(value, fallback = "success") {
  const normalized = String(value ?? "").trim().toLowerCase();
  return RESULT_TIERS.has(normalized) ? normalized : fallback;
}

export function getDowntimePhase1ActionDefinition(actionKey = "") {
  const key = normalizePhase1ActionKey(actionKey);
  return DOWNTIME_PHASE1_ACTIONS.find((entry) => entry.key === key) ?? DOWNTIME_PHASE1_ACTIONS[0];
}

export function normalizePhase1AreaSettings(raw = {}, fallback = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const economy = String(source.economy ?? base.economy ?? "standard").trim().toLowerCase();
  const risk = String(source.risk ?? base.risk ?? "standard").trim().toLowerCase();
  const discovery = String(source.discovery ?? base.discovery ?? "standard").trim().toLowerCase();
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
  const normalized = String(value ?? "").trim().toLowerCase();
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
    const items = DOWNTIME_CRAFTABLES
      .filter((entry) => entry.category === category.id)
      .map((entry) => ({
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
  const key = String(ability ?? "").trim().toLowerCase();
  const raw = actor?.system?.abilities?.[key]?.mod;
  return Number.isFinite(Number(raw)) ? Math.floor(Number(raw)) : 0;
}

export function getActorProficiencyBonus(actor) {
  const raw = actor?.system?.attributes?.prof ?? actor?.system?.bonuses?.prof ?? 0;
  return Number.isFinite(Number(raw)) ? Math.max(0, Math.floor(Number(raw))) : 0;
}

function normalizeSubmittedCheckSnapshot(raw = {}, fallbackAbility = "int") {
  const source = raw && typeof raw === "object" ? raw : {};
  const fallback = ABILITY_KEYS.has(String(fallbackAbility ?? "").trim().toLowerCase())
    ? String(fallbackAbility ?? "").trim().toLowerCase()
    : "int";
  const d20 = Math.floor(Number(source.d20 ?? source.natural ?? 0) || 0);
  if (!Number.isFinite(d20) || d20 <= 0) return null;
  const abilityKeyRaw = String(source.abilityKey ?? source.ability ?? fallback).trim().toLowerCase();
  const abilityKey = ABILITY_KEYS.has(abilityKeyRaw) ? abilityKeyRaw : fallback;
  const abilityMod = Number.isFinite(Number(source.abilityMod))
    ? Math.floor(Number(source.abilityMod))
    : 0;
  const proficiencyBonus = Number.isFinite(Number(source.proficiencyBonus))
    ? Math.max(0, Math.floor(Number(source.proficiencyBonus)))
    : 0;
  const computedTotal = d20 + abilityMod + proficiencyBonus;
  const total = Number.isFinite(Number(source.total))
    ? Math.max(1, Math.floor(Number(source.total)))
    : computedTotal;
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
  const aliases = new Set([
    String(label ?? "").trim(),
    String(toolId ?? "").trim()
  ].filter(Boolean).map(slugify));
  for (const alias of definition?.aliases ?? []) aliases.add(slugify(alias));
  if (definition?.label) aliases.add(slugify(definition.label));
  return aliases;
}

export function actorHasToolProficiency(actor, toolId = "", toolLabel = "") {
  if (!actor) return false;
  const aliases = getToolAliases(toolId, toolLabel);
  if (!aliases.size) return false;

  const systemTools = actor?.system?.tools && typeof actor.system.tools === "object"
    ? Object.entries(actor.system.tools)
    : [];
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
    if (String(item?.type ?? "").trim().toLowerCase() !== "tool") continue;
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
    Object.entries(raw).map(([key, value]) => {
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
    }).filter(([key]) => key)
  );
}

export function getActorCraftingProject(actor, craftableId, options = {}) {
  const projects = getActorCraftingProjects(actor, options);
  return projects[String(craftableId ?? "").trim()] ?? null;
}

export function buildNextCraftingProjects(currentProjects = {}, craftingOutcome = {}, now = Date.now()) {
  const source = currentProjects && typeof currentProjects === "object" && !Array.isArray(currentProjects)
    ? currentProjects
    : {};
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
    const materialDrops = normalizePhase1MaterialDrops(source.materialDrops ?? source.materialDropsJson ?? source.craftMaterialDrops ?? source.craftMaterialDropsJson);
    const materialsOwned = source.materialsOwned === true
      || String(source.materialsOwned ?? "").trim().toLowerCase() === "true"
      || source.materialsOwned === "owned";
    return {
      craftItemId: String(craftable?.id ?? "").trim(),
      craftItemName: String(craftable?.name ?? source.craftItemName ?? "").trim(),
      materialsOwned,
      materialsSecured: existingProject?.materialsSecured === true || materialsOwned || materialDrops.length > 0,
      materialDrops,
      areaSettings
    };
  }

  const profession = getProfessionById(source.professionId ?? source.id ?? source.professionKey);
  return {
    professionId: String(profession?.id ?? "").trim(),
    professionName: String(profession?.name ?? source.professionName ?? "").trim(),
    knownProfession: profession ? actorKnowsProfession(actor, profession.id, { moduleId }) : false,
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
  const selectableCraftables = DOWNTIME_CRAFTABLES.filter((entry) => actorHasToolProficiency(actor, entry.requiredToolId, entry.requiredToolProficiency));
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
  const knownProfessionEntries = DOWNTIME_PROFESSIONS.filter((entry) => knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name)));
  const fallbackProfessionIds = new Set(["laborer", "cook"]);
  const availableProfessionEntries = knownProfessionEntries.length > 0
    ? knownProfessionEntries
    : DOWNTIME_PROFESSIONS.filter((entry) => fallbackProfessionIds.has(entry.id));
  const selectedProfession = availableProfessionEntries.find((entry) => entry.id === normalizedActionData.professionId)
    ?? availableProfessionEntries[0]
    ?? null;
  const materialDrops = normalizePhase1MaterialDrops(normalizedActionData.materialDrops ?? []);

  return {
    actionKey: normalizedAction,
    showBrowsingFields: normalizedAction === "browsing",
    showCraftingFields: normalizedAction === "crafting",
    showProfessionFields: normalizedAction === "profession",
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
    showMaterialDropZone: normalizedAction === "crafting" && (normalizedActionData.materialsOwned === true || normalizedActionData.materialsSecured === true),
    materialsOwnedOptions: [
      { value: "true", label: "Materials On Hand", selected: normalizedActionData.materialsOwned === true || normalizedActionData.materialsSecured === true },
      { value: "false", label: "Buy Materials", selected: normalizedActionData.materialsOwned !== true && normalizedActionData.materialsSecured !== true }
    ],
    professionOptions: availableProfessionEntries.map((entry) => ({
      ...entry,
      selected: entry.id === selectedProfession?.id,
      known: knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name))
    })),
    selectedProfession,
    knownProfessionNames: DOWNTIME_PROFESSIONS
      .filter((entry) => knownProfessionIds.has(slugify(entry.id)) || knownProfessionIds.has(slugify(entry.name)))
      .map((entry) => entry.name)
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
      13
      + (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0)
      + (normalized.risk === "high" ? 2 : normalized.risk === "low" ? -1 : 0)
      + (normalized.discovery === "sparse" ? 2 : normalized.discovery === "rich" ? -2 : 0)
      - baseHoursModifier
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
      tierBase
      + (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0)
      + (normalized.risk === "high" ? 1 : normalized.risk === "low" ? -1 : 0)
      - Math.max(0, Math.floor(Math.max(1, hours) / 8))
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
      base
      + (normalized.economy === "stingy" ? 1 : normalized.economy === "generous" ? -1 : 0)
      + (normalized.risk === "high" ? 1 : normalized.risk === "low" ? -1 : 0)
      - Math.max(0, Math.floor(Math.max(1, hours) / 8))
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
  if (tier === "exceptional-success") return `Offer one premium lead or access point. Build around tags like ${tagText}.`;
  if (tier === "strong-success") return `Offer one concrete lead and one secondary angle. Favor tags like ${tagText}.`;
  if (tier === "success") return `Offer one modest lead, overheard detail, or contact prompt. Suggested tags: ${tagText}.`;
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
  const total = Math.max(1, Math.floor(Number(d20) || 1))
    + Math.floor(Number(abilityMod) || 0)
    + Math.floor(Number(proficiencyBonus) || 0)
    + Math.floor(Number(extraBonus) || 0);
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
  return {
    tier,
    summary: `Browsing resolved as ${getTierLabel(tier).toLowerCase()}.`,
    details: [
      `Browsing check ${check.total} vs DC ${dc} (${check.d20} on d20, ${ability.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}).`,
      `Expected quality: ${expectedQuality}`,
      `GM guidance: ${buildBrowsingGuidance(tier, suggestedTags)}`,
      `Suggested tags: ${suggestedTags.length > 0 ? suggestedTags.join(", ") : "rumor"}`
    ],
    rollTotal: check.total,
    dc,
    gpAward: 0,
    gpCost: 0,
    progress: 0,
    rumorCount: 0,
    itemRewards: [],
    itemRewardDrops: [],
    expectedQuality,
    suggestedTags,
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
      details: [
        `Required proficiency: ${craftable.requiredToolProficiency}.`,
        "No crafting progress was granted."
      ],
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
    ? [{
        id: craftable.id,
        name: craftable.name,
        uuid: "",
        img: "icons/svg/item-bag.svg",
        itemType: craftable.itemType ?? "loot",
        quantity: 1
      }]
    : [];

  return {
    tier,
    summary: complete
      ? `${craftable.name} was completed.`
      : `${craftable.name} gained ${progressGained} progress.`,
    details: [
      `Crafting check ${check.total} vs DC ${dc} (${check.d20} on d20, ${craftable.checkAbility.toUpperCase()} mod ${check.abilityMod >= 0 ? "+" : ""}${check.abilityMod}, proficiency +${check.proficiencyBonus}).`,
      `Required tool proficiency: ${craftable.requiredToolProficiency}.`,
      gpCost > 0
        ? `Materials purchased for ${gpCost} gp.`
        : (project?.materialsSecured === true ? "Existing project materials were already secured." : "Materials were already on hand."),
      `${progressBefore}/${progressRequired} progress before the attempt; ${progressAfter}/${progressRequired} after the attempt.`,
      complete ? "The item is complete and can be collected." : "The item is incomplete and remains available for continuation."
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
  const tierMultiplier = tier === "exceptional-success" ? 2 : tier === "strong-success" ? 1.5 : tier === "success" ? 1 : 0.5;
  const economyMultiplier = normalizedArea.economy === "stingy" ? 0.8 : normalizedArea.economy === "generous" ? 1.2 : 1;
  const gpAward = clampNonNegativeInteger(Math.floor(rate * blocks * tierMultiplier * economyMultiplier));
  const performanceLabel = buildProfessionPerformance(tier, trained);

  return {
    tier,
    summary: gpAward > 0
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

export function resolvePhase1DowntimeEntry({
  actor = null,
  entry = {},
  d20 = 10,
  moduleId = "party-operations"
} = {}) {
  const hours = Math.max(1, Math.floor(Number(entry?.hours ?? 1) || 1));
  const actionKey = normalizePhase1ActionKey(entry?.actionKey);
  const actionData = normalizePhase1ActionData(actionKey, {
    ...(entry?.actionData && typeof entry.actionData === "object" ? entry.actionData : {}),
    areaSettings: entry?.areaSettings
  }, {
    actor,
    moduleId,
    areaSettings: entry?.areaSettings
  });

  let resolved = null;
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
  } else {
    resolved = resolveProfessionEntry({ actor, entry, actionData, d20, hours, moduleId });
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
    actionData,
    areaSettings: normalizePhase1AreaSettings(actionData.areaSettings),
    browsing: resolved?.browsing ?? null,
    crafting: resolved?.crafting ?? null,
    profession: resolved?.profession ?? null,
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
    parts.push(actionData.materialsOwned === true || actionData.materialsSecured === true ? "Materials secured" : "Buy materials if needed");
    if (Array.isArray(actionData.materialDrops) && actionData.materialDrops.length > 0) parts.push(`Materials offered: ${actionData.materialDrops.length}`);
  } else {
    const profession = getProfessionById(actionData.professionId);
    if (profession) parts.push(`Profession: ${profession.name}`);
    parts.push(actionData.knownProfession === true ? "Profession known" : "Profession untrained");
  }
  return parts;
}
