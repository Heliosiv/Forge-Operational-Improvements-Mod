import { onPartyOperationsInit, onPartyOperationsReady } from "./bootstrap/runtime.js";
import { createModulePerfTracker } from "./core/perf.js";
import { registerInteractionAnimations } from "./core/interaction-animations.js";
import { registerPartyOperationsKeybindings } from "./core/keybindings.js";
import { registerUiButtonSounds } from "./core/ui-sounds.js";
import { registerInitHooks } from "./hooks/init.js";
import { registerReadyHooks } from "./hooks/ready.js";

const perfTracker = createModulePerfTracker("module-entry");

function measureHook(metricName, handler) {
  return function measuredPartyOperationsHook(...args) {
    return perfTracker.time(metricName, () => handler?.(...args));
  };
}

registerInitHooks({
  onInit: measureHook("hooks.init", () => {
    registerPartyOperationsKeybindings();
    return onPartyOperationsInit();
  })
});
registerReadyHooks({
  onReady: measureHook("hooks.ready", onPartyOperationsReady),
  readyHandlers: [registerInteractionAnimations, registerUiButtonSounds]
});
