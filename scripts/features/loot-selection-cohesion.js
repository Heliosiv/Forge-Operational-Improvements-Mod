function normalizeText(value = "") {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeList(values = []) {
  return (Array.isArray(values) ? values : []).map((entry) => normalizeText(entry)).filter(Boolean);
}

function normalizeVariableTreasureKind(value = "") {
  const normalized = normalizeText(value);
  if (normalized === "gem" || normalized === "gems" || normalized === "gemstone" || normalized === "gemstones")
    return "gem";
  if (
    normalized === "art" ||
    normalized === "art-item" ||
    normalized === "art-items" ||
    normalized === "art-object" ||
    normalized === "art-objects"
  )
    return "art";
  return "";
}

function randomIntInclusive(min = 1, max = 1, randomFn = Math.random) {
  const low = Math.max(0, Math.floor(Number(min) || 0));
  const high = Math.max(low, Math.floor(Number(max) || 0));
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  return low + Math.floor(random() * (high - low + 1));
}

function getChallengeQuantityBand(challenge = "mid", kind = "ammo") {
  const normalizedChallenge = normalizeText(challenge) || "mid";
  if (kind === "ammo") {
    if (normalizedChallenge === "low") return [4, 12];
    if (normalizedChallenge === "high") return [10, 30];
    if (normalizedChallenge === "epic") return [14, 45];
    return [6, 20];
  }
  if (kind === "treasure") {
    if (normalizedChallenge === "low") return [1, 2];
    if (normalizedChallenge === "high") return [3, 7];
    if (normalizedChallenge === "epic") return [5, 10];
    return [2, 5];
  }
  if (kind === "supply") {
    if (normalizedChallenge === "low") return [1, 3];
    if (normalizedChallenge === "high") return [3, 9];
    if (normalizedChallenge === "epic") return [5, 12];
    return [2, 6];
  }
  return [1, 1];
}

function applyChallengeStackScaling(quantity = 1, kind = "", draft = {}, entry = {}) {
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const challenge = normalizeText(draft?.challenge) || "mid";
  const multipliers = {
    low: { ammo: 0.65, treasure: 0.6, supply: 0.7 },
    mid: { ammo: 1, treasure: 1, supply: 1 },
    high: { ammo: 1.18, treasure: 1.15, supply: 1.12 },
    epic: { ammo: 1.32, treasure: 1.28, supply: 1.2 }
  };
  const byChallenge = multipliers[challenge] ?? multipliers.mid;
  const scaled = Math.max(1, Math.floor(safeQuantity * Number(byChallenge?.[kind] ?? 1)));

  const magicLike = isMagicLike(entry);
  if (magicLike && challenge === "low" && kind !== "ammo") {
    return 1;
  }
  if (magicLike && challenge === "mid" && kind !== "ammo") {
    return Math.max(1, Math.floor(scaled * 0.85));
  }
  return scaled;
}

function getPrimaryCategory(entry = {}) {
  return normalizeList(entry?.merchantCategories)[0] ?? "";
}

function isMagicLike(entry = {}) {
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    categories.has("magic") ||
    keywords.has("merchant.magic") ||
    keywords.has("loot.weapon.magic") ||
    keywords.has("loot.equipment.magic") ||
    normalizeText(entry?.rarity) === "legendary" ||
    normalizeText(entry?.rarity) === "veryrare" ||
    normalizeText(entry?.rarity) === "very-rare"
  );
}

function isContainerLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "container" || itemType === "backpack") return true;
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    categories.has("container") ||
    categories.has("storage") ||
    keywords.has("loot.container") ||
    keywords.has("merchant.container") ||
    keywords.has("merchant.storage") ||
    keywords.has("foundrytype.container")
  );
}

function isAmmoLike(entry = {}) {
  if (isContainerLike(entry) || isQuiverLike(entry)) return false;
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "ammunition" || itemType === "ammo") return true;
  const name = normalizeText(entry?.name);
  return (
    /\barrows?\b/.test(name) || /\bbolts?\b/.test(name) || /\bbullets?\b/.test(name) || /\bsling stones?\b/.test(name)
  );
}

function isRangedWeaponLike(entry = {}) {
  const name = normalizeText(entry?.name);
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    /\bbow\b/.test(name) ||
    /\bcrossbow\b/.test(name) ||
    /\bsling\b/.test(name) ||
    keywords.has("prop.amm") ||
    normalizeText(entry?.subtype).endsWith("r")
  );
}

