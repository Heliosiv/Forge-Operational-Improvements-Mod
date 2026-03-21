import assert from "node:assert/strict";

import { createSyncEffectsSessionState } from "./features/sync-effects-session-state.js";

{
  const storageMap = new Map();
  const storage = {
    getItem(key) {
      return storageMap.has(key) ? storageMap.get(key) : null;
    },
    setItem(key, value) {
      storageMap.set(key, value);
    }
  };

  const state = createSyncEffectsSessionState({
    gameRef: { user: { id: "gm-sync" } },
    storage
  });

  assert.equal(state.getNonPartySyncFilterStorageKey(), "po-non-party-sync-filter-gm-sync");
  assert.equal(state.getActiveSyncEffectsTabStorageKey(), "po-active-sync-effects-tab-gm-sync");

  assert.equal(state.normalizeNonPartySyncFilterKeyword(undefined), "");
  assert.equal(state.normalizeNonPartySyncFilterKeyword("abc"), "abc");
  assert.equal(state.normalizeNonPartySyncFilterKeyword("x".repeat(300)).length, 120);

  assert.equal(state.getNonPartySyncFilterKeyword(), "");
  storage.setItem(state.getNonPartySyncFilterStorageKey(), "  ranger  ");
  assert.equal(state.getNonPartySyncFilterKeyword(), "  ranger  ");

  assert.equal(state.getActiveSyncEffectsTab(), "active");
  storage.setItem(state.getActiveSyncEffectsTabStorageKey(), " archived ");
  assert.equal(state.getActiveSyncEffectsTab(), "archived");
  storage.setItem(state.getActiveSyncEffectsTabStorageKey(), "other");
  assert.equal(state.getActiveSyncEffectsTab(), "active");
}

process.stdout.write("sync effects session state validation passed\n");
