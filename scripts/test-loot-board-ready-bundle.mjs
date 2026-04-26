import assert from "node:assert/strict";
import { validateBoardReadyLootBundle } from "./features/loot-builder.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeValidItem(overrides = {}) {
  return {
    itemId: "item-1",
    sourceId: "source-1",
    displayName: "Potion of Healing",
    image: "icons/potion.webp",
    rarity: "common",
    estimatedValueGp: 50,
    quantity: 1,
    quantityRemaining: 1,
    runId: "run-1",
    lockState: "open",
    lockExpiresAt: 0,
    createdAt: Date.now(),
    isClaimed: false,
    ...overrides
  };
}

function makeValidBundle(overrides = {}) {
  return {
    status: "ok",
    runId: "run-1",
    generatedAt: Date.now(),
    generatedBy: "GM",
    sourceSummary: { precedence: ["module", "world", "compendium"] },
    currency: { pp: 0, gp: 10, sp: 0, cp: 0 },
    currencyRemaining: { pp: 0, gp: 10, sp: 0, cp: 0 },
    items: [makeValidItem()],
    claimsLog: [],
    claimMetadata: { boardReady: true },
    audit: {
      constraintChecks: [],
      relaxationSteps: [],
      sourceSelections: [],
      warnings: []
    },
    warnings: [],
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Test: valid bundle passes
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle(makeValidBundle());
  assert.equal(result.ok, true, "valid bundle should pass");
  assert.equal(result.errors.length, 0, "valid bundle should have no errors");
}

// ---------------------------------------------------------------------------
// Test: valid bundle with zero items passes
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle(makeValidBundle({ items: [] }));
  assert.equal(result.ok, true, "empty items array should pass");
}

// ---------------------------------------------------------------------------
// Test: missing root keys are reported
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle({});
  assert.equal(result.ok, false, "empty object should fail");
  assert.ok(
    result.errors.some((e) => e.includes("runId")),
    "should report missing runId"
  );
  assert.ok(
    result.errors.some((e) => e.includes("items")),
    "should report missing items"
  );
}

// ---------------------------------------------------------------------------
// Test: invalid root fields
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle(makeValidBundle({ runId: "", claimsLog: {}, claimMetadata: null }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("runId must be a non-empty string")));
  assert.ok(result.errors.some((e) => e.includes("claimsLog must be an array")));
  assert.ok(result.errors.some((e) => e.includes("claimMetadata is required")));
}

// ---------------------------------------------------------------------------
// Test: invalid audit.constraintChecks
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle(
    makeValidBundle({ audit: { constraintChecks: "bad", relaxationSteps: [], sourceSelections: [], warnings: [] } })
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("audit.constraintChecks must be an array")));
}

// ---------------------------------------------------------------------------
// Test: invalid item fields are caught individually
// ---------------------------------------------------------------------------
{
  const badItem = makeValidItem({
    itemId: "",
    displayName: "",
    estimatedValueGp: -1,
    quantity: 0,
    quantityRemaining: -1,
    lockState: "unknown-state",
    rarity: "mythic",
    isClaimed: "no"
  });
  const result = validateBoardReadyLootBundle(makeValidBundle({ items: [badItem] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("items[0].itemId")));
  assert.ok(result.errors.some((e) => e.includes("items[0].displayName")));
  assert.ok(result.errors.some((e) => e.includes("items[0].estimatedValueGp")));
  assert.ok(result.errors.some((e) => e.includes("items[0].quantity")));
  assert.ok(result.errors.some((e) => e.includes("items[0].quantityRemaining")));
  assert.ok(result.errors.some((e) => e.includes("items[0].lockState")));
  assert.ok(result.errors.some((e) => e.includes('items[0].rarity "mythic"')));
  assert.ok(result.errors.some((e) => e.includes("items[0].isClaimed")));
}

// ---------------------------------------------------------------------------
// Test: valid legendary rarity is allowed
// ---------------------------------------------------------------------------
{
  const result = validateBoardReadyLootBundle(makeValidBundle({ items: [makeValidItem({ rarity: "legendary" })] }));
  assert.equal(result.ok, true, "legendary rarity should be valid");
}

// ---------------------------------------------------------------------------
// Test: valid lock states are all accepted
// ---------------------------------------------------------------------------
for (const lockState of ["open", "locked", "claimed"]) {
  const result = validateBoardReadyLootBundle(makeValidBundle({ items: [makeValidItem({ lockState })] }));
  assert.equal(result.ok, true, `lockState "${lockState}" should be valid`);
}

process.stdout.write("board-ready loot bundle validation passed\n");
