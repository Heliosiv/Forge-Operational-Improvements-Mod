import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gmShellCss = readFileSync("styles/po-gm-shell.css", "utf8");
const moduleCss = readFileSync("styles/party-operations.css", "utf8");

function getRuleBlocks(css, selectorFragment) {
  const blocks = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    if (!selector.includes(selectorFragment)) continue;
    blocks.push({ selector, body: match[2] });
  }
  return blocks;
}

assert.match(
  gmShellCss,
  /\.po-window\[data-tool="operations-shell"\]\[data-main-tab="gm"\]/,
  "compact GM navigation must target the operations-shell host used by the GM cockpit"
);
assert.match(
  gmShellCss,
  /\.party-operations#marching-order-app \.po-tabs\.po-gm-panel-tabs\.po-gm-ops-tabs/,
  "compact GM navigation must target Foundry hosts where party-operations and marching-order-app are on the same element"
);
assert.match(
  gmShellCss,
  /grid-template-columns:\s*none !important;/,
  "compact GM navigation must explicitly disable older grid tab layouts"
);
assert.match(
  gmShellCss,
  /\.po-tabs\.po-gm-panel-tabs\.po-gm-ops-tabs\s*\{[\s\S]*?display:\s*flex;/,
  "base GM navigation should render as wrapped compact buttons before late overrides"
);
assert.match(
  gmShellCss,
  /\.po-tabs\.po-gm-panel-tabs\.po-gm-ops-tabs\s*\{[\s\S]*?grid-template-columns:\s*none;/,
  "base GM navigation should not start as a wide grid"
);
assert.match(
  gmShellCss,
  /\.po-tabs\.po-gm-panel-tabs\.po-gm-ops-tabs\s+\.po-tab\s*\{[\s\S]*?min-height:\s*30px;/,
  "base GM navigation tabs should stay compact instead of using tall slabs"
);
assert.match(gmShellCss, /clip-path:\s*none;/, "GM main header tabs should not use the large arrow treatment");
assert.match(
  moduleCss,
  /\.po-tabs-sub\.po-planning-tabs\s*\{[\s\S]*?display:\s*flex;/,
  "planning subtabs should also render as compact wrapped buttons"
);
assert.doesNotMatch(
  moduleCss.match(/\.po-tabs-sub\.po-planning-tabs\s*\{[\s\S]*?\}/)?.[0] ?? "",
  /grid-template-columns/,
  "planning subtabs should not reserve full grid columns for every label"
);
assert.match(
  moduleCss,
  /:is\(\[data-tool="gm-merchants"\], \[data-tool="gm-loot"\]\) \.po-gm-panel-tabs\s*\{[\s\S]*?display:\s*flex;/,
  "merchant and loot GM tabs should share the compact flex row behavior"
);
assert.doesNotMatch(
  moduleCss.match(
    /:is\(\[data-tool="gm-merchants"\], \[data-tool="gm-loot"\]\) \.po-gm-panel-tabs\s*\{[\s\S]*?\}/
  )?.[0] ?? "",
  /grid-template-columns/,
  "merchant and loot GM tabs should not reintroduce the older full-width grid treatment"
);
assert.equal(
  getRuleBlocks(moduleCss, ".po-gm-panel-tabs").filter(({ body }) => /grid-template-columns/.test(body)).length,
  0,
  "module CSS should not force GM tabs back into grid columns"
);
assert.equal(
  getRuleBlocks(moduleCss, ".po-gm-panel-tabs .po-tab").filter(({ body }) =>
    /flex:\s*1\s+1|flex-basis:\s*100%/.test(body)
  ).length,
  0,
  "narrow screens should wrap GM tabs as word-sized buttons instead of stretching them"
);

process.stdout.write("gm compact navigation css validation passed\n");
