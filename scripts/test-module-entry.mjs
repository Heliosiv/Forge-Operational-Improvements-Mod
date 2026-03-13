import assert from "node:assert/strict";

import { createPartyOperationsInitHandler } from "./bootstrap/init.js";
import { createPartyOperationsReadyHandler } from "./bootstrap/ready.js";
import { registerInitHooks } from "./hooks/init.js";
import { registerReadyHooks } from "./hooks/ready.js";

{
  const callOrder = [];

  const handler = createPartyOperationsInitHandler({
    installAppBehaviors() {
      callOrder.push("install");
    },
    buildInitConfig() {
      callOrder.push("build");
      return { stage: "init" };
    },
    runInit(config) {
      callOrder.push(config.stage);
      return "init-result";
    }
  });

  assert.equal(handler(), "init-result");
  assert.deepEqual(callOrder, ["install", "build", "init"]);
}

{
  const callOrder = [];

  const handler = createPartyOperationsReadyHandler({
    buildReadyConfig() {
      callOrder.push("build");
      return { stage: "ready" };
    },
    runReady(config) {
      callOrder.push(config.stage);
      return "ready-result";
    }
  });

  assert.equal(handler(), "ready-result");
  assert.deepEqual(callOrder, ["build", "ready"]);
}

{
  const registrations = [];
  const initHandler = () => {};

  registerInitHooks({
    HooksRef: {
      once(event, handler) {
        registrations.push({ event, handler });
      }
    },
    onInit: initHandler
  });

  assert.deepEqual(registrations, [
    { event: "init", handler: initHandler }
  ]);
}

{
  const registrations = [];
  const readyHandler = () => {};
  const extraHandlerOne = () => {};
  const extraHandlerTwo = () => {};

  registerReadyHooks({
    HooksRef: {
      once(event, handler) {
        registrations.push({ event, handler });
      }
    },
    onReady: readyHandler,
    readyHandlers: [extraHandlerOne, null, extraHandlerTwo]
  });

  assert.deepEqual(registrations, [
    { event: "ready", handler: readyHandler },
    { event: "ready", handler: extraHandlerOne },
    { event: "ready", handler: extraHandlerTwo }
  ]);
}
