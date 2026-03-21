import assert from "node:assert/strict";

import {
  createModulePerfTracker,
  getPartyOpsPerfState,
  summarizeCurrentPartyOpsPerfState,
  summarizeMetricBucket
} from "./core/perf.js";

{
  const root = {};
  let clockTick = 0;
  const perfTracker = createModulePerfTracker("spec", {
    root,
    clock: () => {
      clockTick += 5;
      return clockTick;
    }
  });

  perfTracker.increment("launcher.ensure", 1, { reason: "test" });
  perfTracker.record("scan.files", 12, { source: "data" });
  const token = perfTracker.start("ready");
  perfTracker.end(token, { gm: true });
  perfTracker.time("sync-op", () => "done");

  const state = getPartyOpsPerfState(root);
  assert.equal(state.scopes.spec.counters["launcher.ensure"].count, 1);
  assert.equal(state.scopes.spec.values["scan.files"].last, 12);
  assert.equal(state.scopes.spec.timings.ready.last, 5);
  assert.equal(state.scopes.spec.timings["sync-op"].count, 1);
  assert.ok(Array.isArray(state.scopes.spec.recent));
  assert.ok(state.scopes.spec.recent.length >= 4);

  const summary = summarizeCurrentPartyOpsPerfState(root);
  assert.equal(summary.scopes.spec.counters["launcher.ensure"].avg, 1);
  assert.equal(summary.scopes.spec.values["scan.files"].median, 12);
  assert.equal(summary.scopes.spec.timings.ready.p95, 5);
}

{
  const summary = summarizeMetricBucket({
    count: 5,
    total: 150,
    min: 10,
    max: 50,
    last: 50,
    updatedAt: 123,
    samples: [10, 20, 30, 40, 50]
  });

  assert.equal(summary.avg, 30);
  assert.equal(summary.median, 30);
  assert.equal(summary.p95, 50);
}

process.stdout.write("perf instrumentation validation passed\n");