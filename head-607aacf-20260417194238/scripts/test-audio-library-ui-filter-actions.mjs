import assert from "node:assert/strict";

import { createAudioLibraryUiFilterActions } from "./features/audio-library-ui-filter-actions.js";

{
  const audioLibraryUiState = {
    filters: {
      search: "",
      kind: "all",
      usage: "all",
      selectedTags: []
    }
  };
  let resetCount = 0;

  const normalizeAudioLibraryFilters = (filters = {}) => ({
    search: String(filters?.search ?? "").trim().toLowerCase(),
    kind: String(filters?.kind ?? "all").trim().toLowerCase() || "all",
    usage: String(filters?.usage ?? "all").trim().toLowerCase() || "all",
    selectedTags: Array.from(new Set((Array.isArray(filters?.selectedTags) ? filters.selectedTags : [])
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean)))
  });

  const actions = createAudioLibraryUiFilterActions({
    audioLibraryUiState,
    normalizeAudioLibraryFilters,
    normalizeAudioLibrarySearch: (value) => String(value ?? "").trim().toLowerCase(),
    normalizeAudioLibraryKind: (value) => String(value ?? "all").trim().toLowerCase() || "all",
    normalizeAudioLibraryUsage: (value) => String(value ?? "all").trim().toLowerCase() || "all",
    normalizeAudioLibraryTag: (value) => String(value ?? "").trim().toLowerCase(),
    normalizeAudioLibraryTagList: (values) => Array.from(new Set((Array.isArray(values) ? values : [])
      .map((entry) => String(entry ?? "").trim().toLowerCase())
      .filter(Boolean))),
    resetAudioMixTrackBrowserPages: () => {
      resetCount += 1;
    }
  });

  actions.setAudioLibraryFilterField({ dataset: { field: "search" }, value: "  Rain  " });
  assert.equal(audioLibraryUiState.filters.search, "rain");

  actions.setAudioLibraryFilterField({ dataset: { field: "kind" }, value: "music" });
  assert.equal(audioLibraryUiState.filters.kind, "music");

  actions.setAudioLibraryFilterField({ dataset: { field: "usage" }, value: "combat" });
  assert.equal(audioLibraryUiState.filters.usage, "combat");

  actions.setAudioLibraryFilterField({ dataset: { field: "selectedTags", tag: "boss" } });
  assert.deepEqual(audioLibraryUiState.filters.selectedTags, ["boss"]);

  actions.setAudioLibraryFilterField({ dataset: { field: "selectedTags", tag: "boss" } });
  assert.deepEqual(audioLibraryUiState.filters.selectedTags, []);

  actions.setAudioLibraryFilterField({ dataset: { field: "clearAll" } });
  assert.deepEqual(audioLibraryUiState.filters, {
    search: "",
    kind: "all",
    usage: "all",
    selectedTags: []
  });

  actions.clearAudioLibraryFilters();
  assert.equal(resetCount, 7);
}

process.stdout.write("audio library ui filter actions validation passed\n");
