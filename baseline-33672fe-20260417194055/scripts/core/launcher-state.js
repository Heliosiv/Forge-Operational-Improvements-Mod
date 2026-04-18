export function createLauncherStateAccess({
  resolveController = () => null,
  launcherPlacements = {}
} = {}) {
  function getController() {
    return resolveController?.() ?? null;
  }

  function getLauncherPlacement() {
    return getController()?.getLauncherPlacement?.() ?? launcherPlacements.FLOATING ?? "floating";
  }

  function isFloatingLauncherLocked() {
    return Boolean(getController()?.isFloatingLauncherLocked?.() ?? false);
  }

  function resetFloatingLauncherPosition(...args) {
    return getController()?.resetFloatingLauncherPosition?.(...args) ?? false;
  }

  return {
    getLauncherPlacement,
    isFloatingLauncherLocked,
    resetFloatingLauncherPosition
  };
}
