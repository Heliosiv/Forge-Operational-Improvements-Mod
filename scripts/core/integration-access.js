export function createIntegrationAccess({
  moduleId: _moduleId = "party-operations",
  settings: _settings = {},
  integrationModes = {},
  gameRef: _gameRef = globalThis.game ?? {}
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
