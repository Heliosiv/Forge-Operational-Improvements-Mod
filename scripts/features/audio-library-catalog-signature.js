export function createAudioLibraryCatalogSignatureTools({
  normalizeSource,
  normalizeRootPath,
  normalizeKind,
  normalizeUsage,
  hashString,
  normalizeCatalog,
  getStoredCatalog
} = {}) {
  const toSource = (value) => typeof normalizeSource === "function"
    ? normalizeSource(value)
    : String(value ?? "").trim();
  const toRootPath = (value) => typeof normalizeRootPath === "function"
    ? normalizeRootPath(value)
    : String(value ?? "").trim();
  const toKind = (value) => typeof normalizeKind === "function"
    ? normalizeKind(value)
    : String(value ?? "").trim();
  const toUsage = (value) => typeof normalizeUsage === "function"
    ? normalizeUsage(value)
    : String(value ?? "").trim();
  const toHash = (value) => typeof hashString === "function"
    ? hashString(value)
    : 0;

  const buildCatalogSignature = ({ source, rootPath, items } = {}) => {
    const normalizedItems = Array.isArray(items) ? items : [];
    const seed = normalizedItems
      .map((item) => {
        const tags = Array.isArray(item?.tags) ? item.tags.join(",") : "";
        return [
          toRootPath(item?.id),
          toRootPath(item?.path),
          String(item?.name ?? "").trim(),
          String(item?.category ?? "").trim(),
          String(item?.subcategory ?? "").trim(),
          toKind(item?.kind),
          toUsage(item?.usage),
          String(item?.extension ?? "").trim().toLowerCase(),
          tags
        ].join("|");
      })
      .join("\n");

    return `${toSource(source)}|${toRootPath(rootPath)}|${normalizedItems.length}|${toHash(seed)}`;
  };

  const buildStoredCatalogSignature = (catalog = null) => {
    const storedCatalog = catalog ?? (typeof getStoredCatalog === "function" ? getStoredCatalog() : {});
    const normalizedCatalog = typeof normalizeCatalog === "function"
      ? normalizeCatalog(storedCatalog)
      : storedCatalog;
    return buildCatalogSignature({
      source: normalizedCatalog?.source,
      rootPath: normalizedCatalog?.rootPath,
      items: normalizedCatalog?.items
    });
  };

  return Object.freeze({
    buildCatalogSignature,
    buildStoredCatalogSignature
  });
}
