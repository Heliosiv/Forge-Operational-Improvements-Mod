export function createDowntimeUiDraftStorage({
  moduleId,
  gameRef = globalThis.game,
  storage = globalThis.sessionStorage,
  htmlElementClass = globalThis.HTMLElement
} = {}) {
  const getDowntimeUiDraftStorageKey = () => {
    const worldId = String(gameRef?.world?.id ?? "world").trim() || "world";
    const userId = String(gameRef?.user?.id ?? "anon").trim() || "anon";
    return `${moduleId}.downtimeUiDraft.${worldId}.${userId}`;
  };

  const getDowntimeUiDraft = () => {
    try {
      const raw = storage?.getItem?.(getDowntimeUiDraftStorageKey());
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeDowntimeUiDraft = (draft = {}) => {
    try {
      const next = draft && typeof draft === "object" && !Array.isArray(draft) ? draft : {};
      if (Object.keys(next).length <= 0) {
        storage?.removeItem?.(getDowntimeUiDraftStorageKey());
        return {};
      }
      storage?.setItem?.(getDowntimeUiDraftStorageKey(), JSON.stringify(next));
      return next;
    } catch {
      return draft && typeof draft === "object" && !Array.isArray(draft) ? draft : {};
    }
  };

  const setDowntimeUiDraftSection = (sectionKey, patch = null) => {
    const section = String(sectionKey ?? "")
      .trim()
      .toLowerCase();
    if (!section) return getDowntimeUiDraft();
    const current = getDowntimeUiDraft();
    const next = { ...current };
    if (!patch || typeof patch !== "object" || Array.isArray(patch) || Object.keys(patch).length <= 0) {
      delete next[section];
      return writeDowntimeUiDraft(next);
    }
    next[section] = {
      ...(current?.[section] && typeof current[section] === "object" && !Array.isArray(current[section])
        ? current[section]
        : {}),
      ...patch
    };
    return writeDowntimeUiDraft(next);
  };

  const replaceDowntimeUiDraftSection = (sectionKey, patch = null) => {
    const section = String(sectionKey ?? "")
      .trim()
      .toLowerCase();
    if (!section) return getDowntimeUiDraft();
    const current = getDowntimeUiDraft();
    const next = { ...current };
    if (!patch || typeof patch !== "object" || Array.isArray(patch) || Object.keys(patch).length <= 0) {
      delete next[section];
      return writeDowntimeUiDraft(next);
    }
    next[section] = { ...patch };
    return writeDowntimeUiDraft(next);
  };

  const clearDowntimeUiDraft = (sectionKey = null) => {
    const section = String(sectionKey ?? "")
      .trim()
      .toLowerCase();
    if (!section) {
      try {
        storage?.removeItem?.(getDowntimeUiDraftStorageKey());
      } catch {
        // Ignore storage failures outside browser execution contexts.
      }
      return {};
    }
    return replaceDowntimeUiDraftSection(section, null);
  };

  const isRootElement = (value) =>
    htmlElementClass ? value instanceof htmlElementClass : Boolean(value?.querySelector);

  const syncDowntimeSubmissionDraftFromRoot = (root) => {
    if (!isRootElement(root)) return {};
    return setDowntimeUiDraftSection("submission", {
      actorId: String(root.querySelector("select[name='downtimeActorId']")?.value ?? "").trim(),
      actionKey: String(root.querySelector("select[name='downtimeActionKey']")?.value ?? "").trim(),
      subtypeKey: String(root.querySelector("select[name='downtimeSubtypeKey']")?.value ?? "").trim(),
      hours: String(root.querySelector("input[name='downtimeHours']")?.value ?? ""),
      note: String(root.querySelector("textarea[name='downtimeNote']")?.value ?? ""),
      browsingAbility: String(root.querySelector("select[name='downtimeBrowsingAbility']")?.value ?? "").trim(),
      craftItemId: String(root.querySelector("select[name='downtimeCraftItemId']")?.value ?? "").trim(),
      materialsOwned: String(root.querySelector("select[name='downtimeCraftMaterialsOwned']")?.value ?? "").trim(),
      materialDropsJson: String(root.querySelector("input[name='downtimeCraftMaterialDrops']")?.value ?? "[]"),
      professionId: String(root.querySelector("select[name='downtimeProfessionId']")?.value ?? "").trim(),
      v2ActorId: String(root.querySelector("select[name='downtimeV2ActorId']")?.value ?? "").trim(),
      v2CardId: String(root.querySelector("select[name='downtimeV2CardId']")?.value ?? "").trim(),
      v2Note: String(root.querySelector("textarea[name='downtimeV2Note']")?.value ?? "")
    });
  };

  const syncDowntimeResolverDraftFromRoot = (root) => {
    if (!isRootElement(root)) return {};
    return setDowntimeUiDraftSection("resolution", {
      actorId: String(root.querySelector("select[name='resolveDowntimeActorId']")?.value ?? "").trim(),
      summary: String(root.querySelector("input[name='resolveDowntimeSummary']")?.value ?? ""),
      gpAward: String(root.querySelector("input[name='resolveDowntimeGp']")?.value ?? ""),
      gpCost: String(root.querySelector("input[name='resolveDowntimeCost']")?.value ?? ""),
      rumorCount: String(root.querySelector("input[name='resolveDowntimeRumors']")?.value ?? ""),
      socialContractKey: String(root.querySelector("select[name='resolveDowntimeContractKey']")?.value ?? "").trim(),
      socialContractNotes: String(root.querySelector("textarea[name='resolveDowntimeContractNotes']")?.value ?? ""),
      itemRewardsText: String(root.querySelector("textarea[name='resolveDowntimeItems']")?.value ?? ""),
      itemRewardDropsJson: String(root.querySelector("input[name='resolveDowntimeItemDrops']")?.value ?? "[]"),
      gmNotes: String(root.querySelector("textarea[name='resolveDowntimeNotes']")?.value ?? "")
    });
  };

  const syncDowntimeUiDraftFromElement = (element) => {
    const panelRoot = element?.closest?.(".po-downtime-panel");
    if (isRootElement(panelRoot)) syncDowntimeSubmissionDraftFromRoot(panelRoot);
    const resolverRoot = element?.closest?.(".po-downtime-resolver");
    if (isRootElement(resolverRoot)) syncDowntimeResolverDraftFromRoot(resolverRoot);
    return getDowntimeUiDraft();
  };

  return Object.freeze({
    clearDowntimeUiDraft,
    getDowntimeUiDraft,
    getDowntimeUiDraftStorageKey,
    replaceDowntimeUiDraftSection,
    setDowntimeUiDraftSection,
    syncDowntimeResolverDraftFromRoot,
    syncDowntimeSubmissionDraftFromRoot,
    syncDowntimeUiDraftFromElement,
    writeDowntimeUiDraft
  });
}
