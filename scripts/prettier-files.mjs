import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prettierBin = require.resolve("prettier/bin/prettier.cjs");
const mode = process.argv.includes("--write") ? "--write" : "--check";
const supportedExtensions = new Set([".cjs", ".css", ".js", ".json", ".md", ".mjs"]);

function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function getExtension(filePath) {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf("/");
  const lastDot = normalized.lastIndexOf(".");
  return lastDot > lastSlash ? normalized.slice(lastDot).toLowerCase() : "";
}

const files = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"))
  .map(normalizePath)
  .filter((filePath) => supportedExtensions.has(getExtension(filePath)));

if (files.length === 0) {
  process.stdout.write("Pass changed .js, .mjs, .cjs, .json, .md, or .css files after --.\n");
  process.exit(0);
}

const result = spawnSync(process.execPath, [prettierBin, mode, ...files], {
  cwd: process.cwd(),
  stdio: "inherit"
});

process.exit(result.status ?? 1);
