import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format as formatPrettier } from "prettier";

import { LEGACY_SOURCE_FILE, getLegacySourceSlices } from "../runtime/rebuild/legacy-source-map.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDir = path.join(repoRoot, "legacy", "slices");

function toRepoPath(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

function buildSliceHeader(slice) {
  return [
    `# ${slice.label}`,
    "",
    `Source: ${LEGACY_SOURCE_FILE}:${slice.lines.start}-${slice.lines.end}`,
    `Feature IDs: ${slice.featureIds.join(", ")}`,
    `Target Modules: ${slice.targetModules.join(", ")}`,
    "",
    slice.notes,
    "",
    "----- legacy source begins -----",
    ""
  ].join("\n");
}

function buildSliceContent(slice, sourceLines) {
  const startIndex = Math.max(0, slice.lines.start - 1);
  const endIndex = Math.min(sourceLines.length, slice.lines.end);
  const body = sourceLines.slice(startIndex, endIndex).join("\n");
  return `${buildSliceHeader(slice)}${body}\n`;
}

function buildIndexRecord(slice) {
  return {
    id: slice.id,
    label: slice.label,
    source: `${LEGACY_SOURCE_FILE}:${slice.lines.start}-${slice.lines.end}`,
    slicePath: slice.slicePath,
    featureIds: slice.featureIds,
    targetModules: slice.targetModules,
    notes: slice.notes
  };
}

function buildReadme(slices) {
  const rows = slices
    .map((slice) => `- ${slice.slicePath}: ${slice.label} (${slice.lines.start}-${slice.lines.end})`)
    .join("\n");

  return [
    "# Legacy Runtime Slices",
    "",
    "These files are generated from `legacy/party-operations-monolith.js` by `node scripts/refactor/split-legacy-runtime.mjs`.",
    "",
    "They are reference-only text files. Do not import them from active runtime code.",
    "",
    rows,
    ""
  ].join("\n");
}

async function main() {
  const sourcePath = path.join(repoRoot, LEGACY_SOURCE_FILE);
  const source = await readFile(sourcePath, "utf8");
  const sourceLines = source.split(/\r?\n/);
  const slices = getLegacySourceSlices();

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  for (const slice of slices) {
    const slicePath = path.join(repoRoot, slice.slicePath);
    await writeFile(slicePath, buildSliceContent(slice, sourceLines), "utf8");
  }

  await writeFile(
    path.join(outputDir, "index.json"),
    await formatPrettier(JSON.stringify(slices.map(buildIndexRecord)), {
      parser: "json",
      printWidth: 120,
      trailingComma: "none"
    }),
    "utf8"
  );
  await writeFile(path.join(outputDir, "README.md"), buildReadme(slices), "utf8");

  console.log(`Wrote ${slices.length} legacy slices to ${toRepoPath(outputDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
