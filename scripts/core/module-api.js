export function buildPartyOperationsApi(options = {}) {
  const {
    foundryRef,
    gameRef,
    globalRef = globalThis,
    moduleId,
    ensureLauncherUi,
    openMainTab,
    openGmMerchantsPage,
    openGmAudioPage,
    refreshOpenApps,
    getOperationsLedger,
    runGatherResourcesAction,
    applyOperationalUpkeep,
    getInjuryRecoveryState,
    applyRecoveryCycle,
    runSessionAutopilot,
    undoLastSessionAutopilot,
    syncAllInjuriesToSimpleCalendar,
    scheduleIntegrationSync,
    openPartyOperationsSettingsHub,
    getModuleConfigSnapshot,
    getPartyOpsConfigSetting,
    savePartyOpsConfigSetting,
    getInventoryHookModeSetting,
    setInventoryHookMode,
    getLauncherPlacement,
    setLauncherPlacement,
    getLootSourceConfig,
    getCrBracket,
    convertCurrencyToGpEquivalent,
    rollIndividualTreasure,
    rollHoardTreasure,
    applyLootTweakers,
    summarizeLoot,
    generateLootPreviewPayload,
    generateLootFromPackIds,
    getLootPreviewResult,
    diagnoseWorldData,
    resetFloatingLauncherPosition,
    forceLauncherRecovery,
    getLauncherStatusSnapshot,
    getAudioLibraryCatalog,
    scanAudioLibraryCatalog,
    clearAudioLibraryCatalog,
    hideAudioLibraryTrack,
    restoreHiddenAudioLibraryTrack,
    restoreAllHiddenAudioLibraryTracks,
    getAllAudioMixPresets,
    createAudioMixPresetFromSelection,
    deleteSelectedAudioMixPreset,
    addTrackToSelectedAudioMixPreset,
    queueSelectedTrackNext,
    moveTrackToIndexInSelectedAudioMixPreset,
    moveTrackToTopInSelectedAudioMixPreset,
    moveTrackWithinSelectedAudioMixPreset,
    removeTrackFromSelectedAudioMixPreset,
    playAudioMixPresetById,
    getSelectedAudioMixPreset,
    playNextAudioMixTrack,
    restartCurrentAudioMixTrack,
    stopAudioMixPlayback,
    normalizeAudioLibraryKind,
    normalizeAudioLibraryUsage,
    normalizeAudioLibrarySearch
  } = options;

  const deepClone = (value) => foundryRef?.utils?.deepClone ? foundryRef.utils.deepClone(value) : value;
  const buildAudioPick = ({ kind = "all", usage = "all", search = "" } = {}) => {
    const catalog = getAudioLibraryCatalog();
    const normalizedKind = normalizeAudioLibraryKind(kind);
    const normalizedUsage = normalizeAudioLibraryUsage(usage);
    const normalizedSearch = normalizeAudioLibrarySearch(search);
    const candidates = catalog.items.filter((item) => {
      if (normalizedKind !== "all" && item.kind !== normalizedKind) return false;
      if (normalizedUsage !== "all" && item.usage !== normalizedUsage) return false;
      if (!normalizedSearch) return true;
      const haystack = `${item.name} ${item.category} ${item.subcategory} ${item.tags.join(" ")}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
    if (candidates.length <= 0) return null;
    return deepClone(candidates[Math.floor(Math.random() * candidates.length)]);
  };

  const api = {
    restWatch: () => openMainTab("rest-watch", { force: true }),
    marchingOrder: () => openMainTab("marching-order", { force: true }),
    operations: () => openMainTab("operations", { force: true }),
    gm: () => openMainTab("gm", { force: true }),
    gmMerchants: () => openGmMerchantsPage({ force: true }),
    gmAudio: () => openGmAudioPage({ force: true }),
    refreshAll: () => refreshOpenApps(),
    getOperations: () => deepClone(getOperationsLedger()),
    gatherResources: (options = {}) => runGatherResourcesAction(options),
    applyUpkeep: () => applyOperationalUpkeep(),
    getInjuryRecovery: () => deepClone(getInjuryRecoveryState()),
    applyRecoveryCycle: () => applyRecoveryCycle(),
    runSessionAutopilot: () => runSessionAutopilot(),
    undoSessionAutopilot: () => undoLastSessionAutopilot(),
    syncInjuryCalendar: () => syncAllInjuriesToSimpleCalendar(),
    syncIntegrations: () => scheduleIntegrationSync("api"),
    settingsHub: () => openPartyOperationsSettingsHub({ force: true }),
    getConfig: () => deepClone(getModuleConfigSnapshot()),
    getTypedConfig: () => deepClone(getPartyOpsConfigSetting()),
    saveTypedConfig: (input) => savePartyOpsConfigSetting(input),
    getInventoryHookMode: () => getInventoryHookModeSetting(),
    setInventoryHookMode: (mode) => setInventoryHookMode(mode),
    getLauncherPlacement: () => getLauncherPlacement(),
    setLauncherPlacement: (placement) => setLauncherPlacement(placement),
    getLootSourceConfig: () => deepClone(getLootSourceConfig()),
    getCrBracket: (cr) => getCrBracket(cr),
    convertCurrencyToGpEquivalent: (currency) => convertCurrencyToGpEquivalent(currency),
    rollIndividualTreasure: (cr, creatureCount, options = {}) => deepClone(rollIndividualTreasure(cr, creatureCount, options)),
    rollHoardTreasure: (cr, options = {}) => deepClone(rollHoardTreasure(cr, options)),
    applyLootTweakers: (result, tweakers = []) => deepClone(applyLootTweakers(result, tweakers)),
    summarizeLoot: (result) => summarizeLoot(result),
    previewLoot: (draft) => generateLootPreviewPayload(draft),
    generateLootFromPackIds: (packIds, input, options) => generateLootFromPackIds(packIds, input, options),
    getLootPreviewResult: () => deepClone(getLootPreviewResult()),
    diagnoseWorldData: (options) => diagnoseWorldData(options),
    repairWorldData: () => diagnoseWorldData({ repair: true }),
    resetLauncherPosition: () => resetFloatingLauncherPosition(),
    ensureLauncher: () => ensureLauncherUi(),
    showLauncher: () => ensureLauncherUi(),
    forceLauncherRecovery: (reason) => forceLauncherRecovery(reason),
    launcherStatus: () => getLauncherStatusSnapshot(),
    audio: {
      open: () => openGmAudioPage({ force: true }),
      getCatalog: () => deepClone(getAudioLibraryCatalog()),
      getCatalogWithHidden: () => deepClone(getAudioLibraryCatalog({ includeHidden: true })),
      scan: (options = {}) => scanAudioLibraryCatalog(options),
      clear: () => clearAudioLibraryCatalog(),
      hideTrack: (trackId) => hideAudioLibraryTrack(trackId),
      restoreTrack: (trackId) => restoreHiddenAudioLibraryTrack(trackId),
      restoreAllTracks: () => restoreAllHiddenAudioLibraryTracks(),
      getMixPresets: () => deepClone(getAllAudioMixPresets()),
      createMixPreset: () => createAudioMixPresetFromSelection(),
      deleteSelectedMixPreset: () => deleteSelectedAudioMixPreset(),
      addTrackToSelectedMixPreset: (trackId) => addTrackToSelectedAudioMixPreset(trackId),
      queueTrackNext: (trackId) => queueSelectedTrackNext({ dataset: { trackId } }),
      moveTrackToIndexInSelectedMixPreset: (trackId, targetIndex) => moveTrackToIndexInSelectedAudioMixPreset(trackId, targetIndex),
      moveTrackToTopInSelectedMixPreset: (trackId) => moveTrackToTopInSelectedAudioMixPreset(trackId),
      moveTrackInSelectedMixPreset: (trackId, direction) => moveTrackWithinSelectedAudioMixPreset(trackId, direction),
      removeTrackFromSelectedMixPreset: (trackId) => removeTrackFromSelectedAudioMixPreset(trackId),
      playMix: (presetId) => playAudioMixPresetById(presetId ?? getSelectedAudioMixPreset().id),
      nextTrack: () => playNextAudioMixTrack(),
      restartTrack: () => restartCurrentAudioMixTrack(),
      stopMix: () => stopAudioMixPlayback(),
      pick: (options = {}) => buildAudioPick(options)
    },
    apiStatus: () => ({
      moduleActive: Boolean(gameRef?.modules?.get?.(moduleId)?.active),
      hasGameApi: Boolean(gameRef?.partyOperations || gameRef?.partyops),
      hasModuleApi: Boolean(gameRef?.modules?.get?.(moduleId)?.api),
      hasGlobalApi: Boolean(globalRef?.partyOperations || globalRef?.PartyOperations || globalRef?.partyops),
      launcher: ensureLauncherUi()
    })
  };

  api.openRestWatch = api.restWatch;
  api.openMarchingOrder = api.marchingOrder;
  api.openOperations = api.operations;
  api.openGM = api.gm;
  api.openGmMerchants = api.gmMerchants;
  api.openGmAudio = api.gmAudio;
  api.openSettingsHub = api.settingsHub;
  api.gather = api.gatherResources;
  api.launcher = api.ensureLauncher;

  return api;
}

export function registerPartyOperationsApi({
  attachModuleApi,
  moduleId,
  api,
  logger
} = {}) {
  return attachModuleApi({
    moduleId,
    api,
    onModuleApiAttachFailure: (error, defineError) => {
      logger?.warn?.("unable to attach api on module reference", error, defineError);
    }
  });
}
