import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const runtimeSource = readFileSync("scripts/party-operations.js", "utf8");
const gmLootTemplate = readFileSync("templates/gm-loot.hbs", "utf8");

assert.match(
  runtimeSource,
  /packs:\s*\[\s*buildLootManifestSourceEntry\(\{\s*enabled:\s*true\s*\}\)\s*\]/,
  "default loot source config should only use the built-items compendium"
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

assert.equal(
  gmLootTemplate.includes("Roll-Table Sources"),
  false,
  "GM Loot should not expose roll-table source controls when compendium-only mode is active"
);

assert.match(
  runtimeSource,
  /function getAvailableLootTableSources\(\) \{\s*return \[\];\s*\}/,
  "roll-table sources should stay disabled in the compendium-backed source path"
);

assert.match(
  runtimeSource,
  /String\(entry\?\.sourceKind \?\? "compendium-pack"\)[\s\S]+!== LOOT_WORLD_ITEMS_SOURCE_ID/,
  "loot candidate generation should filter out world-item source rows"
);

assert.match(
  runtimeSource,
  /function getMerchantWorldRarityPriceMultiplier/,
  "merchant pricing should read the same world rarity weights used by loot selection"
);

assert.equal(
  gmLootTemplate.includes("Item Pack Sources"),
  false,
  "GM Loot should not expose the old multi-pack source controls"
);

assert.match(
  gmLootTemplate,
  /data-action="set-loot-world-rarity-weight"/,
  "GM Loot should expose world rarity sliders for compendium outcomes"
);

process.stdout.write("loot compendium manifest source validation passed\n");
