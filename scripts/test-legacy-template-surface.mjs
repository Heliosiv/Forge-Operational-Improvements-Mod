import assert from "node:assert/strict";

import {
  PO_PARTIAL_TEMPLATE_PATHS,
  listPartyOperationsTemplatePaths,
  preloadPartyOperationsPartialTemplates,
  validatePartyOperationsTemplates
} from "./legacy/template-surface.js";

{
  const templatePaths = listPartyOperationsTemplatePaths({
    templateMap: {
      a: "templates/a.hbs",
      b: "templates/b.hbs",
      c: "templates/a.hbs"
    },
    partialTemplatePaths: ["partials/x.hbs", "partials/x.hbs", "partials/y.hbs"]
  });

  assert.deepEqual(templatePaths, [
    "templates/a.hbs",
    "templates/b.hbs",
    "partials/x.hbs",
    "partials/y.hbs"
  ]);
}

{
  const loadedTemplates = [];
  const debugLogs = [];
  const errors = [];

  await validatePartyOperationsTemplates({
    templateMap: {
      base: "templates/base.hbs"
    },
    partialTemplatePaths: ["partials/good.hbs", "partials/bad.hbs"],
    async getTemplateFn(templatePath) {
      loadedTemplates.push(templatePath);
      if (templatePath === "partials/bad.hbs") throw new Error("missing");
      return templatePath;
    },
    logUiDebug(scope, message, payload) {
      debugLogs.push({ scope, message, payload });
    },
    logError(...args) {
      errors.push(args);
    },
    moduleId: "party-operations"
  });

  assert.deepEqual(loadedTemplates, [
    "templates/base.hbs",
    "partials/good.hbs",
    "partials/bad.hbs"
  ]);
  assert.deepEqual(debugLogs, [
    {
      scope: "templates",
      message: "template resolved",
      payload: { templatePath: "templates/base.hbs" }
    },
    {
      scope: "templates",
      message: "template resolved",
      payload: { templatePath: "partials/good.hbs" }
    }
  ]);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], "party-operations: failed to load template");
  assert.equal(errors[0][1].templatePath, "partials/bad.hbs");
}

{
  let loaded = null;

  await preloadPartyOperationsPartialTemplates({
    async loadTemplatesFn(templatePaths) {
      loaded = templatePaths;
    }
  });

  assert.deepEqual(loaded, PO_PARTIAL_TEMPLATE_PATHS);
}

{
  await preloadPartyOperationsPartialTemplates({
    loadTemplatesFn: null
  });
}
