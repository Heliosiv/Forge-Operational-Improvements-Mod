export function createPartyOperationsSettingsAccess({
  moduleId = "party-operations",
  settings = {},
  playerHubModes = {},
  launcherPlacements = {},
  gameRef = globalThis.game ?? {}
} = {}) {
  function normalizePlayerHubMode(value, fallback = playerHubModes.SIMPLE ?? "simple") {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === playerHubModes.ADVANCED) return playerHubModes.ADVANCED;
    if (normalized === playerHubModes.SIMPLE) return playerHubModes.SIMPLE;
    return fallback;
  }

  function getPlayerHubModeSetting() {
    try {
      return normalizePlayerHubMode(
        gameRef.settings?.get?.(moduleId, settings.PLAYER_HUB_MODE),
        playerHubModes.SIMPLE
      );
    } catch {
      return playerHubModes.SIMPLE;
    }
  }

  function areAdvancedSettingsEnabled() {
    try {
      return Boolean(gameRef.settings?.get?.(moduleId, settings.ADVANCED_SETTINGS_ENABLED));
    } catch {
      return false;
    }
  }

  function shouldAutoOpenRestForPlayers() {
    try {
      return Boolean(gameRef.settings?.get?.(moduleId, settings.PLAYER_AUTO_OPEN_REST));
    } catch {
      return false;
    }
  }

  function normalizeLauncherPlacement(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (normalized === launcherPlacements.SIDEBAR) return launcherPlacements.SIDEBAR;
    if (normalized === launcherPlacements.BOTH) return launcherPlacements.BOTH;
    return launcherPlacements.FLOATING;
  }

  return {
    normalizePlayerHubMode,
    getPlayerHubModeSetting,
    areAdvancedSettingsEnabled,
    shouldAutoOpenRestForPlayers,
    normalizeLauncherPlacement
  };
}
