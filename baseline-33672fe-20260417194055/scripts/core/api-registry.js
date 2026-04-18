const API_ALIASES = Object.freeze([
  "partyOperations",
  "PartyOperations",
  "partyops"
]);

function attachGlobalAlias(globalRoot, alias, api) {
  try {
    Object.defineProperty(globalRoot, alias, {
      configurable: true,
      get: () => globalRoot.game?.partyOperations ?? globalRoot.game?.partyops ?? api,
      set: (value) => {
        if (!globalRoot.game) return;
        globalRoot.game.partyOperations = value;
        globalRoot.game.partyops = value;
      }
    });
  } catch {
    // Ignore runtimes that do not permit redefining global accessors.
  }
}

export function attachModuleApi({
  moduleId,
  api,
  gameRef = globalThis.game,
  globalRoot = globalThis,
  onModuleApiAttachFailure = null
} = {}) {
  if (!api || !gameRef) return api;

  gameRef.partyOperations = api;
  gameRef.partyops = api;

  for (const alias of API_ALIASES) {
    globalRoot[alias] = api;
    attachGlobalAlias(globalRoot, alias, api);
  }

  const moduleRef = gameRef.modules?.get?.(moduleId);
  if (!moduleRef) return api;

  try {
    moduleRef.api = api;
  } catch (error) {
    try {
      Object.defineProperty(moduleRef, "api", {
        value: api,
        configurable: true,
        writable: true
      });
    } catch (defineError) {
      if (typeof onModuleApiAttachFailure === "function") {
        onModuleApiAttachFailure(error, defineError);
      }
    }
  }

  return api;
}
