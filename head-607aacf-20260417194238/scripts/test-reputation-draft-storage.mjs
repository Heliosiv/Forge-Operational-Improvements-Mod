/**
 * Focused regression tests for createReputationDraftStorage
 */
import assert from "node:assert/strict";
import { createReputationDraftStorage } from "./features/reputation-draft-storage.js";

// ── Storage stub ─────────────────────────────────────────────────────────────
function makeStorage() {
  const store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

// ── Shared factory ────────────────────────────────────────────────────────────
let idSeq = 0;
function makeApi(userId = "u1") {
  return createReputationDraftStorage({
    gameRef: { user: { id: userId } },
    storage: makeStorage(),
    randomIdFn: () => `id-${++idSeq}`,
    deepCloneFn: (v) => JSON.parse(JSON.stringify(v)),
  });
}

// ── Storage key helpers ───────────────────────────────────────────────────────
{
  const api = makeApi("u42");
  assert.equal(api.getReputationFilterStorageKey(), "po-reputation-filter-u42");
  assert.equal(api.getReputationBuilderStorageKey(), "po-reputation-builder-u42");
  assert.equal(api.getReputationNoteLogSelectionStorageKey(), "po-reputation-note-log-selection-u42");
}

// ── anon fallback ─────────────────────────────────────────────────────────────
{
  const api = createReputationDraftStorage({
    gameRef: { user: null },
    storage: makeStorage(),
    randomIdFn: () => "x",
    deepCloneFn: (v) => JSON.parse(JSON.stringify(v)),
  });
  assert.equal(api.getReputationFilterStorageKey(), "po-reputation-filter-anon");
}

// ── clampReputationStandingValue ──────────────────────────────────────────────
{
  const api = makeApi();
  assert.equal(api.clampReputationStandingValue(3), 3);
  assert.equal(api.clampReputationStandingValue(10), 5);
  assert.equal(api.clampReputationStandingValue(-10), -5);
  assert.equal(api.clampReputationStandingValue(2.9), 2);
  assert.equal(api.clampReputationStandingValue(null), 0);
  assert.equal(api.clampReputationStandingValue(NaN), 0);
}

// ── REPUTATION_VIEW_SCOPES / normalizeReputationViewScope ─────────────────────
{
  const api = makeApi();
  assert.equal(api.REPUTATION_VIEW_SCOPES.OPERATIONS, "operations");
  assert.equal(api.REPUTATION_VIEW_SCOPES.GM, "gm");
  assert.equal(api.normalizeReputationViewScope("gm"), "gm");
  assert.equal(api.normalizeReputationViewScope("GM"), "gm");
  assert.equal(api.normalizeReputationViewScope("other"), "operations");
  assert.equal(api.normalizeReputationViewScope(null), "operations");
}

// ── getEmptyReputationPlayerImpact ────────────────────────────────────────────
{
  const api = makeApi();
  const impact = api.getEmptyReputationPlayerImpact();
  assert.ok(typeof impact.id === "string" && impact.id.length > 0);
  assert.equal(impact.actorId, "");
  assert.equal(impact.delta, 0);
  assert.equal(impact.note, "");
}

// ── normalizeReputationPlayerImpact ───────────────────────────────────────────
{
  const api = makeApi();
  const result = api.normalizeReputationPlayerImpact({ id: "abc", actorId: " p1 ", delta: 7, note: "hi" });
  assert.equal(result.id, "abc");
  assert.equal(result.actorId, "p1");
  assert.equal(result.delta, 5); // clamped
  assert.equal(result.note, "hi");
}

// ── getDefaultReputationBuilderDraft ──────────────────────────────────────────
{
  const api = makeApi();
  const draft = api.getDefaultReputationBuilderDraft();
  assert.equal(draft.label, "");
  assert.equal(draft.score, 0);
  assert.ok(Array.isArray(draft.playerImpacts));
  assert.equal(draft.playerImpacts.length, 1);
}

// ── normalizeReputationBuilderDraft ───────────────────────────────────────────
{
  const api = makeApi();
  const input = {
    label: "  The Syndicate  ",
    category: "Crime",
    represents: "x".repeat(200),
    linkedActorId: " a1 ",
    score: -3,
    summary: "A note",
    note: "Another",
    playerImpacts: [{ id: "i1", actorId: "", delta: -6, note: "" }],
  };
  const result = api.normalizeReputationBuilderDraft(input);
  assert.equal(result.label, "The Syndicate");
  assert.equal(result.represents.length, 180);
  assert.equal(result.linkedActorId, "a1");
  assert.equal(result.score, -3);
  assert.equal(result.playerImpacts[0].delta, -5); // clamped
}

// ── Builder state round-trip ──────────────────────────────────────────────────
{
  const api = makeApi("u5");
  const defaults = api.getReputationBuilderState();
  assert.equal(defaults.label, "");

  const saved = api.saveReputationBuilderState({ label: "Saved", score: 2, playerImpacts: [] });
  assert.equal(saved.label, "Saved");
  assert.equal(saved.score, 2);
  // playerImpacts falls back to one empty row
  assert.equal(saved.playerImpacts.length, 1);

  const read = api.getReputationBuilderState();
  assert.equal(read.label, "Saved");
}

// ── updateReputationBuilderState ──────────────────────────────────────────────
{
  const api = makeApi("u6");
  api.saveReputationBuilderState({ label: "A", score: 0, playerImpacts: [] });
  api.updateReputationBuilderState((draft) => { draft.label = "B"; draft.score = 1; });
  const result = api.getReputationBuilderState();
  assert.equal(result.label, "B");
  assert.equal(result.score, 1);
}

// ── clearReputationBuilderState ───────────────────────────────────────────────
{
  const api = makeApi("u7");
  api.saveReputationBuilderState({ label: "To clear", score: 3, playerImpacts: [] });
  const cleared = api.clearReputationBuilderState();
  assert.equal(cleared.label, "");
  const read = api.getReputationBuilderState();
  assert.equal(read.label, "");
}

// ── Note-log selection ────────────────────────────────────────────────────────
{
  const api = makeApi("u8");
  // Initially empty
  assert.deepEqual(api.getReputationNoteLogSelections(), {});
  assert.equal(api.getReputationNoteLogSelection("faction1"), "");

  // Set a selection
  const result = api.setReputationNoteLogSelection("faction1", "log-abc");
  assert.equal(result, "log-abc");
  assert.equal(api.getReputationNoteLogSelection("faction1"), "log-abc");

  // Clear a specific entry
  api.setReputationNoteLogSelection("faction1", "");
  assert.equal(api.getReputationNoteLogSelection("faction1"), "");

  // Empty factionId is a no-op
  api.setReputationNoteLogSelection("", "log-xyz");
  assert.deepEqual(api.getReputationNoteLogSelections(), {});
}

// ── Filter state round-trip ───────────────────────────────────────────────────
{
  const api = makeApi("u9");
  const defaults = api.getReputationFilterState();
  assert.equal(defaults.keyword, "");
  assert.equal(defaults.standing, "all");

  api.setReputationFilterState({ keyword: "goblin" });
  const partial = api.getReputationFilterState();
  assert.equal(partial.keyword, "goblin");
  assert.equal(partial.standing, "all");

  api.setReputationFilterState({ keyword: "", standing: "hostile" });
  const full = api.getReputationFilterState();
  assert.equal(full.keyword, "");
  assert.equal(full.standing, "hostile");
}

// ── Malformed storage data is handled gracefully ──────────────────────────────
{
  const storage = makeStorage();
  storage.setItem("po-reputation-builder-ub", "NOT_JSON{{{");
  storage.setItem("po-reputation-filter-ub", "NOT_JSON{{{");
  storage.setItem("po-reputation-note-log-selection-ub", "NOT_JSON{{{");
  const api = createReputationDraftStorage({
    gameRef: { user: { id: "ub" } },
    storage,
    randomIdFn: () => "safe",
    deepCloneFn: (v) => JSON.parse(JSON.stringify(v)),
  });
  const builder = api.getReputationBuilderState();
  assert.equal(builder.label, "");
  const filter = api.getReputationFilterState();
  assert.equal(filter.keyword, "");
  const selections = api.getReputationNoteLogSelections();
  assert.deepEqual(selections, {});
}

console.log("reputation draft storage validation passed");
