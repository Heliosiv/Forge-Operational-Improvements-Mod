import { buildBoardReadyLootBundle } from "./loot-claim-bundle.js";

export function validateBoardReadyLootBundle(bundle = {}) {
  const errors = [];
  const requiredKeys = [
    "status",
    "runId",
    "generatedAt",
    "generatedBy",
    "sourceSummary",
    "currency",
    "currencyRemaining",
    "items",
    "claimsLog",
    "claimMetadata",
    "audit",
    "warnings"
  ];
  
  for (const key of requiredKeys) {
    if (!(key in bundle)) {
      errors.push(`Missing required root key: ${key}`);
    }
  }
  
  if (!bundle.runId || typeof bundle.runId !== "string") {
    errors.push("runId must be a non-empty string");
  }
  if (!Array.isArray(bundle.items)) {
    errors.push("items must be an array");
  }
  if (!Array.isArray(bundle.claimsLog)) {
    errors.push("claimsLog must be an array");
  }
  if (!bundle.claimMetadata || typeof bundle.claimMetadata !== "object") {
    errors.push("claimMetadata is required");
  }
  
  return {
    ok: errors.length === 0,
    errors
  };
}

export async function generateBoardReadyLootBundle(draftInput = {}, options = {}) {
  // We need to implement the actual generation logic here.
  // For Phase 1 & 2, we just return a board-ready bundle structure.
  // In Phase 3, we will adapt generateLootPreviewPayload to use this.
  
  const payload = buildBoardReadyLootBundle(draftInput);
  
  const validation = validateBoardReadyLootBundle(payload);
  
  if (!validation.ok) {
    payload.warnings.push(...validation.errors);
    payload.audit.constraintChecks.push({
      name: "board-ready-validation",
      ok: false,
      errorCount: validation.errors.length,
      timestamp: Date.now()
    });
  }
  
  return payload;
}

export async function generateLootPreviewPayload(draftInput = {}) {
  // Act as a compatibility layer for existing UI components during the V1 transition.
  const bundle = await generateBoardReadyLootBundle(draftInput);
  
  if (bundle.status === "failed") {
    return {
      generatedAt: bundle.generatedAt,
      generatedBy: bundle.generatedBy,
      draft: bundle.draft,
      currency: bundle.currency,
      items: bundle.items,
      tableRolls: bundle.tableRolls || [],
      stats: bundle.stats,
      meta: bundle.claimMetadata || {},
      warnings: bundle.warnings,
      audit: bundle.audit
    };
  }

  return {
    generatedAt: bundle.generatedAt,
    generatedBy: bundle.generatedBy,
    draft: bundle.draft,
    currency: bundle.currency,
    items: bundle.items,
    tableRolls: bundle.tableRolls || [],
    stats: bundle.stats,
    meta: bundle.audit?.normalizedInputs ? bundle.claimMetadata : (bundle.claimMetadata || {}),
    warnings: bundle.warnings,
    audit: bundle.audit
  };
}
