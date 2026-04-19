import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName}`);
  return source.slice(start, end).trim();
}

const functionBlock = extractFunctionBlock(moduleSource, "getLootBudgetDrivenValueWeight", "getLootValueBalanceWeight");

const context = vm.createContext({
  Math,
  Number,
  String,
  isLootOutsideBudgetPolicy(entryOrPolicy = null) {
    const policy = entryOrPolicy && typeof entryOrPolicy === "object"
      ? String(entryOrPolicy?.sourcePolicy ?? "").trim().toLowerCase()
      : String(entryOrPolicy ?? "").trim().toLowerCase();
    return policy === "outside-budget" || policy === "bonus";
  },
  isLootJackpotCandidate() {
    return false;
  },
  result: {}
});

vm.runInContext(`${functionBlock}\nresult.getLootBudgetDrivenValueWeight = getLootBudgetDrivenValueWeight;`, context);

const { getLootBudgetDrivenValueWeight } = context.result;

const budgetContext = {
  mode: "horde",
  targetCount: 5,
  targetItemBudgetGp: 500,
  manualMaxItemValueGp: 100,
  effectiveMaxItemValueGp: 100
};

const normalWeight = getLootBudgetDrivenValueWeight(250, 0, 0, budgetContext, {
  sourcePolicy: "normal"
});

const outsideBudgetWeight = getLootBudgetDrivenValueWeight(250, 0, 0, budgetContext, {
  sourcePolicy: "outside-budget"
});

const bonusPolicyWeight = getLootBudgetDrivenValueWeight(250, 0, 0, budgetContext, {
  sourcePolicy: "bonus"
});

assert.equal(
  normalWeight,
  0,
  "Manual cap should still hard-stop over-cap picks for normal source policies."
);

assert.ok(
  outsideBudgetWeight > 0,
  "Outside-budget policies should retain a non-zero weight even above manual cap."
);

assert.ok(
  bonusPolicyWeight > 0,
  "Bonus policies should retain a non-zero weight even above manual cap."
);

const inCapWeight = getLootBudgetDrivenValueWeight(75, 0, 0, budgetContext, {
  sourcePolicy: "normal"
});

assert.ok(
  inCapWeight > outsideBudgetWeight,
  "In-cap picks should remain more attractive than over-cap outside-budget picks."
);

process.stdout.write("loot budget source policy validation passed\n");
