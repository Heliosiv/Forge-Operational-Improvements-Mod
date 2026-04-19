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
    generateBoardReadyLootBundle,
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
    normalizeAudioLibrarySearch,
    getPlayerPermissionDebugEntries,
    clearPlayerPermissionDebugEntries,
    getPerfState,
    getPerfSummary
  } = options;

  const deepClone = (value) => foundryRef?.utils?.deepClone ? foundryRef.utils.deepClone(value) : value;
  const wrapTrackIdAction = (action, trackId) => action?.({ dataset: { trackId: String(trackId ?? "").trim() } });
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

  const buildMetaStatus = () => ({
    moduleActive: Boolean(gameRef?.modules?.get?.(moduleId)?.active),
    hasGameApi: Boolean(gameRef?.partyOperations || gameRef?.partyops),
    hasModuleApi: Boolean(gameRef?.modules?.get?.(moduleId)?.api),
    hasGlobalApi: Boolean(globalRef?.partyOperations || globalRef?.PartyOperations || globalRef?.partyops)
  });

  const api = {
    navigation: {
      openRestWatch: () => openMainTab("rest-watch", { force: true }),
      openMarchingOrder: () => openMainTab("marching-order", { force: true }),
      openOperations: () => openMainTab("operations", { force: true }),
      openGm: () => openMainTab("gm", { force: true }),
      openGmMerchants: () => openGmMerchantsPage({ force: true }),
      openGmAudio: () => openGmAudioPage({ force: true }),
      openSettings: () => openPartyOperationsSettingsHub({ force: true }),
      refreshAll: () => refreshOpenApps()
    },
    operations: {
      getLedger: () => deepClone(getOperationsLedger()),
      gatherResources: (options = {}) => runGatherResourcesAction(options),
      applyUpkeep: () => applyOperationalUpkeep(),
      runSessionAutopilot: () => runSessionAutopilot(),
      undoSessionAutopilot: () => undoLastSessionAutopilot(),
      getInjuryRecovery: () => deepClone(getInjuryRecoveryState()),
      applyRecoveryCycle: () => applyRecoveryCycle(),
      syncInjuryCalendar: () => syncAllInjuriesToSimpleCalendar()
    },
    config: {
      getSnapshot: () => deepClone(getModuleConfigSnapshot()),
      getTyped: () => deepClone(getPartyOpsConfigSetting()),
      saveTyped: (input) => savePartyOpsConfigSetting(input),
      getInventoryHookMode: () => getInventoryHookModeSetting(),
      setInventoryHookMode: (mode) => setInventoryHookMode(mode)
    },
    launcher: {
      show: () => ensureLauncherUi(),
      getPlacement: () => deepClone(getLauncherPlacement()),
      setPlacement: (placement) => setLauncherPlacement(placement),
      resetPosition: () => resetFloatingLauncherPosition(),
      forceRecovery: (reason) => forceLauncherRecovery(reason),
      getStatus: () => deepClone(getLauncherStatusSnapshot())
    },
    loot: {
      getSourceConfig: () => deepClone(getLootSourceConfig()),
      getCrBracket: (cr) => getCrBracket(cr),
      convertCurrencyToGpEquivalent: (currency) => convertCurrencyToGpEquivalent(currency),
      rollIndividual: (cr, creatureCount, options = {}) => deepClone(rollIndividualTreasure(cr, creatureCount, options)),
      rollHoard: (cr, options = {}) => deepClone(rollHoardTreasure(cr, options)),
      applyTweakers: (result, tweakers = []) => deepClone(applyLootTweakers(result, tweakers)),
      summarize: (result) => summarizeLoot(result),
      generateBundle: (draft, options = {}) => generateBoardReadyLootBundle(draft, options),
      preview: (draft) => generateLootPreviewPayload(draft),
      generateFromPackIds: (packIds, input, options) => generateLootFromPackIds(packIds, input, options),
      getPreviewResult: () => deepClone(getLootPreviewResult())
    },
    audio: {
      open: () => openGmAudioPage({ force: true }),
      getCatalog: () => deepClone(getAudioLibraryCatalog()),
      getCatalogWithHidden: () => deepClone(getAudioLibraryCatalog({ includeHidden: true })),
      scan: (options = {}) => scanAudioLibraryCatalog(options),
      clearCatalog: () => clearAudioLibraryCatalog(),
      hideTrack: (trackId) => hideAudioLibraryTrack(trackId),
      restoreTrack: (trackId) => restoreHiddenAudioLibraryTrack(trackId),
      restoreAllTracks: () => restoreAllHiddenAudioLibraryTracks(),
      getMixPresets: () => deepClone(getAllAudioMixPresets()),
      createMixPreset: () => createAudioMixPresetFromSelection(),
      deleteSelectedMixPreset: () => deleteSelectedAudioMixPreset(),
      addTrackToSelectedMixPreset: (trackId) => addTrackToSelectedAudioMixPreset(trackId),
      queueTrackNext: (trackId) => wrapTrackIdAction(queueSelectedTrackNext, trackId),
      moveTrackToIndex: (trackId, targetIndex) => moveTrackToIndexInSelectedAudioMixPreset(trackId, targetIndex),
      moveTrackToTop: (trackId) => moveTrackToTopInSelectedAudioMixPreset(trackId),
      moveTrack: (trackId, direction) => moveTrackWithinSelectedAudioMixPreset(trackId, direction),
      removeTrack: (trackId) => removeTrackFromSelectedAudioMixPreset(trackId),
      playMix: (presetId) => playAudioMixPresetById(presetId ?? getSelectedAudioMixPreset().id),
      nextTrack: () => playNextAudioMixTrack(),
      restartTrack: () => restartCurrentAudioMixTrack(),
      stopMix: () => stopAudioMixPlayback(),
      pick: (options = {}) => buildAudioPick(options)
    },
    diagnostics: {
      diagnoseWorldData: (options) => diagnoseWorldData(options),
      repairWorldData: () => diagnoseWorldData({ repair: true }),
      getPermissionDebugLog: () => deepClone(getPlayerPermissionDebugEntries?.() ?? []),
      clearPermissionDebugLog: () => clearPlayerPermissionDebugEntries?.(),
      getPerfState: () => deepClone(getPerfState?.() ?? {}),
      getPerfSummary: () => deepClone(getPerfSummary?.() ?? {})
    },
    meta: {
      getStatus: () => buildMetaStatus()
    }
  };

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
