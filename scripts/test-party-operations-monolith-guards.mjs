import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "party-operations.js"), "utf8");

function getFunctionSource(name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} should exist in party-operations.js.`);
  const nextFunction = source.indexOf("\nasync function ", start + 1);
  const nextPlainFunction = source.indexOf("\nfunction ", start + 1);
  const candidates = [nextFunction, nextPlainFunction].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
}

assert.match(
  source,
  /import\s*\{[\s\S]*\bgetActorCraftingProjects\b[\s\S]*\}\s*from "\.\/features\/downtime-phase1-service\.js";/,
  "party-operations.js should import getActorCraftingProjects for downtime crafting persistence."
);

{
  const fn = getFunctionSource("claimAllLootForPlayer");
  const declarationIndex = fn.indexOf("const itemIds =");
  const firstUseIndex = fn.indexOf("for (const itemId of itemIds)");
  assert.ok(declarationIndex >= 0, "claimAllLootForPlayer should build itemIds from the board.");
  assert.ok(
    declarationIndex < firstUseIndex,
    "claimAllLootForPlayer should define itemIds before looping over claimable items."
  );
}

for (const name of ["saveRestWatchEntryNoteByContext", "saveMarchingNoteByContext"]) {
  const fn = getFunctionSource(name);
  assert.match(
    fn,
    /!canUserControlActor\(actor, game\.user\)\s*&&\s*!canAccessAllPlayerOps\(game\.user\)/,
    `${name} should allow shared player-ops access through the player preflight.`
  );
}

process.stdout.write("party operations monolith guard validation passed\n");
