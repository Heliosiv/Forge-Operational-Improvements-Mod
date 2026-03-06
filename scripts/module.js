import {
  onPartyOperationsInit,
  onPartyOperationsReady
} from "./party-operations.js";
import { registerInteractionAnimations } from "./core/interaction-animations.js";

Hooks.once("init", onPartyOperationsInit);
Hooks.once("ready", onPartyOperationsReady);
Hooks.once("ready", registerInteractionAnimations);
