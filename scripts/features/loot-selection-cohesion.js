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

function randomIntInclusive(min = 1, max = 1, randomFn = Math.random) {
  const low = Math.max(0, Math.floor(Number(min) || 0));
  const high = Math.max(low, Math.floor(Number(max) || 0));
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  return low + Math.floor(random() * ((high - low) + 1));
}

function getChallengeQuantityBand(challenge = "mid", kind = "ammo") {
  const normalizedChallenge = normalizeText(challenge) || "mid";
  if (kind === "ammo") {
    if (normalizedChallenge === "low") return [5, 16];
    if (normalizedChallenge === "high") return [8, 28];
    if (normalizedChallenge === "epic") return [12, 40];
    return [6, 20];
  }
  if (kind === "treasure") {
    if (normalizedChallenge === "low") return [2, 4];
    if (normalizedChallenge === "high") return [3, 6];
    if (normalizedChallenge === "epic") return [4, 8];
    return [2, 5];
  }
  if (kind === "supply") {
    if (normalizedChallenge === "low") return [2, 4];
    if (normalizedChallenge === "high") return [3, 8];
    if (normalizedChallenge === "epic") return [4, 10];
    return [2, 6];
  }
  return [1, 1];
}

function getPrimaryCategory(entry = {}) {
  return normalizeList(entry?.merchantCategories)[0] ?? "";
}

function isMagicLike(entry = {}) {
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return categories.has("magic")
    || keywords.has("merchant.magic")
    || keywords.has("loot.weapon.magic")
    || keywords.has("loot.equipment.magic")
    || normalizeText(entry?.rarity) === "legendary"
    || normalizeText(entry?.rarity) === "veryrare"
    || normalizeText(entry?.rarity) === "very-rare";
}

function isContainerLike(entry = {}) {
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "container" || itemType === "backpack") return true;
  const categories = new Set(normalizeList(entry?.merchantCategories));
  const keywords = new Set(normalizeList(entry?.keywords));
  return categories.has("container")
    || categories.has("storage")
    || keywords.has("loot.container")
    || keywords.has("merchant.container")
    || keywords.has("merchant.storage")
    || keywords.has("foundrytype.container");
}

function isAmmoLike(entry = {}) {
  if (isContainerLike(entry) || isQuiverLike(entry)) return false;
  const itemType = normalizeText(entry?.itemType);
  if (itemType === "ammunition" || itemType === "ammo") return true;
  const name = normalizeText(entry?.name);
  return /\barrows?\b/.test(name)
    || /\bbolts?\b/.test(name)
    || /\bbullets?\b/.test(name)
    || /\bsling stones?\b/.test(name);
}

function isRangedWeaponLike(entry = {}) {
  const name = normalizeText(entry?.name);
  const keywords = new Set(normalizeList(entry?.keywords));
  return /\bbow\b/.test(name)
    || /\bcrossbow\b/.test(name)
    || /\bsling\b/.test(name)
    || keywords.has("prop.amm")
    || normalizeText(entry?.subtype).endsWith("r");
}

