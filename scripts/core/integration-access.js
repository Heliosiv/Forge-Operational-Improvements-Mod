export function createIntegrationAccess({
  moduleId = "party-operations",
  settings = {},
  integrationModes = {},
  gameRef = globalThis.game ?? {}
} = {}) {
  function getIntegrationModeSetting() {
    return integrationModes.OFF;
  }

  function isDaeAvailable() {
    return false;
  }

  function resolveIntegrationMode() {
    return integrationModes.OFF;
  }

  return {
    getIntegrationModeSetting,
    isDaeAvailable,
    resolveIntegrationMode
  };
}
