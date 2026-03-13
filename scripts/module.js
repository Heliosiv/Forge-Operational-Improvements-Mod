import {
  onPartyOperationsInit,
  onPartyOperationsReady
} from "./bootstrap/runtime.js";
import { registerInteractionAnimations } from "./core/interaction-animations.js";
import { registerUiButtonSounds } from "./core/ui-sounds.js";
import { registerInitHooks } from "./hooks/init.js";
import { registerReadyHooks } from "./hooks/ready.js";

registerInitHooks({ onInit: onPartyOperationsInit });
registerReadyHooks({
  onReady: onPartyOperationsReady,
  readyHandlers: [registerInteractionAnimations, registerUiButtonSounds]
});
