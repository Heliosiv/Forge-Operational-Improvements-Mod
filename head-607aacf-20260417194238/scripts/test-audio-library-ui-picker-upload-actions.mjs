import assert from "node:assert/strict";

import { createAudioLibraryUiPickerUploadActions } from "./features/audio-library-ui-picker-upload-actions.js";

class FakeFilePicker {
  static createdDirectories = [];
  static uploads = [];
  static nextSelectedPath = "";

  constructor(options = {}) {
    this.options = options;
    this.activeSource = options.activeSource;
  }

  render() {
    this.options.callback?.(FakeFilePicker.nextSelectedPath);
  }

  static async upload(source, directory, file) {
    FakeFilePicker.uploads.push({ source, directory, name: file?.name ?? "" });
  }
}

{
  const draftCalls = [];
  let cleared = 0;
  FakeFilePicker.nextSelectedPath = "music/ambient";

  const actions = createAudioLibraryUiPickerUploadActions({
    canAccessAllPlayerOps: () => true,
    ui: { notifications: {} },
    getAudioLibraryDraftState: () => ({ source: "data", rootPath: "music" }),
    filePickerClass: FakeFilePicker,
    getAudioLibraryPickerCurrentPath: (value) => value,
    audioLibraryUiDraftActions: {
      setDraftFromPickerSelection(payload) {
        draftCalls.push({ type: "picker", payload });
      },
      setDraftFromCatalog(payload) {
        draftCalls.push({ type: "catalog", payload });
      }
    },
    clearAudioLibraryError: () => {
      cleared += 1;
    },
    documentRef: {
      body: { appendChild() {} },
      createElement() {
        return {
          style: {},
          setAttribute() {},
          addEventListener() {},
          remove() {},
          click() {}
        };
      }
    },
    audioLibraryExtensions: ["mp3"],
    isUploadableAudioLibraryFile: () => true,
    getAudioLibraryUploadRelativePath: () => "",
    getAudioLibraryUploadSelectionError: () => "",
    buildAudioLibraryUploadRootPath: () => "music",
    ensureAudioLibraryUploadDirectories: async () => {},
    getAudioLibraryUploadDirectoryPath: () => "music",
    normalizeAudioLibrarySource: (value) => String(value ?? "").trim().toLowerCase(),
    notifyUiInfoThrottled: () => {},
    scanAudioLibraryCatalog: async () => {},
    pauseAudioLibraryUpload: async () => {}
  });

  const result = await actions.openAudioLibraryRootPicker();
  assert.equal(result, true);
  assert.deepEqual(draftCalls[0], {
    type: "picker",
    payload: {
      activeSource: "data",
      fallbackSource: "data",
      selectedPath: "music/ambient"
    }
  });
  assert.equal(cleared, 1);
}

{
  const draftCalls = [];
  const notifications = [];
  const scans = [];
  const infoNotices = [];
  const directoryCalls = [];
  const pauseCalls = [];
  FakeFilePicker.uploads = [];

  let changeHandler = null;
  let cancelHandler = null;
  const input = {
    files: [
      { name: "one.mp3", webkitRelativePath: "raid/one.mp3" },
      { name: "two.mp3", webkitRelativePath: "raid/sub/two.mp3" }
    ],
    style: {},
    setAttribute() {},
    addEventListener(type, handler) {
      if (type === "change") changeHandler = handler;
      if (type === "cancel") cancelHandler = handler;
    },
    remove() {},
    click() {
      changeHandler?.();
    }
  };

  const actions = createAudioLibraryUiPickerUploadActions({
    canAccessAllPlayerOps: () => true,
    ui: { notifications: { warn(message) { notifications.push(message); } } },
    getAudioLibraryDraftState: () => ({ source: "data", rootPath: "music" }),
    filePickerClass: FakeFilePicker,
    getAudioLibraryPickerCurrentPath: (value) => value,
    audioLibraryUiDraftActions: {
      setDraftFromPickerSelection() {},
      setDraftFromCatalog(payload) {
        draftCalls.push(payload);
      }
    },
    clearAudioLibraryError: () => {},
    documentRef: {
      body: { appendChild() {} },
      createElement() {
        return input;
      }
    },
    audioLibraryExtensions: ["mp3"],
    isUploadableAudioLibraryFile: () => true,
    getAudioLibraryUploadRelativePath: (file) => String(file?.webkitRelativePath ?? "").split(/[\\/]/).slice(1).join("/"),
    getAudioLibraryUploadSelectionError: () => "",
    buildAudioLibraryUploadRootPath: (rootPath, localRootName) => `${rootPath}/${localRootName}`,
    ensureAudioLibraryUploadDirectories: async (source, destinationRoot, relativePaths) => {
      directoryCalls.push({ source, destinationRoot, relativePaths });
    },
    getAudioLibraryUploadDirectoryPath: (destinationRoot, relativePath) => {
      const parts = String(relativePath ?? "").split("/").filter(Boolean);
      parts.pop();
      return parts.length > 0 ? `${destinationRoot}/${parts.join("/")}` : destinationRoot;
    },
    normalizeAudioLibrarySource: (value) => String(value ?? "").trim().toLowerCase(),
    notifyUiInfoThrottled: (message, options) => {
      infoNotices.push({ message, options });
    },
    scanAudioLibraryCatalog: async (payload) => {
      scans.push(payload);
    },
    pauseAudioLibraryUpload: async (source) => {
      pauseCalls.push(source);
    }
  });

  const result = await actions.uploadLocalAudioFolderToLibrary();
  assert.equal(result, true);
  assert.deepEqual(directoryCalls, [{
    source: "data",
    destinationRoot: "music/raid",
    relativePaths: ["one.mp3", "sub/two.mp3"]
  }]);
  assert.deepEqual(FakeFilePicker.uploads, [
    { source: "data", directory: "music/raid", name: "one.mp3" },
    { source: "data", directory: "music/raid/sub", name: "two.mp3" }
  ]);
  assert.deepEqual(pauseCalls, ["data"]);
  assert.deepEqual(draftCalls, [{ source: "data", rootPath: "music/raid" }]);
  assert.deepEqual(scans, [{ source: "data", rootPath: "music/raid", forceRescan: true }]);
  assert.equal(infoNotices.length, 1);
  assert.equal(notifications.length, 0);
  assert.equal(typeof cancelHandler, "function");
}

process.stdout.write("audio library ui picker upload actions validation passed\n");
