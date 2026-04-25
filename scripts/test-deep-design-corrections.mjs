/**
 * Test Validation for Deep Design Corrections
 * Validates:
 * 1. GM reward controls are enabled for browsing/crafting
 * 2. New profession identities exist (street thief, performer, merchant broker)
 * 3. Complication auto-assignment triggers on high risk
 * 4. Multi-track progression foundation is in place
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const verbose = process.env.PARTY_OPS_VERBOSE_TESTS === "1";

function log(message) {
  if (verbose) process.stdout.write(`${message}\n`);
}

const partyOpsContent = readLegacyRuntimeSource(["merchants", "downtime-operations-actions"]);

const downtimeDataContent = readFileSync(join(rootDir, "scripts", "features", "downtime-phase1-data.js"), "utf-8");

log("Checking GM reward controls");
assert(
  partyOpsContent.includes("showSocialContract: selectedPendingIsBrowsing,"),
  "Social contract control should be enabled based on browsing action."
);
assert(
  partyOpsContent.includes("showItemRewards: selectedPendingIsBrowsing || selectedPendingIsCrafting,"),
  "Item rewards control should be enabled for browsing and crafting."
);

log("Checking profession identities");
for (const profession of ["street-thief", "performer", "merchant-broker"]) {
  assert(downtimeDataContent.includes(`"${profession}"`), `Expected profession ${profession} to exist.`);
}

log("Checking complication auto-assignment");
assert(
  partyOpsContent.includes('function getRandomDowntimeComplication(actionKey = "", riskLevel = "standard")'),
  "Expected getRandomDowntimeComplication to accept a riskLevel parameter."
);
assert(
  partyOpsContent.includes('shouldRollComplication = riskLevel === "high"'),
  "Expected high risk rolls to auto-trigger complications."
);
assert(
  partyOpsContent.includes("complication,") && partyOpsContent.includes("const complication = shouldRollComplication"),
  "Expected complication field to be auto-populated in generateDowntimeResult."
);

log("Checking multi-track progression foundation");
for (const marker of [
  "getDowntimeActiveEntry",
  "getDowntimeEntryQueue",
  "setDowntimeActiveEntry",
  "getDowntimeEntryHoursInvested",
  "Future Multi-Track Model (v2.0)"
]) {
  assert(partyOpsContent.includes(marker), `Expected ${marker} to exist.`);
}

process.stdout.write("deep design corrections validation passed\n");
