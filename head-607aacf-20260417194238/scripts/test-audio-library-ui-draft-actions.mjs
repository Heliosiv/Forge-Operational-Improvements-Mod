import assert from "node:assert/strict";

import { createAudioLibraryUiDraftActions } from "./features/audio-library-ui-draft-actions.js";

{
  const audioLibraryUiState = {
    draft: {
      source: "data",
      rootPath: "music"
    }
  };

  const actions = createAudioLibraryUiDraftActions({
    audioLibraryUiState,
    normalizeAudioLibrarySource: (value) => String(value ?? "").trim().toLowerCase() || "data",
    normalizeAudioLibraryRootPath: (value) => String(value ?? "").trim().replace(/\\/g, "/"),
    normalizeAudioLibraryPickerSelection: (value) => String(value ?? "").trim().replace(/\\/g, "/")
  });

  assert.equal(actions.setDraftSource("s3"), "s3");
  assert.equal(actions.setDraftRootPath("audio\\boss"), "audio/boss");

  assert.deepEqual(actions.setDraftFromCatalog({
    source: "forgevtt",
    rootPath: "modules/party-operations/audio"
  }), {
    source: "forgevtt",
    rootPath: "modules/party-operations/audio"
  });

  assert.deepEqual(actions.setDraftFromPickerSelection({
    activeSource: "data",
    fallbackSource: "forgevtt",
    selectedPath: "music\\ambient"
  }), {
    source: "data",
    rootPath: "music/ambient"
  });

  actions.setAudioLibraryDraftField({ dataset: { field: "source" }, value: "forgevtt" });
  assert.equal(audioLibraryUiState.draft.source, "forgevtt");

  actions.setAudioLibraryDraftField({ dataset: { field: "rootPath" }, value: "music\\combat" });
  assert.equal(audioLibraryUiState.draft.rootPath, "music/combat");

  assert.equal(actions.setAudioLibraryDraftField({ dataset: { field: "" }, value: "ignored" }), undefined);
}

process.stdout.write("audio library ui draft actions validation passed\n");
