import { buildBoardReadyLootBundle } from "./loot-claim-bundle.js";

const VALID_LOCK_STATES = new Set(["open", "locked", "claimed"]);
const VALID_RARITIES = new Set(["common", "uncommon", "rare", "very-rare", "legendary", "artifact", ""]);

/**
 * Validates a board-ready loot bundle for structural correctness.
 * Checks both the root envelope and each individual item entry.
 *
 * @param {object} bundle
 * @returns {{ ok: boolean, errors: string[] }}
 */
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
  if (bundle.audit && !Array.isArray(bundle.audit.constraintChecks)) {
    errors.push("audit.constraintChecks must be an array");
  }

  // Validate individual item entries when items is a valid array
  if (Array.isArray(bundle.items)) {
    for (let i = 0; i < bundle.items.length; i++) {
      const item = bundle.items[i];
      const prefix = `items[${i}]`;
      if (!item || typeof item !== "object") {
        errors.push(`${prefix}: must be an object`);
        continue;
      }
      if (!item.itemId || typeof item.itemId !== "string") {
        errors.push(`${prefix}.itemId must be a non-empty string`);
      }
      if (typeof item.displayName !== "string" || !item.displayName.trim()) {
        errors.push(`${prefix}.displayName must be a non-empty string`);
      }
      if (typeof item.estimatedValueGp !== "number" || item.estimatedValueGp < 0) {
        errors.push(`${prefix}.estimatedValueGp must be a non-negative number`);
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        errors.push(`${prefix}.quantity must be a positive integer`);
      }
      if (!Number.isInteger(item.quantityRemaining) || item.quantityRemaining < 0) {
        errors.push(`${prefix}.quantityRemaining must be a non-negative integer`);
      }
      if (item.lockState !== undefined && !VALID_LOCK_STATES.has(item.lockState)) {
        errors.push(`${prefix}.lockState must be one of: ${[...VALID_LOCK_STATES].join(", ")}`);
      }
      if (item.rarity !== undefined && !VALID_RARITIES.has(String(item.rarity ?? "").toLowerCase())) {
        errors.push(`${prefix}.rarity "${item.rarity}" is not a recognized rarity`);
      }
      if (typeof item.isClaimed !== "boolean") {
        errors.push(`${prefix}.isClaimed must be a boolean`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

/**
 * Generates a board-ready loot bundle from a draft input.
 * Accepts an optional `generatePayload` factory so the monolith's real engine
 * can be injected at runtime (dependency-injection bridge for Phase 3).
 *
 * @param {object} draftInput
 * @param {{ generatePayload?: (draft: object) => Promise<object> }} options
 * @returns {Promise<object>}
 */
export async function generateBoardReadyLootBundle(draftInput = {}, options = {}) {
  const generatePayload = typeof options?.generatePayload === "function" ? options.generatePayload : null;

  let payload;
  if (generatePayload) {
    // Phase 3: delegate to the injected real engine
    const result = await generatePayload(draftInput);
    // Wrap legacy preview payload into the board-ready envelope if needed
    payload = buildBoardReadyLootBundle({
      ...draftInput,
      items: result?.items ?? [],
      currency: result?.currency ?? {},
      stats: result?.stats ?? {},
      warnings: result?.warnings ?? [],
      audit: result?.audit ?? {},
      status: result?.status ?? "ok"
    });
  } else {
    // Stub path: pass the draft through to get a valid envelope structure
    payload = buildBoardReadyLootBundle(draftInput);
  }

  const validation = validateBoardReadyLootBundle(payload);

  if (!validation.ok) {
    payload.warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
    payload.warnings.push(...validation.errors);
    if (payload.audit && Array.isArray(payload.audit.constraintChecks)) {
      payload.audit.constraintChecks.push({
        name: "board-ready-validation",
        ok: false,
        errorCount: validation.errors.length,
        timestamp: Date.now()
      });
    }
  }

  return payload;
}

/**
 * Compatibility shim for existing UI components during the V1 → V2 transition.
 * Accepts the same `options` as `generateBoardReadyLootBundle` so callers can
 * inject the real engine without changing their call sites.
 *
 * @param {object} draftInput
 * @param {{ generatePayload?: (draft: object) => Promise<object> }} options
 * @returns {Promise<object>}
 */
export async function generateLootPreviewPayload(draftInput = {}, options = {}) {
  const bundle = await generateBoardReadyLootBundle(draftInput, options);

  // Return a flat preview-style object that the existing UI templates expect.
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
    audit: bundle.audit,
    status: bundle.status
  };
}
