import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_INTERVAL_MS = 30 * 1000;

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

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "party-operations-release-publication-check",
      "Cache-Control": "no-cache"
    },
    redirect: "follow"
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}: ${text.slice(0, 240)}`);
  }
  return text;
}

async function fetchJson(url) {
  const text = await fetchText(url);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${url} did not return valid JSON: ${error instanceof Error ? error.message : String(error)}`, {
      cause: error
    });
  }
}

function extractFieldVersion(block, field) {
  const escapedPattern = new RegExp(`&quot;${field}&quot;\\s*:\\s*&quot;([^&]+)&quot;`);
  const escapedMatch = escapedPattern.exec(block);
  if (escapedMatch) return escapedMatch[1];

  const jsonPattern = new RegExp(`"${field}"\\s*:\\s*"([^"]+)"`);
  const jsonMatch = jsonPattern.exec(block);
  return jsonMatch?.[1] ?? "";
}

function extractForgePackageBlock(html, packageId) {
  const escapedMarker = `&quot;id&quot;:&quot;${packageId}&quot;`;
  const jsonMarker = `"id":"${packageId}"`;
  const markerIndex = html.indexOf(escapedMarker) >= 0 ? html.indexOf(escapedMarker) : html.indexOf(jsonMarker);
  if (markerIndex < 0) return "";

  const tail = html.slice(markerIndex);
  const escapedNext = tail.indexOf("},{&quot;type&quot;:", 1);
  const jsonNext = tail.indexOf('},{"type":', 1);
  const nextIndexes = [escapedNext, jsonNext].filter((index) => index > 0);
  const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : Math.min(tail.length, 120000);
  return tail.slice(0, endIndex);
}

function readForgePublication(html, packageId, version) {
  const packageBlock = extractForgePackageBlock(html, packageId);
  if (!packageBlock) {
    return {
      ok: false,
      message: `Forge Bazaar did not include package ${packageId}.`
    };
  }

  const latest = extractFieldVersion(packageBlock, "latest");
  const manifestVersionMatch =
    /&quot;manifest&quot;\s*:\s*\{[\s\S]*?&quot;version&quot;\s*:\s*&quot;([^&]+)&quot;/.exec(packageBlock) ??
    /"manifest"\s*:\s*\{[\s\S]*?"version"\s*:\s*"([^"]+)"/.exec(packageBlock);
  const manifestVersion = manifestVersionMatch?.[1] ?? "";
  const hasVersion =
    packageBlock.includes(`&quot;${version}&quot;`) ||
    packageBlock.includes(`"${version}"`) ||
    packageBlock.includes(`/releases/download/v${version}/module.json`);

  const ok = latest === version && manifestVersion === version && hasVersion;
  return {
    ok,
    latest,
    manifestVersion,
    hasVersion,
    message: ok
      ? `Forge Bazaar lists ${packageId} ${version}.`
      : `Forge Bazaar stale for ${packageId}: latest=${latest || "missing"}, manifest=${manifestVersion || "missing"}, hasVersion=${hasVersion}.`
  };
}

async function waitForCheck(label, timeoutMs, intervalMs, checkFn) {
  const deadline = Date.now() + timeoutMs;
  let lastMessage;
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      const result = await checkFn();
      lastMessage = result?.message ?? "no detail";
      if (result?.ok) {
        console.log(`${label}: ${lastMessage}`);
        return result;
      }
    } catch (error) {
      lastMessage = error instanceof Error ? error.message : String(error);
    }

    if (Date.now() >= deadline || timeoutMs === 0) {
      throw new Error(`${label} did not verify within ${timeoutMs}ms. Last result: ${lastMessage ?? "not checked"}`);
    }

    const remainingMs = Math.max(0, deadline - Date.now());
    const waitMs = Math.min(intervalMs, remainingMs);
    console.log(`${label}: attempt ${attempt} not ready. ${lastMessage} Waiting ${Math.round(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(repoRoot, String(args.manifest ?? "module.json"));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const packageId = String(args.id ?? manifest?.id ?? "").trim();
  const version = String(args.version ?? manifest?.version ?? "").trim();
  const repoUrl = String(args.repo ?? manifest?.url ?? "")
    .trim()
    .replace(/\/+$/, "");
  const requireForge = args["require-forge"] === true || args.requireForge === true;
  const skipForge = args["skip-forge"] === true || args.skipForge === true;
  const timeoutMs = parsePositiveInteger(args["timeout-ms"] ?? args.timeoutMs, DEFAULT_TIMEOUT_MS);
  const intervalMs = parsePositiveInteger(args["interval-ms"] ?? args.intervalMs, DEFAULT_INTERVAL_MS);

  if (!packageId) throw new Error("Package id is required.");
  if (!version) throw new Error("Package version is required.");
  if (!repoUrl) throw new Error("Repository URL is required.");

  const latestManifestUrl = `${repoUrl}/releases/latest/download/module.json`;
  const taggedManifestUrl = `${repoUrl}/releases/download/v${version}/module.json`;
  const foundryPackageUrl = `https://foundryvtt.com/packages/${packageId}`;
  const forgePackageUrl = `https://forge-vtt.com/bazaar/package/${packageId}`;

  const latestManifest = await fetchJson(latestManifestUrl);
  if (String(latestManifest?.version ?? "") !== version) {
    throw new Error(`GitHub latest manifest is ${latestManifest?.version ?? "missing"}, expected ${version}.`);
  }
  console.log(`GitHub latest manifest: ${version}`);

  const taggedManifest = await fetchJson(taggedManifestUrl);
  if (String(taggedManifest?.version ?? "") !== version) {
    throw new Error(`GitHub tagged manifest is ${taggedManifest?.version ?? "missing"}, expected ${version}.`);
  }
  console.log(`GitHub tagged manifest: ${version}`);

  await waitForCheck("Foundry package listing", timeoutMs, intervalMs, async () => {
    const html = await fetchText(`${foundryPackageUrl}?partyOpsReleaseCheck=${Date.now()}`);
    const hasVersion = html.includes(`Version ${version}`);
    const hasManifest = html.includes(`/releases/download/v${version}/module.json`);
    return {
      ok: hasVersion && hasManifest,
      message: `hasVersion=${hasVersion}, hasManifest=${hasManifest}`
    };
  });

  if (!skipForge) {
    const checkForge = async () => {
      const html = await fetchText(`${forgePackageUrl}?partyOpsReleaseCheck=${Date.now()}`);
      return readForgePublication(html, packageId, version);
    };

    if (requireForge) {
      await waitForCheck("Forge Bazaar listing", timeoutMs, intervalMs, checkForge);
    } else {
      const result = await checkForge();
      if (result.ok) {
        console.log(`Forge Bazaar listing: ${result.message}`);
      } else {
        console.warn(`Forge Bazaar listing: ${result.message}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
