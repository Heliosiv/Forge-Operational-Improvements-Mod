import { createPartyOperationsInitHandler } from "./init.js";
import { createPartyOperationsReadyHandler } from "./ready.js";

export function createLegacyBootstrapLoader(importLegacyModule = () => import("../legacy/bootstrap-bridge.js")) {
  let legacyBootstrapModulePromise = null;

  return async function loadLegacyBootstrapModule() {
    legacyBootstrapModulePromise ??= Promise.resolve().then(() => importLegacyModule());
    return legacyBootstrapModulePromise;
  };
}

export function createLazyPartyOperationsInitHandler({
  loadLegacyBootstrapModule = createLegacyBootstrapLoader(),
  createInitHandler = createPartyOperationsInitHandler
} = {}) {
  return async function onPartyOperationsInit() {
    const legacyBootstrap = await loadLegacyBootstrapModule();
    const initHandler = createInitHandler({
      installAppBehaviors: legacyBootstrap.installLegacyAppBehaviors,
      buildInitConfig: legacyBootstrap.buildLegacyPartyOperationsInitConfig
    });
    return initHandler();
  };
}

export function createLazyPartyOperationsReadyHandler({
  loadLegacyBootstrapModule = createLegacyBootstrapLoader(),
  createReadyHandler = createPartyOperationsReadyHandler
} = {}) {
  return async function onPartyOperationsReady() {
    const legacyBootstrap = await loadLegacyBootstrapModule();
    const readyHandler = createReadyHandler({
      buildReadyConfig: legacyBootstrap.buildLegacyPartyOperationsReadyConfig
    });
    return readyHandler();
  };
}

const loadLegacyBootstrapModule = createLegacyBootstrapLoader();

// Keep the Foundry entrypoint small while the legacy module is decomposed behind this bridge.
export const onPartyOperationsInit = createLazyPartyOperationsInitHandler({
  loadLegacyBootstrapModule
});

export const onPartyOperationsReady = createLazyPartyOperationsReadyHandler({
  loadLegacyBootstrapModule
});
