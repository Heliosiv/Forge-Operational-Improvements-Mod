import assert from "node:assert/strict";

import {
  PO_PARTIAL_TEMPLATE_PATHS,
  listPartyOperationsTemplatePaths,
  preloadPartyOperationsPartialTemplates,
  validatePartyOperationsTemplates
} from "./core/template-loader.js";

assert.ok(Array.isArray(PO_PARTIAL_TEMPLATE_PATHS));

{
  const paths = listPartyOperationsTemplatePaths({
    templateMap: { a: "path/a.hbs", b: "path/b.hbs" },
    partialTemplatePaths: ["path/a.hbs", "path/c.hbs"]
  });
  assert.deepEqual(paths, ["path/a.hbs", "path/b.hbs", "path/c.hbs"]);
}

{
  const loaded = [];
  await preloadPartyOperationsPartialTemplates({
    partialTemplatePaths: ["path/a.hbs", "path/b.hbs"],
    loadTemplatesFn(paths) {
      loaded.push(...paths);
    }
  });
  assert.deepEqual(loaded, ["path/a.hbs", "path/b.hbs"]);
}

{
  const resolved = [];
  const errors = [];
  await validatePartyOperationsTemplates({
    templateMap: { one: "path/a.hbs" },
    partialTemplatePaths: ["path/b.hbs"],
    async getTemplateFn(path) {
      resolved.push(path);
      if (path === "path/b.hbs") throw new Error("missing");
    },
    logUiDebug: () => {},
    logError: (...args) => errors.push(args)
  });
  assert.deepEqual(resolved, ["path/a.hbs", "path/b.hbs"]);
  assert.equal(errors.length, 1);
}
