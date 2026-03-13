function deepCloneValue(value, foundryRef) {
  const deepClone = foundryRef?.utils?.deepClone;
  if (typeof deepClone === "function") return deepClone(value);
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function createAudioMixPresetManager({
  foundryRef = globalThis.foundry,
  windowRef = globalThis.window,
  uiRef = globalThis.ui,
  dialogClass = globalThis.Dialog,
  audioLibraryUiState,
  builtInPresets = [],
  defaultPresetId = "",
  canAccessAllPlayerOps,
  getSelectedAudioMixPreset,
  getAudioMixPresetById,
  updateStoredAudioMixPresets,
  serializeAudioMixPresetForStore,
  normalizeAudioMixPresetDefinition,
  normalizeAudioMixPresetTrackIds,
  normalizeAudioLibraryRootPath,
  normalizeAudioLibraryKind,
  normalizeAudioLibraryUsage,
  normalizeAudioMixPlaybackMode,
  normalizeAudioMixVolume,
  normalizeAudioMixPresetSearchTokens,
  formatAudioMixPresetSearchTokens,
  inferAudioMixChannelForKind,
  setAudioMixStatus,
  syncLiveAudioMixPresetVolume,
  poEscapeHtml,
  clearManagedAudioMixQueueForPreset,
  syncSelectedAudioMixPresetTrackIdsToLiveQueue,
  getSelectedAudioMixTrackSelectionIds,
  setSelectedAudioMixTrackSelectionIds,
  getAudioMixPlaybackState,
  getAudioLibraryCatalog
} = {}) {
  function warn(message) {
    uiRef?.notifications?.warn?.(message);
  }

  function getSelectedCustomAudioMixPreset() {
    const preset = getSelectedAudioMixPreset?.();
    return preset?.isCustom ? preset : null;
  }

  function getSelectedEditableAudioMixPreset() {
    return getSelectedAudioMixPreset?.();
  }

  function isBuiltInAudioMixPreset(preset) {
    const presetId = String(preset?.id ?? "").trim();
    return builtInPresets.some((entry) => String(entry?.id ?? "").trim() === presetId);
  }

  function buildCustomAudioMixPresetSeed(seedPreset = getSelectedAudioMixPreset?.()) {
    const baseLabel = String(seedPreset?.label ?? "Mix").trim() || "Mix";
    const randomId = foundryRef?.utils?.randomID;
    const nextId = typeof randomId === "function" ? randomId() : `${Date.now()}`;
    return normalizeAudioMixPresetDefinition?.({
      id: `custom-${nextId}`,
      label: `New ${baseLabel} Mix`,
      description: String(seedPreset?.description ?? "Custom ambient playlist.").trim() || "Custom ambient playlist.",
      kindFocus: seedPreset?.kindFocus ?? seedPreset?.preferredKinds?.[0] ?? "music",
      usageFocus: seedPreset?.usageFocus ?? seedPreset?.preferredUsage?.[0] ?? "general",
      searchTokens: seedPreset?.searchTokens ?? [],
      channel: seedPreset?.channel ?? inferAudioMixChannelForKind?.(seedPreset?.kindFocus ?? seedPreset?.preferredKinds?.[0]),
      volume: seedPreset?.volume ?? 0.5,
      fade: seedPreset?.fade ?? 1200,
      playbackMode: seedPreset?.playbackMode ?? (seedPreset?.repeat ? "repeat" : "single"),
      trackIds: normalizeAudioMixPresetTrackIds?.(seedPreset?.trackIds ?? []) ?? []
    }, { isCustom: true });
  }

  async function updateSelectedAudioMixPreset(mutator) {
    const preset = getSelectedEditableAudioMixPreset();
    if (!preset) return false;
    await updateStoredAudioMixPresets?.((store) => {
      if (preset.isCustom) {
        store.presets = store.presets.map((entry) => {
          if (String(entry?.id ?? "").trim() !== String(preset?.id ?? "").trim()) return entry;
          const nextEntry = typeof mutator === "function"
            ? (mutator(deepCloneValue(entry, foundryRef), preset) ?? entry)
            : entry;
          return serializeAudioMixPresetForStore?.({
            ...preset,
            ...nextEntry,
            id: preset.id,
            label: String(nextEntry?.label ?? preset.label).trim() || preset.label,
            isCustom: true
          }, { includeIdentity: true });
        });
        return store;
      }

      const basePreset = builtInPresets.find((entry) => String(entry?.id ?? "").trim() === String(preset?.id ?? "").trim()) ?? preset;
      const currentOverride = store.overrides?.[preset.id] ?? {};
      const nextOverride = typeof mutator === "function"
        ? (mutator(deepCloneValue({
          ...basePreset,
          ...currentOverride,
          id: preset.id,
          label: preset.label
        }, foundryRef), preset) ?? currentOverride)
        : currentOverride;
      store.overrides = {
        ...(store.overrides ?? {}),
        [preset.id]: serializeAudioMixPresetForStore?.({
          ...basePreset,
          ...nextOverride,
          id: preset.id,
          label: preset.label,
          isCustom: false
        }, { includeIdentity: false })
      };
      return store;
    });
    return true;
  }

  async function createAudioMixPresetFromSelection() {
    if (!canAccessAllPlayerOps?.()) {
      warn("Only the GM can create Party Operations mix presets.");
      return null;
    }
    const preset = buildCustomAudioMixPresetSeed(getSelectedAudioMixPreset?.());
    await updateStoredAudioMixPresets?.((store) => {
      store.presets.push(preset);
      return store;
    });
    if (audioLibraryUiState) audioLibraryUiState.selectedMixPresetId = preset.id;
    setAudioMixStatus?.(`Created and saved custom preset: ${preset.label}`);
    return preset;
  }

  async function promptAndUpdateSelectedAudioMixPresetField(field) {
    const preset = getSelectedEditableAudioMixPreset();
    if (!preset) {
      warn("Select a mix preset to edit it.");
      return false;
    }
    if (field === "label" && !preset.isCustom) {
      warn("Built-in preset names are fixed. Create a custom preset to rename it.");
      return false;
    }

    const config = {
      label: {
        message: "Preset name",
        value: preset.label
      },
      description: {
        message: "Preset description",
        value: preset.description
      },
      searchTokens: {
        message: "Comma-separated search tokens",
        value: formatAudioMixPresetSearchTokens?.(preset.searchTokens)
      }
    }[field];
    if (!config || typeof windowRef?.prompt !== "function") return false;

    const response = windowRef.prompt(config.message, config.value);
    if (response === null) return false;
    const nextValue = field === "searchTokens"
      ? normalizeAudioMixPresetSearchTokens?.(response)
      : String(response ?? "").trim();
    if ((field === "label" || field === "description") && !nextValue) return false;

    await updateSelectedAudioMixPreset((entry) => {
      entry[field] = nextValue;
      return entry;
    });
    const updatedPreset = getAudioMixPresetById?.(String(preset?.id ?? "").trim());
    setAudioMixStatus?.(
      field === "label"
        ? `Saved preset name: ${updatedPreset?.label}`
        : field === "description"
          ? `Saved preset description for ${updatedPreset?.label}.`
          : `Saved preset tokens for ${updatedPreset?.label}.`
    );
    return true;
  }

  async function setSelectedAudioMixPresetTextField(actionElement) {
    const preset = getSelectedEditableAudioMixPreset();
    if (!preset) {
      warn("Select a mix preset to edit it.");
      return false;
    }

    const field = String(actionElement?.dataset?.field ?? "").trim();
    if (!["label", "description"].includes(field)) return false;
    if (field === "label" && !preset.isCustom) {
      warn("Built-in preset names are fixed. Create a custom preset to rename it.");
      return false;
    }

    const nextValue = String(actionElement?.value ?? "").trim();
    const previousValue = String(preset?.[field] ?? "").trim();
    if (!nextValue) {
      warn(field === "label"
        ? "Preset name cannot be empty."
        : "Preset description cannot be empty.");
      return false;
    }
    if (nextValue === previousValue) return false;

    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      [field]: nextValue
    }));
    const updatedPreset = getAudioMixPresetById?.(String(preset?.id ?? "").trim());
    setAudioMixStatus?.(
      field === "label"
        ? `Saved preset name: ${updatedPreset?.label}`
        : `Saved preset description for ${updatedPreset?.label}.`
    );
    return true;
  }

  async function setSelectedAudioMixPresetOption(actionElement) {
    const preset = getSelectedEditableAudioMixPreset();
    if (!preset) return false;
    const field = String(actionElement?.dataset?.field ?? "").trim();
    const value = actionElement?.value;
    if (!field) return false;
    const normalizedPresetId = String(preset?.id ?? "").trim();

    await updateSelectedAudioMixPreset((entry) => {
      const next = { ...entry };
      if (field === "kindFocus") {
        next.kindFocus = normalizeAudioLibraryKind?.(value);
        next.preferredKinds = next.kindFocus === "all" ? [] : [next.kindFocus];
        next.channel = inferAudioMixChannelForKind?.(next.kindFocus);
      } else if (field === "usageFocus") {
        next.usageFocus = normalizeAudioLibraryUsage?.(value);
        next.preferredUsage = next.usageFocus === "all" ? [] : [next.usageFocus];
      } else if (field === "playbackMode") {
        next.playbackMode = normalizeAudioMixPlaybackMode?.(value);
        next.repeat = next.playbackMode === "repeat";
      } else if (field === "volume") {
        next.volume = normalizeAudioMixVolume?.(Number(value) / 100, entry?.volume);
      }
      return next;
    });
    if (field === "volume") {
      const livePreset = getAudioMixPresetById?.(normalizedPresetId);
      await syncLiveAudioMixPresetVolume?.(livePreset);
    }
    return true;
  }

  async function deleteSelectedAudioMixPreset() {
    const preset = getSelectedCustomAudioMixPreset();
    if (!preset) {
      warn("Built-in presets cannot be deleted.");
      return false;
    }
    if (typeof dialogClass?.confirm !== "function") return false;

    const confirmed = await dialogClass.confirm({
      title: "Delete Mix Preset",
      content: `<p>Delete <strong>${poEscapeHtml?.(preset.label) ?? preset.label}</strong>?</p>`
    });
    if (!confirmed) return false;

    const clearedQueue = await clearManagedAudioMixQueueForPreset?.(preset, {
      nextPresetId: defaultPresetId,
      stopPlayback: true
    });
    await updateStoredAudioMixPresets?.((store) => {
      store.presets = store.presets.filter((entry) => entry.id !== preset.id);
      return store;
    });
    if (audioLibraryUiState) audioLibraryUiState.selectedMixPresetId = defaultPresetId;
    setAudioMixStatus?.(clearedQueue
      ? `Deleted custom preset and cleared its queue: ${preset.label}`
      : `Deleted custom preset: ${preset.label}`);
    return true;
  }

  async function addTrackToSelectedAudioMixPreset(trackId) {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!preset || !normalizedTrackId) {
      warn("Select a mix preset before adding tracks.");
      return false;
    }

    const nextTrackIds = normalizeAudioMixPresetTrackIds?.([...(preset.trackIds ?? []), normalizedTrackId]) ?? [];
    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      trackIds: nextTrackIds
    }));
    await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.(nextTrackIds, preset);
    const updatedPreset = getAudioMixPresetById?.(String(preset?.id ?? "").trim());
    setAudioMixStatus?.(`Saved ${updatedPreset?.label} track list.`);
    return true;
  }

  async function addTracksToSelectedAudioMixPreset(trackIds = []) {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackIds = normalizeAudioMixPresetTrackIds?.(trackIds) ?? [];
    if (!preset || normalizedTrackIds.length < 1) {
      warn("Select one or more tracks before adding them to the mix.");
      return false;
    }

    const currentTrackIds = normalizeAudioMixPresetTrackIds?.(preset.trackIds ?? []) ?? [];
    const nextTrackIds = normalizeAudioMixPresetTrackIds?.([...currentTrackIds, ...normalizedTrackIds]) ?? [];
    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      trackIds: nextTrackIds
    }));
    await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.(nextTrackIds, preset);
    setSelectedAudioMixTrackSelectionIds?.([]);
    const addedCount = Math.max(0, nextTrackIds.length - currentTrackIds.length);
    setAudioMixStatus?.(
      addedCount > 0
        ? `Added ${addedCount} track${addedCount === 1 ? "" : "s"} to ${preset.label}.`
        : `${preset.label} already included the selected tracks.`
    );
    return true;
  }

  async function clearSelectedAudioMixPresetTrackList() {
    const preset = getSelectedEditableAudioMixPreset();
    if (!preset) return false;
    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      trackIds: []
    }));
    const clearedQueue = await clearManagedAudioMixQueueForPreset?.(preset, { stopPlayback: true });
    if (!clearedQueue) {
      await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.([], preset);
    }
    setAudioMixStatus?.(clearedQueue
      ? `Cleared saved track list and queue for ${preset.label}.`
      : `Cleared saved track list for ${preset.label}.`);
    return true;
  }

  async function addSelectedLibraryTrackToAudioMixPreset() {
    const trackId = String(audioLibraryUiState?.selectedTrackId ?? "").trim();
    return addTrackToSelectedAudioMixPreset(trackId);
  }

  async function addSelectedAudioMixTracksToPreset() {
    return addTracksToSelectedAudioMixPreset(getSelectedAudioMixTrackSelectionIds?.());
  }

  function getAudioMixCurrentInsertionIndex(preset = getSelectedCustomAudioMixPreset()) {
    const playback = getAudioMixPlaybackState?.(getAudioLibraryCatalog?.());
    const currentTrackId = String(playback?.activeTrack?.id ?? playback?.activeTrackId ?? "").trim();
    if (!preset || !currentTrackId) return -1;
    if (String(playback?.presetId ?? "").trim() !== String(preset?.id ?? "").trim()) return -1;
    const trackIds = Array.isArray(preset?.trackIds) ? preset.trackIds : [];
    return trackIds.indexOf(currentTrackId);
  }

  function buildReorderedAudioMixTrackIds(trackIds = [], trackId, targetIndex) {
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!normalizedTrackId) return normalizeAudioMixPresetTrackIds?.(trackIds) ?? [];
    const existing = (normalizeAudioMixPresetTrackIds?.(trackIds) ?? []).filter((entry) => entry !== normalizedTrackId);
    const nextIndex = Math.max(0, Math.min(existing.length, Number(targetIndex ?? existing.length)));
    existing.splice(nextIndex, 0, normalizedTrackId);
    return existing;
  }

  async function queueTrackNextInSelectedAudioMixPreset(trackId) {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!preset || !normalizedTrackId) return false;
    const insertionIndex = getAudioMixCurrentInsertionIndex(preset);
    const targetIndex = insertionIndex >= 0 ? insertionIndex + 1 : 0;
    const nextTrackIds = buildReorderedAudioMixTrackIds(preset.trackIds ?? [], normalizedTrackId, targetIndex);
    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      trackIds: nextTrackIds
    }));
    await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.(nextTrackIds, preset);
    return true;
  }

  async function moveTrackToIndexInSelectedAudioMixPreset(trackId, targetIndex = 0) {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!preset || !normalizedTrackId) return false;

    let nextTrackIds = normalizeAudioMixPresetTrackIds?.(preset.trackIds ?? []) ?? [];
    let didChange = false;
    await updateSelectedAudioMixPreset((entry) => {
      const rows = normalizeAudioMixPresetTrackIds?.(entry?.trackIds ?? []) ?? [];
      const currentIndex = rows.indexOf(normalizedTrackId);
      if (currentIndex < 0) return entry;
      const boundedTargetIndex = Math.max(0, Math.min(rows.length, Math.floor(Number(targetIndex) || 0)));
      const reordered = buildReorderedAudioMixTrackIds(rows, normalizedTrackId, boundedTargetIndex);
      const changed = reordered.length !== rows.length || reordered.some((entryTrackId, index) => entryTrackId !== rows[index]);
      if (!changed) return entry;
      nextTrackIds = reordered;
      didChange = true;
      return {
        ...entry,
        trackIds: reordered
      };
    });

    if (!didChange) return false;
    await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.(nextTrackIds, preset);
    return true;
  }

  async function moveTrackWithinSelectedAudioMixPreset(trackId, direction = "up") {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!preset || !normalizedTrackId) return false;
    const rows = normalizeAudioMixPresetTrackIds?.(preset.trackIds ?? []) ?? [];
    const currentIndex = rows.indexOf(normalizedTrackId);
    if (currentIndex < 0) return false;
    const delta = String(direction ?? "").trim().toLowerCase() === "down" ? 1 : -1;
    const targetIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + delta));
    if (targetIndex === currentIndex) return false;
    return moveTrackToIndexInSelectedAudioMixPreset(normalizedTrackId, targetIndex);
  }

  async function moveTrackToTopInSelectedAudioMixPreset(trackId) {
    return moveTrackToIndexInSelectedAudioMixPreset(trackId, 0);
  }

  async function removeTrackFromSelectedAudioMixPreset(trackId) {
    const preset = getSelectedEditableAudioMixPreset();
    const normalizedTrackId = normalizeAudioLibraryRootPath?.(trackId);
    if (!preset || !normalizedTrackId) return false;

    const nextTrackIds = normalizeAudioMixPresetTrackIds?.((preset.trackIds ?? []).filter((entryTrackId) => entryTrackId !== normalizedTrackId)) ?? [];
    await updateSelectedAudioMixPreset((entry) => ({
      ...entry,
      trackIds: nextTrackIds
    }));
    await syncSelectedAudioMixPresetTrackIdsToLiveQueue?.(nextTrackIds, preset);
    return true;
  }

  return {
    buildCustomAudioMixPresetSeed,
    createAudioMixPresetFromSelection,
    getSelectedCustomAudioMixPreset,
    getSelectedEditableAudioMixPreset,
    isBuiltInAudioMixPreset,
    updateSelectedAudioMixPreset,
    promptAndUpdateSelectedAudioMixPresetField,
    setSelectedAudioMixPresetTextField,
    setSelectedAudioMixPresetOption,
    deleteSelectedAudioMixPreset,
    addTrackToSelectedAudioMixPreset,
    addTracksToSelectedAudioMixPreset,
    clearSelectedAudioMixPresetTrackList,
    addSelectedLibraryTrackToAudioMixPreset,
    addSelectedAudioMixTracksToPreset,
    getAudioMixCurrentInsertionIndex,
    buildReorderedAudioMixTrackIds,
    queueTrackNextInSelectedAudioMixPreset,
    moveTrackToIndexInSelectedAudioMixPreset,
    moveTrackWithinSelectedAudioMixPreset,
    moveTrackToTopInSelectedAudioMixPreset,
    removeTrackFromSelectedAudioMixPreset
  };
}
