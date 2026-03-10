import {
  onPartyOperationsInit,
  onPartyOperationsReady
} from "./party-operations.js";
import { registerInteractionAnimations } from "./core/interaction-animations.js";
import { registerUiButtonSounds } from "./core/ui-sounds.js";

Hooks.once("init", onPartyOperationsInit);
Hooks.once("ready", onPartyOperationsReady);
Hooks.once("ready", registerInteractionAnimations);
Hooks.once("ready", registerUiButtonSounds);
