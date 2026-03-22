import assert from "node:assert/strict";

import { createOperationsJournalSettings } from "./features/operations-journal-settings.js";

const settingValues = {
  journalVisibility: "public",
  journalFilterDebounceMs: 180,
  sessionSummaryRange: "last-24h"
};

const settingsFeature = createOperationsJournalSettings({
  moduleId: "party-operations",
  settings: {
    JOURNAL_ENTRY_VISIBILITY: "journalVisibility",
    JOURNAL_FILTER_DEBOUNCE_MS: "journalFilterDebounceMs",
    SESSION_SUMMARY_RANGE: "sessionSummaryRange"
  },
  journalVisibilityModes: {
    PUBLIC: "public",
    REDACTED: "redacted",
    GM_PRIVATE: "gm-private"
  },
  sessionSummaryRangeOptions: {
    "last-24h": "Last 24 Hours",
    today: "Today",
    "last-7d": "Last 7 Days"
  },
  gameRef: {
    settings: {
      get(moduleId, key) {
        assert.equal(moduleId, "party-operations");
        return settingValues[key];
      }
    }
  }
});

assert.equal(settingsFeature.getJournalVisibilityMode(), "public");
settingValues.journalVisibility = "REDACTED";
assert.equal(settingsFeature.getJournalVisibilityMode(), "redacted");
settingValues.journalVisibility = "gm-private";
assert.equal(settingsFeature.getJournalVisibilityMode(), "gm-private");
settingValues.journalVisibility = "invalid";
assert.equal(settingsFeature.getJournalVisibilityMode(), "redacted");
delete settingValues.journalVisibility;
assert.equal(settingsFeature.getJournalVisibilityMode(), "redacted");
settingValues.journalVisibility = "public";

settingValues.journalFilterDebounceMs = 245.9;
assert.equal(settingsFeature.getJournalFilterDebounceMs(), 245);
settingValues.journalFilterDebounceMs = 5000;
assert.equal(settingsFeature.getJournalFilterDebounceMs(), 1000);
settingValues.journalFilterDebounceMs = -10;
assert.equal(settingsFeature.getJournalFilterDebounceMs(), 0);
settingValues.journalFilterDebounceMs = "bad";
assert.equal(settingsFeature.getJournalFilterDebounceMs(), 180);

settingValues.sessionSummaryRange = "today";
assert.equal(settingsFeature.getSessionSummaryRangeSetting(), "today");
settingValues.sessionSummaryRange = "invalid";
assert.equal(settingsFeature.getSessionSummaryRangeSetting(), "last-24h");

settingValues.sessionSummaryRange = "last-7d";
const lastWeekBounds = settingsFeature.getSessionSummaryWindowBounds();
assert.equal(lastWeekBounds.mode, "last-7d");
assert.equal(lastWeekBounds.label, "Last 7 Days");
assert.equal(lastWeekBounds.end >= lastWeekBounds.start, true);
assert.equal(Math.round((lastWeekBounds.end - lastWeekBounds.start) / 86400000), 7);

settingValues.sessionSummaryRange = "today";
const todayBounds = settingsFeature.getSessionSummaryWindowBounds();
assert.equal(todayBounds.mode, "today");
assert.equal(todayBounds.label, "Today");
assert.equal(todayBounds.end >= todayBounds.start, true);

process.stdout.write("operations journal settings validation passed\n");
