import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");
const gmDowntimeTemplate = readFileSync(new URL("../templates/gm-downtime.hbs", import.meta.url), "utf8");
const gmShellStyles = readFileSync(new URL("../styles/po-gm-shell.css", import.meta.url), "utf8");
const restWatchTemplate = readFileSync(new URL("../templates/rest-watch.hbs", import.meta.url), "utf8");
const playerDowntimeTemplate = readFileSync(
  new URL("../templates/partials/rest-watch-player/simple-downtime.hbs", import.meta.url),
  "utf8"
);

assert.match(
  moduleSource,
  /function normalizeDowntimeSubmission\(raw = \{\}, downtimeState = \{\}, options = \{\}\) \{[\s\S]*const rawActionData =[\s\S]*raw\?\.actionData[\s\S]*normalizePhase1ActionData\(\s*actionDef\.key,\s*\{[\s\S]*\.\.\.rawActionData,[\s\S]*\.\.\.raw,[\s\S]*areaSettings[\s\S]*\},\s*\{/,
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
  moduleSource,
  /function buildGatherRequestContext\(resourcesState = null, options = \{\}\) \{[\s\S]*const riskTags = getRiskTags\(source\);[\s\S]*modifierSummary,[\s\S]*riskTags,[\s\S]*riskLevelLabel:[\s\S]*matchingPresetLabel,/,
  "Gather request context should expose normalized card fields for modifier summary, risk tags, and preset matching."
);

assert.match(
  moduleSource,
  /function buildGatherDefaultsContext\(resourcesState = null\) \{[\s\S]*const weatherOptions = getGatherWeatherOptions\(resourcesState\)[\s\S]*const presets = buildGatherPresetContext\(config\)[\s\S]*summary:[\s\S]*weatherOptions,[\s\S]*presets,/,
  "Gather defaults context should group quick presets and hidden DC default controls for upcoming approvals."
);

assert.match(
  moduleSource,
  /async function runGatherResourceCheck\(\) \{[\s\S]*if \(!game\.user\?\.isGM\) \{[\s\S]*Wait for the GM to call for gather requests\.[\s\S]*GM must initiate gather requests\./,
  "Players should not be able to self-initiate the gather request dialog from the operations page."
);

assert.match(
  moduleSource,
  /async function promptPlayerGatherRequestDialog\(options = \{\}\) \{[\s\S]*const promptedByUserId = String\(options\?\.promptedByUserId \?\? ""\)\.trim\(\);[\s\S]*!isActiveGmUserId\(promptedByUserId\)[\s\S]*GM must initiate gather requests\./,
  "Player gather request dialogs should require a broadcast prompt from an active GM."
);

assert.match(
  moduleSource,
  /Gather During Travel only marks your intent\.[\s\S]*reducing pace records a party travel slowdown[\s\S]*falling behind can trigger the configured Constitution save\./,
  "Player gather prompt should explain what the during-travel option affects."
);

assert.match(
  gmDowntimeTemplate,
  /\{\{#if downtime\.submit\.showCraftingFields\}\}[\s\S]*Crafting Catalog[\s\S]*\{\{\/if\}\}/,
  "GM downtime template should only show the crafting catalog while crafting is selected."
);

assert.match(
  gmDowntimeTemplate,
  /data-page-action-status role="status" aria-live="polite" aria-atomic="true"/,
  "GM downtime page status banner should expose atomic polite status semantics for assistive tech."
);

assert.match(
  gmDowntimeTemplate,
  /po-downtime-publication-status \{\{#if downtime\.publication\.isPublished\}\}is-good\{\{else\}\}is-warn\{\{\/if\}\}/,
  "GM downtime publication status callout should reflect published vs blocked states."
);

assert.match(
  gmDowntimeTemplate,
  /Sort Entries<\/span>[\s\S]*data-action="set-downtime-entry-sort" aria-label="Sort submitted downtime entries" title="Sort submitted downtime entries"/,
  "Submitted entries sort control should include explicit label and title affordances."
);

assert.match(
  gmDowntimeTemplate,
  /Drag queued rows to reorder, or use Up\/Down for precise positioning\./,
  "Queued plan section should include a clear reorder hint for drag-and-button interactions."
);

assert.match(
  gmDowntimeTemplate,
  /Bulk actions immediately apply outcomes and can update multiple records at once\./,
  "Resolver controls should warn that bulk actions affect multiple records."
);

assert.match(
  gmDowntimeTemplate,
  /class="po-op-action-row po-downtime-resolver-actions"/,
  "Resolver controls should expose a dedicated resolver action group wrapper."
);

assert.match(
  gmDowntimeTemplate,
  /class="po-btn po-btn-sm po-downtime-bulk-action"[\s\S]*data-action="auto-resolve-all-downtime-entries"/,
  "Resolver action row should mark all-pending auto-resolve as a dedicated bulk action."
);

assert.match(
  gmDowntimeTemplate,
  /class="po-op-action-row po-downtime-maintenance-actions"[\s\S]*data-action="clear-downtime-results"/,
  "Resolved log maintenance controls should be grouped in a dedicated maintenance action row."
);

assert.match(
  gmDowntimeTemplate,
  /data-action="clear-downtime-log" data-log-id="\{\{logId\}\}" title="Permanently remove this resolved log" aria-label="Permanently remove this resolved log"/,
  "Resolved log clear action should include explicit destructive-action affordances."
);

assert.match(
  gmShellStyles,
  /\.po-window\[data-tool="gm-downtime"\] :is\(\.po-btn, \.po-select, \.po-input, \.po-icon-btn\):focus-visible/,
  "GM downtime styles should include a focus-visible treatment for keyboard navigation."
);

assert.doesNotMatch(
  restWatchTemplate,
  /data-page="downtime"/,
  "Operations tab strip should not expose a downtime page button."
);

assert.doesNotMatch(
  restWatchTemplate,
  /\{\{#if operationsPageDowntime\}\}/,
  "Rest watch operations template should not include an embedded downtime section."
);

assert.match(
  restWatchTemplate,
  /Pending Requests[\s\S]*Gather History/,
  "Gather panel should render the compact queue-first section order: pending requests, then history."
);

assert.match(
  restWatchTemplate,
  /\{\{#if @root\.isGM\}\}[\s\S]*data-action="gather-resource-check"[\s\S]*\{\{\/if\}\}/,
  "Call Gather buttons should only render for the GM."
);

assert.match(
  restWatchTemplate,
  /\{\{#each operations\.resources\.gatherRequests\.rows\}\}[\s\S]*\{\{resourceTypeLabel\}\}[\s\S]*\{\{gatherModeLabel\}\}[\s\S]*\{\{travelModeLabel\}\}[\s\S]*\{\{environmentLabel\}\}[\s\S]*\{\{modifierSummary\}\}/,
  "Pending request cards should render normalized intent and setup summary labels."
);

assert.doesNotMatch(
  restWatchTemplate,
  /Quick Resolution Defaults|Advanced Review|Apply Daily Upkeep|data-resource="weatherMod:\{\{value\}\}"/,
  "GM resource workspace should not expose quick defaults, advanced review, manual upkeep, or weather default controls."
);

assert.match(
  playerDowntimeTemplate,
  /\{\{#if downtime\.submit\.showCraftingFields\}\}[\s\S]*Crafting Catalog[\s\S]*\{\{\/if\}\}/,
  "Player downtime partial should only show the crafting catalog while crafting is selected."
);

process.stdout.write("downtime submission ui validation passed\n");
