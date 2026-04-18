import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
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

function toRepoPath(targetPath) {
  return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureListedPathsExist(manifest, listKey, mapper = (value) => value) {
  const entries = Array.isArray(manifest?.[listKey]) ? manifest[listKey] : [];
  for (const entry of entries) {
    const relativePath = mapper(entry);
    if (!relativePath) continue;
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (!(await pathExists(absolutePath))) {
      throw new Error(`Manifest ${listKey} path is missing: ${relativePath}`);
    }
  }
}

async function copyRuntimeScripts(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  await cp(sourceDir, targetDir, {
    recursive: true,
    filter(sourcePath) {
      const sourceStatsPath = path.resolve(sourcePath);
      const relativePath = path.relative(sourceDir, sourceStatsPath);
      if (!relativePath || relativePath === ".") return true;
      const normalized = relativePath.split(path.sep).join("/");
      const ext = path.extname(sourceStatsPath).toLowerCase();
      if (!ext) return true;
      return ext === ".js";
    }
  });
}

async function copyDeclaredPackAssets(manifest, stagingDir) {
  const packs = Array.isArray(manifest?.packs) ? manifest.packs : [];
  for (const pack of packs) {
    const relativePath = String(pack?.path ?? "").trim();
    if (!relativePath) continue;
    const sourcePath = path.resolve(repoRoot, relativePath);
    const targetPath = path.resolve(stagingDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await cp(sourcePath, targetPath, { recursive: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const manifestPath = path.resolve(repoRoot, String(args.manifest ?? "module.json"));
  const outputDir = path.resolve(repoRoot, String(args.output ?? "release"));
  const stagingDir = path.join(outputDir, "staging");

  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  await ensureListedPathsExist(manifest, "esmodules");
  await ensureListedPathsExist(manifest, "styles");
  await ensureListedPathsExist(manifest, "templates");
  await ensureListedPathsExist(manifest, "packs", (entry) => entry?.path);

  await rm(stagingDir, { recursive: true, force: true });
  await mkdir(stagingDir, { recursive: true });

  const outputManifestPath = path.join(outputDir, "module.json");
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(path.join(stagingDir, "module.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const scriptsDir = path.join(repoRoot, "scripts");
  if (await pathExists(scriptsDir)) {
    await copyRuntimeScripts(scriptsDir, path.join(stagingDir, "scripts"));
  }

  for (const directoryName of ["styles", "templates"]) {
    const sourcePath = path.join(repoRoot, directoryName);
    if (!(await pathExists(sourcePath))) continue;
    await cp(sourcePath, path.join(stagingDir, directoryName), { recursive: true });
  }

  await copyDeclaredPackAssets(manifest, stagingDir);

  console.log(`Prepared package staging at ${toRepoPath(stagingDir)}`);
  console.log(`Prepared manifest at ${toRepoPath(outputManifestPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
