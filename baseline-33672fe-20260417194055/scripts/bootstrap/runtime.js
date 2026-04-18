import { createPartyOperationsInitHandler } from "./init.js";
import { createPartyOperationsReadyHandler } from "./ready.js";

export function createPartyOperationsBootstrapLoader(importBootstrapModule = () => import("../party-operations.js")) {
  let bootstrapModulePromise = null;

  return async function loadBootstrapModule() {
    bootstrapModulePromise ??= Promise.resolve().then(() => importBootstrapModule());
    return bootstrapModulePromise;
  };
}

export function createLazyPartyOperationsInitHandler({
  loadBootstrapModule = createPartyOperationsBootstrapLoader(),
  createInitHandler = createPartyOperationsInitHandler
} = {}) {
  return async function onPartyOperationsInit() {
    const bootstrapModule = await loadBootstrapModule();
    const initHandler = createInitHandler({
      installAppBehaviors: bootstrapModule.installPartyOperationsAppBehaviors,
      buildInitConfig: bootstrapModule.buildPartyOperationsInitConfig
    });
    return initHandler();
  };
}

export function createLazyPartyOperationsReadyHandler({
  loadBootstrapModule = createPartyOperationsBootstrapLoader(),
  createReadyHandler = createPartyOperationsReadyHandler
} = {}) {
  return async function onPartyOperationsReady() {
    const bootstrapModule = await loadBootstrapModule();
    const readyHandler = createReadyHandler({
      buildReadyConfig: bootstrapModule.buildPartyOperationsReadyConfig
    });
    return readyHandler();
  };
}

const loadBootstrapModule = createPartyOperationsBootstrapLoader();

export const onPartyOperationsInit = createLazyPartyOperationsInitHandler({
  loadBootstrapModule
});

export const onPartyOperationsReady = createLazyPartyOperationsReadyHandler({
  loadBootstrapModule
});
