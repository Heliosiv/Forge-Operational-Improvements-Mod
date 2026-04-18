export function createAudioLibraryUiDraftActions({
  audioLibraryUiState,
  normalizeAudioLibrarySource,
  normalizeAudioLibraryRootPath,
  normalizeAudioLibraryPickerSelection
} = {}) {
  const setDraftSource = (value) => {
    audioLibraryUiState.draft.source = normalizeAudioLibrarySource(value);
    return audioLibraryUiState.draft.source;
  };

  const setDraftRootPath = (value) => {
    audioLibraryUiState.draft.rootPath = normalizeAudioLibraryRootPath(value);
    return audioLibraryUiState.draft.rootPath;
  };

  const setDraftFromCatalog = ({ source, rootPath } = {}) => {
    setDraftSource(source);
    setDraftRootPath(rootPath);
    return {
      source: audioLibraryUiState.draft.source,
      rootPath: audioLibraryUiState.draft.rootPath
    };
  };

  const setDraftFromPickerSelection = ({ activeSource, fallbackSource, selectedPath } = {}) => {
    audioLibraryUiState.draft.source = normalizeAudioLibrarySource(activeSource ?? fallbackSource);
    audioLibraryUiState.draft.rootPath = normalizeAudioLibraryPickerSelection(selectedPath);
    return {
      source: audioLibraryUiState.draft.source,
      rootPath: audioLibraryUiState.draft.rootPath
    };
  };

  const setAudioLibraryDraftField = (actionElement) => {
    const field = String(actionElement?.dataset?.field ?? "").trim();
    if (!field) return;
    if (field === "source") setDraftSource(actionElement?.value);
    if (field === "rootPath") setDraftRootPath(actionElement?.value);
  };

  return Object.freeze({
    setDraftSource,
    setDraftRootPath,
    setDraftFromCatalog,
    setDraftFromPickerSelection,
    setAudioLibraryDraftField
  });
}
