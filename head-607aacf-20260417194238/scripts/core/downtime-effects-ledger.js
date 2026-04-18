const CONTACT_TIERS = new Set(["minor", "medium", "major"]);

function clampInt(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

export function normalizeDowntimeRewardEffects(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const contactTierRaw = String(source.contactTier ?? "").trim().toLowerCase();
  return {
    discountPercent: clampInt(source.discountPercent, 0, 20),
    materialsCreditGp: clampInt(source.materialsCreditGp, 0, 10),
    heatDelta: clampInt(source.heatDelta, 0, 20),
    reputationDelta: clampInt(source.reputationDelta, -10, 10),
    contactTier: CONTACT_TIERS.has(contactTierRaw) ? contactTierRaw : ""
  };
}

export function normalizeDowntimeRewardEffectsRecord(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const contactSource = source.contactTiers && typeof source.contactTiers === "object" ? source.contactTiers : {};
  return {
    discountPercent: clampInt(source.discountPercent, 0, 20),
    materialsCreditGp: clampInt(source.materialsCreditGp, 0, 10),
    heatDelta: clampInt(source.heatDelta, 0, 20),
    reputationDelta: clampInt(source.reputationDelta, -10, 10),
    contactTiers: {
      minor: clampInt(contactSource.minor, 0, 99),
      medium: clampInt(contactSource.medium, 0, 99),
      major: clampInt(contactSource.major, 0, 99)
    },
    updatedAt: clampInt(source.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  };
}

export function normalizeDowntimeRewardEffectsLedger(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const byActorSource = source.byActor && typeof source.byActor === "object" && !Array.isArray(source.byActor)
    ? source.byActor
    : {};
  const byActor = Object.fromEntries(
    Object.entries(byActorSource)
      .map(([actorId, record]) => [String(actorId ?? "").trim(), normalizeDowntimeRewardEffectsRecord(record)])
      .filter(([actorId]) => actorId)
  );
  return {
    byActor
  };
}

export function applyDowntimeRewardEffectsToLedger(rawLedger = {}, actorId = "", rawEffects = {}, now = Date.now()) {
  const normalizedActorId = String(actorId ?? "").trim();
  const ledger = normalizeDowntimeRewardEffectsLedger(rawLedger);
  if (!normalizedActorId) {
    return {
      ledger,
      record: normalizeDowntimeRewardEffectsRecord({}),
      appliedDelta: normalizeDowntimeRewardEffects({})
    };
  }

  const effects = normalizeDowntimeRewardEffects(rawEffects);
  const current = normalizeDowntimeRewardEffectsRecord(ledger.byActor[normalizedActorId]);
  const next = normalizeDowntimeRewardEffectsRecord({
    discountPercent: current.discountPercent + effects.discountPercent,
    materialsCreditGp: current.materialsCreditGp + effects.materialsCreditGp,
    heatDelta: current.heatDelta + effects.heatDelta,
    reputationDelta: current.reputationDelta + effects.reputationDelta,
    contactTiers: {
      minor: current.contactTiers.minor + (effects.contactTier === "minor" ? 1 : 0),
      medium: current.contactTiers.medium + (effects.contactTier === "medium" ? 1 : 0),
      major: current.contactTiers.major + (effects.contactTier === "major" ? 1 : 0)
    },
    updatedAt: now
  });

  ledger.byActor[normalizedActorId] = next;
  return {
    ledger,
    record: next,
    appliedDelta: effects
  };
}

export function consumeDowntimeRewardEffectsForCraftingCost(rawLedger = {}, actorId = "", {
  baseGpCost = 0,
  allowDiscount = true,
  allowMaterialsCredit = true,
  now = Date.now()
} = {}) {
  const normalizedActorId = String(actorId ?? "").trim();
  const ledger = normalizeDowntimeRewardEffectsLedger(rawLedger);
  const safeBaseCost = clampInt(baseGpCost, 0, Number.MAX_SAFE_INTEGER);
  if (!normalizedActorId || safeBaseCost <= 0) {
    return {
      ledger,
      record: normalizeDowntimeRewardEffectsRecord(ledger.byActor[normalizedActorId]),
      baseGpCost: safeBaseCost,
      effectiveGpCost: safeBaseCost,
      consumed: {
        discountPercent: 0,
        discountGp: 0,
        materialsCreditGp: 0
      }
    };
  }

  const current = normalizeDowntimeRewardEffectsRecord(ledger.byActor[normalizedActorId]);
  const discountPercentAvailable = allowDiscount ? clampInt(current.discountPercent, 0, 20) : 0;
  const discountGpRaw = Math.floor((safeBaseCost * discountPercentAvailable) / 100);
  const discountGp = Math.max(0, Math.min(safeBaseCost, discountGpRaw));
  const discountPercentConsumed = discountGp > 0 ? discountPercentAvailable : 0;
  const afterDiscountCost = Math.max(0, safeBaseCost - discountGp);
  const materialsAvailable = allowMaterialsCredit ? clampInt(current.materialsCreditGp, 0, 10) : 0;
  const materialsUsed = Math.max(0, Math.min(afterDiscountCost, materialsAvailable));
  const effectiveGpCost = Math.max(0, afterDiscountCost - materialsUsed);

  const next = normalizeDowntimeRewardEffectsRecord({
    ...current,
    discountPercent: Math.max(0, current.discountPercent - discountPercentConsumed),
    materialsCreditGp: Math.max(0, current.materialsCreditGp - materialsUsed),
    updatedAt: now
  });
  ledger.byActor[normalizedActorId] = next;

  return {
    ledger,
    record: next,
    baseGpCost: safeBaseCost,
    effectiveGpCost,
    consumed: {
      discountPercent: discountPercentConsumed,
      discountGp,
      materialsCreditGp: materialsUsed
    }
  };
}

export function summarizeDowntimeRewardEffectsRecord(value = {}) {
  const record = normalizeDowntimeRewardEffectsRecord(value);
  const parts = [];
  if (record.discountPercent > 0) parts.push(`discount ${record.discountPercent}%`);
  if (record.materialsCreditGp > 0) parts.push(`materials credit ${record.materialsCreditGp} gp`);
  if (record.heatDelta > 0) parts.push(`heat ${record.heatDelta}`);
  if (record.reputationDelta !== 0) parts.push(`reputation ${record.reputationDelta > 0 ? "+" : ""}${record.reputationDelta}`);
  if (record.contactTiers.minor > 0) parts.push(`minor contacts ${record.contactTiers.minor}`);
  if (record.contactTiers.medium > 0) parts.push(`medium contacts ${record.contactTiers.medium}`);
  if (record.contactTiers.major > 0) parts.push(`major contacts ${record.contactTiers.major}`);
  return parts.length > 0 ? parts.join(" | ") : "No stored reward effects.";
}
