import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gmShellCss = readFileSync("styles/po-gm-shell.css", "utf8");

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
assert.match(gmShellCss, /clip-path:\s*none;/, "GM main header tabs should not use the large arrow treatment");

process.stdout.write("gm compact navigation css validation passed\n");
