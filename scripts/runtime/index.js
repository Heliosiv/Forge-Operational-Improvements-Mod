import { runPartyOperationsInit, runPartyOperationsReady } from "../core/lifecycle.js";
import { installRuntimeAppBehaviors } from "./apps/app-shell.js";
import { buildRuntimeInitConfig, buildRuntimeReadyConfig } from "./lifecycle-config.js";
import { recordRuntimeInit, recordRuntimeReady } from "./state/runtime-state.js";

export { buildRefactorModuleApi, registerRefactorModuleApi } from "./api/module-api.js";
export { getRefactorFeatureManifest } from "./rebuild/feature-manifest.js";
export { emitSocketRefresh } from "./sockets/refresh-socket.js";

export function installPartyOperationsAppBehaviors() {
  return installRuntimeAppBehaviors();
}

export function buildPartyOperationsInitConfig() {
  return buildRuntimeInitConfig();
}

export function buildPartyOperationsReadyConfig() {
  return buildRuntimeReadyConfig();
}

export function onPartyOperationsInit() {
  installPartyOperationsAppBehaviors();
  recordRuntimeInit();
  return runPartyOperationsInit(buildPartyOperationsInitConfig());
}

export function onPartyOperationsReady() {
  recordRuntimeReady();
  return runPartyOperationsReady(buildPartyOperationsReadyConfig());
}