function isQuiverLike(entry = {}) {
  const name = normalizeText(entry?.name);
  return (
    /\bquiver\b/.test(name) || /\bbolt case\b/.test(name) || /\bammo pouch\b/.test(name) || /\barrow case\b/.test(name)
  );
}

function getAmmoToken(entry = {}) {
  const name = normalizeText(entry?.name);
  if (/\bcrossbow\b/.test(name) || /\bbolts?\b/.test(name)) return "bolt";
  if (/\bsling\b/.test(name) || /\bbullets?\b/.test(name) || /\bstones?\b/.test(name)) return "bullet";
  if (/\bbow\b/.test(name) || /\barrows?\b/.test(name)) return "arrow";
  return "";
}

function matchesAmmoToken(entry = {}, token = "") {
  const normalizedToken = normalizeText(token);
  if (!normalizedToken) return false;
  const name = normalizeText(entry?.name);
  if (normalizedToken === "arrow") return /\barrows?\b/.test(name);
  if (normalizedToken === "bolt") return /\bbolts?\b/.test(name) || /\bcrossbow bolts?\b/.test(name);
  if (normalizedToken === "bullet") return /\bbullets?\b/.test(name) || /\bsling stones?\b/.test(name);
  return false;
}

function isToolLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    itemType === "tool" ||
    categories.has("tool") ||
    categories.has("kit") ||
    keywords.has("merchant.tool") ||
    keywords.has("merchant.kit")
  );
}

function isConsumableLike(entry = {}) {
  return normalizeText(entry?.itemType) === "consumable";
}

function isUtilityConsumableLike(entry = {}) {
  if (!isConsumableLike(entry)) return false;
  const name = normalizeText(entry?.name);
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    /\bhealing\b/.test(name) ||
    /\bantitoxin\b/.test(name) ||
    /\balchemist'?s fire\b/.test(name) ||
    /\bholy water\b/.test(name) ||
    /\bacid\b/.test(name) ||
    /\boil\b/.test(name) ||
    /\brations?\b/.test(name) ||
    /\bwaterskin\b/.test(name) ||
    /\bscroll\b/.test(name) ||
    categories.has("alchemy") ||
    categories.has("survival") ||
    keywords.has("merchant.alchemy") ||
    keywords.has("merchant.survival") ||
    keywords.has("healing")
  );
}

function isPracticalSupportGearLike(entry = {}) {
  if (isContainerLike(entry) || isQuiverLike(entry)) return true;
  const itemType = normalizeText(entry?.itemType);
  const name = normalizeText(entry?.name);
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    itemType === "equipment" ||
    itemType === "backpack" ||
    /\brope\b/.test(name) ||
    /\btorch\b/.test(name) ||
    /\bbedroll\b/.test(name) ||
    /\bgrappling hook\b/.test(name) ||
    /\bcrowbar\b/.test(name) ||
    /\bpitons?\b/.test(name) ||
    /\bwaterskin\b/.test(name) ||
    categories.has("outfitting") ||
    categories.has("survival") ||
    keywords.has("merchant.outfitting") ||
    keywords.has("merchant.survival")
  );
}

function isHealingConsumableLike(entry = {}) {
  if (!isConsumableLike(entry)) return false;
  const name = normalizeText(entry?.name);
  const keywords = new Set(normalizeList(entry?.keywords));
  return /\bhealing\b/.test(name) || /\bpotion of healing\b/.test(name) || keywords.has("healing");
}

function isAmmoSupportLike(entry = {}) {
  const name = normalizeText(entry?.name);
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return (
    isQuiverLike(entry) ||
    /\bpowder horn\b/.test(name) ||
    /\bshot pouch\b/.test(name) ||
    /\bammo pouch\b/.test(name) ||
    categories.has("storage") ||
    keywords.has("merchant.storage")
  );
}

function getNameTokens(entry = {}) {
  return new Set(
    normalizeText(entry?.name)
      .split(/[^a-z0-9]+/u)
      .filter((token) => token.length >= 3)
  );
}

function countNameOverlap(anchor = {}, candidate = {}) {
  const anchorTokens = getNameTokens(anchor);
  if (!anchorTokens.size) return 0;
  let overlap = 0;
  for (const token of getNameTokens(candidate)) {
    if (anchorTokens.has(token)) overlap += 1;
  }
  return overlap;
}

