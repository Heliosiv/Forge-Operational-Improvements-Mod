import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoint = "https://foundryvtt.com/_api/packages/release_version/";

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

function getReleaseToken() {
  return String(process.env.FOUNDRY_PACKAGE_RELEASE_TOKEN ?? process.env.FVTT_PACKAGE_RELEASE_TOKEN ?? "").trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(repoRoot, String(args.manifest ?? "module.json"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const version = String(args.version ?? manifest?.version ?? "").trim();
  const packageId = String(args.id ?? manifest?.id ?? "").trim();
  const token = getReleaseToken();

  if (!packageId) throw new Error("Package id is required.");
  if (!version) throw new Error("Package version is required.");
  if (!token) {
    throw new Error("FOUNDRY_PACKAGE_RELEASE_TOKEN is required to publish the official Foundry package version.");
  }

  const release = {
    version,
    manifest: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/download/v${version}/module.json`,
    notes: `https://github.com/Heliosiv/Forge-Operational-Improvements-Mod/releases/tag/v${version}`,
    compatibility: {
      minimum: String(manifest?.compatibility?.minimum ?? "").trim(),
      verified: String(manifest?.compatibility?.verified ?? "").trim(),
      maximum: String(manifest?.compatibility?.maximum ?? "").trim()
    }
  };

  const dryRun = args["dry-run"] === true || args.dryRun === true;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({
      id: packageId,
      "dry-run": dryRun,
      release
    })
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseData = responseText;
  }

  if (!response.ok) {
    throw new Error(
      `Foundry package release publish failed (${response.status} ${response.statusText}): ${JSON.stringify(responseData)}`
    );
  }

  console.log(
    `${dryRun ? "Validated" : "Published"} Foundry package release ${packageId} v${version}: ${JSON.stringify(responseData)}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
