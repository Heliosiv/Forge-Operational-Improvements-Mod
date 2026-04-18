import assert from "node:assert/strict";

import { createNoteDraftCache } from "./features/note-draft-cache.js";

{
  const storageMap = new Map();
  const storage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    },
    removeItem(key) {
      storageMap.delete(key);
    }
  };

  let now = 100;
  const cache = createNoteDraftCache({
    moduleId: "party-operations",
    gameRef: {
      world: { id: "world-a" },
      user: { id: "user-a" }
    },
    storage,
    nowFn: () => {
      now += 1;
      return now;
    },
    sopKeys: ["campSetup", "retreatProtocol"],
    clampText: (value, maxLength) => String(value ?? "").slice(0, Math.max(0, Number(maxLength) || 0)),
    sopNoteMaxLength: 12,
    maxEntries: 3
  });

  assert.equal(cache.getRestWatchNoteCacheKey("slot-1", "actor-1"), "rest:slot-1:actor-1");
  assert.equal(cache.getMarchingNoteCacheKey("actor-2"), "march:actor-2");
  assert.equal(cache.getSopNoteCacheKey("campSetup"), "sop:campSetup");
  assert.equal(cache.getSopNoteCacheKey("bad-key"), "");

  cache.setNoteDraftCacheValue("rest:slot-1:actor-1", "draft one");
  assert.equal(cache.getNoteDraftCacheValue("rest:slot-1:actor-1"), "draft one");
  cache.setNoteDraftCacheValue("rest:slot-1:actor-1", "   ");
  assert.equal(cache.getNoteDraftCacheValue("rest:slot-1:actor-1"), "");

  cache.setNoteDraftCacheValue("a", "A");
  cache.setNoteDraftCacheValue("b", "B");
  cache.setNoteDraftCacheValue("c", "C");
  cache.setNoteDraftCacheValue("d", "D");
  const prunedStore = JSON.parse(storage.getItem(cache.getNoteDraftCacheStorageKey()));
  assert.deepEqual(Object.keys(prunedStore).sort(), ["b", "c", "d"]);

  cache.writeSopCachedNoteEntry("campSetup", "12345678901234567890", { pendingSync: true });
  assert.deepEqual(cache.readSopCachedNoteEntry("campSetup"), {
    sopKey: "campSetup",
    text: "123456789012",
    pendingSync: true,
    updatedAt: now
  });

  assert.deepEqual(cache.resolveSopDraftForView("campSetup", "world text"), {
    note: "123456789012",
    pendingSync: true
  });

  cache.writeSopCachedNoteEntry("retreatProtocol", "same text", { pendingSync: false });
  assert.deepEqual(cache.resolveSopNoteForView("retreatProtocol", "same text"), {
    note: "same text",
    pendingSync: false
  });
  assert.equal(cache.readSopCachedNoteEntry("retreatProtocol"), null);

  cache.writeSopCachedNoteEntry("campSetup", "send later", { pendingSync: true });
  cache.writeSopCachedNoteEntry("retreatProtocol", "queued", { pendingSync: true });
  assert.deepEqual(cache.getPendingSopCachedNotes().map((entry) => entry.sopKey).sort(), ["campSetup", "retreatProtocol"]);

  cache.clearSopCachedNoteEntry("campSetup");
  assert.equal(cache.readSopCachedNoteEntry("campSetup"), null);
}

process.stdout.write("note draft cache validation passed\n");