import assert from "node:assert/strict";

import {
  MARCH_DOCTRINE_STATES,
  buildDefaultMarchDoctrineTracker,
  buildDoctrineCheckPayload,
  ensureMarchDoctrineTracker,
  evaluateMarchingFormationState,
  getMarchFormationPassiveEffectDetails,
  markDoctrineTriggerPending,
  normalizeMarchingFormationId
} from "./features/march-doctrine.js";

{
  const tracker = buildDefaultMarchDoctrineTracker();
  tracker.state = MARCH_DOCTRINE_STATES.BROKEN;
  tracker.cohesionCheckRequired = true;
  const snapshot = evaluateMarchingFormationState({
    formationId: "free",
    ranks: {
      front: ["actor-a"],
      middle: [],
      rear: []
    },
    doctrineTracker: tracker
  });

  assert.equal(snapshot.formation.id, "free");
  assert.equal(snapshot.doctrine.active, false);
  assert.equal(snapshot.doctrine.checksActive, false);
  assert.equal(snapshot.doctrine.cohesionCheckRequired, false);
  assert.equal(snapshot.effectEntries.length, 0);
}

{
  const snapshot = evaluateMarchingFormationState({
    formationId: "loose",
    ranks: {
      front: ["actor-a"],
      middle: ["actor-b"],
      rear: []
    },
    doctrineTracker: buildDefaultMarchDoctrineTracker(),
    tokenPositionsByActorId: {
      "actor-a": { x: 300, y: 100 },
      "actor-b": { x: 180, y: 120 }
    },
    gridUnitPixels: 100
  });

  assert.equal(snapshot.formation.id, "loose");
  assert.equal(snapshot.doctrine.active, true);
  assert.equal(snapshot.validity.isValid, true);
  assert.equal(snapshot.formationState.state, MARCH_DOCTRINE_STATES.STABLE);
  assert.deepEqual(snapshot.effectSummaries, ["+1 Passive Perception"]);
}

{
  const passiveDetails = getMarchFormationPassiveEffectDetails("tight-guard");

  assert.deepEqual(passiveDetails.positiveSummaries, [
    "+1 Initiative",
    "Front +1 AC",
    "Middle +1 AC"
  ]);
  assert.deepEqual(passiveDetails.negativeSummaries, [
    "-5 ft Walk Speed",
    "-1 Stealth Checks"
  ]);
}

{
  const passiveDetails = getMarchFormationPassiveEffectDetails("free");

  assert.equal(passiveDetails.positiveSummary, "None");
  assert.equal(passiveDetails.negativeSummary, "None");
}

{
  const tracker = buildDefaultMarchDoctrineTracker();
  const snapshot = evaluateMarchingFormationState({
    formationId: "tight-guard",
    ranks: {
      front: ["actor-a", "actor-b"],
      middle: ["actor-c"],
      rear: []
    },
    doctrineTracker: tracker,
    tokenPositionsByActorId: {
      "actor-a": { x: 100, y: 100 },
      "actor-b": { x: 120, y: 520 },
      "actor-c": { x: 110, y: 520 }
    },
    gridUnitPixels: 100
  });

  assert.equal(snapshot.validity.isValid, false);
  assert.equal(snapshot.validity.state, MARCH_DOCTRINE_STATES.BROKEN);
  assert.equal(snapshot.formationState.state, MARCH_DOCTRINE_STATES.BROKEN);
  assert.equal(snapshot.effectEntries.length, 0);
  assert.ok(snapshot.validity.reasons.some((reason) => reason.message.includes("spacing exceeded tolerance")));
}

{
  const tracker = buildDefaultMarchDoctrineTracker();
  tracker.state = MARCH_DOCTRINE_STATES.STRAINED;
  const snapshot = evaluateMarchingFormationState({
    formationId: normalizeMarchingFormationId("combat-ready"),
    ranks: {
      front: ["actor-a", "actor-b"],
      middle: ["actor-c", "actor-d"],
      rear: []
    },
    doctrineTracker: tracker,
    tokenPositionsByActorId: {
      "actor-a": { x: 400, y: 100 },
      "actor-b": { x: 400, y: 180 },
      "actor-c": { x: 290, y: 120 },
      "actor-d": { x: 290, y: 180 }
    },
    gridUnitPixels: 100
  });

  assert.equal(snapshot.validity.state, MARCH_DOCTRINE_STATES.STABLE);
  assert.equal(snapshot.formationState.state, MARCH_DOCTRINE_STATES.STRAINED);
  assert.deepEqual(snapshot.effectSummaries, ["-5 ft Walk Speed", "Front +1 AC"]);
}

{
  const snapshot = evaluateMarchingFormationState({
    formationId: "tight-guard",
    ranks: {
      front: ["actor-a", "actor-b"],
      middle: ["actor-c"],
      rear: []
    },
    doctrineTracker: buildDefaultMarchDoctrineTracker(),
    tokenPositionsByActorId: {
      "actor-a": { x: 100, y: 100 },
      "actor-b": { x: 120, y: 520 }
    },
    gridUnitPixels: 100
  });

  assert.equal(snapshot.validity.isValid, true);
  assert.equal(snapshot.validity.state, MARCH_DOCTRINE_STATES.STABLE);
  assert.ok(
    snapshot.validity.reasons.some((reason) => reason.code === "missing-token-positions"),
    "Missing token coverage should add an informational reason while keeping rank-only validation active."
  );
}

{
  const state = { doctrineTracker: buildDefaultMarchDoctrineTracker() };
  ensureMarchDoctrineTracker(state);

  markDoctrineTriggerPending(state, "spacing-violation");
  markDoctrineTriggerPending(state, "manual");

  assert.equal(
    state.doctrineTracker.pendingTrigger,
    "spacing-violation",
    "Lower-priority triggers should not overwrite existing higher-priority pending triggers."
  );
}

{
  const payload = buildDoctrineCheckPayload({
    formationId: "open-screen",
    doctrineState: MARCH_DOCTRINE_STATES.STABLE,
    trigger: "major-reposition",
    actorRows: [
      { actorId: "actor-a", name: "A", charismaModifier: 2, rankId: "front" },
      { actorId: "actor-b", name: "B", charismaModifier: 0, rankId: "middle" },
      { actorId: "actor-c", name: "C", charismaModifier: 1, rankId: "rear" }
    ],
    rollTotal: 13
  });

  assert.equal(payload.active, true);
  assert.equal(payload.averageModifier, 1);
  assert.equal(payload.dc, 12);
  assert.equal(payload.state, MARCH_DOCTRINE_STATES.STABLE);
}

{
  const payload = buildDoctrineCheckPayload({
    formationId: "loose",
    doctrineState: MARCH_DOCTRINE_STATES.STABLE,
    trigger: "spacing-violation",
    actorRows: [],
    rollTotal: null
  });

  assert.equal(payload.participantCount, 0);
  assert.equal(payload.state, MARCH_DOCTRINE_STATES.BROKEN);
}

process.stdout.write("march doctrine validation passed\n");