function getCompanionAffinity(anchor = {}, candidate = {}) {
  let affinity = 0;
  const sharedTags = countSharedTags(anchor, candidate);
  const sharedNameTokens = countNameOverlap(anchor, candidate);
  const primaryCategory = getPrimaryCategory(anchor);
  const candidatePrimaryCategory = getPrimaryCategory(candidate);

  if (isRangedWeaponLike(anchor)) {
    const ammoToken = getAmmoToken(anchor);
    if (isAmmoLike(candidate) && (!ammoToken || matchesAmmoToken(candidate, ammoToken))) affinity += 40;
    if (isAmmoSupportLike(candidate) && !isAmmoLike(candidate)) affinity += 24;
  }

  if (isAmmoLike(anchor)) {
    if (isAmmoSupportLike(candidate) && !isAmmoLike(candidate)) affinity += 34;
  }

  if (isToolLike(anchor)) {
    if (isUtilityConsumableLike(candidate)) affinity += 28;
    if (isPracticalSupportGearLike(candidate)) affinity += 20;
    if (isToolLike(candidate)) affinity += 10;
  }

  if (isPracticalSupportGearLike(anchor)) {
    if (isToolLike(candidate)) affinity += 20;
    if (isUtilityConsumableLike(candidate)) affinity += 18;
    if (isPracticalSupportGearLike(candidate) && !isContainerLike(candidate)) affinity += 12;
    if (isContainerLike(anchor) && isPracticalSupportGearLike(candidate) && !isContainerLike(candidate)) affinity += 10;
  }

  if (isUtilityConsumableLike(anchor)) {
    if (isHealingConsumableLike(anchor) && isHealingConsumableLike(candidate)) affinity += 18;
    else if (isUtilityConsumableLike(candidate)) affinity += 14;
    if (isPracticalSupportGearLike(candidate)) affinity += 10;
  }

  if (primaryCategory && candidatePrimaryCategory === primaryCategory) affinity += 8;
  affinity += sharedTags * 2;
  affinity += sharedNameTokens * 3;

  const candidateValue = Math.max(0, Number(candidate?.itemValueGp ?? 0) || 0);
  if (candidateValue > 0) {
    if (candidateValue <= 5) affinity += 4;
    else if (candidateValue <= 25) affinity += 2;
    else if (candidateValue >= 100) affinity -= 3;
  }

  return affinity;
}

function countSharedTags(anchor = {}, candidate = {}) {
  const anchorTags = new Set([...normalizeList(anchor?.merchantCategories), ...normalizeList(anchor?.keywords)]);
  let overlap = 0;
  for (const tag of [...normalizeList(candidate?.merchantCategories), ...normalizeList(candidate?.keywords)]) {
    if (anchorTags.has(tag)) overlap += 1;
  }
  return overlap;
}

function getConsumableBatchBonus(entry = {}) {
  if (!isUtilityConsumableLike(entry)) return 1;
  const name = normalizeText(entry?.name);
  if (/\bhealing\b/.test(name) || /\bpotion\b/.test(name)) return 1.25;
  if (/\bscroll\b/.test(name)) return 0.85;
  return 1.12;
}

function canBatchPrimaryEntry(entry = {}) {
  const kind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  if (isAmmoLike(entry)) return "ammo";
  if (kind === "gem" || kind === "art") return "treasure";
  const itemType = normalizeText(entry?.itemType);
  const value = Math.max(0, Number(entry?.itemValueGp ?? 0) || 0);
  if ((itemType === "consumable" || itemType === "loot") && value > 0 && value <= 10 && !isMagicLike(entry))
    return "supply";
  return "";
}

function capBundledQuantity(quantity = 1, kind = "", draft = {}) {
  const mode = normalizeText(draft?.mode) || "horde";
  const scale = normalizeText(draft?.scale) || "medium";
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  if (mode !== "horde" || scale !== "major") return safeQuantity;
  if (kind === "ammo") return Math.min(safeQuantity, 8);
  if (kind === "treasure") return Math.min(safeQuantity, 2);
  if (kind === "supply") return Math.min(safeQuantity, 2);
  return safeQuantity;
}

