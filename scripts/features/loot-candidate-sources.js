const DEFAULT_COMPENDIUM_SOURCE_KIND = "compendium-pack";

function normalizeSourceId(value) {
  return String(value ?? "").trim();
}

function normalizeSourceKind(value) {
  return String(value ?? DEFAULT_COMPENDIUM_SOURCE_KIND).trim() || DEFAULT_COMPENDIUM_SOURCE_KIND;
}

function pushWarning(warnings, message) {
  if (Array.isArray(warnings)) warnings.push(message);
}

export function resolveLootCandidateSources(
  sourceConfig = {},
  {
    manifestPackId = sourceConfig?.filters?.manifestPackId,
    parseManifestFolderId = () => "",
    getManifestCompendiumPackId = () => "",
    worldItemsSourceId = "__world_items__",
    warnings = []
  } = {}
) {
  const selectedManifestPackId = normalizeSourceId(manifestPackId);
  const manifestFolderId = parseManifestFolderId(selectedManifestPackId);
  let enabledSources = (Array.isArray(sourceConfig?.packs) ? sourceConfig.packs : [])
    .filter((entry) => entry?.enabled !== false)
    .filter((entry) => normalizeSourceKind(entry?.sourceKind) === DEFAULT_COMPENDIUM_SOURCE_KIND)
    .filter((entry) => normalizeSourceId(entry?.id) !== worldItemsSourceId);
  let selectedSourceId = "";

  if (selectedManifestPackId) {
    selectedSourceId = manifestFolderId ? normalizeSourceId(getManifestCompendiumPackId()) : selectedManifestPackId;
    const source = enabledSources.find((entry) => normalizeSourceId(entry?.id) === selectedSourceId);
    enabledSources = source ? [source] : [];
    if (!source) {
      pushWarning(warnings, `Selected source is currently disabled: ${selectedSourceId}`);
    }
  }

  return {
    enabledSources,
    manifestPackId: selectedManifestPackId,
    manifestFolderId,
    selectedSourceId
  };
}
