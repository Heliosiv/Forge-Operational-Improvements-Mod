import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");

function extractFunctionBlock(source, functionName, nextFunctionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);
  const end = source.indexOf(`function ${nextFunctionName}(`, start);
  assert.notEqual(end, -1, `${nextFunctionName} should exist after ${functionName} in party-operations.js`);
  return source.slice(start, end).trim();
}

const functionBlock = extractFunctionBlock(moduleSource, "resolveDesiredItemCount", "resolveLootSelectionSeed");
const context = vm.createContext({
  result: {},
  logLootBuilderFailure: () => {}
});

vm.runInContext(`${functionBlock}\nresult.resolveDesiredItemCount = resolveDesiredItemCount;`, context);

const { resolveDesiredItemCount } = context.result;

assert.equal(
  resolveDesiredItemCount({ mode: "horde", challenge: "low", profile: "standard", scale: "medium" }, 1000, 0),
  resolveDesiredItemCount({ mode: "horde", challenge: "epic", profile: "standard", scale: "medium" }, 1000, 0),
  "Horde item count should be budget-driven and not change solely because the challenge tier label changed."
);

assert.equal(
  resolveDesiredItemCount({ mode: "horde", challenge: "mid", profile: "standard", scale: "medium" }, 1000, 7),
  7,
  "Manual target count overrides should still win."
);

assert.ok(
  resolveDesiredItemCount({ mode: "horde", challenge: "mid", profile: "standard", scale: "medium" }, 2400, 0)
  > resolveDesiredItemCount({ mode: "horde", challenge: "mid", profile: "standard", scale: "medium" }, 600, 0),
  "Larger horde item budgets should yield more items."
);

assert.ok(
  resolveDesiredItemCount({ mode: "horde", challenge: "mid", profile: "well", scale: "medium" }, 1000, 0)
  < resolveDesiredItemCount({ mode: "horde", challenge: "mid", profile: "poor", scale: "medium" }, 1000, 0),
  "Higher-quality profiles should bias toward fewer, more valuable items."
);

process.stdout.write("loot item count validation passed\n");