function resolvePrimaryQuantity(entry = {}, budgetRemainingGp = 0, draft = {}, randomFn = Math.random) {
  const bundleKind = canBatchPrimaryEntry(entry);
  const unitValueGp = Math.max(0, Number(entry?.itemValueGp ?? 0) || 0);
  if (!bundleKind || unitValueGp <= 0 || budgetRemainingGp < unitValueGp) return 1;
  const maxAffordable = Math.max(1, Math.floor(budgetRemainingGp / Math.max(0.0001, unitValueGp)));
  if (maxAffordable <= 1) return 1;

  // Use specialized ammo logic with enhancement-level stacking penalties
  if (bundleKind === "ammo") {
    return resolveAmmoQuantity(entry, budgetRemainingGp, draft, randomFn);
  }

  const challenge = normalizeText(draft?.challenge) || "mid";
  const [minQty, maxQty] = getChallengeQuantityBand(challenge, bundleKind);
  const rolledQuantity = Math.max(1, Math.min(maxAffordable, randomIntInclusive(minQty, maxQty, randomFn)));
  let quantity = applyChallengeStackScaling(rolledQuantity, bundleKind, draft, entry);
  if (bundleKind === "supply") {
    quantity = Math.max(1, Math.floor(quantity * getConsumableBatchBonus(entry)));
  }
  return capBundledQuantity(quantity, bundleKind, draft);
}

function findCompanionCandidate(anchor = {}, pool = [], selected = [], budgetRemainingGp = 0) {
  if (budgetRemainingGp <= 0) return null;
  const rows = Array.isArray(pool) ? pool : [];
  const selectedKeys = new Set(
    (Array.isArray(selected) ? selected : []).map((entry) => normalizeText(entry?.uuid || entry?.name))
  );
  const ammoToken = getAmmoToken(anchor);

  const affordable = rows.filter((candidate) => {
    const value = Math.max(0, Number(candidate?.itemValueGp ?? 0) || 0);
    if (value <= 0 || value > budgetRemainingGp) return false;
    const key = normalizeText(candidate?.uuid || candidate?.name);
    return key ? !selectedKeys.has(key) : true;
  });

  if (isAmmoLike(anchor)) {
    return (
      affordable
        .filter((candidate) => isQuiverLike(candidate) && !isMagicLike(candidate))
        .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null
    );
  }

  if (isRangedWeaponLike(anchor)) {
    const ammoCandidate =
      affordable
        .filter((candidate) => isAmmoLike(candidate) && (!ammoToken || matchesAmmoToken(candidate, ammoToken)))
        .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null;
    if (ammoCandidate) return ammoCandidate;
    return (
      affordable
        .filter((candidate) => isQuiverLike(candidate) && !isMagicLike(candidate))
        .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null
    );
  }

  const scored = affordable
    .map((candidate) => {
      return { candidate, affinity: getCompanionAffinity(anchor, candidate) };
    })
    .filter((entry) => entry.affinity > 0)
    .sort((left, right) => {
      if (right.affinity !== left.affinity) return right.affinity - left.affinity;
      return Number(left.candidate?.itemValueGp ?? 0) - Number(right.candidate?.itemValueGp ?? 0);
    });

  if (scored.length > 0) return scored[0].candidate;

  const primaryCategory = getPrimaryCategory(anchor);
  if (!primaryCategory || primaryCategory === "magic" || primaryCategory === "art" || primaryCategory === "treasure")
    return null;
  return (
    affordable
      .filter(
        (candidate) =>
          getPrimaryCategory(candidate) === primaryCategory &&
          normalizeText(candidate?.uuid) !== normalizeText(anchor?.uuid)
      )
      .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null
  );
}

function shouldAddCompanion(anchor = {}, companion = {}, randomFn = Math.random) {
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  if (!companion) return false;
  if (isAmmoLike(anchor)) return random() < 0.72;
  if (isRangedWeaponLike(anchor)) return random() < 0.68;
  if (isToolLike(anchor)) return random() < 0.64;
  if (isPracticalSupportGearLike(anchor)) return random() < 0.46;
  if (isUtilityConsumableLike(anchor)) return random() < 0.36;
  return random() < 0.22;
}

/**
 * Detect enchantment/enhancement level from item.
 * Returns 0 for non-magical, 1 for +1, 2 for +2, etc.
 * Checks: name pattern (+1, +2), rarity, properties.
 */
function getEnchantmentLevel(entry = {}) {
  // Check name for +1, +2, +3, etc. pattern
  const name = normalizeText(entry?.name);
  const match = String(name).match(/\+\s*([1-9]\d*)/);
  if (match && match[1]) {
    return Math.max(0, Math.floor(Number(match[1]) || 0));
  }

  // Check rarity as proxy for enchantment
  const rarity = normalizeText(entry?.rarity ?? entry?.rarityBucket ?? "");
  if (rarity === "legendary") return 3;
  if (rarity === "very-rare" || rarity === "veryrare") return 2;
  if (rarity === "rare") return 1;

  // Check for magic property flags
  const keywords = new Set(normalizeList(entry?.keywords));
  const properties = new Set(normalizeList(entry?.properties));
  if (keywords.has("loot.weapon.magic") || properties.has("mgc")) {
    return 1; // Assume +1 if flagged as magical but no explicit level
  }

  return 0; // Not enchanted
}

