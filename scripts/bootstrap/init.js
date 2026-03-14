import { runPartyOperationsInit } from "../core/lifecycle.js";

export function createPartyOperationsInitHandler({
  installAppBehaviors,
  buildInitConfig,
  runInit = runPartyOperationsInit
} = {}) {
  return function onPartyOperationsInit() {
    if (typeof installAppBehaviors === "function") {
      try {
        installAppBehaviors();
      } catch (error) {
        console.warn("party-operations: failed to install app behaviors", error);
      }
    }
    const config = typeof buildInitConfig === "function" ? buildInitConfig() : {};
    return runInit(config);
  };
}
