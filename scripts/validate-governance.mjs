import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const TEST_VERSION_PATTERN = /^\d+\.\d+\.\d+-test\.\d+$/;
const RELEASE_DOWNLOAD_PREFIX = "/releases/latest/download/";

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

function isStableVersion(version) {
  return STABLE_VERSION_PATTERN.test(String(version ?? "").trim());
}

function isTestVersion(version) {
  return TEST_VERSION_PATTERN.test(String(version ?? "").trim());
}

function validateManifestUrl(manifest, key, errors) {
  const value = String(manifest?.[key] ?? "").trim();
  if (!value) {
    errors.push(`Manifest ${key} URL is required.`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    errors.push(`Manifest ${key} must be a valid URL.`);
    return;
  }

  if (parsed.protocol !== "https:") {
    errors.push(`Manifest ${key} must use https.`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = String(args.mode ?? "ci")
    .trim()
    .toLowerCase();
  const expectedTag = String(args["expected-tag"] ?? "").trim();
  const manifestPath = path.join(repoRoot, "module.json");
  const readmePath = path.join(repoRoot, "README.md");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const readme = await readFile(readmePath, "utf8");
  const errors = [];

  const version = String(manifest?.version ?? "").trim();
  if (!version) {
    errors.push("Manifest version is required.");
  } else if (!isStableVersion(version) && !isTestVersion(version)) {
    errors.push("Manifest version must match x.y.z or x.y.z-test.n.");
  }

  const esmodules = Array.isArray(manifest?.esmodules)
    ? manifest.esmodules.map((entry) => String(entry ?? "").trim()).filter(Boolean)
    : [];
  if (esmodules.length !== 1 || esmodules[0] !== "scripts/module.js") {
    errors.push("Manifest esmodules must contain exactly scripts/module.js.");
  }
  if (esmodules.some((entry) => entry.endsWith(".ts"))) {
    errors.push("Manifest must not reference TypeScript files directly.");
  }
  if (esmodules.includes("scripts/party-operations.js")) {
    errors.push("Manifest must not use scripts/party-operations.js as the entrypoint.");
  }

  validateManifestUrl(manifest, "url", errors);
  validateManifestUrl(manifest, "manifest", errors);
  validateManifestUrl(manifest, "download", errors);

  const repoUrl = String(manifest?.url ?? "").trim();
  const manifestUrl = String(manifest?.manifest ?? "").trim();
  const downloadUrl = String(manifest?.download ?? "").trim();
  const readmeBuildMatch = readme.match(/The current repository manifest version is `([^`]+)`\./);
  if (!readmeBuildMatch) {
    errors.push("README Current Build line is required.");
  } else if (version && readmeBuildMatch[1] !== version) {
    errors.push(`README Current Build ${readmeBuildMatch[1]} must match manifest version ${version}.`);
  }
  if (repoUrl && manifestUrl && !manifestUrl.startsWith(`${repoUrl}${RELEASE_DOWNLOAD_PREFIX}`)) {
    errors.push("Manifest manifest URL must point at the repository latest release download path.");
  }
  if (repoUrl && downloadUrl && !downloadUrl.startsWith(`${repoUrl}${RELEASE_DOWNLOAD_PREFIX}`)) {
    errors.push("Manifest download URL must point at the repository latest release download path.");
  }

  if (mode === "release") {
    if (!isStableVersion(version)) {
      errors.push("Release mode requires a stable manifest version without a -test suffix.");
    }
    if (expectedTag && expectedTag !== `v${version}`) {
      errors.push(`Expected release tag v${version}, received ${expectedTag}.`);
    }
  } else if (mode !== "ci") {
    errors.push(`Unsupported governance validation mode: ${mode}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`governance validation passed (${mode})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
