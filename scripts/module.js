import {
  onPartyOperationsInit,
  onPartyOperationsReady
} from "./party-operations.js";

Hooks.once("init", onPartyOperationsInit);
Hooks.once("ready", onPartyOperationsReady);
