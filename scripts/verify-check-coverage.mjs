import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const packageJson = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"));
const runChecksSource = readFileSync(join(rootDir, "scripts", "run-checks.mjs"), "utf8");
const testFiles = readdirSync(join(rootDir, "scripts"))
  .filter((name) => /^test-.*\.mjs$/i.test(name))
  .sort();

assert.equal(
  packageJson?.scripts?.check,
  "node scripts/run-checks.mjs",
  "package.json check script should delegate to scripts/run-checks.mjs."
);

for (const fileName of testFiles) {
  assert(
    runChecksSource.includes(`scripts/${fileName}`),
    `scripts/run-checks.mjs should include ${fileName}.`
  );

  const matchingScriptEntry = Object.entries(packageJson?.scripts ?? {}).find(
    ([scriptName, command]) => scriptName.startsWith("check:") && command === `node scripts/${fileName}`
  );
  assert(
    matchingScriptEntry,
    `package.json should expose a check:* script for ${fileName}.`
  );
}

process.stdout.write(`check coverage validation passed (${testFiles.length} test files)\n`);
