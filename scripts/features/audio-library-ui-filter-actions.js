export function createAudioLibraryUiFilterActions({
  audioLibraryUiState,
  normalizeAudioLibraryFilters,
  normalizeAudioLibrarySearch,
  normalizeAudioLibraryKind,
  normalizeAudioLibraryUsage,
  normalizeAudioLibraryTag,
  normalizeAudioLibraryTagList,
  resetAudioMixTrackBrowserPages
} = {}) {
  const clearAudioLibraryFilters = () => {
    audioLibraryUiState.filters = normalizeAudioLibraryFilters({});
    resetAudioMixTrackBrowserPages();
  };

  const setAudioLibraryFilterField = (actionElement) => {
    const field = String(actionElement?.dataset?.field ?? "").trim();
    if (!field) return;
    if (field === "clearAll") {
      clearAudioLibraryFilters();
      return;
    }
    if (!audioLibraryUiState.filters || typeof audioLibraryUiState.filters !== "object") {
      audioLibraryUiState.filters = normalizeAudioLibraryFilters({});
    }
    if (field === "search") audioLibraryUiState.filters.search = normalizeAudioLibrarySearch(actionElement?.value);
    if (field === "kind") audioLibraryUiState.filters.kind = normalizeAudioLibraryKind(actionElement?.value);
    if (field === "usage") audioLibraryUiState.filters.usage = normalizeAudioLibraryUsage(actionElement?.value);
    if (field === "selectedTags") {
      const tag = normalizeAudioLibraryTag(actionElement?.dataset?.tag ?? actionElement?.value);
      const selectedTags = new Set(normalizeAudioLibraryTagList(audioLibraryUiState.filters.selectedTags ?? []));
      if (tag) {
        if (selectedTags.has(tag)) selectedTags.delete(tag);
        else selectedTags.add(tag);
      }
      audioLibraryUiState.filters.selectedTags = [...selectedTags];
    }
    audioLibraryUiState.filters = normalizeAudioLibraryFilters(audioLibraryUiState.filters);
    resetAudioMixTrackBrowserPages();
  };

  return Object.freeze({
    clearAudioLibraryFilters,
    setAudioLibraryFilterField
  });
}
