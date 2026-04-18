import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) continue;
    const key = entry.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

async function walkFiles(rootDir, options = {}) {
  const skipNames = new Set(options.skipNames ?? []);
  const files = [];
  const pending = [rootDir];
  while (pending.length > 0) {
    const currentDir = pending.pop();
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (skipNames.has(entry.name)) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
        continue;
      }
      if (entry.isFile()) files.push(fullPath);
    }
  }
  return files;
}

function normalizePath(value = "") {
  return path.resolve(String(value ?? ""));
}

async function removeOldArchives(rootDir, keepPaths = []) {
  const keep = new Set(keepPaths.map((entry) => normalizePath(entry)));
  const files = await walkFiles(rootDir, {
    skipNames: [".git", "node_modules"]
  });
  for (const filePath of files) {
    const normalized = normalizePath(filePath);
    if (keep.has(normalized)) continue;
    const lowerName = path.basename(normalized).toLowerCase();
    const shouldDelete = lowerName.endsWith(".zip")
      || lowerName.endsWith(".zip.old")
      || lowerName.endsWith(".zip.sha256.txt")
      || lowerName.endsWith(".sha256.txt");
    if (!shouldDelete) continue;
    await rm(normalized, { force: true });
  }
}

async function ensureFileExists(filePath) {
  await stat(filePath);
}

async function writeReleaseNotes(outputDir, version) {
  const content = [
    "# Party Operations Release Notes",
    "",
    `Release: v${String(version ?? "").trim() || "dev"}`
  ].join("\n") + "\n";
  await writeFile(path.join(outputDir, "RELEASE_NOTES.md"), content, "utf8");
  await writeFile(path.join(outputDir, "staging", "RELEASE_NOTES.md"), content, "utf8");
}

async function writeDeployReadme(outputDir) {
  const content = [
    "# Party Operations Deployment",
    "",
    "Deploy and distribute using `release/module.zip` only.",
    "",
    "- `module.zip` is the canonical release artifact.",
    "- Every `npm run prepare:release` run overwrites that same zip.",
    "- Do not keep or publish versioned zip copies.",
    "- `RELEASE_NOTES.md` contains the current release label bundled with the zip.",
    "",
    "Canonical command:",
    "",
    "```powershell",
    "npm run prepare:release",
    "```"
  ].join("\n") + "\n";
  await writeFile(path.join(outputDir, "README.md"), content, "utf8");
  await writeFile(path.join(outputDir, "staging", "README.md"), content, "utf8");
}

async function writeSha256(zipPath) {
  const data = await readFile(zipPath);
  const hash = createHash("sha256").update(data).digest("hex");
  await writeFile(`${zipPath}.sha256.txt`, `${hash}\n`, "utf8");
}

function runPreparePackage(manifestPath, outputDir) {
  const result = spawnSync(process.execPath, [
    path.join(repoRoot, "scripts", "prepare-package.mjs"),
    "--manifest",
    manifestPath,
    "--output",
    outputDir
  ], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`prepare-package.mjs failed with exit code ${result.status ?? 1}`);
  }
}

function runCompressArchive(stagingDir, zipPath) {
  const escapedStaging = stagingDir.replace(/'/g, "''");
  const escapedZip = zipPath.replace(/'/g, "''");
  const command = [
    "$ErrorActionPreference = 'Stop'",
    `if (Test-Path '${escapedZip}') { Remove-Item '${escapedZip}' -Force }`,
    `Compress-Archive -Path (Join-Path '${escapedStaging}' '*') -DestinationPath '${escapedZip}' -CompressionLevel Optimal`
  ].join("; ");
  const result = spawnSync("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    command
  ], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(`Compress-Archive failed with exit code ${result.status ?? 1}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(repoRoot, String(args.manifest ?? "module.json"));
  const outputDir = path.resolve(repoRoot, String(args.output ?? "release"));
  const stagingDir = path.join(outputDir, "staging");
  const zipPath = path.join(outputDir, "module.zip");
  const zipShaPath = `${zipPath}.sha256.txt`;

  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  await mkdir(outputDir, { recursive: true });
  await removeOldArchives(repoRoot, [zipPath, zipShaPath]);
  runPreparePackage(manifestPath, outputDir);
  await writeReleaseNotes(outputDir, manifest?.version);
  await writeDeployReadme(outputDir);
  await ensureFileExists(path.join(stagingDir, "module.json"));
  runCompressArchive(stagingDir, zipPath);
  await writeSha256(zipPath);

  console.log(`Prepared canonical release zip at ${path.relative(repoRoot, zipPath).split(path.sep).join("/")}`);
  console.log(`Prepared release notes for version ${String(manifest?.version ?? "").trim() || "dev"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
