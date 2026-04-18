import assert from "node:assert/strict";

import {
  createLazyPartyOperationsInitHandler,
  createLazyPartyOperationsReadyHandler,
  createPartyOperationsBootstrapLoader
} from "./bootstrap/runtime.js";

{
  let importerCalls = 0;
  const expectedModule = { marker: "bootstrap-module" };
  const loadBootstrapModule = createPartyOperationsBootstrapLoader(async () => {
    importerCalls += 1;
    return expectedModule;
  });

  const [firstLoad, secondLoad] = await Promise.all([
    loadBootstrapModule(),
    loadBootstrapModule()
  ]);

  assert.equal(importerCalls, 1);
  assert.equal(firstLoad, expectedModule);
  assert.equal(secondLoad, expectedModule);
}

{
  const bootstrapModule = {
    installPartyOperationsAppBehaviors() {
      return "install";
    },
    buildPartyOperationsInitConfig() {
      return { stage: "init" };
    }
  };
  let importerCalls = 0;
  let createInitHandlerCalls = 0;

  const onPartyOperationsInit = createLazyPartyOperationsInitHandler({
    loadBootstrapModule: async () => {
      importerCalls += 1;
      return bootstrapModule;
    },
    createInitHandler(options) {
      createInitHandlerCalls += 1;
      assert.equal(options.installAppBehaviors, bootstrapModule.installPartyOperationsAppBehaviors);
      assert.equal(options.buildInitConfig, bootstrapModule.buildPartyOperationsInitConfig);
      return () => "init-result";
    }
  });

  const result = await onPartyOperationsInit();
  assert.equal(importerCalls, 1);
  assert.equal(createInitHandlerCalls, 1);
  assert.equal(result, "init-result");
}

{
  const bootstrapModule = {
    buildPartyOperationsReadyConfig() {
      return { stage: "ready" };
    }
  };
  let importerCalls = 0;
  let createReadyHandlerCalls = 0;

  const onPartyOperationsReady = createLazyPartyOperationsReadyHandler({
    loadBootstrapModule: async () => {
      importerCalls += 1;
      return bootstrapModule;
    },
    createReadyHandler(options) {
      createReadyHandlerCalls += 1;
      assert.equal(options.buildReadyConfig, bootstrapModule.buildPartyOperationsReadyConfig);
      return () => "ready-result";
    }
  });

  const result = await onPartyOperationsReady();
  assert.equal(importerCalls, 1);
  assert.equal(createReadyHandlerCalls, 1);
  assert.equal(result, "ready-result");
}
