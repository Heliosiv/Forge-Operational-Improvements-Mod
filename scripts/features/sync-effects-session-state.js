export function createSyncEffectsSessionState({
  gameRef = globalThis.game,
  storage = globalThis.sessionStorage,
} = {}) {
  const getNonPartySyncFilterStorageKey = () => `po-non-party-sync-filter-${gameRef?.user?.id ?? "anon"}`;

  const normalizeNonPartySyncFilterKeyword = (value) => String(value ?? "").slice(0, 120);

  const getNonPartySyncFilterKeyword = () => {
    const raw = storage?.getItem?.(getNonPartySyncFilterStorageKey());
    return normalizeNonPartySyncFilterKeyword(raw);
  };

  const getActiveSyncEffectsTabStorageKey = () => `po-active-sync-effects-tab-${gameRef?.user?.id ?? "anon"}`;

  const getActiveSyncEffectsTab = () => {
    const stored = String(storage?.getItem?.(getActiveSyncEffectsTabStorageKey()) ?? "active").trim().toLowerCase();
    return stored === "archived" ? "archived" : "active";
  };

  return Object.freeze({
    getActiveSyncEffectsTab,
    getActiveSyncEffectsTabStorageKey,
    getNonPartySyncFilterKeyword,
    getNonPartySyncFilterStorageKey,
    normalizeNonPartySyncFilterKeyword,
  });
}
