import {
  buildLegacyPartyOperationsInitConfig,
  buildLegacyPartyOperationsReadyConfig,
  installLegacyAppBehaviors
} from "../party-operations.js";
import { createPartyOperationsInitHandler } from "./init.js";
import { createPartyOperationsReadyHandler } from "./ready.js";

// Keep the Foundry entrypoint small while the legacy module is decomposed behind this bridge.
export const onPartyOperationsInit = createPartyOperationsInitHandler({
  installAppBehaviors: installLegacyAppBehaviors,
  buildInitConfig: buildLegacyPartyOperationsInitConfig
});

export const onPartyOperationsReady = createPartyOperationsReadyHandler({
  buildReadyConfig: buildLegacyPartyOperationsReadyConfig
});
