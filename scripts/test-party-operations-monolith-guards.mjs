import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(__dirname, "party-operations.js"), "utf8");
const restWatchTemplate = readFileSync(join(__dirname, "..", "templates", "rest-watch.hbs"), "utf8");
const gmLootTemplate = readFileSync(join(__dirname, "..", "templates", "gm-loot.hbs"), "utf8");
const gmLootClaimsBoardTemplate = readFileSync(join(__dirname, "..", "templates", "gm-loot-claims-board.hbs"), "utf8");
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

{
  const fn = getFunctionSource("getLootClaimSelectableActorsForUser");
  assert.match(
    fn,
    /canUserManageLootClaimActor\(user,\s*actor\)/,
    "Loot claim destinations should use loot-specific actor ownership."
  );
  assert.match(
    source,
    /canUserOwnActor\(user,\s*actor,\s*\{\s*requireCharacter:\s*false\s*\}\)/,
    "Loot claim destinations should include owned non-character stash actors."
  );
}

assert.match(
  source,
  /"deposit-and-archive-loot": async \(\) => \{[\s\S]*depositAndArchiveLootClaimRun\(element\)/,
  "Main app action routing should support deposit-and-archive loot."
);
assert.match(
  source,
  /function resolveDefaultLootClaimActorIdFromOptions[\s\S]*isStashLike/,
  "Loot claim default actor resolution should prefer stash-like destinations."
);
assert.match(
  gmLootTemplate,
  /data-action="deposit-and-archive-loot" data-source="builder"/,
  "GM loot page should expose Deposit and Archive as a builder-sourced shortcut."
);
assert.match(
  gmLootClaimsBoardTemplate,
  /data-action="deposit-and-archive-loot"/,
  "Live loot claim board should expose Deposit and Archive for selected runs."
);
assert.match(
  source,
  /recordLootRollItems\(items\)/,
  "Loot generation should record every generated item roll for repeat-frequency dampening."
);
{
  const fn = source.slice(
    source.indexOf("async function depositAndArchiveLootClaimRun"),
    source.indexOf(
      "\nasync function autoAssignItemsByVouchForGm",
      source.indexOf("async function depositAndArchiveLootClaimRun")
    )
  );
  assert.match(
    fn,
    /shouldPublishCurrentPreview[\s\S]*data.*source[\s\S]*builder[\s\S]*getLootPreviewResult\(\)/,
    "Builder Deposit and Archive should publish the current preview instead of reusing a stale selected run."
  );
  assert.match(
    fn,
    /let actorId = getLootClaimActorIdFromElement\(element\)/,
    "Deposit and Archive should honor the stored or selected loot destination actor."
  );
}
assert.match(source, /function escapeCssValue/, "Runtime selector lookups should share a top-level CSS escape helper.");
assert.match(
  source,
  /getReputationNoteLogSelect[\s\S]*const escapedFactionId = escapeCssValue\(factionId\)/,
  "Reputation note log selector lookup should escape faction ids before querySelector."
);
assert.match(
  source,
  /runGmReadyTasks:\s*runPartyOperationsGmReadyTasks/,
  "GM ready migrations should be wired into the real ready config."
);
assert.doesNotMatch(
  source,
  /if\s*\(\s*draft\.mode\s*===\s*"horde"\s*\)\s*\{\s*recordLootRollItems\(items\)/,
  "Repeat-frequency dampening should not be limited to horde-mode loot rolls."
);
assert.doesNotMatch(
  gmLootTemplate,
  /reward mix/i,
  "Loot builder copy should describe loot, not duplicate reward language."
);

{
  const fn = getFunctionSource("normalizeLootPreviewDraft");
  assert.match(fn, /emphasis:\s*current|emphasis,/s, "Loot preview drafts should preserve an explicit emphasis field.");
}

{
  const fn = getFunctionSource("applyLootPreviewQualityAction");
  assert.match(
    fn,
    /draft\.emphasis\s*=\s*"practical"/,
    "More Practical should mark the draft with practical emphasis."
  );
  assert.match(fn, /draft\.emphasis\s*=\s*"magical"/, "More Magical should mark the draft with magical emphasis.");
}

{
  const rarityFn = getFunctionSource("getLootModeChallengeRarityWeight");
  const typeFn = getFunctionSource("getLootModeItemTypeWeightModifier");
  const capsFn = getFunctionSource("getLootRaritySelectionCaps");
  assert.match(
    source,
    /function getLootEmphasisRarityWeightModifier/,
    "Loot preview emphasis should have rarity weight behavior."
  );
  assert.match(
    source,
    /function getLootEmphasisItemTypeWeightModifier/,
    "Loot preview emphasis should have item type behavior."
  );
  assert.match(
    rarityFn,
    /getLootEmphasisRarityWeightModifier\(draft,\s*bucket\)/,
    "More Magical and More Practical should affect rarity selection weights."
  );
  assert.match(
    typeFn,
    /getLootEmphasisItemTypeWeightModifier\(draft,\s*entry\)/,
    "More Practical should affect ammunition and consumable item weights."
  );
  assert.match(
    capsFn,
    /getLootEmphasisRarityCapModifier/,
    "Loot preview emphasis should affect rarity caps, not only labels."
  );
  assert.match(
    capsFn,
    /getLootMagicalEmphasisRarityFloor/,
    "More Magical should be able to open uncommon and rarer slots when the count supports it."
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
  restWatchTemplate,
  /class="po-gm-cockpit-table"/,
  "GM cockpit should render as a compact row table instead of the old card grid."
);
assert.doesNotMatch(
  restWatchTemplate,
  /po-gm-cockpit-card/,
  "GM cockpit should not reintroduce card-style cockpit rows."
);
assert.match(
  source,
  /"plan-gather-checks": async \(\) => \{[\s\S]*promptGatherBatchDialog\(\)/,
  "GM cockpit gather action should open the batch gather workflow."
);
assert.match(
  source,
  /function buildGatherBatchActorRows/,
  "Batch gather workflow should render PC rows for selecting gather participants."
);
assert.match(
  restWatchTemplate,
  /data-action="manage-merchant-session"/,
  "GM cockpit merchant action should open the compact merchant session picker."
);
assert.match(
  source,
  /"manage-merchant-session": async \(\) => \{[\s\S]*promptMerchantSessionDialog\(\)/,
  "GM cockpit merchant action should dispatch to the compact merchant session picker."
);
assert.match(
  source,
  /function promptMerchantSessionDialog/,
  "Merchant session picker should be implemented in the runtime layer."
);
assert.match(
  source,
  /function applyMerchantSessionDialogSelection/,
  "Merchant session picker should apply selected players and merchants together."
);
assert.match(source, /Live Merchants:/, "Merchant shop chat card should include a brief live merchant summary.");
assert.match(
  restWatchTemplate,
  /data-action="gm-cockpit-weather-set-climate"/,
  "GM cockpit weather row should let the GM select the day's climate before rolling."
);
assert.match(source, /Roll Today's Weather/, "GM cockpit weather action should describe rolling today's weather.");
assert.match(
  source,
  /"gm-cockpit-weather-set-climate": async \(\) => \{[\s\S]*gmCockpitWeatherSetClimate\(element\)/,
  "GM cockpit weather climate selector should persist through a cockpit-specific action handler."
);
assert.match(
  source,
  /function gmCockpitWeatherSetClimate/,
  "GM cockpit weather climate selector should have a dedicated ledger update helper."
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
