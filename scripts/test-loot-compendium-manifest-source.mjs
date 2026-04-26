import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtimeSource = readFileSync("scripts/party-operations.js", "utf8");
const gmLootTemplate = readFileSync("templates/gm-loot.hbs", "utf8");

assert.match(
  runtimeSource,
  /packs:\s*\[\s*buildLootManifestSourceEntry\(\{\s*enabled:\s*true\s*\}\),\s*buildLootWorldItemSourceEntry\(\{\s*enabled:\s*false\s*\}\)\s*\]/,
  "default loot source config should prefer the built-items compendium and leave imported world items off"
);

assert.match(
  runtimeSource,
  /manifestPackId:\s*getLootManifestCompendiumPackId\(\)/,
  "default loot manifest selection should point at the built-items compendium"
);

assert.match(
  runtimeSource,
  /if\s*\(\s*isLootManifestManagedWorldFolderSelection\(id\)\s*\)\s*return\s+getLootManifestCompendiumPackId\(\)/,
  "legacy imported-world-folder selections should repair back to the compendium manifest"
);

assert.match(
  runtimeSource,
  /scheduleLootManifestCompendiumTypeFolderSync:\s*null/,
  "ready startup should not try to mutate read-only module compendium folders"
);

assert.equal(
  gmLootTemplate.includes('data-action="import-loot-manifest-compendium"'),
  false,
  "GM Loot should not offer the old import-to-world-folder loop"
);

assert.match(
  gmLootTemplate,
  /Built loot now runs directly from the Party Operations compendium\./,
  "GM Loot should explain that built loot is compendium-backed"
);

process.stdout.write("loot compendium manifest source validation passed\n");
