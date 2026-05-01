import assert from "node:assert/strict";

import {
  DOWNTIME_V2_SCHEMA_VERSION,
  acknowledgeDowntimeV2Result,
  applyDowntimeV2ResultToActorProjects,
  applyDowntimeV2Submission,
  buildDefaultDowntimeV2State,
  buildDowntimeV2ResultDraft,
  deliverDowntimeV2Submission,
  getDowntimeV2AvailableCards,
  normalizeDowntimeV2Card,
  normalizeDowntimeV2State
} from "./core/downtime-v2.js";

const legacy = {
  hoursGranted: 4,
  publishedAt: 123,
  entries: {
    a1: {
      actorId: "a1",
      actionKey: "crafting"
    }
  },
  logs: [{ actorId: "a1", summary: "Old result" }]
};

const migrated = normalizeDowntimeV2State(legacy, { now: 999 });
assert.equal(migrated.schemaVersion, DOWNTIME_V2_SCHEMA_VERSION);
assert.equal(migrated.legacyArchive.archivedAt, 999);
assert.deepEqual(migrated.legacyArchive.snapshot.entries.a1.actionKey, "crafting");
assert.equal(migrated.activeSession.status, "draft");
assert.ok(migrated.cardLibrary.some((card) => card.type === "learn"));
assert.ok(migrated.cardLibrary.some((card) => card.type === "craft"));
assert.ok(migrated.cardLibrary.some((card) => card.type === "custom"));

const customCard = normalizeDowntimeV2Card({
  id: "Train!!!",
  type: "LEARN",
  title: "Train Sword Forms",
  ability: "str",
  dc: 14,
  progressTarget: 6
});
assert.equal(customCard.id, "train");
assert.equal(customCard.type, "learn");
assert.equal(customCard.ability, "str");
assert.equal(customCard.createsProject, true);

const state = buildDefaultDowntimeV2State(1000);
state.activeSession = {
  ...state.activeSession,
  id: "session-1",
  status: "launched",
  rosterActorIds: ["actor-1"],
  availableCardIds: ["learn-skill", "craft-project"],
  launchedAt: 1000,
  launchedBy: "GM"
};
assert.deepEqual(
  getDowntimeV2AvailableCards(state).map((card) => card.id),
  ["learn-skill", "craft-project"]
);

const card = state.cardLibrary.find((entry) => entry.id === "learn-skill");
const resultDraft = buildDowntimeV2ResultDraft(
  {
    roll: {
      total: 22
    }
  },
  card,
  { hours: 4 }
);
assert.equal(resultDraft.tier, "exceptional-success");
assert.ok(resultDraft.progress >= 4);

const submissionApply = applyDowntimeV2Submission(state, {
  id: "sub-1",
  sessionId: "session-1",
  actorId: "actor-1",
  actorName: "Aster",
  userId: "user-1",
  userName: "Player",
  cardId: "learn-skill",
  roll: {
    formula: "1d20 + @abilityMod + @proficiencyBonus",
    d20: 18,
    ability: "int",
    abilityMod: 2,
    proficiencyBonus: 2,
    total: 22
  },
  resultDraft,
  submittedAt: 1100
});
assert.equal(submissionApply.ok, true);
assert.equal(submissionApply.state.submissions.length, 1);

const delivered = deliverDowntimeV2Submission(submissionApply.state, "sub-1", {
  now: 1200,
  deliveredBy: "GM",
  resultDraft: {
    summary: "Training made real progress."
  }
});
assert.equal(delivered.ok, true);
assert.equal(delivered.result.status, "delivered");
assert.equal(delivered.state.deliveredResults.length, 1);
assert.equal(delivered.result.resultDraft.summary, "Training made real progress.");

const acknowledged = acknowledgeDowntimeV2Result(delivered.state, "sub-1", {
  now: 1300,
  acknowledgedBy: "Player"
});
assert.equal(acknowledged.ok, true);
assert.equal(acknowledged.result.acknowledgedAt, 1300);

const projectApply = applyDowntimeV2ResultToActorProjects([], delivered.result, card, { now: 1400 });
assert.equal(projectApply.projects.length, 1);
assert.equal(projectApply.project.sourceCardId, "learn-skill");
assert.equal(
  projectApply.project.status,
  projectApply.project.progress >= projectApply.project.target ? "completed" : "active"
);

process.stdout.write("downtime v2 service validation passed\n");
