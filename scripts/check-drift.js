#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const MANIFEST_FILES = [
  "module.json",
  "module.copy.test.json",
  "module.premium.template.json"
];
const PACK_PATH = path.join("packs", "party-operations-loot-manifest.db");

function readJson(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  const text = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(text);
}

function getUniqueStatsVersions(packText, fieldName) {
  const versions = new Set();
  const lines = packText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      const value = String(row?._stats?.[fieldName] ?? "").trim();
      if (value) versions.add(value);
    } catch {
      // Ignore malformed rows so the check can still evaluate valid records.
    }
  }
  return Array.from(versions).sort((a, b) => a.localeCompare(b));
}

function main() {
  const manifestVersions = [];
  for (const file of MANIFEST_FILES) {
    const json = readJson(file);
    manifestVersions.push({
      file,
      version: String(json.version ?? "")
    });
  }

  const canonical = manifestVersions.find((entry) => entry.file === "module.json")?.version ?? "";
  const mismatches = manifestVersions.filter((entry) => entry.version !== canonical);

  if (mismatches.length > 0) {
    console.error("Manifest version drift detected.");
    console.error(`Canonical (module.json): ${canonical}`);
    for (const entry of manifestVersions) {
      console.error(`- ${entry.file}: ${entry.version}`);
    }
    process.exit(1);
  }

  console.log(`Manifest versions aligned at ${canonical}.`);

  const absolutePackPath = path.join(ROOT, PACK_PATH);
  if (!fs.existsSync(absolutePackPath)) {
    console.warn(`Pack file not found: ${PACK_PATH}`);
    return;
  }

  const packText = fs.readFileSync(absolutePackPath, "utf8");
  const coreVersions = getUniqueStatsVersions(packText, "coreVersion");
  const systemVersions = getUniqueStatsVersions(packText, "systemVersion");

  console.log(`Pack _stats.coreVersion values: ${coreVersions.join(", ") || "(none)"}`);
  console.log(`Pack _stats.systemVersion values: ${systemVersions.join(", ") || "(none)"}`);

  if (coreVersions.length > 1 || systemVersions.length > 1) {
    console.warn("Pack metadata drift warning: mixed _stats core/system versions detected.");
  }
}

main();
