import assert from "node:assert/strict";

import { createGatherHistoryView } from "./core/gather-history-view.js";

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
const historyView = createGatherHistoryView({
  gatherHistorySortOptions: [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "actor-asc", label: "Actor A-Z" },
    { value: "actor-desc", label: "Actor Z-A" },
    { value: "rations-asc", label: "Rations Low-High" },
    { value: "rations-desc", label: "Rations High-Low" }
  ],
  gatherHistoryResultFilterOptions: [
    { value: "all", label: "All" },
    { value: "success", label: "Success" },
    { value: "fail", label: "Fail" }
  ],
  gatherHistoryResourceFilterOptions: [
    { value: "all", label: "All" },
    { value: "food", label: "Food" },
    { value: "water", label: "Water" }
  ],
  gatherEnvironmentKeys: [
    "lush_forest_or_river_valley",
    "desert_blighted_wasteland"
  ],
  gatherEnvironmentLabels: {
    lush_forest_or_river_valley: "Lush Forest",
    desert_blighted_wasteland: "Desert"
  },
  normalizeGatherEnvironmentKey(value) {
    return String(value ?? "").trim().toLowerCase() === "desert_blighted_wasteland"
      ? "desert_blighted_wasteland"
      : "lush_forest_or_river_valley";
  },
  normalizeGatherResourceType(value) {
    return String(value ?? "").trim().toLowerCase() === "water" ? "water" : "food";
  },
  getGatherResourceTypeLabel(value) {
    return value === "water" ? "Water" : "Food";
  },
  formatGatherFlagLabel(value) {
    return value === "good-weather" ? "Good Weather" : String(value ?? "");
  },
  formatGatherComplicationLabel(value) {
    return value === "hostile-fauna" ? "Hostile Fauna" : String(value ?? "");
  },
  sessionStorageRef,
  resolveUserId: () => "user-1",
  randomId: () => "generated-id",
  getNow: () => 5000,
  createDate(value) {
    return {
      getTime() {
        return Number(value);
      },
      toLocaleString() {
        return `date:${value}`;
      }
    };
  }
});

sessionStorageRef.setItem(
  historyView.getGatherHistoryViewStorageKey(),
  JSON.stringify({
    search: "   Alice   trail   ",
    result: "success",
    resource: "food",
    environment: "lush_forest_or_river_valley",
    actor: "ALICE",
    sort: "oldest"
  })
);

assert.deepEqual(historyView.getGatherHistoryViewState(), {
  search: "Alice trail",
  result: "success",
  resource: "food",
  environment: "lush_forest_or_river_valley",
  actor: "alice",
  sort: "oldest"
});

assert.deepEqual(historyView.setGatherHistoryViewState({ actor: "ghost", sort: "invalid" }), {
  search: "Alice trail",
  result: "success",
  resource: "food",
  environment: "lush_forest_or_river_valley",
  actor: "ghost",
  sort: "newest"
});

const actorResetContext = historyView.buildGatherHistoryContext({
  gather: {
    history: [
      {
        actorName: "Alice",
        environment: "lush_forest_or_river_valley",
        result: "success",
        resourceType: "food",
        timestamp: 3000,
        rations: 2
      }
    ]
  }
}, {
  viewState: {
    search: "",
    result: "all",
    resource: "all",
    environment: "all",
    actor: "ghost",
    sort: "newest"
  }
});

assert.equal(actorResetContext.filters.actor, "all");
assert.equal(actorResetContext.rows.length, 1);

const filteredContext = historyView.buildGatherHistoryContext(
  {
    gather: {
      history: [
        {
          id: "row-1",
          actorName: "Alice",
          environment: "lush_forest_or_river_valley",
          result: "success",
          resourceType: "food",
          timestamp: 1000,
          rations: 3,
          flags: ["good-weather"],
          complications: ["hostile-fauna"],
          notes: ["Trail sign"],
          inventoryGainAmount: 2,
          inventoryGainSource: "Camp",
          requesterName: "Scout",
          approvedBy: "GM",
          rationDieTotal: 4,
          yieldRolledBy: "Alice",
          appliedToLedger: false,
          checkTotal: 15,
          dc: 12,
          createdBy: "GM",
          dayKey: "Day 4"
        },
        {
          actorName: "Borin",
          environment: "desert_blighted_wasteland",
          result: "fail",
          resourceType: "water",
          timestamp: 2000,
          rations: 1
        }
      ]
    }
  },
  {
    viewState: {
      search: "Scout",
      result: "success",
      resource: "food",
      environment: "lush_forest_or_river_valley",
      actor: "alice",
      sort: "oldest"
    }
  }
);

assert.equal(filteredContext.visibleCount, 1);
assert.equal(filteredContext.hiddenCount, 1);
assert.equal(filteredContext.hasActiveFilters, true);
assert.equal(filteredContext.rows[0].id, "row-1");
assert.equal(filteredContext.rows[0].timestampLabel, "date:1000");
assert.equal(filteredContext.rows[0].rollVsDc, "15 vs 12");
assert.match(filteredContext.rows[0].detailsText, /Good Weather/);
assert.match(filteredContext.rows[0].detailsText, /Hostile Fauna/);
assert.match(filteredContext.rows[0].detailsText, /Inventory \+2 \(Camp\)/);
assert.equal(filteredContext.actorOptions[1].selected, true);
assert.equal(filteredContext.environmentOptions[1].selected, true);
assert.equal(filteredContext.sortOptions.find((entry) => entry.value === "oldest")?.selected, true);
assert.equal(filteredContext.filters.searchPlaceholder, "Filter by actor, note, or result");

process.stdout.write("gather history view validation passed\n");
