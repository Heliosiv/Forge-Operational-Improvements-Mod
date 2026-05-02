import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "party-operations.js"), "utf8");
const restWatchTemplate = readFileSync(join(__dirname, "..", "templates", "rest-watch.hbs"), "utf8");

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

{
  const fn = getFunctionSource("getResourceOwnerActors");
  assert.doesNotMatch(fn, /actor\.type\s*!==\s*"character"/, "Resource targets should not be limited to PC actors.");
  assert.match(
    fn,
    /canUserOwnActor\(user,\s*actor,\s*\{\s*requireCharacter:\s*false\s*\}\)/,
    "Player resource targets should include non-character actors that the player owns."
  );
}

{
  const fn = getFunctionSource("setOperationalResource");
  assert.match(
    fn,
    /itemSelectionActor[\s\S]*canUserOwnActor\(game\.user,\s*actor,\s*\{\s*requireCharacter:\s*false\s*\}\)/,
    "Saving a resource target actor should allow owned non-character actors."
  );
  assert.match(
    fn,
    /Choose one of your owned actors for that resource target\./,
    "Resource target validation copy should not call targets characters."
  );
}

assert.match(
  restWatchTemplate,
  /Choose player-owned actor target items for food, water, and torches\./,
  "Resource target helper copy should describe actor-owned targets, not character-only targets."
);

process.stdout.write("party operations monolith guard validation passed\n");
