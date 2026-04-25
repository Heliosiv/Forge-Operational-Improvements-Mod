import { recordRuntimeRefresh } from "../state/runtime-state.js";

export function installRuntimeAppBehaviors() {
  return [];
}

export function refreshOpenApps(options = {}) {
  recordRuntimeRefresh({
    type: "local-refresh",
    ...options
  });
  return [];
}

export function ensureLauncherUi() {
  return null;
}

export async function forceLauncherRecovery() {
  return null;
}
