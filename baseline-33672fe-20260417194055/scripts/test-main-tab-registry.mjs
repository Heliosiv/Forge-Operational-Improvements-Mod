import assert from "node:assert/strict";

import { createMainTabRegistry } from "./features/main-tab-registry.js";

const registry = createMainTabRegistry({
  templateMap: {
    "rest-watch": "templates/rest-watch.hbs",
    "marching-order": "templates/marching-order.hbs"
  }
});

assert.equal(registry.getTemplateForMainTab("rest-watch"), "templates/rest-watch.hbs");
assert.equal(registry.getTemplateForMainTab("operations"), "templates/rest-watch.hbs");
assert.equal(registry.normalizeMainTabId("march"), "marching-order");
assert.equal(registry.normalizeMainTabId("unknown", "operations"), "operations");
assert.equal(registry.normalizeSwitchTabId("marching-order"), "march");
assert.equal(registry.getSwitchTabIdFromMainTabId("gm"), "gm");
assert.equal(registry.getMainTabIdFromAction("rest"), "rest-watch");
assert.equal(registry.getMainTabIdFromAction("missing"), null);
assert.deepEqual(Array.from(registry.mainTabIds), ["rest-watch", "marching-order", "operations", "gm"]);

process.stdout.write("main tab registry validation passed\n");
