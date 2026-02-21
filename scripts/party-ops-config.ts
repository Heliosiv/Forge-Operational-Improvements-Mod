export type ScarcityLevel = "abundant" | "normal" | "scarce";

export type LootRarity = "common" | "uncommon" | "rare" | "veryRare" | "legendary";

export interface PartyOpsConfig {
  debugEnabled: boolean;
  lootScarcity: ScarcityLevel;
  rarityWeights: Record<LootRarity, number>;
  crGoldMultiplier: number;
}

const LOOT_RARITIES: LootRarity[] = ["common", "uncommon", "rare", "veryRare", "legendary"];
const SCARCITY_LEVELS: ScarcityLevel[] = ["abundant", "normal", "scarce"];

export const DEFAULT_PARTY_OPS_CONFIG: PartyOpsConfig = {
  debugEnabled: false,
  lootScarcity: "normal",
  rarityWeights: {
    common: 50,
    uncommon: 30,
    rare: 12,
    veryRare: 6,
    legendary: 2
  },
  crGoldMultiplier: 1
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toNonNegativeNumberOrFallback(value: unknown, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback;
  return Math.max(0, value);
}

function toPositiveNumberOrFallback(value: unknown, fallback: number): number {
  if (!isFiniteNumber(value)) return fallback;
  return value > 0 ? value : fallback;
}

function normalizeScarcityLevel(value: unknown, fallback: ScarcityLevel): ScarcityLevel {
  const raw = String(value ?? "").trim() as ScarcityLevel;
  return SCARCITY_LEVELS.includes(raw) ? raw : fallback;
}

function normalizeRarityWeights(value: unknown, fallback: Record<LootRarity, number>): Record<LootRarity, number> {
  if (!isPlainObject(value)) {
    return { ...fallback };
  }

  const normalized = {} as Record<LootRarity, number>;
  for (const rarity of LOOT_RARITIES) {
    normalized[rarity] = toNonNegativeNumberOrFallback(value[rarity], fallback[rarity]);
  }
  return normalized;
}

export function validateConfig(input: unknown): PartyOpsConfig {
  if (!isPlainObject(input)) {
    return {
      debugEnabled: DEFAULT_PARTY_OPS_CONFIG.debugEnabled,
      lootScarcity: DEFAULT_PARTY_OPS_CONFIG.lootScarcity,
      rarityWeights: { ...DEFAULT_PARTY_OPS_CONFIG.rarityWeights },
      crGoldMultiplier: DEFAULT_PARTY_OPS_CONFIG.crGoldMultiplier
    };
  }

  return {
    debugEnabled: Boolean(input.debugEnabled),
    lootScarcity: normalizeScarcityLevel(input.lootScarcity, DEFAULT_PARTY_OPS_CONFIG.lootScarcity),
    rarityWeights: normalizeRarityWeights(input.rarityWeights, DEFAULT_PARTY_OPS_CONFIG.rarityWeights),
    crGoldMultiplier: toPositiveNumberOrFallback(input.crGoldMultiplier, DEFAULT_PARTY_OPS_CONFIG.crGoldMultiplier)
  };
}
