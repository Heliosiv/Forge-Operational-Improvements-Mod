function normalizeVariableTreasureKind(value = "") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "gem" || normalized === "gems" || normalized === "gemstone" || normalized === "gemstones") return "gem";
  if (normalized === "art" || normalized === "art-item" || normalized === "art-items" || normalized === "art-object" || normalized === "art-objects") return "art";
  return "";
}

function roundVariableTreasureWeightLb(value = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(4));
}

function toPositiveGp(value = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number(numeric.toFixed(2));
}

function normalizeVariableTreasurePoolEntry(entry = {}) {
  const kind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  const valueGp = toPositiveGp(
    entry?.intrinsicItemValueGp
    ?? entry?.baseItemValueGp
    ?? entry?.itemValueGp
    ?? 0
  );
  const weightLb = roundVariableTreasureWeightLb(
    entry?.intrinsicItemWeightLb
    ?? entry?.baseItemWeightLb
    ?? entry?.itemWeightLb
    ?? 0
  );
  if (!kind || valueGp <= 0 || weightLb <= 0) return null;
  return { kind, valueGp, weightLb };
}

function getVariableTreasureWeightMatchWeight(targetWeightLb = 0, candidateWeightLb = 0) {
  const target = roundVariableTreasureWeightLb(targetWeightLb);
  const candidate = roundVariableTreasureWeightLb(candidateWeightLb);
  if (target <= 0 || candidate <= 0) return 0;
  const distance = Math.abs(Math.log(candidate / target));
  return Math.exp(-(distance * 3));
}

function buildWeightedVariableTreasurePool(entry = {}, pools = {}) {
  const kind = normalizeVariableTreasureKind(entry?.variableTreasureKind);
  if (!kind) return [];
  const targetWeightLb = roundVariableTreasureWeightLb(
    entry?.intrinsicItemWeightLb
    ?? entry?.baseItemWeightLb
    ?? entry?.itemWeightLb
    ?? 0
  );
  const sourcePool = Array.isArray(pools?.[kind]) ? pools[kind] : [];
  if (!sourcePool.length) return [];
  return sourcePool
    .map((option) => ({
      ...option,
      matchWeight: targetWeightLb > 0
        ? getVariableTreasureWeightMatchWeight(targetWeightLb, option.weightLb)
        : 1
    }))
    .filter((option) => option.matchWeight > 0);
}

function toOutcome(kind = "", valueGp = 0, weightLb = 0) {
  const safeValueGp = toPositiveGp(valueGp);
  const safeWeightLb = roundVariableTreasureWeightLb(weightLb);
  if (!kind || safeValueGp <= 0 || safeWeightLb <= 0) return null;
  return {
    variableTreasureKind: kind,
    itemValueGp: safeValueGp,
    itemWeightLb: safeWeightLb,
    baseItemValueGp: safeValueGp,
    baseItemWeightLb: safeWeightLb
  };
}

export function buildVariableTreasureRollPools(entries = []) {
  const pools = { gem: [], art: [] };
  for (const raw of (Array.isArray(entries) ? entries : [])) {
    const entry = normalizeVariableTreasurePoolEntry(raw);
    if (!entry) continue;
    pools[entry.kind].push(entry);
  }
  return pools;
}

export function estimateVariableTreasureOutcome(entry = {}, pools = {}) {
  const weightedPool = buildWeightedVariableTreasurePool(entry, pools);
  if (!weightedPool.length) return null;
  const totalWeight = weightedPool.reduce((sum, option) => sum + option.matchWeight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return null;
  const expectedValueGp = weightedPool.reduce((sum, option) => sum + (option.valueGp * option.matchWeight), 0) / totalWeight;
  const expectedWeightLb = weightedPool.reduce((sum, option) => sum + (option.weightLb * option.matchWeight), 0) / totalWeight;
  return toOutcome(weightedPool[0]?.kind ?? "", expectedValueGp, expectedWeightLb);
}

export function rollVariableTreasureOutcome(entry = {}, pools = {}, rng = Math.random) {
  const weightedPool = buildWeightedVariableTreasurePool(entry, pools);
  if (!weightedPool.length) return null;
  const totalWeight = weightedPool.reduce((sum, option) => sum + option.matchWeight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return null;
  const rawRandom = typeof rng === "function" ? Number(rng()) : Number.NaN;
  let roll = Math.max(0, Math.min(0.999999999999, Number.isFinite(rawRandom) ? rawRandom : Math.random())) * totalWeight;
  for (const option of weightedPool) {
    roll -= option.matchWeight;
    if (roll <= 0) return toOutcome(option.kind, option.valueGp, option.weightLb);
  }
  const fallback = weightedPool[weightedPool.length - 1];
  return toOutcome(fallback?.kind ?? "", fallback?.valueGp ?? 0, fallback?.weightLb ?? 0);
}
