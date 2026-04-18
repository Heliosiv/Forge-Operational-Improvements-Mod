import {
  APP_WINDOW_POSITION_STORAGE_KEYS,
  APP_WINDOW_PROFILE_BY_ID,
  APP_WINDOW_SIZE_PROFILES
} from "./window-position-profiles.js";

function clampWindowMetric(value, min, max, fallback) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

export function createAppWindowPositionManager({
  moduleId,
  appWindowPositionsSettingKey,
  normalizeWindowStateLike,
  areWindowStatesEquivalent,
  captureWindowState,
  gameInstance = globalThis?.game,
  foundryInstance = globalThis?.foundry,
  globalObject = globalThis,
  pendingPersistTimers = new Map()
} = {}) {
  let cachedAppWindowPositions = {};
  let cachedAppWindowPositionsLoaded = false;

  const normalizeWindowProfileId = (profileOrApp) => {
    if (typeof profileOrApp === "string") {
      const normalized = String(profileOrApp ?? "").trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(APP_WINDOW_SIZE_PROFILES, normalized)) return normalized;
      return "default";
    }
    const appId = String(profileOrApp?.options?.id ?? profileOrApp?.id ?? "").trim();
    const mappedProfileId = APP_WINDOW_PROFILE_BY_ID[appId];
    if (mappedProfileId && Object.prototype.hasOwnProperty.call(APP_WINDOW_SIZE_PROFILES, mappedProfileId)) return mappedProfileId;
    return "default";
  };

  const getUiViewportSize = () => {
    const rawWidth = Number(globalObject?.window?.innerWidth ?? globalObject?.document?.documentElement?.clientWidth ?? 1600);
    const rawHeight = Number(globalObject?.window?.innerHeight ?? globalObject?.document?.documentElement?.clientHeight ?? 900);
    const width = Number.isFinite(rawWidth) && rawWidth > 0 ? Math.floor(rawWidth) : 1600;
    const height = Number.isFinite(rawHeight) && rawHeight > 0 ? Math.floor(rawHeight) : 900;
    return {
      width: Math.max(480, width),
      height: Math.max(360, height)
    };
  };

  const normalizeWindowPositionStorageKey = (profileOrApp) => {
    const profileId = normalizeWindowProfileId(profileOrApp);
    return APP_WINDOW_POSITION_STORAGE_KEYS[profileId] ?? profileId;
  };

  const normalizeStoredAppWindowPositions = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return {};
    const normalized = {};
    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = String(key ?? "").trim();
      if (!normalizedKey) continue;
      const normalizedState = normalizeWindowStateLike(value);
      if (!normalizedState) continue;
      normalized[normalizedKey] = normalizedState;
    }
    return normalized;
  };

  const getStoredAppWindowPositions = () => {
    if (cachedAppWindowPositionsLoaded) return cachedAppWindowPositions;
    try {
      cachedAppWindowPositions = normalizeStoredAppWindowPositions(
        gameInstance?.settings?.get(moduleId, appWindowPositionsSettingKey)
      );
      cachedAppWindowPositionsLoaded = true;
    } catch {
      return {};
    }
    return cachedAppWindowPositions;
  };

  const setStoredAppWindowPositions = (input) => {
    cachedAppWindowPositions = normalizeStoredAppWindowPositions(input);
    cachedAppWindowPositionsLoaded = true;
    return cachedAppWindowPositions;
  };

  const getRememberedWindowState = (profileOrApp) => {
    const storageKey = normalizeWindowPositionStorageKey(profileOrApp);
    return normalizeWindowStateLike(getStoredAppWindowPositions()[storageKey]);
  };

  const queuePersistRememberedWindowState = (profileOrApp, state, options = {}) => {
    const normalizedState = normalizeWindowStateLike(state);
    if (!normalizedState) return;

    const storageKey = normalizeWindowPositionStorageKey(profileOrApp);
    const currentStates = getStoredAppWindowPositions();
    const previousState = normalizeWindowStateLike(currentStates[storageKey]);
    const existingTimer = pendingPersistTimers.get(storageKey);

    const clearExistingTimer = () => {
      if (!existingTimer) return;
      try {
        globalObject?.clearTimeout(existingTimer);
      } catch {
        // Ignore timer cleanup failures.
      }
    };

    if (areWindowStatesEquivalent(previousState, normalizedState)) {
      if (options?.immediate !== true || !existingTimer) return;

      clearExistingTimer();
      pendingPersistTimers.delete(storageKey);
      void gameInstance?.settings?.set(moduleId, appWindowPositionsSettingKey, { ...currentStates });
      return;
    }

    const nextStates = setStoredAppWindowPositions({
      ...currentStates,
      [storageKey]: normalizedState
    });

    clearExistingTimer();

    const persist = async () => {
      pendingPersistTimers.delete(storageKey);
      try {
        await gameInstance?.settings?.set(moduleId, appWindowPositionsSettingKey, { ...nextStates });
      } catch {
        // Ignore transient client-setting failures. The in-memory cache still preserves navigation.
      }
    };

    if (options?.immediate === true) {
      void persist();
      return;
    }

    const timerDelayMs = Math.max(60, Math.floor(Number(options?.delayMs ?? 180) || 180));
    try {
      const timerId = globalObject?.setTimeout(() => {
        void persist();
      }, timerDelayMs);
      pendingPersistTimers.set(storageKey, timerId);
    } catch {
      void persist();
    }
  };

  const persistWindowStateFromApp = (app, options = {}) => {
    const windowState = captureWindowState(app);
    if (!windowState) return;
    queuePersistRememberedWindowState(app, windowState, options);
  };

  const getResponsiveWindowSize = (profileOrApp, overrides = {}) => {
    const profileId = normalizeWindowProfileId(profileOrApp);
    const profile = APP_WINDOW_SIZE_PROFILES[profileId] ?? APP_WINDOW_SIZE_PROFILES.default;
    const patch = overrides && typeof overrides === "object" ? overrides : {};
    const merged = {
      width: Number(patch.width ?? profile.width),
      height: Number(patch.height ?? profile.height),
      minWidth: Number(patch.minWidth ?? profile.minWidth),
      minHeight: Number(patch.minHeight ?? profile.minHeight),
      maxWidthRatio: Number(patch.maxWidthRatio ?? profile.maxWidthRatio),
      maxHeightRatio: Number(patch.maxHeightRatio ?? profile.maxHeightRatio)
    };
    const viewport = getUiViewportSize();
    const minWidth = Math.max(420, Math.floor(Number.isFinite(merged.minWidth) ? merged.minWidth : 700));
    const minHeight = Math.max(320, Math.floor(Number.isFinite(merged.minHeight) ? merged.minHeight : 520));
    const maxWidthRatio = Math.max(0.6, Math.min(0.99, Number.isFinite(merged.maxWidthRatio) ? merged.maxWidthRatio : 0.95));
    const maxHeightRatio = Math.max(0.6, Math.min(0.99, Number.isFinite(merged.maxHeightRatio) ? merged.maxHeightRatio : 0.92));
    const maxWidth = Math.max(minWidth, Math.floor(viewport.width * maxWidthRatio));
    const maxHeight = Math.max(minHeight, Math.floor(viewport.height * maxHeightRatio));
    const widthFallback = clampWindowMetric(profile.width, minWidth, maxWidth, maxWidth);
    const heightFallback = clampWindowMetric(profile.height, minHeight, maxHeight, maxHeight);
    return {
      width: clampWindowMetric(merged.width, minWidth, maxWidth, widthFallback),
      height: clampWindowMetric(merged.height, minHeight, maxHeight, heightFallback)
    };
  };

  const clampWindowPositionToViewport = (position, options = {}) => {
    const viewport = getUiViewportSize();
    const padding = Math.max(0, Math.floor(Number(options.padding ?? 8) || 8));
    const width = Number(position?.width);
    const height = Number(position?.height);
    const left = Number(position?.left);
    const top = Number(position?.top);
    const maxLeft = Number.isFinite(width) ? Math.max(padding, viewport.width - Math.floor(width) - padding) : undefined;
    const maxTop = Number.isFinite(height) ? Math.max(padding, viewport.height - Math.floor(height) - padding) : undefined;
    return {
      left: Number.isFinite(left) && Number.isFinite(maxLeft) ? Math.max(padding, Math.min(maxLeft, Math.floor(left))) : undefined,
      top: Number.isFinite(top) && Number.isFinite(maxTop) ? Math.max(padding, Math.min(maxTop, Math.floor(top))) : undefined
    };
  };

  const getResponsiveWindowPosition = (profileOrApp, overrides = {}) => {
    const patch = overrides && typeof overrides === "object" ? overrides : {};
    const remembered = getRememberedWindowState(profileOrApp);
    const size = getResponsiveWindowSize(profileOrApp, remembered ? {
      width: remembered.width,
      height: remembered.height,
      ...patch
    } : patch);
    const placement = clampWindowPositionToViewport({
      left: Number.isFinite(Number(patch.left)) ? Number(patch.left) : remembered?.left,
      top: Number.isFinite(Number(patch.top)) ? Number(patch.top) : remembered?.top,
      width: size.width,
      height: size.height
    });
    if (Number.isFinite(placement.left) && Number.isFinite(placement.top)) {
      return {
        ...size,
        left: placement.left,
        top: placement.top
      };
    }
    return size;
  };

  const getResponsiveWindowOptions = (profileId, options = {}) => {
    const patch = options && typeof options === "object" ? options : {};
    const overridePosition = patch.position && typeof patch.position === "object" ? patch.position : {};
    return foundryInstance?.utils?.mergeObject(patch, {
      position: getResponsiveWindowPosition(profileId, overridePosition)
    }, { inplace: false, overwrite: true }) ?? {
      ...patch,
      position: getResponsiveWindowPosition(profileId, overridePosition)
    };
  };

  const installRememberedWindowPositionBehavior = (appClass) => {
    if (!appClass?.prototype || appClass.prototype.__poWindowPositionPersistenceInstalled === true) return;

    const originalSetPosition = appClass.prototype.setPosition;
    if (typeof originalSetPosition === "function") {
      appClass.prototype.setPosition = function(position = {}) {
        const result = originalSetPosition.call(this, position);
        try {
          const nextState = normalizeWindowStateLike(result)
            ?? normalizeWindowStateLike(this?.position)
            ?? normalizeWindowStateLike(position)
            ?? captureWindowState(this);
          if (nextState) queuePersistRememberedWindowState(this, nextState);
        } catch {
          // Ignore position persistence failures so the UI still moves normally.
        }
        return result;
      };
    }

    const originalClose = appClass.prototype.close;
    if (typeof originalClose === "function") {
      appClass.prototype.close = function(options = {}) {
        try {
          persistWindowStateFromApp(this, { immediate: true });
        } catch {
          // Ignore close-time persistence failures.
        }
        return originalClose.call(this, options);
      };
    }

    appClass.prototype.persistWindowPosition = function(options = {}) {
      try {
        persistWindowStateFromApp(this, options);
      } catch {
        // Ignore manual persistence failures requested by navigation helpers.
      }
    };

    Object.defineProperty(appClass.prototype, "__poWindowPositionPersistenceInstalled", {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false
    });
  };

  return Object.freeze({
    clampWindowPositionToViewport,
    getRememberedWindowState,
    getResponsiveWindowOptions,
    getResponsiveWindowPosition,
    getResponsiveWindowSize,
    installRememberedWindowPositionBehavior,
    normalizeStoredAppWindowPositions,
    normalizeWindowPositionStorageKey,
    normalizeWindowProfileId,
    persistWindowStateFromApp,
    queuePersistRememberedWindowState
  });
}
