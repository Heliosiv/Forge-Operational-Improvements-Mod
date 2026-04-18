export function createIntegrationAccess({
  moduleId = "party-operations",
  settings = {},
  integrationModes = {},
  gameRef = globalThis.game ?? {}
} = {}) {
  function getIntegrationModeSetting() {
    return gameRef.settings?.get?.(moduleId, settings.INTEGRATION_MODE) ?? integrationModes.AUTO;
  }

  function isDaeAvailable() {
    return Boolean(gameRef.modules?.get?.("dae")?.active);
  }

  function resolveIntegrationMode() {
    const configured = getIntegrationModeSetting();
    if (configured === integrationModes.OFF) return integrationModes.OFF;
    if (configured === integrationModes.FLAGS) return integrationModes.FLAGS;
    if (configured === integrationModes.DAE) return isDaeAvailable() ? integrationModes.DAE : integrationModes.FLAGS;
    return isDaeAvailable() ? integrationModes.DAE : integrationModes.FLAGS;
  }

  return {
    getIntegrationModeSetting,
    isDaeAvailable,
    resolveIntegrationMode
  };
}
