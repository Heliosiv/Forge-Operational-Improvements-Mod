import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { LEGACY_SOURCE_FILE, getLegacySourceSlices } from "./runtime/rebuild/legacy-source-map.js";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const marker = "----- legacy source begins -----\n";

function readLines(relativePath) {
  const raw = readFileSync(join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines;
}

const legacyLines = readLines(LEGACY_SOURCE_FILE);
const slices = getLegacySourceSlices();
let expectedStart = 1;

assert.equal(slices.length, 16, "legacy source map should keep the current high-level rebuild slices.");

for (const slice of slices) {
  assert.equal(slice.lines.start, expectedStart, `${slice.id} should start after the previous slice.`);
  assert(slice.lines.end >= slice.lines.start, `${slice.id} should have a valid line range.`);
  assert(slice.slicePath?.endsWith(`${slice.id}.txt`), `${slice.id} should expose a generated text slice path.`);

  const sliceText = readFileSync(join(repoRoot, slice.slicePath), "utf8").replace(/\r\n/g, "\n");
  assert(sliceText.includes(`Source: ${LEGACY_SOURCE_FILE}:${slice.lines.start}-${slice.lines.end}`));
  assert(sliceText.includes(marker), `${slice.id} should include the legacy source marker.`);

  const actualBody = sliceText.slice(sliceText.indexOf(marker) + marker.length).replace(/\n$/, "");
  const expectedBody = legacyLines.slice(slice.lines.start - 1, slice.lines.end).join("\n");
  assert.equal(actualBody, expectedBody, `${slice.id} generated slice should match the legacy source lines.`);

  expectedStart = slice.lines.end + 1;
}

assert.equal(expectedStart - 1, legacyLines.length, "legacy source slices should cover the full monolith.");

const index = JSON.parse(readFileSync(join(repoRoot, "legacy", "slices", "index.json"), "utf8"));
assert.deepEqual(
  index.map((entry) => entry.slicePath),
  slices.map((slice) => slice.slicePath),
  "legacy slice index should list the same slice paths as the source map."
);

assert.match(
  readLegacyRuntimeSource("loot-engine"),
  /function validateBoardReadyLootBundle\(bundle = \{\}\)/,
  "legacy runtime test helper should support a single slice id."
);
assert.throws(
  () => readLegacyRuntimeSource("missing-slice"),
  /Unknown legacy runtime source slice id\(s\): missing-slice/,
  "legacy runtime test helper should reject unknown slice ids."
);

process.stdout.write("legacy source map validation passed\n");
