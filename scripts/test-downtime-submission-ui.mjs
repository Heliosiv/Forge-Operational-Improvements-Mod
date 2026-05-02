import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");
const socketRoutes = readFileSync(new URL("./core/socket-gm-requester-routes.js", import.meta.url), "utf8");
const socketHandlers = readFileSync(new URL("./core/socket-route-handlers.js", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../styles/party-operations.css", import.meta.url), "utf8");
const gmDowntimeTemplate = readFileSync(new URL("../templates/gm-downtime.hbs", import.meta.url), "utf8");
const playerDowntimeTemplate = readFileSync(
  new URL("../templates/partials/rest-watch-player/simple-downtime.hbs", import.meta.url),
  "utf8"
);

function assertMatch(source, pattern, message) {
  assert.match(source, pattern, message);
}

function assertNoMatch(source, pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

assertMatch(
  moduleSource,
  /downtime:\s*buildDefaultDowntimeV2State\(0\)/,
  "Operations ledger defaults should initialize downtime schema v2."
);
assertMatch(
  moduleSource,
  /function ensureDowntimeState\(ledger\) \{[\s\S]*normalizeDowntimeV2State\(ledger\.downtime/,
  "ensureDowntimeState should normalize downtime through the v2 schema."
);
assertMatch(
  moduleSource,
  /async function launchDowntimeV2Session\(element\)[\s\S]*players:openDowntimeSession[\s\S]*canUserManageDowntimeActor/,
  "Launch should target connected players who manage assigned roster actors."
);
assertMatch(
  moduleSource,
  /async function submitDowntimeV2Action\(element\)[\s\S]*new Roll\("1d20 \+ @abilityMod \+ @proficiencyBonus"/,
  "Player downtime v2 submissions should roll before submitting structured drafts."
);
assertMatch(
  moduleSource,
  /async function deliverDowntimeV2Result\(element\)[\s\S]*deliverDowntimeV2Submission[\s\S]*applyDowntimeV2DeliveredResultToActor/,
  "GM delivery should persist the result and apply actor project writes."
);
assertMatch(
  moduleSource,
  /actor\.setFlag\(MODULE_ID, "downtimeProjects", applied\.projects\)/,
  "Completed or advanced downtime projects should be saved to actor flags."
);
assertMatch(
  moduleSource,
  /actor\.createEmbeddedDocuments\("Item", \[buildDowntimeV2CompletionItemData\(result, card\)\]\)/,
  "Completed Learn/Craft projects should create a visible actor item or feature."
);

assertMatch(gmDowntimeTemplate, /class="[^"]*po-downtime-v2/, "GM downtime page should render the v2 surface.");
assertMatch(gmDowntimeTemplate, /<main class="po-main">/, "GM downtime page should render inside the app scroll body.");
assertMatch(gmDowntimeTemplate, /data-action="downtime-v2-launch-session"/, "GM page should expose one launch action.");
assertMatch(gmDowntimeTemplate, /name="downtimeV2RosterActorIds"/, "GM page should assign a roster.");
assertMatch(gmDowntimeTemplate, /data-downtime-v2-card-row/, "GM page should expose reusable action cards.");
assertMatch(
  gmDowntimeTemplate,
  /data-action="downtime-v2-deliver-result"/,
  "GM page should deliver reviewed v2 results."
);
assertNoMatch(
  gmDowntimeTemplate,
  /data-action="auto-resolve-all-downtime-entries"/,
  "Old auto-resolver UI should not remain runnable."
);
assertNoMatch(
  gmDowntimeTemplate,
  /name="downtimeActionKey"/,
  "Old Phase 1 action selector should not remain in the GM page."
);
assertMatch(
  stylesSource,
  /\.party-operations \.po-main \{[\s\S]*?flex: 1;[\s\S]*?min-height: 0;[\s\S]*?overflow: auto;/,
  "GM downtime app body should scroll instead of clipping long action card text."
);

assertMatch(
  playerDowntimeTemplate,
  /data-action="submit-downtime-v2"/,
  "Player downtime panel should submit through the v2 action."
);
assertMatch(playerDowntimeTemplate, /name="downtimeV2ActorId"/, "Player panel should choose assigned actors.");
assertMatch(playerDowntimeTemplate, /name="downtimeV2CardId"/, "Player panel should choose GM-selected action cards.");
assertMatch(
  playerDowntimeTemplate,
  /data-action="ack-downtime-v2-result"/,
  "Player panel should acknowledge delivered results."
);
assertNoMatch(
  playerDowntimeTemplate,
  /name="downtimeActionKey"/,
  "Old Phase 1 action selector should not remain in the player panel."
);

assertMatch(
  socketRoutes,
  /"ops:downtimeV2-submit": applyPlayerDowntimeV2SubmitRequest/,
  "Socket routes should include v2 submission."
);
assertMatch(
  socketRoutes,
  /"ops:downtimeV2-ack-result": applyPlayerDowntimeV2AckResult/,
  "Socket routes should include v2 result acknowledgement."
);
assertMatch(
  socketHandlers,
  /players:openDowntimeSession[\s\S]*setPlayerHubTab\?\.\("downtime"\)/,
  "Player socket route should open the downtime hub tab."
);

process.stdout.write("downtime submission ui validation passed\n");