function isQuiverLike(entry = {}) {
  const name = normalizeText(entry?.name);
  return /\bquiver\b/.test(name)
    || /\bbolt case\b/.test(name)
    || /\bammo pouch\b/.test(name)
    || /\barrow case\b/.test(name);
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

function canBatchPrimaryEntry(entry = {}) {
  const kind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  if (isAmmoLike(entry)) return "ammo";
  if (kind === "gem" || kind === "art") return "treasure";
  const itemType = normalizeText(entry?.itemType);
  const value = Math.max(0, Number(entry?.itemValueGp ?? 0) || 0);
  if ((itemType === "consumable" || itemType === "loot") && value > 0 && value <= 10 && !isMagicLike(entry)) return "supply";
  return "";
}

function capBundledQuantity(quantity = 1, kind = "", draft = {}) {
  const mode = normalizeText(draft?.mode) || "horde";
  const scale = normalizeText(draft?.scale) || "medium";
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  if (mode !== "horde" || scale !== "major") return safeQuantity;
  if (kind === "ammo") return Math.min(safeQuantity, 4);
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
  const challenge = normalizeText(draft?.challenge) || "mid";
  const [minQty, maxQty] = getChallengeQuantityBand(challenge, bundleKind);
  const quantity = Math.max(1, Math.min(maxAffordable, randomIntInclusive(minQty, maxQty, randomFn)));
  return capBundledQuantity(quantity, bundleKind, draft);
}

function findCompanionCandidate(anchor = {}, pool = [], selected = [], budgetRemainingGp = 0) {
  if (budgetRemainingGp <= 0) return null;
  const rows = Array.isArray(pool) ? pool : [];
  const selectedKeys = new Set((Array.isArray(selected) ? selected : []).map((entry) => normalizeText(entry?.uuid || entry?.name)));
  const ammoToken = getAmmoToken(anchor);

  const affordable = rows.filter((candidate) => {
    const value = Math.max(0, Number(candidate?.itemValueGp ?? 0) || 0);
    if (value <= 0 || value > budgetRemainingGp) return false;
    const key = normalizeText(candidate?.uuid || candidate?.name);
    return key ? !selectedKeys.has(key) : true;
  });

  if (isAmmoLike(anchor)) {
    return affordable
      .filter((candidate) => isQuiverLike(candidate) && !isMagicLike(candidate))
      .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null;
  }

  if (isRangedWeaponLike(anchor)) {
    const ammoCandidate = affordable
      .filter((candidate) => isAmmoLike(candidate) && (!ammoToken || matchesAmmoToken(candidate, ammoToken)))
      .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null;
    if (ammoCandidate) return ammoCandidate;
    return affordable
      .filter((candidate) => isQuiverLike(candidate) && !isMagicLike(candidate))
      .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null;
  }

  const primaryCategory = getPrimaryCategory(anchor);
  if (!primaryCategory || primaryCategory === "magic" || primaryCategory === "art" || primaryCategory === "treasure") return null;
  return affordable
    .filter((candidate) => getPrimaryCategory(candidate) === primaryCategory && normalizeText(candidate?.uuid) !== normalizeText(anchor?.uuid))
    .sort((left, right) => Number(left?.itemValueGp ?? 0) - Number(right?.itemValueGp ?? 0))[0] ?? null;
}

function shouldAddCompanion(anchor = {}, companion = {}, randomFn = Math.random) {
  const random = typeof randomFn === "function" ? randomFn : Math.random;
  if (!companion) return false;
  if (isAmmoLike(anchor)) return random() < 0.72;
  if (isRangedWeaponLike(anchor)) return random() < 0.68;
  return random() < 0.22;
}

function resolveCompanionQuantity(anchor = {}, companion = {}, budgetRemainingGp = 0, draft = {}, randomFn = Math.random) {
  const unitValueGp = Math.max(0, Number(companion?.itemValueGp ?? 0) || 0);
  if (unitValueGp <= 0 || budgetRemainingGp < unitValueGp) return 1;
  if (isAmmoLike(companion)) {
    const maxAffordable = Math.max(1, Math.floor(budgetRemainingGp / Math.max(0.0001, unitValueGp)));
    const challenge = normalizeText(draft?.challenge) || "mid";
    const [minQty, maxQty] = getChallengeQuantityBand(challenge, "ammo");
    const quantity = Math.max(1, Math.min(maxAffordable, randomIntInclusive(minQty, maxQty, randomFn)));
    return capBundledQuantity(quantity, "ammo", draft);
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
  remainingGp = Math.max(0, remainingGp - (Math.max(0, Number(anchor?.itemValueGp ?? 0) || 0) * primaryQuantity));

  const companion = findCompanionCandidate(anchor, pool, selected, remainingGp);
  if (!companion || !shouldAddCompanion(anchor, companion, random)) return rows;
  const companionQuantity = resolveCompanionQuantity(anchor, companion, remainingGp, draft, random);
  rows.push({ candidate: companion, quantity: companionQuantity, reason: "companion" });
  return rows;
}
