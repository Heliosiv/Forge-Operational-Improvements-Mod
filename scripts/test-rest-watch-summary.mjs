import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const moduleSource = readFileSync(new URL("./party-operations.js", import.meta.url), "utf8");
const stylesheet = readFileSync(new URL("../styles/party-operations.css", import.meta.url), "utf8");

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} should exist in party-operations.js`);

  let depth = 0;
  let end = -1;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
        stringQuote = "";
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }

  assert.notEqual(end, -1, `${functionName} should have a closing brace`);
  return source.slice(start, end);
}

const functionBlock = [
  extractFunctionSource(moduleSource, "getSenseRange"),
  extractFunctionSource(moduleSource, "getDarkvision"),
  extractFunctionSource(moduleSource, "computeHighestNumericValue"),
  extractFunctionSource(moduleSource, "summarizeRestWatchLanguages"),
  extractFunctionSource(moduleSource, "computePassiveRangeForEntries"),
  extractFunctionSource(moduleSource, "buildRestWatchDetailSummary")
].join("\n\n");

const context = vm.createContext({ result: {}, REST_WATCH_MAX_ENTRIES: 4 });
vm.runInContext(`${functionBlock}\nresult.getSenseRange = getSenseRange;\nresult.getDarkvision = getDarkvision;\nresult.buildRestWatchDetailSummary = buildRestWatchDetailSummary;`, context);

const { getSenseRange, getDarkvision, buildRestWatchDetailSummary } = context.result;

assert.equal(getSenseRange(60), 60, "Numeric senses should remain numeric.");
assert.equal(getSenseRange("60 ft"), 60, "String senses should parse their range.");
assert.equal(getSenseRange({ value: "120 ft" }), 120, "Object senses should parse nested values.");
assert.equal(getSenseRange(""), null, "Blank senses should not be treated as darkvision.");

assert.equal(
  getDarkvision({ system: { attributes: { senses: { darkvision: "60 ft" } } } }),
  60,
  "Actor senses should drive darkvision detection for standard DnD5e actors."
);

assert.equal(
  getDarkvision({ system: { attributes: { senses: { darkvision: { value: 60 } } } } }),
  60,
  "Structured sense objects should be recognized."
);

assert.equal(
  getDarkvision({
    system: { attributes: { senses: {} } },
    getActiveTokens: () => [{ document: { detectionModes: [{ id: "basicSight" }, { id: "darkvision", range: 90 }] } }]
  }),
  90,
  "Darkvision detection modes should still provide a fallback when actor data is absent."
);

assert.equal(
  buildRestWatchDetailSummary(
    { visibleEntryCount: 4, slotNoDarkvision: false, campfireActive: false },
    [
      { actor: { darkvision: 60, passivePerception: 15, passiveInvestigation: 12, languageList: ["Common"] } },
      { actor: { darkvision: 60, passivePerception: 11, passiveInvestigation: 8, languageList: ["Elvish"] } }
    ]
  ).coverageLabel,
  "Darkvision 60 ft",
  "Fully covered watches should show the best darkvision range."
);

assert.equal(
  buildRestWatchDetailSummary(
    { visibleEntryCount: 4, slotNoDarkvision: true, campfireActive: false },
    [
      { actor: { darkvision: 60, passivePerception: 15, passiveInvestigation: 12, languageList: ["Common"] } },
      { actor: { darkvision: null, passivePerception: 11, passiveInvestigation: 8, languageList: ["Elvish"] } }
    ]
  ).coverageLabel,
  "Missing Darkvision",
  "Mixed watches should still warn when any assigned actor lacks darkvision."
);

assert.equal(
  buildRestWatchDetailSummary(
    { visibleEntryCount: 4, slotNoDarkvision: false, slotDarkvisionRange: 120, campfireActive: false },
    [
      { actor: { darkvision: null, passivePerception: 15, passiveInvestigation: 12, languageList: ["Common"] } },
      { actor: { darkvision: null, passivePerception: 11, passiveInvestigation: 8, languageList: ["Elvish"] } }
    ]
  ).coverageLabel,
  "Darkvision 120 ft",
  "Coverage labels should respect computed slot darkvision range even when rendered entries are redacted."
);

assert.match(
  stylesheet,
  /\.po-watch-card-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(500px,\s*0\.95fr\)\s+minmax\(760px,\s*1\.75fr\);/,
  "Rest watch cards should allocate substantially more width to the summary pane."
);

process.stdout.write("rest watch summary validation passed\n");
