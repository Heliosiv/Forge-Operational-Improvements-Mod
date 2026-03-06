import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectTopLevelTemplates() {
  const templatesDir = path.join(repoRoot, "templates");
  const entries = await readdir(templatesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".hbs")
    .map((entry) => `templates/${entry.name}`)
    .sort();
}

async function validateManifestPaths(manifest, listKey, mapper = (value) => value) {
  const errors = [];
  const entries = Array.isArray(manifest?.[listKey]) ? manifest[listKey] : [];
  for (const entry of entries) {
    const relativePath = mapper(entry);
    if (!relativePath) continue;
    const absolutePath = path.resolve(repoRoot, relativePath);
    if (!(await pathExists(absolutePath))) {
      errors.push(`Missing ${listKey} path: ${relativePath}`);
    }
  }
  return errors;
}

async function main() {
  const manifestPath = path.join(repoRoot, "module.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const errors = [];

  if (!String(manifest?.id ?? "").trim()) errors.push("Manifest id is required.");
  if (!String(manifest?.version ?? "").trim()) errors.push("Manifest version is required.");
  if (!Array.isArray(manifest?.esmodules) || manifest.esmodules.length === 0) {
    errors.push("Manifest must declare at least one esmodule.");
  }

  errors.push(...await validateManifestPaths(manifest, "esmodules"));
  errors.push(...await validateManifestPaths(manifest, "styles"));
  errors.push(...await validateManifestPaths(manifest, "templates"));
  errors.push(...await validateManifestPaths(manifest, "packs", (entry) => entry?.path));

  const declaredTemplates = new Set((Array.isArray(manifest?.templates) ? manifest.templates : []).map((entry) => String(entry)));
  const topLevelTemplates = await collectTopLevelTemplates();
  for (const templatePath of topLevelTemplates) {
    if (!declaredTemplates.has(templatePath)) {
      errors.push(`Top-level template is not declared in module.json: ${templatePath}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("module.json validation passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
