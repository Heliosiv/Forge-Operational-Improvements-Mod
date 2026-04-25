export function buildDefaultRestWatchState() {
  return {
    slots: [],
    campfireBySlot: {},
    refactorShell: true
  };
}

export function buildDefaultMarchingOrderState() {
  return {
    ranks: [],
    rankPlacements: {},
    refactorShell: true
  };
}

export function buildDefaultActivityState() {
  return {};
}

export function buildDefaultOperationsLedger() {
  return {
    resources: {},
    factions: [],
    downtime: {},
    refactorShell: true
  };
}

export function buildDefaultInjuryRecoveryState() {
  return {
    entries: [],
    refactorShell: true
  };
}

export function buildDefaultLootSourceConfig() {
  return {
    sources: [],
    refactorShell: true
  };
}

export function buildDefaultAudioLibraryCatalog() {
  return {
    tracks: [],
    refactorShell: true
  };
}

export function buildDefaultAudioLibraryHiddenTrackStore() {
  return {};
}

export function buildDefaultAudioMixPresetStore() {
  return {
    presets: [],
    refactorShell: true
  };
}
