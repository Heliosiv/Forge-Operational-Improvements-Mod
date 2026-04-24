function resolvePartyOperationsNavigationApi({ gameRef = globalThis.game, globalRef = globalThis, moduleId } = {}) {
  return (
    gameRef?.modules?.get?.(moduleId)?.api?.navigation ??
    gameRef?.partyOperations?.navigation ??
    gameRef?.partyops?.navigation ??
    globalRef?.partyOperations?.navigation ??
    globalRef?.PartyOperations?.navigation ??
    globalRef?.partyops?.navigation ??
    null
  );
}

function openViaNavigationApi(actionName, options = {}) {
  const {
    gameRef = globalThis.game,
    globalRef = globalThis,
    moduleId = "party-operations",
    loadBootstrapModule = () => import("../party-operations.js"),
    logger = console
  } = options;

  const navigate = () => {
    const navigation = resolvePartyOperationsNavigationApi({ gameRef, globalRef, moduleId });
    const action = navigation?.[actionName];
    if (typeof action !== "function") return false;
    action();
    return true;
  };

  if (navigate()) return true;

  Promise.resolve()
    .then(() => loadBootstrapModule())
    .then(() => {
      if (!navigate()) logger?.warn?.(`[${moduleId}] keybinding navigation API was not available: ${actionName}`);
    })
    .catch((error) => {
      logger?.warn?.(`[${moduleId}] failed to load runtime for keybinding: ${actionName}`, error);
    });

  return true;
}

export function registerPartyOperationsKeybindings({
  gameRef = globalThis.game,
  moduleId = "party-operations",
  loadBootstrapModule = () => import("../party-operations.js"),
  logger = console
} = {}) {
  if (typeof gameRef?.keybindings?.register !== "function") return false;

  gameRef.keybindings.register(moduleId, "openRestWatch", {
    name: "Open Rest Watch",
    editable: [],
    onDown: () =>
      openViaNavigationApi("openRestWatch", {
        gameRef,
        moduleId,
        loadBootstrapModule,
        logger
      })
  });

  gameRef.keybindings.register(moduleId, "openMarchingOrder", {
    name: "Open Marching Order",
    editable: [],
    onDown: () =>
      openViaNavigationApi("openMarchingOrder", {
        gameRef,
        moduleId,
        loadBootstrapModule,
        logger
      })
  });

  return true;
}
