import { recordNavigationRequest } from "../state/runtime-state.js";

const NAVIGATION_ACTIONS = Object.freeze([
  "openRestWatch",
  "openMarchingOrder",
  "openOperations",
  "openGm",
  "openLoot",
  "openMerchants",
  "openDowntime",
  "openAudio"
]);

function notifyRefactorShell(action, { uiRef = globalThis.ui } = {}) {
  const label = String(action ?? "navigation").replace(/^open/, "");
  uiRef?.notifications?.warn?.(`Party Operations ${label || "view"} is disabled during the modular rebuild.`);
}

function createNavigationAction(action, options = {}) {
  return function navigateWithRefactorStub(details = {}) {
    recordNavigationRequest(action, details);
    notifyRefactorShell(action, options);
    return false;
  };
}

export function createRefactorNavigationApi(options = {}) {
  return Object.fromEntries(NAVIGATION_ACTIONS.map((action) => [action, createNavigationAction(action, options)]));
}

export function getRefactorNavigationActionNames() {
  return [...NAVIGATION_ACTIONS];
}
