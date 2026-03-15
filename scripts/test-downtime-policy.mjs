import assert from "node:assert/strict";

import {
  canSubmitPublishedDowntime,
  clampDowntimeHours,
  normalizeDowntimeActionKey,
  normalizeDowntimePublication,
  resolveDowntimeVisibleHours
} from "./core/downtime-policy.js";

assert.equal(clampDowntimeHours(undefined), 4);
assert.equal(clampDowntimeHours(0), 1);
assert.equal(clampDowntimeHours(29), 24);

assert.equal(normalizeDowntimeActionKey("browsing"), "browsing");
assert.equal(normalizeDowntimeActionKey("carousing"), "browsing");
assert.equal(normalizeDowntimeActionKey("invalid"), "browsing");

assert.deepEqual(
  normalizeDowntimePublication({
    publishedHoursGranted: 6,
    publishedAt: 12345,
    publishedBy: "GM"
  }, 8),
  {
    configuredHoursGranted: 8,
    publishedHoursGranted: 6,
    publishedAt: 12345,
    publishedBy: "GM",
    isPublished: true
  }
);

assert.deepEqual(
  normalizeDowntimePublication({
    publishedHoursGranted: 6,
    publishedAt: 0,
    publishedBy: "GM"
  }, 8),
  {
    configuredHoursGranted: 8,
    publishedHoursGranted: 0,
    publishedAt: 0,
    publishedBy: "",
    isPublished: false
  }
);

assert.equal(resolveDowntimeVisibleHours({
  configuredHoursGranted: 8,
  publishedHoursGranted: 6,
  isPublished: true,
  isGM: true
}), 8);
assert.equal(resolveDowntimeVisibleHours({
  configuredHoursGranted: 8,
  publishedHoursGranted: 6,
  isPublished: true,
  isGM: false
}), 6);
assert.equal(resolveDowntimeVisibleHours({
  configuredHoursGranted: 8,
  publishedHoursGranted: 6,
  isPublished: false,
  isGM: false
}), 0);

assert.equal(canSubmitPublishedDowntime({ isGM: true, isPublished: false }), true);
assert.equal(canSubmitPublishedDowntime({ isGM: false, isPublished: true }), true);
assert.equal(canSubmitPublishedDowntime({ isGM: false, isPublished: false }), false);

process.stdout.write("downtime policy validation passed\n");
