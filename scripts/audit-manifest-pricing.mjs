#!/usr/bin/env node
/**
 * One-shot audit script: checks every item in the loot manifest for
 * pricing, rarity, lootType, and lootWeight problems.
 * Run: node scripts/audit-manifest-pricing.mjs
 */
import fs from "node:fs";
import path from "node:path";

const DB = path.resolve(process.cwd(), "packs", "party-operations-loot-manifest.db");
const OUT = path.resolve(process.cwd(), "audit-report.txt");
const lines = fs.readFileSync(DB, "utf8").trim().split("\n");
const db = lines.map((l) => JSON.parse(l));
const po = (i) => i.flags?.["party-operations"] ?? {};
const output = [];

const log = (msg) => output.push(msg);

const issues = [];
const flag = (item, tag, msg) => issues.push({ name: item.name, type: item.type, id: item.system?.identifier, tag, msg });

const PERM = new Set(["weapon", "equipment", "tool", "container"]);
const RARITY_FLOOR = { rare: 750, "very-rare": 5000, legendary: 25000 };
const RARITY_CEIL  = { common: 200, uncommon: 2000, rare: 20000, "very-rare": 100000, legendary: 500000 };

for (const item of db) {
  const f = po(item);
  const gp = f.gpValue ?? 0;
  const rar = f.rarityNormalized ?? "";
  const lt = f.lootType ?? "";
  const wt = f.lootWeight ?? 0;
  const eligible = f.lootEligible !== false;

  // 1. Zero or negative price on eligible items
  if (gp <= 0 && eligible) flag(item, "ZERO_PRICE", `gpValue=${gp}`);

  // 2. Rarity mismatch between system.rarity and rarityNormalized
  const sysR = String(item.system?.rarity ?? "").toLowerCase().replace(/\s/g, "");
  const normSys = sysR === "veryrare" ? "very-rare" : sysR;
  if (normSys && rar && normSys !== rar) flag(item, "RARITY_MISMATCH", `system=${item.system.rarity} normalized=${rar}`);

  // 3. Permanent items below rarity floor
  if (PERM.has(item.type) && eligible) {
    const floor = RARITY_FLOOR[rar];
    if (floor && gp < floor) flag(item, "BELOW_FLOOR", `${gp}gp < ${floor}gp floor for ${rar} ${item.type}`);
  }

  // 4. Items above rarity ceiling
  if (eligible) {
    const ceil = RARITY_CEIL[rar];
    if (ceil && gp > ceil) flag(item, "ABOVE_CEIL", `${gp}gp > ${ceil}gp ceiling for ${rar}`);
  }

  // 5. Missing or empty lootType
  if (!lt) flag(item, "NO_LOOTTYPE", "lootType is empty");

  // 6. lootWeight outside expected range
  if (wt < 0.05 || wt > 2.5) flag(item, "BAD_WEIGHT", `lootWeight=${wt}`);

  // 7. Potion-classified items that are not actually potions
  if (lt === "loot.potion") {
    const sub = String(item.system?.type?.value ?? "").toLowerCase();
    if (sub !== "potion" && sub !== "poison") flag(item, "BAD_POTION_TYPE", `lootType=loot.potion but subtype=${sub}`);
  }

  // 8. Missing valueBand
  if (!f.valueBand) flag(item, "NO_VALUEBAND", "valueBand is empty");

  // 9. Missing rarityNormalized on items with a system rarity
  if (sysR && !rar) flag(item, "MISSING_NORM_RARITY", `system.rarity=${item.system.rarity} but no rarityNormalized`);

  // 10. Suspiciously identical prices across different rarity tiers
  // (caught by floor/ceiling, but let's also flag common items priced as rare+)
  if (rar === "common" && gp > 100 && eligible) flag(item, "EXPENSIVE_COMMON", `common item at ${gp}gp`);

  // 11. Missing merchantCategories
  if (!Array.isArray(f.merchantCategories) || f.merchantCategories.length === 0) flag(item, "NO_MERCHANT_CATS", "empty merchantCategories");

  // 12. Check lootType classification matches item.type
  if (item.type === "weapon" && !lt.includes("weapon") && !lt.includes("spell")) flag(item, "TYPE_MISMATCH", `type=weapon but lootType=${lt}`);
  if (item.type === "equipment" && !lt.includes("equipment") && !lt.includes("armor") && !lt.includes("spell")) flag(item, "TYPE_MISMATCH", `type=equipment but lootType=${lt}`);
  if (item.type === "spell" && !lt.includes("spell")) flag(item, "TYPE_MISMATCH", `type=spell but lootType=${lt}`);
}

// Print summary
const byTag = {};
for (const iss of issues) {
  if (!byTag[iss.tag]) byTag[iss.tag] = [];
  byTag[iss.tag].push(iss);
}

log(`======== LOOT MANIFEST AUDIT ========`);
log(`Total items: ${db.length}`);
log(`Total issues: ${issues.length}`);
log(``);

for (const [tag, list] of Object.entries(byTag).sort((a, b) => b[1].length - a[1].length)) {
  log(`--- ${tag} (${list.length}) ---`);
  list.sort((a, b) => a.name.localeCompare(b.name)).forEach((iss) => {
    log(`  ${iss.name} (${iss.type}): ${iss.msg}`);
  });
  log(``);
}

// Also print overall stats
const bands = {};
const rarities = {};
const types = {};
for (const item of db) {
  const f = po(item);
  bands[f.valueBand] = (bands[f.valueBand] || 0) + 1;
  rarities[f.rarityNormalized || "none"] = (rarities[f.rarityNormalized || "none"] || 0) + 1;
  types[f.lootType || "none"] = (types[f.lootType || "none"] || 0) + 1;
}
log("--- VALUE BAND DISTRIBUTION ---");
for (const [k, v] of Object.entries(bands).sort()) log(`  ${k}: ${v}`);
log("");
log("--- RARITY DISTRIBUTION ---");
for (const [k, v] of Object.entries(rarities).sort()) log(`  ${k}: ${v}`);
log("");
log("--- LOOT TYPE DISTRIBUTION (top 20) ---");
for (const [k, v] of Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 20)) log(`  ${k}: ${v}`);

fs.writeFileSync(OUT, output.join("\n"), "utf8");
console.log(`Audit written to ${OUT}`);
