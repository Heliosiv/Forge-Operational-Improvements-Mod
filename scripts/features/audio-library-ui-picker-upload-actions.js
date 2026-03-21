export function createAudioLibraryUiPickerUploadActions({
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
  getAudioLibraryUploadSelectionError,
  buildAudioLibraryUploadRootPath,
  ensureAudioLibraryUploadDirectories,
  getAudioLibraryUploadDirectoryPath,
  normalizeAudioLibrarySource,
  notifyUiInfoThrottled,
  scanAudioLibraryCatalog,
  pauseAudioLibraryUpload
} = {}) {
  const openAudioLibraryRootPicker = async () => {
    if (!canAccessAllPlayerOps()) {
      ui.notifications?.warn("Only the GM can browse audio asset folders.");
      return false;
    }
    const { source, rootPath } = getAudioLibraryDraftState();
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
            const selectionError = getAudioLibraryUploadSelectionError(activeSource, selectedFiles);
            if (selectionError) throw new Error(selectionError);

            const localRootName = String(selectedFiles[0]?.webkitRelativePath ?? "")
              .split(/[\\/]/)
              .filter(Boolean)[0] ?? "";
            const destinationRoot = buildAudioLibraryUploadRootPath(rootPath, localRootName);
            const relativePaths = selectedFiles
              .map((file) => getAudioLibraryUploadRelativePath(file))
              .filter(Boolean);

            await ensureAudioLibraryUploadDirectories(activeSource, destinationRoot, relativePaths);

            let uploadedCount = 0;
            for (const [index, file] of selectedFiles.entries()) {
              const relativePath = getAudioLibraryUploadRelativePath(file);
              const destinationDirectory = getAudioLibraryUploadDirectoryPath(destinationRoot, relativePath);
              await filePickerClass.upload(activeSource, destinationDirectory, file, {}, { notify: false });
              uploadedCount += 1;
              if (index < selectedFiles.length - 1) await pauseAudioLibraryUpload(activeSource);
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
