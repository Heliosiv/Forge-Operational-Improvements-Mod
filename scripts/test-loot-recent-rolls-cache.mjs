import assert from "node:assert/strict";

import {
  clearRecentRollsCache,
  debugGetRecentRollsCache,
  getRecentRollMalus,
  recordHordeRollItems,
  recordRecentlyRolledItem
} from "./features/loot-recent-rolls-cache.js";

const originalGame = globalThis.game;
const originalDateNow = Date.now;

globalThis.game = {
  scenes: {
    active: {
      id: "scene-test"
    }
  }
};

try {
  let nowMs = 10_000;
  Date.now = () => nowMs;

  const arrow = {
    name: "Arrow",
    itemType: "ammunition",
    rarity: "common",
    sourceId: "pack:ammo"
  };

  clearRecentRollsCache();

  // First record should register and apply a strong malus.
  recordRecentlyRolledItem(arrow);
  let snapshot = debugGetRecentRollsCache();
  assert.equal(snapshot.count, 1);
  assert.equal(snapshot.items[0].nameIdentity, "arrow|ammunition|common");

  let malus = getRecentRollMalus(arrow);
  assert.ok(malus <= 0.27 && malus >= 0.26, `Fresh repeat malus should be strong; got ${malus}`);

  // Duplicate record within 500ms should be ignored.
  nowMs += 300;
  recordRecentlyRolledItem(arrow);
  snapshot = debugGetRecentRollsCache();
  assert.equal(snapshot.count, 1);

  // Duplicate after 500ms should register as another pressure point.
  nowMs += 300;
  recordRecentlyRolledItem(arrow);
  snapshot = debugGetRecentRollsCache();
  assert.equal(snapshot.count, 2);
  malus = getRecentRollMalus(arrow);
  assert.ok(malus <= 0.16 && malus >= 0.15, `Multiple fresh repeats should reduce weight further; got ${malus}`);

  // Pressure should decay as entries age.
  nowMs += 31_000;
  malus = getRecentRollMalus(arrow);
  assert.ok(malus <= 0.2 && malus >= 0.19, `Aged repeats should soften penalty; got ${malus}`);

  nowMs += 120_000;
  malus = getRecentRollMalus(arrow);
  assert.ok(malus <= 0.36 && malus >= 0.35, `Older repeats should apply only a light penalty; got ${malus}`);

  nowMs += 400_000;
  malus = getRecentRollMalus(arrow);
  assert.equal(malus, 1);

  // Scene separation should isolate caches.
  globalThis.game.scenes.active.id = "scene-other";
  clearRecentRollsCache();
  assert.equal(debugGetRecentRollsCache().count, 0);
  recordHordeRollItems([
    {
      name: "Bolt",
      itemType: "ammunition",
      rarity: "common",
      sourceId: "pack:ammo"
    }
  ]);
  assert.equal(debugGetRecentRollsCache().count, 1);

  globalThis.game.scenes.active.id = "scene-test";
  // Returning to original scene should still see its previous cache untouched by other scene writes.
  assert.equal(debugGetRecentRollsCache().count, 2);

  clearRecentRollsCache();
  assert.equal(debugGetRecentRollsCache().count, 0);

  recordRecentlyRolledItem({
    name: "Sentinel Shield",
    itemType: "equipment",
    rarity: "uncommon",
    sourceId: "pack:usable-items"
  });
  const sameNameDifferentSourceMalus = getRecentRollMalus({
    name: "Sentinel Shield",
    itemType: "equipment",
    rarity: "uncommon",
    sourceId: "pack:other-usable-items"
  });
  assert.ok(
    sameNameDifferentSourceMalus < 0.5,
    `Same-name usable items should be penalized across source variants; got ${sameNameDifferentSourceMalus}`
  );

  clearRecentRollsCache();

  process.stdout.write("loot recent-rolls cache validation passed\n");
} finally {
  Date.now = originalDateNow;
  globalThis.game = originalGame;
}
