import assert from "node:assert/strict";

import { createPartyOperationsInitHandler } from "./bootstrap/init.js";
import { createPartyOperationsReadyHandler } from "./bootstrap/ready.js";
import { registerPartyOperationsKeybindings } from "./core/keybindings.js";
import { registerInitHooks } from "./hooks/init.js";
import { registerReadyHooks } from "./hooks/ready.js";

const originalConsoleWarn = console.warn;

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
  const warnings = [];
  console.warn = (...args) => warnings.push(args.map((entry) => String(entry)).join(" "));

  const handler = createPartyOperationsInitHandler({
    installAppBehaviors() {
      callOrder.push("install");
      throw new Error("install failed");
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
  assert.ok(warnings.some((entry) => entry.includes("failed to install app behaviors")));
  console.warn = originalConsoleWarn;
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

  assert.deepEqual(registrations, [{ event: "init", handler: initHandler }]);
}

{
  const registrations = [];
  let initCalls = 0;
  const initHandler = () => {
    initCalls += 1;
  };

  registerInitHooks({
    HooksRef: {
      once(event, handler) {
        registrations.push({ event, handler });
      }
    },
    gameRef: {
      ready: true
    },
    onInit: initHandler
  });

  assert.deepEqual(registrations, [{ event: "init", handler: initHandler }]);
  assert.equal(initCalls, 1);
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

{
  const registrations = [];
  const callOrder = [];
  const readyHandler = () => {
    callOrder.push("ready");
  };
  const extraHandlerOne = () => {
    callOrder.push("extra-1");
  };
  const extraHandlerTwo = () => {
    callOrder.push("extra-2");
  };

  registerReadyHooks({
    HooksRef: {
      once(event, handler) {
        registrations.push({ event, handler });
      }
    },
    gameRef: {
      ready: true
    },
    onReady: readyHandler,
    readyHandlers: [extraHandlerOne, null, extraHandlerTwo]
  });

  assert.deepEqual(registrations, [
    { event: "ready", handler: readyHandler },
    { event: "ready", handler: extraHandlerOne },
    { event: "ready", handler: extraHandlerTwo }
  ]);
  assert.deepEqual(callOrder, ["ready", "extra-1", "extra-2"]);
}

{
  const keybindings = [];
  const navigationCalls = [];

  const didRegister = registerPartyOperationsKeybindings({
    moduleId: "party-operations",
    gameRef: {
      keybindings: {
        register(moduleId, key, config) {
          keybindings.push({ moduleId, key, config });
        }
      },
      modules: {
        get() {
          return {
            api: {
              navigation: {
                openRestWatch() {
                  navigationCalls.push("rest-watch");
                },
                openMarchingOrder() {
                  navigationCalls.push("marching-order");
                }
              }
            }
          };
        }
      }
    },
    loadBootstrapModule() {
      throw new Error("runtime should not load when navigation API is available");
    }
  });

  assert.equal(didRegister, true);
  assert.deepEqual(
    keybindings.map((entry) => entry.key),
    ["openRestWatch", "openMarchingOrder"]
  );
  assert.equal(keybindings[0].config.onDown(), true);
  assert.equal(keybindings[1].config.onDown(), true);
  assert.deepEqual(navigationCalls, ["rest-watch", "marching-order"]);
}
