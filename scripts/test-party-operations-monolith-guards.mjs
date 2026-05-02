import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "party-operations.js"), "utf8");
const restWatchTemplate = readFileSync(join(__dirname, "..", "templates", "rest-watch.hbs"), "utf8");
const lootItemOverrideEditorSource = readFileSync(join(__dirname, "features", "loot-item-override-editor.js"), "utf8");
const lootCandidateSourcesSource = readFileSync(join(__dirname, "features", "loot-candidate-sources.js"), "utf8");
const featureManifestSource = readFileSync(join(__dirname, "runtime", "rebuild", "feature-manifest.js"), "utf8");

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

assert.match(
  source,
  /createLootItemOverrideEditorActions/,
  "party-operations.js should wire loot item override actions through the extracted feature module."
);

for (const name of [
  "pruneLootItemOverrideRecord",
  "normalizeLootItemOverrideKeyList",
  "updateLootItemOverrideFromElement",
  "updateLootItemOverridesByKeys"
]) {
  assert.doesNotMatch(
    source,
    new RegExp(`function\\s+${name}\\s*\\(`),
    `${name} should not be reintroduced into party-operations.js after extraction.`
  );
  assert.match(
    lootItemOverrideEditorSource,
    new RegExp(`function\\s+${name}\\s*\\(`),
    `${name} should live in the extracted loot item override editor module.`
  );
}

assert.match(
  source,
  /resolveLootCandidateSources\(sourceConfig/,
  "party-operations.js should delegate loot source filtering and source warnings to the extracted module."
);
assert.match(
  lootCandidateSourcesSource,
  /Selected source is currently disabled:/,
  "loot source warning copy should live with source-selection behavior."
);
assert.match(
  featureManifestSource,
  /scripts\/features\/loot-item-override-editor\.js/,
  "refactor manifest should list the extracted loot item override editor owner."
);
assert.match(
  featureManifestSource,
  /scripts\/features\/loot-candidate-sources\.js/,
  "refactor manifest should list the extracted loot candidate source owner."
);

process.stdout.write("party operations monolith guard validation passed\n");
