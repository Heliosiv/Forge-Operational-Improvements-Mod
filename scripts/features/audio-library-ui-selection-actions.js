export function createAudioLibraryUiSelectionActions({
  audioLibraryUiState,
  normalizeAudioLibraryView,
  normalizeAudioMixTrackBrowserView,
  getAudioMixTrackBrowserPageForView,
  setAudioMixTrackBrowserPageForView,
  normalizeAudioLibraryRootPath,
  getSelectedAudioLibraryTrackSelectionIds,
  setSelectedAudioLibraryTrackSelectionIds,
  getAudioLibraryCatalog,
  buildAudioLibraryResults,
  getSelectedAudioMixTrackSelectionIds,
  setSelectedAudioMixTrackSelectionIds,
  getSelectedAudioMixPreset,
  buildAudioMixAssignedCandidates,
  normalizeAudioLibraryFilters,
  filterAudioMixTrackCandidates,
  buildAudioMixCandidates,
  scoreAudioTrackForMixPreset,
  AUDIO_MIX_TRACK_BROWSER_VIEW_IDS,
  buildAudioMixTrackBrowserPagination,
  getAudioMixPresetById,
  setSelectedAudioMixPresetId,
  resetAudioMixTrackBrowserPages,
  refreshLauncherAudioUi
} = {}) {
  const setAudioLibraryView = (actionElement) => {
    const view = normalizeAudioLibraryView(actionElement?.dataset?.view);
    if (Object.is(audioLibraryUiState.view, view)) return false;
    audioLibraryUiState.view = view;
    return true;
  };

  const setAudioMixTrackBrowserView = (actionElement) => {
    const view = normalizeAudioMixTrackBrowserView(actionElement?.dataset?.view ?? actionElement?.value);
    const pageResetNeeded = !Object.is(getAudioMixTrackBrowserPageForView(view), 0);
    const viewChanged = !Object.is(audioLibraryUiState.mixTrackBrowserView, view);
    if (!viewChanged && !pageResetNeeded) return false;
    audioLibraryUiState.mixTrackBrowserView = view;
    setAudioMixTrackBrowserPageForView(view, 0);
    return true;
  };

  const selectAudioLibraryTrack = (actionElement) => {
    const nextTrackId = String(actionElement?.dataset?.trackId ?? "").trim();
    if (Object.is(audioLibraryUiState.selectedTrackId, nextTrackId)) return false;
    audioLibraryUiState.selectedTrackId = nextTrackId;
    return true;
  };

  const toggleAudioLibraryTrackSelection = (actionElement) => {
    const normalizedTrackId = normalizeAudioLibraryRootPath(actionElement?.dataset?.trackId);
    if (!normalizedTrackId) return false;
    const selected = new Set(getSelectedAudioLibraryTrackSelectionIds());
    const shouldSelect = actionElement instanceof HTMLInputElement
      ? Boolean(actionElement.checked)
      : !selected.has(normalizedTrackId);
    if (shouldSelect) selected.add(normalizedTrackId);
    else selected.delete(normalizedTrackId);
    setSelectedAudioLibraryTrackSelectionIds([...selected]);
    return true;
  };

  const selectVisibleAudioLibraryTracks = () => {
    const catalog = getAudioLibraryCatalog();
    const visibleTrackIds = buildAudioLibraryResults(catalog).tracks.map((item) => item.id);
    const previousSelection = getSelectedAudioLibraryTrackSelectionIds();
    const unchanged = previousSelection.length === visibleTrackIds.length
      && previousSelection.every((trackId, index) => Object.is(trackId, visibleTrackIds[index]));
    if (unchanged) return false;
    setSelectedAudioLibraryTrackSelectionIds(visibleTrackIds);
    return true;
  };

  const clearAudioLibraryTrackSelections = () => {
    if (getSelectedAudioLibraryTrackSelectionIds().length <= 0) return false;
    setSelectedAudioLibraryTrackSelectionIds([]);
    return true;
  };

  const toggleAudioMixTrackSelection = (actionElement) => {
    const normalizedTrackId = normalizeAudioLibraryRootPath(actionElement?.dataset?.trackId);
    if (!normalizedTrackId) return false;
    const selected = new Set(getSelectedAudioMixTrackSelectionIds());
    const shouldSelect = actionElement instanceof HTMLInputElement
      ? Boolean(actionElement.checked)
      : !selected.has(normalizedTrackId);
    if (shouldSelect) selected.add(normalizedTrackId);
    else selected.delete(normalizedTrackId);
    setSelectedAudioMixTrackSelectionIds([...selected]);
    return true;
  };

  const getVisibleAudioMixTrackBrowserCandidates = (catalog, preset = getSelectedAudioMixPreset()) => {
    const assignedTrackIds = buildAudioMixAssignedCandidates(catalog, preset).map(({ item }) => item.id);
    const filters = normalizeAudioLibraryFilters(audioLibraryUiState.filters);
    const suggestedCandidates = filterAudioMixTrackCandidates(buildAudioMixCandidates(catalog, preset, {
      excludeTrackIds: assignedTrackIds
    }), filters);
    const allCandidates = filterAudioMixTrackCandidates(catalog.items
      .map((item) => ({
        item,
        score: scoreAudioTrackForMixPreset(item, preset)
      }))
      .sort((left, right) => {
        const categoryCompare = String(left.item.category ?? "").localeCompare(String(right.item.category ?? ""));
        if (categoryCompare !== 0) return categoryCompare;
        const subcategoryCompare = String(left.item.subcategory ?? "").localeCompare(String(right.item.subcategory ?? ""));
        if (subcategoryCompare !== 0) return subcategoryCompare;
        return String(left.item.name ?? "").localeCompare(String(right.item.name ?? ""));
      }), filters);
    const view = normalizeAudioMixTrackBrowserView(audioLibraryUiState.mixTrackBrowserView);
    return {
      view,
      suggestedCandidates,
      allCandidates,
      visibleCandidates: view === AUDIO_MIX_TRACK_BROWSER_VIEW_IDS.ALL ? allCandidates : suggestedCandidates
    };
  };

  const selectVisibleAudioMixTracks = () => {
    const catalog = getAudioLibraryCatalog();
    const preset = getSelectedAudioMixPreset();
    const { view, visibleCandidates } = getVisibleAudioMixTrackBrowserCandidates(catalog, preset);
    const pagination = buildAudioMixTrackBrowserPagination(visibleCandidates.length, view);
    const visibleTrackIds = visibleCandidates
      .slice(pagination.startIndex, pagination.endIndex)
      .map(({ item }) => item.id);
    const previousSelection = getSelectedAudioMixTrackSelectionIds();
    const unchanged = previousSelection.length === visibleTrackIds.length
      && previousSelection.every((trackId, index) => Object.is(trackId, visibleTrackIds[index]));
    if (unchanged) return false;
    setSelectedAudioMixTrackSelectionIds(visibleTrackIds);
    return true;
  };

  const clearAudioMixTrackSelections = () => {
    if (getSelectedAudioMixTrackSelectionIds().length <= 0) return false;
    setSelectedAudioMixTrackSelectionIds([]);
    return true;
  };

  const selectAudioMixPreset = (actionElement) => {
    const preset = getAudioMixPresetById(actionElement?.dataset?.presetId ?? actionElement?.value);
    const currentPresetId = String(getSelectedAudioMixPreset()?.id ?? "").trim();
    if (Object.is(currentPresetId, preset.id)) return false;
    setSelectedAudioMixPresetId(preset.id);
    resetAudioMixTrackBrowserPages();
    refreshLauncherAudioUi();
    return true;
  };

  const changeAudioMixTrackBrowserPage = (actionElement) => {
    const catalog = getAudioLibraryCatalog();
    const preset = getSelectedAudioMixPreset();
    const { view, visibleCandidates } = getVisibleAudioMixTrackBrowserCandidates(catalog, preset);
    const pagination = buildAudioMixTrackBrowserPagination(visibleCandidates.length, view);
    const direction = String(actionElement?.dataset?.direction ?? "").trim().toLowerCase();
    let nextPage = pagination.currentPage;
    if (direction === "prev") nextPage -= 1;
    if (direction === "next") nextPage += 1;
    if (Object.is(nextPage, pagination.currentPage)) return false;
    nextPage = Math.max(0, Math.min(pagination.totalPages - 1, nextPage));
    if (Object.is(nextPage, pagination.currentPage)) return false;
    setAudioMixTrackBrowserPageForView(view, nextPage);
    return true;
  };

  return Object.freeze({
    setAudioLibraryView,
    setAudioMixTrackBrowserView,
    selectAudioLibraryTrack,
    toggleAudioLibraryTrackSelection,
    selectVisibleAudioLibraryTracks,
    clearAudioLibraryTrackSelections,
    toggleAudioMixTrackSelection,
    getVisibleAudioMixTrackBrowserCandidates,
    selectVisibleAudioMixTracks,
    clearAudioMixTrackSelections,
    selectAudioMixPreset,
    changeAudioMixTrackBrowserPage
  });
}
