function buildAudioLibraryUploadRootPath(normalizeRootPath, rootPath = "", localFolderName = "") {
  const normalizedRoot = normalizeRootPath(rootPath);
  const normalizedFolder = normalizeRootPath(localFolderName);
  if (!normalizedRoot) return normalizedFolder;
  if (!normalizedFolder) return normalizedRoot;
  return normalizeRootPath(`${normalizedRoot}/${normalizedFolder}`);
}

function buildAudioLibraryUploadDirectories(normalizeRootPath, destinationRoot = "", relativePaths = []) {
  const normalizedRoot = normalizeRootPath(destinationRoot);
  const directories = new Set(normalizedRoot ? [normalizedRoot] : []);
  for (const relativePath of relativePaths) {
    const normalizedRelativePath = normalizeRootPath(relativePath);
    if (!normalizedRelativePath) continue;
    const parts = normalizedRelativePath.split("/").filter(Boolean);
    if (parts.length <= 1) continue;
    parts.pop();
    let current = normalizedRoot;
    for (const part of parts) {
      current = normalizeRootPath(`${current}/${part}`);
      if (current) directories.add(current);
    }
  }
  return Array.from(directories).sort((left, right) => left.split("/").length - right.split("/").length);
}

function isExistingDirectoryError(error) {
  const message = String(error?.message ?? error ?? "").toLowerCase();
  return message.includes("already exists") || message.includes("eexist");
}

async function ensureAudioLibraryUploadDirectories({
  filePickerClass,
  normalizeRootPath,
  source,
  destinationRoot,
  relativePaths = []
} = {}) {
  const directories = buildAudioLibraryUploadDirectories(normalizeRootPath, destinationRoot, relativePaths);
  for (const directory of directories) {
    if (!directory) continue;
    try {
      await filePickerClass.createDirectory(source, directory);
    } catch (error) {
      if (isExistingDirectoryError(error)) continue;
      throw error;
    }
  }
}

function getAudioLibraryUploadSelectionError({ activeSource, files = [], sourceLabelById = {} } = {}) {
  const normalizedSource = String(activeSource ?? "").trim().toLowerCase();
  if (normalizedSource && normalizedSource !== "data") {
    const sourceLabel = sourceLabelById?.[normalizedSource] ?? normalizedSource;
    return `Folder uploads are only supported for ${String(sourceLabel).trim() || "data"} paths. Choose a Data source folder to upload local files.`;
  }
  if (!Array.isArray(files) || files.length <= 0) return "Choose at least one audio file to upload.";
  return "";
}

export function createAudioLibraryUiPickerActions({
  canAccessAllPlayerOps,
  ui,
  getAudioLibraryDraftState,
  filePickerClass,
  getAudioLibraryPickerCurrentPath,
  audioLibraryUiDraftActions,
  clearAudioLibraryError,
  documentRef,
  audioLibraryExtensions,
  isUploadableAudioLibraryFile,
  getAudioLibraryUploadRelativePath,
  normalizeAudioLibrarySource,
  normalizeAudioLibraryRootPath,
  getAudioLibrarySourceInteractionError = () => "",
  notifyUiInfoThrottled,
  scanAudioLibraryCatalog,
  pauseUploadBySource,
  sourceLabelById = {}
} = {}) {
  const openAudioLibraryRootPicker = async () => {
    if (!canAccessAllPlayerOps()) {
      ui.notifications?.warn("Only the GM can browse audio asset folders.");
      return false;
    }
    const { source, rootPath } = getAudioLibraryDraftState();
    const sourceError = getAudioLibrarySourceInteractionError(source);
    if (sourceError) {
      ui.notifications?.warn(sourceError);
      return false;
    }
    return new Promise((resolve) => {
      const picker = new filePickerClass({
        type: "folder",
        activeSource: source,
        current: getAudioLibraryPickerCurrentPath(rootPath),
        callback: (selectedPath) => {
          audioLibraryUiDraftActions.setDraftFromPickerSelection({
            activeSource: picker.activeSource,
            fallbackSource: source,
            selectedPath
          });
          clearAudioLibraryError();
          resolve(true);
        }
      });
      picker.render(true);
    });
  };

  const uploadLocalAudioFolderToLibrary = async () => {
    if (!canAccessAllPlayerOps()) {
      ui.notifications?.warn("Only the GM can upload audio asset folders.");
      return false;
    }

    const { source, rootPath } = getAudioLibraryDraftState();
    const activeSource = normalizeAudioLibrarySource(source);
    const sourceError = getAudioLibrarySourceInteractionError(activeSource);
    if (sourceError) throw new Error(sourceError);
    return new Promise((resolve, reject) => {
      const input = documentRef.createElement("input");
      let settled = false;
      const finalize = (result, error = null) => {
        if (settled) return;
        settled = true;
        input.remove();
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      };

      input.type = "file";
      input.multiple = true;
      input.accept = audioLibraryExtensions.map((extension) => `.${extension}`).join(",");
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.style.display = "none";
      documentRef.body.appendChild(input);

      input.addEventListener("change", () => {
        void (async () => {
          try {
            const selectedFiles = Array.from(input.files ?? []).filter((file) => isUploadableAudioLibraryFile(file));
            if (selectedFiles.length <= 0) {
              finalize(false);
              return;
            }
            const selectionError = getAudioLibraryUploadSelectionError({
              activeSource,
              files: selectedFiles,
              sourceLabelById
            });
            if (selectionError) throw new Error(selectionError);

            const localRootName = String(selectedFiles[0]?.webkitRelativePath ?? "")
              .split(/[\\/]/)
              .filter(Boolean)[0] ?? "";
            const destinationRoot = buildAudioLibraryUploadRootPath(normalizeAudioLibraryRootPath, rootPath, localRootName);
            const relativePaths = selectedFiles
              .map((file) => getAudioLibraryUploadRelativePath(file))
              .filter(Boolean);

            await ensureAudioLibraryUploadDirectories({
              filePickerClass,
              normalizeRootPath: normalizeAudioLibraryRootPath,
              source: activeSource,
              destinationRoot,
              relativePaths
            });

            let uploadedCount = 0;
            for (const [index, file] of selectedFiles.entries()) {
              const relativePath = getAudioLibraryUploadRelativePath(file);
              const destinationDirectory = normalizeAudioLibraryRootPath(`${destinationRoot}/${String(relativePath ?? "").split("/").filter(Boolean).slice(0, -1).join("/")}`);
              await filePickerClass.upload(activeSource, destinationDirectory, file, {}, { notify: false });
              uploadedCount += 1;
              if (index < selectedFiles.length - 1) await pauseUploadBySource(activeSource);
            }

            audioLibraryUiDraftActions.setDraftFromCatalog({
              source: activeSource,
              rootPath: destinationRoot
            });
            clearAudioLibraryError();
            notifyUiInfoThrottled(`Uploaded ${uploadedCount} audio file(s) to ${destinationRoot}.`, {
              key: "audio-library-upload-complete",
              ttlMs: 2200
            });
            await scanAudioLibraryCatalog({ source: activeSource, rootPath: destinationRoot, forceRescan: true });
            finalize(true);
          } catch (error) {
            finalize(false, error);
          }
        })();
      }, { once: true });

      input.addEventListener("cancel", () => {
        finalize(false);
      }, { once: true });

      input.click();
    });
  };

  return Object.freeze({
    openAudioLibraryRootPicker,
    uploadLocalAudioFolderToLibrary
  });
}