/**
 * Apply ammo-specific stack bonus/penalty.
 * - Base ammo stacks normally per challenge band
 * - +1 ammo: 90% stack size (10% reduction)
 * - +2 ammo: 75% stack size (25% reduction)
 * - +3 ammo: 50% stack size (50% reduction)
 * This keeps magical ammo useful but rarer in massive stacks.
 */
function applyEnchantmentStackPenalty(quantity = 1, enchantmentLevel = 0) {
  if (enchantmentLevel <= 0) return quantity;

  const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (enchantmentLevel === 1) return Math.max(1, Math.floor(safeQty * 0.9));
  if (enchantmentLevel === 2) return Math.max(1, Math.floor(safeQty * 0.75));
  if (enchantmentLevel >= 3) return Math.max(1, Math.floor(safeQty * 0.5));

  return safeQty;
}

/**
 * Resolve ammo-specific quantities with stack bonus for mundane ammo
 * and stack penalty for enchanted ammo.
 */
function resolveAmmoQuantity(entry = {}, budgetRemainingGp = 0, draft = {}, randomFn = Math.random) {
  const unitValueGp = Math.max(0, Number(entry?.itemValueGp ?? 0) || 0);
  if (!isAmmoLike(entry) || unitValueGp <= 0 || budgetRemainingGp < unitValueGp) return 1;

  const maxAffordable = Math.max(1, Math.floor(budgetRemainingGp / Math.max(0.0001, unitValueGp)));
  if (maxAffordable <= 1) return 1;

  const challenge = normalizeText(draft?.challenge) || "mid";
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  const enchantmentLevel = getEnchantmentLevel(entry);

  if (challenge === "low") {
    if (enchantmentLevel >= 3) return 0;
    if (enchantmentLevel === 2) {
      if (random() >= 0.18) return 0;
      return capBundledQuantity(1, "ammo", draft);
    }
    if (enchantmentLevel === 1) {
      const lowMagicQty = Math.max(1, Math.min(maxAffordable, randomIntInclusive(1, 3, random)));
      return capBundledQuantity(lowMagicQty, "ammo", draft);
    }
  }

  const [minQty, maxQty] = getChallengeQuantityBand(challenge, "ammo");
  let quantity = Math.max(1, Math.min(maxAffordable, randomIntInclusive(minQty, maxQty, random)));

  // Apply enhancement-level penalty for magical ammo
  quantity = applyEnchantmentStackPenalty(quantity, enchantmentLevel);
  quantity = applyChallengeStackScaling(quantity, "ammo", draft, entry);

  // Cap final quantity per horde scale rules
  return capBundledQuantity(quantity, "ammo", draft);
}

function resolveCompanionQuantity(
  _anchor = {},
  companion = {},
  budgetRemainingGp = 0,
  draft = {},
  randomFn = Math.random
) {
  const unitValueGp = Math.max(0, Number(companion?.itemValueGp ?? 0) || 0);
  if (unitValueGp <= 0 || budgetRemainingGp < unitValueGp) return 1;
  if (isAmmoLike(companion)) {
    return resolveAmmoQuantity(companion, budgetRemainingGp, draft, randomFn);
  }
  return 1;
}

export function buildLootCohesiveBundle(anchor = {}, options = {}) {
  const random = typeof options?.random === "function" ? options.random : Math.random;
  const draft = options?.draft ?? {};
  const pool = Array.isArray(options?.pool) ? options.pool : [];
  const selected = Array.isArray(options?.selected) ? options.selected : [];
  let remainingGp = Math.max(0, Number(options?.budgetRemainingGp ?? 0) || 0);
  const rows = [];

  const primaryQuantity = resolvePrimaryQuantity(anchor, remainingGp, draft, random);
  rows.push({ candidate: anchor, quantity: primaryQuantity, reason: primaryQuantity > 1 ? "batch" : "single" });
  remainingGp = Math.max(0, remainingGp - Math.max(0, Number(anchor?.itemValueGp ?? 0) || 0) * primaryQuantity);

  const companion = findCompanionCandidate(anchor, pool, selected, remainingGp);
  if (!companion || !shouldAddCompanion(anchor, companion, random)) return rows;
  const companionQuantity = resolveCompanionQuantity(anchor, companion, remainingGp, draft, random);
  rows.push({ candidate: companion, quantity: companionQuantity, reason: "companion" });
  return rows;
}
