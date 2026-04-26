import assert from "node:assert/strict";
import { validateBoardReadyLootBundle } from "./features/loot-builder.js";

const validBundle = {
  status: "ok",
  runId: "run-1",
  generatedAt: Date.now(),
  generatedBy: "GM",
  sourceSummary: { precedence: ["module", "world", "compendium"] },
  currency: { pp: 0, gp: 10, sp: 0, cp: 0 },
  currencyRemaining: { pp: 0, gp: 10, sp: 0, cp: 0 },
  items: [
    {
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
      isClaimed: false
    }
  ],
  claimsLog: [],
  claimMetadata: { boardReady: true },
  audit: {
    constraintChecks: [],
    relaxationSteps: [],
    sourceSelections: [],
    warnings: []
  },
  warnings: []
};

const validResult = validateBoardReadyLootBundle(validBundle);
assert.equal(validResult.ok, true);
assert.equal(Array.isArray(validResult.errors), true);
assert.equal(validResult.errors.length, 0);

const invalidBundle = {
  status: "ok",
  runId: "",
  generatedAt: 0,
  generatedBy: "GM",
  sourceSummary: { precedence: [] },
  currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
  currencyRemaining: { pp: 0, gp: 0, sp: 0, cp: 0 },
  items: [
    {
      itemId: "",
      sourceId: "",
      displayName: "",
      image: "",
      rarity: "",
      estimatedValueGp: -1,
      quantity: -1,
      quantityRemaining: -1,
      runId: "other-run",
      lockState: "",
      lockExpiresAt: -1,
      createdAt: -1,
      isClaimed: "no"
    }
  ],
  claimsLog: {},
  claimMetadata: null,
  audit: {
    constraintChecks: "bad",
    relaxationSteps: [],
    sourceSelections: [],
    warnings: []
  },
  warnings: []
};

const invalidResult = validateBoardReadyLootBundle(invalidBundle);
assert.equal(invalidResult.ok, false);
assert.equal(
  invalidResult.errors.some((entry) => entry.includes("runId")),
  true
);
assert.equal(
  invalidResult.errors.some((entry) => entry.includes("claimsLog must be an array")),
  true
);
assert.equal(
  invalidResult.errors.some((entry) => entry.includes("claimMetadata is required")),
  true
);

process.stdout.write("board-ready loot bundle validation passed\n");
