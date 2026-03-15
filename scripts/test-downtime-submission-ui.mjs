import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");
const gmDowntimeTemplate = readFileSync(new URL("../templates/gm-downtime.hbs", import.meta.url), "utf8");
const restWatchTemplate = readFileSync(new URL("../templates/rest-watch.hbs", import.meta.url), "utf8");
const playerDowntimeTemplate = readFileSync(new URL("../templates/partials/rest-watch-player/simple-downtime.hbs", import.meta.url), "utf8");

assert.match(
  moduleSource,
  /function normalizeDowntimeSubmission\(raw = \{\}, downtimeState = \{\}, options = \{\}\) \{[\s\S]*const rawActionData = raw\?\.actionData[\s\S]*normalizePhase1ActionData\(actionDef\.key, \{[\s\S]*\.\.\.rawActionData,[\s\S]*\.\.\.raw,[\s\S]*areaSettings[\s\S]*\}, \{/,
  "Downtime submission normalization should preserve nested actionData when entries are re-normalized."
);

assert.match(
  moduleSource,
  /async function promptLocalDowntimeSubmissionCheck\(submission = \{\}, actor = null\) \{[\s\S]*Hidden roll:[\s\S]*Roll and Submit[\s\S]*new Roll\("1d20 \+ @abilityMod \+ @proficiencyBonus"/,
  "Player downtime submissions should prompt for a hidden local check roll."
);

assert.match(
  moduleSource,
  /async function generateDowntimeResult\(entry, downtimeState\) \{[\s\S]*const submittedCheck = normalizeDowntimeSubmittedCheck\(entry\?\.submittedCheck\);[\s\S]*submittedCheck\?\.d20/,
  "GM downtime pre-resolution should reuse a submitted player check when one exists."
);

assert.match(
  gmDowntimeTemplate,
  /\{\{#if downtime\.submit\.showCraftingFields\}\}[\s\S]*Crafting Catalog[\s\S]*\{\{\/if\}\}/,
  "GM downtime template should only show the crafting catalog while crafting is selected."
);

assert.match(
  restWatchTemplate,
  /\{\{#if operations\.downtime\.submit\.showCraftingFields\}\}[\s\S]*Crafting Catalog[\s\S]*\{\{\/if\}\}/,
  "Rest watch downtime template should only show the crafting catalog while crafting is selected."
);

assert.match(
  playerDowntimeTemplate,
  /\{\{#if downtime\.submit\.showCraftingFields\}\}[\s\S]*Crafting Catalog[\s\S]*\{\{\/if\}\}/,
  "Player downtime partial should only show the crafting catalog while crafting is selected."
);

process.stdout.write("downtime submission ui validation passed\n");
