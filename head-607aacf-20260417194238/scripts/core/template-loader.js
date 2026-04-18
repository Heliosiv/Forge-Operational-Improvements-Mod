import { PO_TEMPLATE_MAP } from "./window-config.js";

export const PO_PARTIAL_TEMPLATE_PATHS = Object.freeze([
  "modules/party-operations/templates/partials/gm-panel-nav.hbs",
  "modules/party-operations/templates/partials/rest-watch-player/simple-watch.hbs",
  "modules/party-operations/templates/partials/rest-watch-player/simple-march.hbs",
  "modules/party-operations/templates/partials/rest-watch-player/simple-loot.hbs",
  "modules/party-operations/templates/partials/rest-watch-player/simple-downtime.hbs",
  "modules/party-operations/templates/partials/rest-watch-player/classic.hbs"
]);

export function listPartyOperationsTemplatePaths({
  templateMap = PO_TEMPLATE_MAP,
  partialTemplatePaths = PO_PARTIAL_TEMPLATE_PATHS
} = {}) {
  return [...new Set([
    ...Object.values(templateMap ?? {}),
    ...partialTemplatePaths
  ])];
}

export async function validatePartyOperationsTemplates({
  templateMap = PO_TEMPLATE_MAP,
  partialTemplatePaths = PO_PARTIAL_TEMPLATE_PATHS,
  getTemplateFn = globalThis.getTemplate,
  logUiDebug = () => {},
  logError = console.error,
  moduleId = "party-operations"
} = {}) {
  for (const templatePath of listPartyOperationsTemplatePaths({ templateMap, partialTemplatePaths })) {
    try {
      await getTemplateFn(templatePath);
      logUiDebug("templates", "template resolved", { templatePath });
    } catch (error) {
      logError(`${moduleId}: failed to load template`, { templatePath, error });
    }
  }
}

export async function preloadPartyOperationsPartialTemplates({
  loadTemplatesFn = globalThis.loadTemplates,
  partialTemplatePaths = PO_PARTIAL_TEMPLATE_PATHS
} = {}) {
  if (typeof loadTemplatesFn !== "function") return;
  await loadTemplatesFn(partialTemplatePaths);
}
