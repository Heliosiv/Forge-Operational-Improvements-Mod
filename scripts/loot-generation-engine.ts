import {
  DEFAULT_PARTY_OPS_CONFIG,
  type LootRarity,
  type PartyOpsConfig,
  type ScarcityLevel
} from "./party-ops-config";

export type LootTarget = "pocket" | "horde";

export interface LootGenerationInput {
  cr: number;
  scarcity: ScarcityLevel;
  target: LootTarget;
}

export interface LootSuggestionItem {
  uuid: string;
  name: string;
  qty: number;
}

export interface LootGenerationOutput {
  gold: number;
  items: LootSuggestionItem[];
}

export interface LootCatalogItem {
  uuid: string;
  name: string;
  rarity: LootRarity;
  weight?: number;
  maxQty?: number;
}

export interface WeightedEntry<T> {
  value: T;
  weight: number;
}

type Rng = () => number;

const SCARCITY_MODIFIER: Record<ScarcityLevel, number> = {
  abundant: 1.25,
  normal: 1,
  scarce: 0.75
};

const RARITY_ORDER: LootRarity[] = ["common", "uncommon", "rare", "veryRare", "legendary"];

function clampCr(rawCr: number): number {
  if (!Number.isFinite(rawCr)) return 0;
  return Math.max(0, Math.min(30, Math.floor(rawCr)));
}

function getScarcityModifier(scarcity: ScarcityLevel): number {
  return SCARCITY_MODIFIER[scarcity] ?? SCARCITY_MODIFIER.normal;
}

export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (low === high) return low;
  return Math.floor(rng() * (high - low + 1)) + low;
}

export function weightedPick<T>(pool: Array<WeightedEntry<T>>, rng: Rng = Math.random): T | null {
  const valid = pool.filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);
  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return null;

  let roll = rng() * totalWeight;
  for (const entry of valid) {
    roll -= entry.weight;
    if (roll <= 0) return entry.value;
  }

  return valid[valid.length - 1]?.value ?? null;
}

export function estimateBaseGoldByCr(cr: number, target: LootTarget): number {
  const c = clampCr(cr);
  const pocketBase = 8 + (c * 14) + Math.floor((c * c) * 1.8);
  const hordeBase = 35 + (c * 42) + Math.floor((c * c) * 8.5);
  return target === "horde" ? hordeBase : pocketBase;
}

export function estimateItemCount(cr: number, target: LootTarget, scarcity: ScarcityLevel, rng: Rng = Math.random): number {
  const c = clampCr(cr);
  const scarcityModifier = getScarcityModifier(scarcity);

  const base = target === "horde"
    ? Math.max(1, Math.floor(c / 5) + 1)
    : Math.max(0, Math.floor((c - 1) / 8));

  const variance = target === "horde"
    ? randomInt(0, 2, rng)
    : randomInt(0, 1, rng);

  const scaled = Math.round((base + variance) * scarcityModifier);
  return Math.max(0, scaled);
}

export function pickRarity(
  rarityWeights: Record<LootRarity, number>,
  availableRarities: Set<LootRarity>,
  rng: Rng = Math.random
): LootRarity | null {
  const pool: Array<WeightedEntry<LootRarity>> = RARITY_ORDER
    .filter((rarity) => availableRarities.has(rarity))
    .map((rarity) => ({ value: rarity, weight: Number(rarityWeights[rarity] ?? 0) }))
    .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);

  return weightedPick(pool, rng);
}

export function buildItemPoolByRarity(
  catalog: LootCatalogItem[],
  rarity: LootRarity
): Array<WeightedEntry<LootCatalogItem>> {
  return (Array.isArray(catalog) ? catalog : [])
    .filter((item) => item?.rarity === rarity && String(item?.uuid ?? "").trim())
    .map((item) => ({ value: item, weight: Number(item.weight ?? 1) }))
    .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);
}

export function generateSuggestedLoot(
  input: LootGenerationInput,
  catalog: LootCatalogItem[],
  config: PartyOpsConfig = DEFAULT_PARTY_OPS_CONFIG,
  rng: Rng = Math.random
): LootGenerationOutput {
  const cr = clampCr(input.cr);
  const scarcity = input.scarcity;
  const target = input.target;
  const scarcityModifier = getScarcityModifier(scarcity);

  const baseGold = estimateBaseGoldByCr(cr, target);
  const goldVariance = target === "horde" ? randomInt(80, 130, rng) / 100 : randomInt(85, 120, rng) / 100;
  const gold = Math.max(0, Math.round(baseGold * scarcityModifier * config.crGoldMultiplier * goldVariance));

  const draws = estimateItemCount(cr, target, scarcity, rng);
  if (draws <= 0 || !Array.isArray(catalog) || catalog.length === 0) {
    return { gold, items: [] };
  }

  const availableRarities = new Set<LootRarity>(catalog.map((item) => item.rarity).filter(Boolean));
  const aggregate = new Map<string, LootSuggestionItem>();

  for (let index = 0; index < draws; index += 1) {
    const rarity = pickRarity(config.rarityWeights, availableRarities, rng);
    if (!rarity) continue;

    const itemPool = buildItemPoolByRarity(catalog, rarity);
    const picked = weightedPick(itemPool, rng);
    if (!picked) continue;

    const uuid = String(picked.uuid ?? "").trim();
    const name = String(picked.name ?? "Unknown Item").trim() || "Unknown Item";
    if (!uuid) continue;

    const maxQty = Math.max(1, Math.floor(Number(picked.maxQty ?? (rarity === "common" ? 3 : 1)) || 1));
    const qty = maxQty > 1 ? randomInt(1, maxQty, rng) : 1;
    const current = aggregate.get(uuid);

    if (!current) {
      aggregate.set(uuid, { uuid, name, qty });
    } else {
      current.qty += qty;
      aggregate.set(uuid, current);
    }
  }

  return {
    gold,
    items: Array.from(aggregate.values())
  };
}
