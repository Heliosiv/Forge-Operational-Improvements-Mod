function deepCloneValue(value, foundryRef) {
  const deepClone = foundryRef?.utils?.deepClone;
  if (typeof deepClone === "function") return deepClone(value);
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

export function createAudioStore({
  gameRef = globalThis.game,
  foundryRef = globalThis.foundry,
  storageRef = globalThis.localStorage,
  moduleId = "party-operations",
  settings = {},
  refreshScopeKeys = {},
  audioLibraryUiState,
  audioLibraryDefaultSource = "data",
  audioLibraryBlockedSources = [],
  audioLibraryVersion = 1,
  audioLibraryHiddenTrackStoreVersion = 1,
  audioLibraryExtensions = [],
  audioMixPresetStoreVersion = 1,
  audioMixBuiltInPresets = [],
  audioMixPresetDefaultId = "",
  normalizeAudioMixChannel,
  normalizeAudioMixPlaybackMode,
  inferAudioMixChannelForKind,
  normalizeAudioMixPresetSearchTokens,
  normalizeAudioLibraryRootPath,
  normalizeAudioLibraryKind,
  normalizeAudioLibraryUsage,
  normalizeAudioLibraryDurationSeconds,
  normalizeAudioLibraryDurationResolvedAt,
  safeDecodeAudioText,
  setModuleSettingWithLocalRefreshSuppressed,
  refreshOpenApps,
  emitSocketRefresh
} = {}) {
  function buildDefaultAudioLibraryCatalog() {
    return {
      version: audioLibraryVersion,
      source: audioLibraryDefaultSource,
      rootPath: "",
      scannedAt: 0,
      scannedBy: "",
      items: []
    };
  }

  function buildDefaultAudioLibraryHiddenTrackStore() {
    return {
      version: audioLibraryHiddenTrackStoreVersion,
      trackIds: []
    };
  }

  function buildDefaultAudioMixPresetStore() {
    return {
      version: audioMixPresetStoreVersion,
      presets: [],
      overrides: {}
    };
  }

  function getSharedAudioStateStorageKey() {
    return `${moduleId}.sharedAudioState`;
  }

  function normalizeStoredAudioLibraryValue(value, { allowArray = false } = {}) {
    if (typeof value === "string") {
      const raw = value.trim();
      if (!raw) return allowArray ? [] : {};
      try {
        return normalizeStoredAudioLibraryValue(JSON.parse(raw), { allowArray });
      } catch {
        return allowArray ? [] : {};
      }
    }
    if (Array.isArray(value)) return allowArray ? value : {};
    if (value && typeof value === "object") return value;
    return allowArray ? [] : {};
  }

  function normalizeAudioLibrarySource(value) {
    const normalized = String(value ?? "").trim();
    const normalizedKey = normalized.toLowerCase();
    if (
      audioLibraryBlockedSources.some(
        (source) =>
          String(source ?? "")
            .trim()
            .toLowerCase() === normalizedKey
      )
    ) {
      return audioLibraryDefaultSource;
    }
    return normalized || audioLibraryDefaultSource;
  }

  function normalizeAudioMixPresetTrackIds(value) {
    const source = Array.isArray(value) ? value : [value];
    return source
      .map((entry) => normalizeAudioLibraryRootPath(entry))
      .filter((entry, index, rows) => entry && rows.indexOf(entry) === index);
  }

  function normalizeAudioLibraryHiddenTrackStore(store = {}) {
    const normalizedStore = normalizeStoredAudioLibraryValue(store, { allowArray: true });
    const trackIdsSource = Array.isArray(normalizedStore)
      ? normalizedStore
      : (normalizedStore?.trackIds ?? normalizedStore?.hiddenTrackIds ?? normalizedStore?.ids ?? []);
    return {
      version: audioLibraryHiddenTrackStoreVersion,
      trackIds: normalizeAudioMixPresetTrackIds(trackIdsSource)
    };
  }

  function normalizeAudioMixPresetDefinition(input = {}, { isCustom = false, allowTrackIds = false } = {}) {
    const preferredKinds = Array.isArray(input.preferredKinds)
      ? input.preferredKinds.map((entry) => normalizeAudioLibraryKind(entry)).filter((entry) => entry !== "all")
      : [];
    const preferredUsage = Array.isArray(input.preferredUsage)
      ? input.preferredUsage.map((entry) => normalizeAudioLibraryUsage(entry)).filter((entry) => entry !== "all")
      : [];
    const kindFocus = isCustom
      ? normalizeAudioLibraryKind(input.kindFocus ?? preferredKinds[0] ?? "music")
      : normalizeAudioLibraryKind(preferredKinds[0] ?? "all");
    const usageFocus = isCustom
      ? normalizeAudioLibraryUsage(input.usageFocus ?? preferredUsage[0] ?? "general")
      : normalizeAudioLibraryUsage(preferredUsage[0] ?? "all");
    const playbackMode = normalizeAudioMixPlaybackMode(input.playbackMode ?? (input.repeat ? "repeat" : "single"));
    const channel = normalizeAudioMixChannel(input.channel ?? inferAudioMixChannelForKind(kindFocus));
    const volumeRaw = Number(input.volume ?? 0.5);
    const fadeRaw = Number(input.fade ?? 1200);
    const randomId = foundryRef?.utils?.randomID;
    return {
      id: String(input.id ?? "").trim() || (typeof randomId === "function" ? randomId() : `audio-${Date.now()}`),
      label: String(input.label ?? "").trim() || "New Mix",
      description: String(input.description ?? "").trim() || "Custom ambient playlist.",
      preferredKinds: preferredKinds.length > 0 ? preferredKinds : kindFocus !== "all" ? [kindFocus] : [],
      preferredUsage: preferredUsage.length > 0 ? preferredUsage : usageFocus !== "all" ? [usageFocus] : [],
      kindFocus,
      usageFocus,
      searchTokens: normalizeAudioMixPresetSearchTokens(input.searchTokens),
      channel,
      volume: Math.max(0, Math.min(1, Number.isFinite(volumeRaw) ? volumeRaw : 0.5)),
      fade: Math.max(0, Math.floor(Number.isFinite(fadeRaw) ? fadeRaw : 1200)),
      repeat: playbackMode === "repeat",
      playbackMode,
      isCustom,
      trackIds: isCustom || allowTrackIds ? normalizeAudioMixPresetTrackIds(input.trackIds) : []
    };
  }

  function serializeAudioMixPresetForStore(preset = {}, { includeIdentity = true } = {}) {
    const normalized = normalizeAudioMixPresetDefinition(preset, {
      isCustom: Boolean(preset?.isCustom),
      allowTrackIds: true
    });
    const payload = {
      description: normalized.description,
      preferredKinds: normalized.preferredKinds,
      preferredUsage: normalized.preferredUsage,
      kindFocus: normalized.kindFocus,
      usageFocus: normalized.usageFocus,
      searchTokens: normalized.searchTokens,
      channel: normalized.channel,
      volume: normalized.volume,
      fade: normalized.fade,
      repeat: normalized.repeat,
      playbackMode: normalized.playbackMode,
      trackIds: normalized.trackIds
    };
    if (includeIdentity) {
      payload.id = normalized.id;
      payload.label = normalized.label;
    }
    return payload;
  }

  function normalizeAudioMixPresetStore(store = {}) {
    const normalizedStore = normalizeStoredAudioLibraryValue(store, { allowArray: true });
    const presetSource = Array.isArray(normalizedStore)
      ? normalizedStore
      : (normalizedStore?.presets ?? normalizedStore?.customPresets ?? []);
    const presets = Array.isArray(presetSource)
      ? presetSource.map((entry) => normalizeAudioMixPresetDefinition(entry, { isCustom: true })).filter(Boolean)
      : [];
    const overrideCandidate = Array.isArray(normalizedStore)
      ? null
      : (normalizedStore?.overrides ?? normalizedStore?.builtInOverrides ?? null);
    const overrideSource =
      overrideCandidate && typeof overrideCandidate === "object" && !Array.isArray(overrideCandidate)
        ? overrideCandidate
        : {};
    const overrides = {};
    for (const preset of audioMixBuiltInPresets) {
      const entry = overrideSource?.[preset.id];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const normalized = normalizeAudioMixPresetDefinition(
        {
          ...preset,
          ...entry,
          id: preset.id,
          label: preset.label
        },
        { isCustom: false, allowTrackIds: true }
      );
      overrides[preset.id] = serializeAudioMixPresetForStore(normalized, { includeIdentity: false });
    }
    return {
      version: audioMixPresetStoreVersion,
      presets,
      overrides
    };
  }

  function hasAudioMixPresetStoreData(store = {}) {
    const normalizedStore = normalizeAudioMixPresetStore(store);
    return normalizedStore.presets.length > 0 || Object.keys(normalizedStore.overrides ?? {}).length > 0;
  }

  function normalizeSharedAudioState(value = {}) {
    const normalizedValue = normalizeStoredAudioLibraryValue(value);
    return {
      version: 1,
      catalog: normalizeAudioLibraryCatalog(
        normalizedValue?.catalog ??
          normalizedValue?.audioLibraryCatalog ??
          normalizedValue?.libraryCatalog ??
          buildDefaultAudioLibraryCatalog()
      ),
      hiddenTracks: normalizeAudioLibraryHiddenTrackStore(
        normalizedValue?.hiddenTracks ??
          normalizedValue?.audioLibraryHiddenTracks ??
          buildDefaultAudioLibraryHiddenTrackStore()
      ),
      mixPresets: normalizeAudioMixPresetStore(
        normalizedValue?.mixPresets ??
          normalizedValue?.audioMixPresets ??
          normalizedValue?.presetStore ??
          buildDefaultAudioMixPresetStore()
      ),
      selectedMixPresetId: String(
        normalizedValue?.selectedMixPresetId ?? normalizedValue?.selectedPresetId ?? ""
      ).trim()
    };
  }

  function readSharedAudioState() {
    try {
      const raw = storageRef?.getItem?.(getSharedAudioStateStorageKey());
      if (!raw) return normalizeSharedAudioState({});
      return normalizeSharedAudioState(JSON.parse(raw));
    } catch {
      return normalizeSharedAudioState({});
    }
  }

  function writeSharedAudioState(state = {}) {
    const normalized = normalizeSharedAudioState(state);
    try {
      storageRef?.setItem?.(getSharedAudioStateStorageKey(), JSON.stringify(normalized));
    } catch {
      // Ignore storage failures outside browser execution contexts.
    }
    return normalized;
  }

  function updateSharedAudioState(mutator) {
    const current = readSharedAudioState();
    const next = normalizeSharedAudioState(
      typeof mutator === "function" ? (mutator(deepCloneValue(current, foundryRef)) ?? current) : current
    );
    return writeSharedAudioState(next);
  }

  function getWorldAudioLibraryCatalog() {
    const stored = gameRef?.settings?.get?.(moduleId, settings?.AUDIO_LIBRARY_CATALOG);
    return normalizeAudioLibraryCatalog(stored ?? buildDefaultAudioLibraryCatalog());
  }

  function getWorldAudioLibraryHiddenTrackStore() {
    const stored = gameRef?.settings?.get?.(moduleId, settings?.AUDIO_LIBRARY_HIDDEN_TRACKS);
    return normalizeAudioLibraryHiddenTrackStore(stored ?? buildDefaultAudioLibraryHiddenTrackStore());
  }

  function getWorldAudioMixPresetStore() {
    const stored = gameRef?.settings?.get?.(moduleId, settings?.AUDIO_MIX_PRESETS);
    return normalizeAudioMixPresetStore(stored ?? buildDefaultAudioMixPresetStore());
  }

  function choosePreferredAudioLibraryCatalog(primaryCatalog = {}, secondaryCatalog = {}) {
    const primary = normalizeAudioLibraryCatalog(primaryCatalog);
    const secondary = normalizeAudioLibraryCatalog(secondaryCatalog);
    if (primary.items.length <= 0) return secondary;
    if (secondary.items.length <= 0) return primary;
    if (primary.scannedAt !== secondary.scannedAt) {
      return primary.scannedAt >= secondary.scannedAt ? primary : secondary;
    }
    return primary.items.length >= secondary.items.length ? primary : secondary;
  }

  function mergeAudioLibraryHiddenTrackStores(primaryStore = {}, secondaryStore = {}) {
    const primary = normalizeAudioLibraryHiddenTrackStore(primaryStore);
    const secondary = normalizeAudioLibraryHiddenTrackStore(secondaryStore);
    return {
      version: audioLibraryHiddenTrackStoreVersion,
      trackIds: normalizeAudioMixPresetTrackIds([...secondary.trackIds, ...primary.trackIds])
    };
  }

  function mergeAudioMixPresetStores(primaryStore = {}, secondaryStore = {}) {
    const primary = normalizeAudioMixPresetStore(primaryStore);
    const secondary = normalizeAudioMixPresetStore(secondaryStore);
    const presetMap = new Map();
    for (const preset of secondary.presets) {
      const presetId = String(preset?.id ?? "").trim();
      if (!presetId) continue;
      presetMap.set(presetId, preset);
    }
    for (const preset of primary.presets) {
      const presetId = String(preset?.id ?? "").trim();
      if (!presetId) continue;
      presetMap.set(presetId, preset);
    }
    return {
      version: audioMixPresetStoreVersion,
      presets: Array.from(presetMap.values()),
      overrides: {
        ...(secondary.overrides ?? {}),
        ...(primary.overrides ?? {})
      }
    };
  }

  function hydrateSharedAudioStateFromWorldSettings() {
    const sharedState = readSharedAudioState();
    const worldCatalog = getWorldAudioLibraryCatalog();
    const worldHiddenTracks = getWorldAudioLibraryHiddenTrackStore();
    const worldMixPresets = getWorldAudioMixPresetStore();
    const currentSelectedPresetId = String(sharedState.selectedMixPresetId ?? "").trim();
    const selectedPresetId = String(audioLibraryUiState?.selectedMixPresetId ?? "").trim();
    let didChange = false;
    const nextState = { ...sharedState };

    if (sharedState.catalog.items.length <= 0 && worldCatalog.items.length > 0) {
      nextState.catalog = worldCatalog;
      didChange = true;
    }
    if (sharedState.hiddenTracks.trackIds.length <= 0 && worldHiddenTracks.trackIds.length > 0) {
      nextState.hiddenTracks = worldHiddenTracks;
      didChange = true;
    }
    if (!hasAudioMixPresetStoreData(sharedState.mixPresets) && hasAudioMixPresetStoreData(worldMixPresets)) {
      nextState.mixPresets = worldMixPresets;
      didChange = true;
    }
    if (!currentSelectedPresetId && selectedPresetId && selectedPresetId !== audioMixPresetDefaultId) {
      nextState.selectedMixPresetId = selectedPresetId;
      didChange = true;
    }

    return didChange ? writeSharedAudioState(nextState) : sharedState;
  }

  function getBuiltInAudioMixPresets() {
    const store = getStoredAudioMixPresetStore();
    return audioMixBuiltInPresets.map((preset) => {
      const override = store?.overrides?.[preset.id] ?? {};
      return normalizeAudioMixPresetDefinition(
        {
          ...preset,
          ...override,
          id: preset.id,
          label: preset.label
        },
        { isCustom: false, allowTrackIds: true }
      );
    });
  }

  function normalizeAudioLibraryItem(entry = {}) {
    const normalizedEntry = normalizeStoredAudioLibraryValue(entry);
    const path = normalizeAudioLibraryRootPath(
      normalizedEntry.path ??
        normalizedEntry.file ??
        normalizedEntry.src ??
        normalizedEntry.url ??
        normalizedEntry.relativePath
    );
    if (!path) return null;
    const id = normalizeAudioLibraryRootPath(normalizedEntry.id ?? normalizedEntry.trackId ?? path) || path;
    const name = safeDecodeAudioText(
      String(normalizedEntry.name ?? normalizedEntry.label ?? normalizedEntry.title ?? "").trim() ||
        String(path.split("/").pop() ?? path).trim()
    );
    const category = safeDecodeAudioText(
      String(normalizedEntry.category ?? normalizedEntry.group ?? normalizedEntry.folder ?? "Uncategorized").trim() ||
        "Uncategorized"
    );
    const subcategory = safeDecodeAudioText(
      String(normalizedEntry.subcategory ?? normalizedEntry.subCategory ?? normalizedEntry.collection ?? "").trim()
    );
    const kind = normalizeAudioLibraryKind(normalizedEntry.kind === "all" ? "" : normalizedEntry.kind);
    const usage = normalizeAudioLibraryUsage(normalizedEntry.usage === "all" ? "" : normalizedEntry.usage);
    const extensionRaw = String(normalizedEntry.extension ?? normalizedEntry.ext ?? "")
      .trim()
      .replace(/^\./, "")
      .toLowerCase();
    const extension = audioLibraryExtensions.includes(extensionRaw)
      ? extensionRaw
      : String(path.split(".").pop() ?? "mp3")
          .trim()
          .toLowerCase() || "mp3";
    const durationSeconds = normalizeAudioLibraryDurationSeconds(
      normalizedEntry.durationSeconds ??
        normalizedEntry.duration ??
        normalizedEntry.metadata?.durationSeconds ??
        normalizedEntry.metadata?.duration ??
        0
    );
    const durationResolvedAt = normalizeAudioLibraryDurationResolvedAt(
      normalizedEntry.durationResolvedAt ?? normalizedEntry.metadata?.durationResolvedAt ?? 0
    );
    const tagSource = normalizedEntry.tags ?? normalizedEntry.keywords ?? normalizedEntry.labels ?? [];
    const tags = Array.isArray(tagSource)
      ? tagSource
          .map((tag) => safeDecodeAudioText(String(tag ?? "").trim()))
          .filter((tag, index, rows) => tag && rows.indexOf(tag) === index)
          .slice(0, 12)
      : [];
    return {
      id,
      path,
      name,
      category,
      subcategory,
      kind: kind === "all" ? "music" : kind,
      usage: usage === "all" ? "general" : usage,
      extension,
      durationSeconds,
      durationResolvedAt,
      tags
    };
  }

  function normalizeAudioLibraryCatalog(catalog = {}) {
    const normalizedCatalog = normalizeStoredAudioLibraryValue(catalog, { allowArray: true });
    const itemSource = Array.isArray(normalizedCatalog)
      ? normalizedCatalog
      : (normalizedCatalog?.items ??
        normalizedCatalog?.tracks ??
        normalizedCatalog?.entries ??
        normalizedCatalog?.catalog ??
        []);
    const items = Array.isArray(itemSource)
      ? itemSource.map((entry) => normalizeAudioLibraryItem(entry)).filter(Boolean)
      : [];
    const scannedAtRaw = Number(
      Array.isArray(normalizedCatalog)
        ? 0
        : (normalizedCatalog?.scannedAt ?? normalizedCatalog?.updatedAt ?? normalizedCatalog?.lastScannedAt ?? 0)
    );
    return {
      version: audioLibraryVersion,
      source: normalizeAudioLibrarySource(
        Array.isArray(normalizedCatalog)
          ? ""
          : (normalizedCatalog?.source ?? normalizedCatalog?.activeSource ?? normalizedCatalog?.fileSource)
      ),
      rootPath: normalizeAudioLibraryRootPath(
        Array.isArray(normalizedCatalog)
          ? ""
          : (normalizedCatalog?.rootPath ??
              normalizedCatalog?.path ??
              normalizedCatalog?.basePath ??
              normalizedCatalog?.libraryRoot)
      ),
      scannedAt: Number.isFinite(scannedAtRaw) ? scannedAtRaw : 0,
      scannedBy: String(
        Array.isArray(normalizedCatalog)
          ? ""
          : (normalizedCatalog?.scannedBy ?? normalizedCatalog?.updatedBy ?? normalizedCatalog?.lastScannedBy ?? "")
      ).trim(),
      items
    };
  }

  function getStoredAudioMixPresetStore() {
    const worldStore = getWorldAudioMixPresetStore();
    const sharedStore = hydrateSharedAudioStateFromWorldSettings().mixPresets;
    if (!hasAudioMixPresetStoreData(sharedStore)) return worldStore;
    return mergeAudioMixPresetStores(sharedStore, worldStore);
  }

  function getAllAudioMixPresets() {
    return [...getBuiltInAudioMixPresets(), ...getStoredAudioMixPresetStore().presets];
  }

  function getAudioMixPresetById(value) {
    const normalized = String(value ?? "").trim();
    const presets = getAllAudioMixPresets();
    return (
      presets.find((preset) => String(preset.id ?? "").trim() === normalized) ??
      presets.find(
        (preset) =>
          String(preset.id ?? "")
            .trim()
            .toLowerCase() === normalized.toLowerCase()
      ) ??
      presets[0]
    );
  }

  function getSelectedAudioMixPreset() {
    return getAudioMixPresetById(audioLibraryUiState?.selectedMixPresetId);
  }

  function getAudioLibraryDraftState() {
    return {
      source: normalizeAudioLibrarySource(audioLibraryUiState?.draft?.source),
      rootPath: normalizeAudioLibraryRootPath(audioLibraryUiState?.draft?.rootPath)
    };
  }

  function getAudioLibrarySourceSetting() {
    const worldValue = String(gameRef?.settings?.get?.(moduleId, settings?.AUDIO_LIBRARY_SOURCE) ?? "").trim();
    if (worldValue) return normalizeAudioLibrarySource(worldValue);
    return normalizeAudioLibrarySource(hydrateSharedAudioStateFromWorldSettings().catalog.source);
  }

  function getAudioLibraryRootSetting() {
    const worldValue = String(gameRef?.settings?.get?.(moduleId, settings?.AUDIO_LIBRARY_ROOT) ?? "").trim();
    if (worldValue) return normalizeAudioLibraryRootPath(worldValue);
    return normalizeAudioLibraryRootPath(hydrateSharedAudioStateFromWorldSettings().catalog.rootPath);
  }

  function syncAudioLibraryDraftFromSettings() {
    const sharedState = hydrateSharedAudioStateFromWorldSettings();
    if (!audioLibraryUiState?.draft) return;
    audioLibraryUiState.draft.source = getAudioLibrarySourceSetting();
    audioLibraryUiState.draft.rootPath = getAudioLibraryRootSetting();
    const sharedSelectedPresetId = String(sharedState.selectedMixPresetId ?? "").trim();
    if (sharedSelectedPresetId) {
      audioLibraryUiState.selectedMixPresetId =
        getAudioMixPresetById(sharedSelectedPresetId)?.id ?? audioMixPresetDefaultId;
    }
  }

  function getStoredAudioLibraryCatalog() {
    const worldCatalog = getWorldAudioLibraryCatalog();
    const sharedCatalog = hydrateSharedAudioStateFromWorldSettings().catalog;
    return choosePreferredAudioLibraryCatalog(sharedCatalog, worldCatalog);
  }

  function getStoredAudioLibraryHiddenTrackStore() {
    const worldStore = getWorldAudioLibraryHiddenTrackStore();
    const sharedStore = hydrateSharedAudioStateFromWorldSettings().hiddenTracks;
    return mergeAudioLibraryHiddenTrackStores(sharedStore, worldStore);
  }

  function getHiddenAudioLibraryTrackIds() {
    return getStoredAudioLibraryHiddenTrackStore().trackIds;
  }

  function getHiddenAudioLibraryTrackIdSet() {
    return new Set(getHiddenAudioLibraryTrackIds());
  }

  function applyHiddenTracksToAudioLibraryCatalog(catalog, hiddenTrackIds = []) {
    const normalizedCatalog = normalizeAudioLibraryCatalog(catalog);
    const hiddenIds = new Set(normalizeAudioMixPresetTrackIds(hiddenTrackIds));
    if (hiddenIds.size <= 0) return normalizedCatalog;
    return {
      ...normalizedCatalog,
      items: normalizedCatalog.items.filter((item) => !hiddenIds.has(String(item?.id ?? "").trim()))
    };
  }

  function getAudioLibraryCatalog(options = {}) {
    const includeHidden = Boolean(options?.includeHidden);
    const catalog = getStoredAudioLibraryCatalog();
    if (includeHidden) return catalog;
    return applyHiddenTracksToAudioLibraryCatalog(catalog, getHiddenAudioLibraryTrackIds());
  }

  function getAudioLibraryCatalogWarmupKey(catalog = null) {
    const normalizedCatalog = normalizeAudioLibraryCatalog(catalog ?? getStoredAudioLibraryCatalog());
    return [
      String(normalizedCatalog.rootPath ?? "").trim(),
      String(normalizedCatalog.source ?? "").trim(),
      String(normalizedCatalog.scannedAt ?? 0),
      String(normalizedCatalog.items.length ?? 0)
    ].join("|");
  }

  async function saveAudioMixPresetStore(store) {
    const normalized = normalizeAudioMixPresetStore(store);
    await setModuleSettingWithLocalRefreshSuppressed?.(settings?.AUDIO_MIX_PRESETS, normalized);
    updateSharedAudioState((state) => ({
      ...state,
      mixPresets: normalized,
      selectedMixPresetId: String(audioLibraryUiState?.selectedMixPresetId ?? state.selectedMixPresetId ?? "").trim()
    }));
    refreshOpenApps?.({ scope: refreshScopeKeys?.LOOT });
    emitSocketRefresh?.({ scope: refreshScopeKeys?.LOOT });
    return normalized;
  }

  async function saveAudioLibraryHiddenTrackStore(store) {
    const normalized = normalizeAudioLibraryHiddenTrackStore(store);
    await setModuleSettingWithLocalRefreshSuppressed?.(settings?.AUDIO_LIBRARY_HIDDEN_TRACKS, normalized);
    updateSharedAudioState((state) => ({
      ...state,
      hiddenTracks: normalized
    }));
    refreshOpenApps?.({ scope: refreshScopeKeys?.LOOT });
    emitSocketRefresh?.({ scope: refreshScopeKeys?.LOOT });
    return normalized;
  }

  function saveSharedAudioLibraryCatalog(catalog) {
    const normalized = normalizeAudioLibraryCatalog(catalog);
    return updateSharedAudioState((state) => ({
      ...state,
      catalog: normalized
    }));
  }

  function getSharedSelectedAudioMixPresetId() {
    return String(readSharedAudioState().selectedMixPresetId ?? "").trim();
  }

  function setSharedSelectedAudioMixPresetId(value) {
    const normalized = String(value ?? "").trim();
    const nextSelectedPresetId = getAudioMixPresetById(normalized)?.id ?? audioMixPresetDefaultId;
    updateSharedAudioState((state) => ({
      ...state,
      selectedMixPresetId: nextSelectedPresetId
    }));
    return nextSelectedPresetId;
  }

  async function updateStoredAudioLibraryHiddenTracks(mutator) {
    const current = getStoredAudioLibraryHiddenTrackStore();
    const next = normalizeAudioLibraryHiddenTrackStore(
      typeof mutator === "function" ? (mutator(deepCloneValue(current, foundryRef)) ?? current) : current
    );
    await saveAudioLibraryHiddenTrackStore(next);
    return next;
  }

  async function updateStoredAudioMixPresets(mutator) {
    const current = getStoredAudioMixPresetStore();
    const next = normalizeAudioMixPresetStore(
      typeof mutator === "function" ? (mutator(deepCloneValue(current, foundryRef)) ?? current) : current
    );
    await saveAudioMixPresetStore(next);
    const selectedId = String(audioLibraryUiState?.selectedMixPresetId ?? "").trim();
    const nextPresetIds = [
      ...audioMixBuiltInPresets.map((preset) => String(preset.id ?? "").trim()),
      ...next.presets.map((preset) => String(preset.id ?? "").trim())
    ];
    if (audioLibraryUiState && !nextPresetIds.some((presetId) => presetId === selectedId)) {
      audioLibraryUiState.selectedMixPresetId = audioMixPresetDefaultId;
    }
    return next;
  }

  return {
    buildDefaultAudioLibraryCatalog,
    buildDefaultAudioLibraryHiddenTrackStore,
    buildDefaultAudioMixPresetStore,
    normalizeStoredAudioLibraryValue,
    normalizeAudioLibrarySource,
    normalizeAudioMixPresetTrackIds,
    normalizeAudioLibraryHiddenTrackStore,
    normalizeAudioMixPresetDefinition,
    serializeAudioMixPresetForStore,
    normalizeAudioMixPresetStore,
    getBuiltInAudioMixPresets,
    normalizeAudioLibraryItem,
    normalizeAudioLibraryCatalog,
    getStoredAudioMixPresetStore,
    getAllAudioMixPresets,
    getAudioMixPresetById,
    getSelectedAudioMixPreset,
    getAudioLibraryDraftState,
    getAudioLibrarySourceSetting,
    getAudioLibraryRootSetting,
    syncAudioLibraryDraftFromSettings,
    getStoredAudioLibraryCatalog,
    getStoredAudioLibraryHiddenTrackStore,
    getHiddenAudioLibraryTrackIds,
    getHiddenAudioLibraryTrackIdSet,
    applyHiddenTracksToAudioLibraryCatalog,
    getAudioLibraryCatalog,
    getAudioLibraryCatalogWarmupKey,
    saveAudioMixPresetStore,
    saveAudioLibraryHiddenTrackStore,
    saveSharedAudioLibraryCatalog,
    getSharedSelectedAudioMixPresetId,
    setSharedSelectedAudioMixPresetId,
    updateStoredAudioLibraryHiddenTracks,
    updateStoredAudioMixPresets
  };
}
