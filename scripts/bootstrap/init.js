import { runPartyOperationsInit } from "../core/lifecycle.js";

export function createPartyOperationsInitHandler({
  installAppBehaviors,
  buildInitConfig,
  runInit = runPartyOperationsInit
} = {}) {
  return function onPartyOperationsInit() {
    if (typeof installAppBehaviors === "function") installAppBehaviors();
    const config = typeof buildInitConfig === "function" ? buildInitConfig() : {};
    return runInit(config);
  };
}
