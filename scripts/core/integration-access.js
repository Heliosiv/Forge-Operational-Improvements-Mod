import { INTEGRATION_MODES } from "./constants.js";

export function createIntegrationAccess({
  moduleId = "party-operations",
  settings = globalThis.game?.settings ?? {},
  settingKey = "integrationMode",
  gameRef = globalThis.game ?? {}
} = {}) {
  function getIntegrationModeSetting() {
    try {
      const value = settings?.get?.(moduleId, settingKey);
      const valid = Object.values(INTEGRATION_MODES);
      if (valid.includes(value)) return value;
    } catch {
      // Fall through to default.
    }
    return INTEGRATION_MODES.AUTO;
  }

  function isDaeAvailable() {
    try {
      return gameRef?.modules?.get?.("dae")?.active === true;
    } catch {
      return false;
    }
  }

  function resolveIntegrationMode() {
    const mode = getIntegrationModeSetting();
    if (mode !== INTEGRATION_MODES.AUTO) return mode;
    return isDaeAvailable() ? INTEGRATION_MODES.DAE : INTEGRATION_MODES.FLAGS;
  }

  return {
    getIntegrationModeSetting,
    isDaeAvailable,
    resolveIntegrationMode
  };
}
