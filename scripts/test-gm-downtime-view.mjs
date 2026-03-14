import assert from "node:assert/strict";

import { createGmDowntimeViewAccess } from "./core/gm-downtime-view.js";

function createSessionStorageMock() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

const sessionStorageRef = createSessionStorageMock();
const access = createGmDowntimeViewAccess({
  downtimeEntrySortOptions: [
    { value: "pending", label: "Pending" },
    { value: "submitted", label: "Submitted" }
  ],
  downtimeLogSortOptions: [
    { value: "resolved-desc", label: "Newest resolved" },
    { value: "created-asc", label: "Oldest created" }
  ],
  sessionStorageRef,
  resolveUserId: () => "gm-user"
});

assert.equal(access.getGmDowntimeViewStorageKey(), "po-gm-downtime-view-gm-user");
assert.equal(access.normalizeDowntimeEntriesSort("submitted"), "submitted");
assert.equal(access.normalizeDowntimeEntriesSort("invalid"), "pending");
assert.equal(access.normalizeDowntimeLogsSort("created-asc"), "created-asc");
assert.equal(access.normalizeDowntimeLogsSort("invalid"), "resolved-desc");
assert.deepEqual(access.getGmDowntimeViewState(), {
  entriesSort: "pending",
  logsSort: "resolved-desc"
});

sessionStorageRef.setItem(access.getGmDowntimeViewStorageKey(), "{bad json");
assert.deepEqual(access.getGmDowntimeViewState(), {
  entriesSort: "pending",
  logsSort: "resolved-desc"
});

assert.deepEqual(access.setGmDowntimeViewState({
  entriesSort: "submitted",
  logsSort: "created-asc"
}), {
  entriesSort: "submitted",
  logsSort: "created-asc"
});

assert.deepEqual(access.setGmDowntimeViewState({
  logsSort: "invalid"
}), {
  entriesSort: "submitted",
  logsSort: "resolved-desc"
});

process.stdout.write("gm downtime view validation passed\n");
