import { runPartyOperationsReady } from "../core/lifecycle.js";

export function createPartyOperationsReadyHandler({
  buildReadyConfig,
  runReady = runPartyOperationsReady
} = {}) {
  return function onPartyOperationsReady() {
    const config = typeof buildReadyConfig === "function" ? buildReadyConfig() : {};
    return runReady(config);
  };
}
