import assert from "node:assert/strict";

import { createAudioLibraryUiSelectionActions } from "./features/audio-library-ui-selection-actions.js";

{
  const audioLibraryUiState = {
    view: "library",
    mixTrackBrowserView: "suggested",
    selectedTrackId: "",
    filters: {}
  };
  let audioLibrarySelectionIds = [];
  let audioMixSelectionIds = [];
  const browserPages = new Map([[
    "suggested", 0
  ], [
    "all", 0
  ]]);
  let selectedPresetId = "preset-a";
  let resetCount = 0;
  let launcherRefreshCount = 0;

  const actions = createAudioLibraryUiSelectionActions({
    audioLibraryUiState,
    normalizeAudioLibraryView: (value) => String(value ?? "").trim().toLowerCase() || "library",
    normalizeAudioMixTrackBrowserView: (value) => String(value ?? "").trim().toLowerCase() === "all" ? "all" : "suggested",
    getAudioMixTrackBrowserPageForView: (view) => Number(browserPages.get(view) ?? 0),
    setAudioMixTrackBrowserPageForView: (view, page) => browserPages.set(view, page),
    normalizeAudioLibraryRootPath: (value) => String(value ?? "").trim(),
    getSelectedAudioLibraryTrackSelectionIds: () => [...audioLibrarySelectionIds],
    setSelectedAudioLibraryTrackSelectionIds: (ids) => {
      audioLibrarySelectionIds = [...ids];
    },
    getAudioLibraryCatalog: () => ({
      items: [
        { id: "track-a", name: "Track A", category: "A", subcategory: "1" },
        { id: "track-b", name: "Track B", category: "B", subcategory: "1" }
      ]
    }),
    buildAudioLibraryResults: () => ({
      tracks: [
        { id: "track-a" },
        { id: "track-b" }
      ]
    }),
    getSelectedAudioMixTrackSelectionIds: () => [...audioMixSelectionIds],
    setSelectedAudioMixTrackSelectionIds: (ids) => {
      audioMixSelectionIds = [...ids];
    },
    getSelectedAudioMixPreset: () => ({ id: selectedPresetId }),
    buildAudioMixAssignedCandidates: () => [],
    normalizeAudioLibraryFilters: (filters) => filters ?? {},
    filterAudioMixTrackCandidates: (candidates) => candidates,
    buildAudioMixCandidates: (catalog) => catalog.items.map((item) => ({ item, score: 1 })),
    scoreAudioTrackForMixPreset: () => 1,
    AUDIO_MIX_TRACK_BROWSER_VIEW_IDS: { ALL: "all" },
    buildAudioMixTrackBrowserPagination: (count) => ({
      currentPage: 0,
      totalPages: Math.max(1, count),
      startIndex: 0,
      endIndex: count
    }),
    getAudioMixPresetById: (value) => ({ id: String(value ?? "") }),
    setSelectedAudioMixPresetId: (value) => {
      selectedPresetId = String(value ?? "");
    },
    resetAudioMixTrackBrowserPages: () => {
      resetCount += 1;
    },
    refreshLauncherAudioUi: () => {
      launcherRefreshCount += 1;
    }
  });

  assert.equal(actions.setAudioLibraryView({ dataset: { view: "library" } }), false);
  assert.equal(actions.setAudioLibraryView({ dataset: { view: "mix" } }), true);

  assert.equal(actions.selectAudioLibraryTrack({ dataset: { trackId: "track-a" } }), true);
  assert.equal(actions.selectAudioLibraryTrack({ dataset: { trackId: "track-a" } }), false);

  assert.equal(actions.selectVisibleAudioLibraryTracks(), true);
  assert.deepEqual(audioLibrarySelectionIds, ["track-a", "track-b"]);
  assert.equal(actions.selectVisibleAudioLibraryTracks(), false);

  assert.equal(actions.clearAudioLibraryTrackSelections(), true);
  assert.equal(actions.clearAudioLibraryTrackSelections(), false);

  assert.equal(actions.selectVisibleAudioMixTracks(), true);
  assert.deepEqual(audioMixSelectionIds, ["track-a", "track-b"]);

  assert.equal(actions.selectAudioMixPreset({ value: "preset-a" }), false);
  assert.equal(actions.selectAudioMixPreset({ value: "preset-b" }), true);
  assert.equal(selectedPresetId, "preset-b");
  assert.equal(resetCount, 1);
  assert.equal(launcherRefreshCount, 1);

  assert.equal(actions.changeAudioMixTrackBrowserPage({ dataset: { direction: "prev" } }), false);
}

process.stdout.write("audio library ui selection actions validation passed\n");
