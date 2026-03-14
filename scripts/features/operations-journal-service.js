// Encapsulate operations-journal folder management and entry writes behind a bounded service.
export function createOperationsJournalService({
  moduleId = "party-operations",
  journalFolderCacheSettingKey = "journalFolderCache",
  journalRootName = "Party Operations Logs",
  journalRootLegacyNames = [],
  journalCategories = {},
  journalVisibilityModes = {},
  canAccessAllPlayerOps = () => false,
  getJournalVisibilityMode = () => journalVisibilityModes.PUBLIC ?? "public",
  setModuleSettingWithLocalRefreshSuppressed = async () => {},
  gameRef = globalThis.game ?? {},
  foundryRef = globalThis.foundry ?? {},
  uiRef = globalThis.ui ?? {},
  constRef = globalThis.CONST ?? {},
  FolderClass = globalThis.Folder,
  JournalEntryClass = globalThis.JournalEntry
} = {}) {
  const folderEnsurePromises = new Map();

  function getJournalFolderParentId(folder) {
    return String(folder?.folder?.id ?? folder?.folder ?? folder?.parent?.id ?? "").trim();
  }

  function findJournalFolderByName(name, parentId = "") {
    const targetName = String(name ?? "").trim().toLowerCase();
    const targetParentId = String(parentId ?? "").trim();
    return (gameRef.folders?.contents ?? []).find((folder) => {
      if (!folder || String(folder.type ?? "") !== "JournalEntry") return false;
      if (String(folder.name ?? "").trim().toLowerCase() !== targetName) return false;
      return getJournalFolderParentId(folder) === targetParentId;
    }) ?? null;
  }

  function findOperationsJournalRootFolder() {
    const preferred = findJournalFolderByName(journalRootName, "");
    if (preferred) return preferred;
    for (const legacyName of journalRootLegacyNames) {
      const legacy = findJournalFolderByName(legacyName, "");
      if (legacy) return legacy;
    }
    return null;
  }

  async function ensureOperationsJournalRootFolder() {
    const existing = findOperationsJournalRootFolder();
    if (existing) {
      const existingName = String(existing.name ?? "").trim();
      if (existingName !== journalRootName && canAccessAllPlayerOps()) {
        try {
          await existing.update({ name: journalRootName });
        } catch {
          // Non-fatal; continue using the existing folder.
        }
      }
      return existing;
    }
    return ensureJournalFolderByName(journalRootName, "");
  }

  function getJournalFolderCacheState() {
    const raw = gameRef.settings?.get?.(moduleId, journalFolderCacheSettingKey);
    if (!raw || typeof raw !== "object") return {};
    return raw;
  }

  async function setJournalFolderCacheState(patch = {}) {
    const current = getJournalFolderCacheState();
    const next = foundryRef.utils?.mergeObject
      ? foundryRef.utils.mergeObject(current, patch, {
        inplace: false,
        insertKeys: true,
        insertValues: true
      })
      : { ...current, ...patch };
    await setModuleSettingWithLocalRefreshSuppressed(journalFolderCacheSettingKey, next);
  }

  async function ensureJournalFolderByName(name, parentId = "") {
    const normalizedName = String(name ?? "").trim();
    const normalizedParentId = String(parentId ?? "").trim();
    const key = `${normalizedParentId}::${normalizedName.toLowerCase()}`;

    const cache = getJournalFolderCacheState();
    const cachedId = String(cache?.folders?.[key] ?? "").trim();
    if (cachedId) {
      const cachedFolder = gameRef.folders?.get?.(cachedId) ?? null;
      if (cachedFolder && String(cachedFolder.type ?? "") === "JournalEntry") {
        const cachedName = String(cachedFolder.name ?? "").trim().toLowerCase();
        const cachedParentId = getJournalFolderParentId(cachedFolder);
        if (cachedName === normalizedName.toLowerCase() && cachedParentId === normalizedParentId) return cachedFolder;
      }
      if (canAccessAllPlayerOps()) {
        await setJournalFolderCacheState({ folders: { [key]: "" } });
      }
    }

    const existing = findJournalFolderByName(normalizedName, normalizedParentId);
    if (existing) {
      if (canAccessAllPlayerOps()) {
        await setJournalFolderCacheState({ folders: { [key]: String(existing.id ?? "") } });
      }
      return existing;
    }

    const activePromise = folderEnsurePromises.get(key);
    if (activePromise) return activePromise;

    const createPromise = (async () => {
      const created = await FolderClass.create({
        name: normalizedName || "Folder",
        type: "JournalEntry",
        folder: normalizedParentId || null
      });
      if (canAccessAllPlayerOps() && created?.id) {
        await setJournalFolderCacheState({ folders: { [key]: String(created.id) } });
      }
      return created;
    })();

    folderEnsurePromises.set(key, createPromise);
    try {
      return await createPromise;
    } finally {
      folderEnsurePromises.delete(key);
    }
  }

  async function ensureOperationsJournalFolder(categoryKey = "session") {
    const normalized = Object.prototype.hasOwnProperty.call(journalCategories, categoryKey)
      ? categoryKey
      : "session";
    const root = await ensureOperationsJournalRootFolder();
    const categoryLabel = journalCategories[normalized];
    const categoryFolder = await ensureJournalFolderByName(categoryLabel, root?.id ?? "");
    return { root, categoryFolder, categoryKey: normalized, categoryLabel };
  }

  async function ensureOperationsJournalFolderTree() {
    if (!canAccessAllPlayerOps()) return null;
    const root = await ensureOperationsJournalRootFolder();
    const categories = [];
    for (const [categoryKey, categoryLabel] of Object.entries(journalCategories)) {
      const categoryFolder = await ensureJournalFolderByName(categoryLabel, root?.id ?? "");
      categories.push({ categoryKey, categoryLabel, categoryFolder });
    }
    return { root, categories };
  }

  function journalFolderIsUnderRoot(folderId, rootId) {
    const start = String(folderId ?? "").trim();
    const root = String(rootId ?? "").trim();
    if (!start || !root) return false;
    let currentId = start;
    let guard = 0;
    while (currentId && guard < 40) {
      if (currentId === root) return true;
      const folder = gameRef.folders?.get?.(currentId);
      currentId = getJournalFolderParentId(folder);
      guard += 1;
    }
    return false;
  }

  async function createOperationsJournalEntry(options = {}) {
    if (!canAccessAllPlayerOps()) return null;

    const categoryRaw = String(options?.category ?? options?.categoryKey ?? "session").trim().toLowerCase();
    const categoryKey = Object.prototype.hasOwnProperty.call(journalCategories, categoryRaw)
      ? categoryRaw
      : "session";
    const title = String(options?.title ?? "Operations Log").trim() || "Operations Log";
    const summary = String(options?.summary ?? "").trim();
    const redactedSummary = String(options?.redactedSummary ?? "").trim();
    const body = String(options?.body ?? "").trim() || "<p>No details provided.</p>";
    const redactedBody = String(options?.redactedBody ?? "").trim();
    const sensitivity = String(options?.sensitivity ?? "public").trim().toLowerCase();

    const visibility = getJournalVisibilityMode();
    let effectiveSummary = summary;
    let effectiveBody = body;

    if (sensitivity === "gm" && visibility === journalVisibilityModes.REDACTED) {
      effectiveSummary = redactedSummary || summary;
      effectiveBody = redactedBody || body;
    }

    const gmOnly = sensitivity === "gm" && visibility === journalVisibilityModes.GM_PRIVATE;
    const ownership = gmOnly
      ? (() => {
        const next = { default: constRef.DOCUMENT_OWNERSHIP_LEVELS?.NONE ?? 0 };
        for (const user of gameRef.users?.contents ?? []) {
          if (!user) continue;
          if (user.isGM) next[String(user.id)] = constRef.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
        }
        return next;
      })()
      : { default: constRef.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2 };

    const escape = foundryRef.utils?.escapeHTML ?? ((value) => String(value ?? ""));
    const stamp = new Date().toLocaleString();
    const safeStamp = escape(stamp);
    const safeEffectiveSummary = escape(effectiveSummary);
    const finalBody = `
    <p><em>${safeStamp}</em></p>
    ${safeEffectiveSummary ? `<p>${safeEffectiveSummary}</p>` : ""}
    ${effectiveBody}
  `;

    try {
      const { categoryFolder } = await ensureOperationsJournalFolder(categoryKey);
      const htmlFormat = Number(constRef?.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1);
      const entry = await JournalEntryClass.create({
        name: `${title} - ${stamp}`,
        folder: categoryFolder?.id ?? null,
        ownership,
        pages: [{
          name: "Log",
          type: "text",
          text: {
            format: htmlFormat,
            content: finalBody
          }
        }]
      });
      return entry ?? null;
    } catch (error) {
      console.warn(`${moduleId}: failed creating operations journal entry`, error);
      uiRef.notifications?.warn?.(`Party Operations journal write failed: ${title}`);
      return null;
    }
  }

  async function openJournalEntryFromElement(element) {
    const entryId = String(element?.dataset?.journalId ?? "").trim();
    if (!entryId) return;
    const entry = gameRef.journal?.get?.(entryId);
    if (!entry) {
      uiRef.notifications?.warn?.("Journal entry not found.");
      return;
    }
    entry.sheet?.render?.(true);
  }

  return {
    getJournalFolderParentId,
    findOperationsJournalRootFolder,
    ensureOperationsJournalFolderTree,
    journalFolderIsUnderRoot,
    createOperationsJournalEntry,
    openJournalEntryFromElement
  };
}
