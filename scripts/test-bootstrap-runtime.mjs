import assert from "node:assert/strict";

import {
  createLegacyBootstrapLoader,
  createLazyPartyOperationsInitHandler,
  createLazyPartyOperationsReadyHandler
} from "./bootstrap/runtime.js";

{
  let importerCalls = 0;
  const expectedModule = { marker: "legacy-bootstrap" };
  const loadLegacyBootstrapModule = createLegacyBootstrapLoader(async () => {
    importerCalls += 1;
    return expectedModule;
  });

  const [firstLoad, secondLoad] = await Promise.all([
    loadLegacyBootstrapModule(),
    loadLegacyBootstrapModule()
  ]);

  assert.equal(importerCalls, 1);
  assert.equal(firstLoad, expectedModule);
  assert.equal(secondLoad, expectedModule);
}

{
  const legacyBootstrap = {
    installLegacyAppBehaviors() {
      return "install";
    },
    buildLegacyPartyOperationsInitConfig() {
      return { stage: "init" };
    }
  };
  let importerCalls = 0;
  let createInitHandlerCalls = 0;

  const onPartyOperationsInit = createLazyPartyOperationsInitHandler({
    loadLegacyBootstrapModule: async () => {
      importerCalls += 1;
      return legacyBootstrap;
    },
    createInitHandler(options) {
      createInitHandlerCalls += 1;
      assert.equal(options.installAppBehaviors, legacyBootstrap.installLegacyAppBehaviors);
      assert.equal(options.buildInitConfig, legacyBootstrap.buildLegacyPartyOperationsInitConfig);
      return () => "init-result";
    }
  });

  const result = await onPartyOperationsInit();
  assert.equal(importerCalls, 1);
  assert.equal(createInitHandlerCalls, 1);
  assert.equal(result, "init-result");
}

{
  const legacyBootstrap = {
    buildLegacyPartyOperationsReadyConfig() {
      return { stage: "ready" };
    }
  };
  let importerCalls = 0;
  let createReadyHandlerCalls = 0;

  const onPartyOperationsReady = createLazyPartyOperationsReadyHandler({
    loadLegacyBootstrapModule: async () => {
      importerCalls += 1;
      return legacyBootstrap;
    },
    createReadyHandler(options) {
      createReadyHandlerCalls += 1;
      assert.equal(options.buildReadyConfig, legacyBootstrap.buildLegacyPartyOperationsReadyConfig);
      return () => "ready-result";
    }
  });

  const result = await onPartyOperationsReady();
  assert.equal(importerCalls, 1);
  assert.equal(createReadyHandlerCalls, 1);
  assert.equal(result, "ready-result");
}
