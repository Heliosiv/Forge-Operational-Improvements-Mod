export const PARTY_OPERATIONS_SIDEBAR_VIEW_ITEMS = Object.freeze([
  {
    id: "rest-watch",
    action: "rest",
    label: "Rest",
    icon: "fas fa-moon",
    title: "Open Rest Watch",
    target: "po-panel-rest-watch"
  },
  {
    id: "operations",
    action: "operations",
    label: "Ops",
    icon: "fas fa-clipboard-list",
    title: "Open Operations",
    target: "po-panel-operations"
  },
  {
    id: "marching-order",
    action: "march",
    label: "March",
    icon: "fas fa-arrow-up",
    title: "Open Marching Order",
    target: "po-march-overview"
  },
  {
    id: "gm",
    action: "gm",
    label: "GM",
    icon: "fas fa-user-shield",
    title: "Open GM Section",
    target: "po-panel-operations",
    gmOnly: true
  }
]);

export function createLauncherUiController(options = {}) {
  const {
    moduleId,
    settings,
    launcherPlacements,
    launcherRecoveryDelaysMs = [],
    sidebarViewItems = PARTY_OPERATIONS_SIDEBAR_VIEW_ITEMS,
    poEscapeHtml = (value) => String(value ?? ""),
    setModuleSettingWithLocalRefreshSuppressed,
    getMainTabIdFromAction,
    getTemplateForMainTab,
    openMainTab,
    canAccessAllPlayerOps,
    canAccessGmPage,
    logUiDebug,
    refreshOpenApps,
    refreshScopeKeys,
    getAudioLibraryCatalog,
    getSelectedAudioMixPreset,
    getAudioMixPlaybackState,
    getPlayableAudioMixCandidates,
    getAllAudioMixPresets,
    selectAudioMixPreset,
    playAudioMixPresetById,
    toggleAudioMixPlayback,
    playNextAudioMixTrack,
    stopAudioMixPlayback,
    clearAudioLibraryError,
    setAudioLibraryError,
    getGame,
    getDocument,
    getWindow,
    getUi
  } = options;

  let launcherRecoveryScheduled = false;
  const resolveGame = () => getGame?.() ?? globalThis.game;
  const resolveDocument = () => getDocument?.() ?? globalThis.document;
  const resolveWindow = () => getWindow?.() ?? globalThis.window;
  const resolveUi = () => getUi?.() ?? globalThis.ui;

  function normalizeLauncherPlacement(value) {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    if (normalized === launcherPlacements?.SIDEBAR) return launcherPlacements.SIDEBAR;
    if (normalized === launcherPlacements?.BOTH) return launcherPlacements.BOTH;
    return launcherPlacements?.FLOATING ?? "floating";
  }

  function getLauncherPlacement() {
    try {
      return normalizeLauncherPlacement(resolveGame()?.settings?.get?.(moduleId, settings?.LAUNCHER_PLACEMENT));
    } catch {
      return launcherPlacements?.FLOATING ?? "floating";
    }
  }

  function shouldShowFloatingLauncher() {
    const placement = getLauncherPlacement();
    return placement === launcherPlacements?.FLOATING || placement === launcherPlacements?.BOTH;
  }

  function shouldShowSidebarLauncher() {
    const placement = getLauncherPlacement();
    return placement === launcherPlacements?.SIDEBAR || placement === launcherPlacements?.BOTH;
  }

  function getFloatingLauncherCenteredPosition() {
    const documentRef = resolveDocument();
    const windowRef = resolveWindow();
    const launcher = documentRef?.getElementById?.("po-floating-launcher");
    const launcherWidth = Math.max(56, Number(launcher?.offsetWidth ?? 56));
    const launcherHeight = Math.max(172, Number(launcher?.offsetHeight ?? 172));
    const viewportWidth = Math.max(240, Number(windowRef?.innerWidth ?? 1200));
    const viewportHeight = Math.max(240, Number(windowRef?.innerHeight ?? 800));

    return {
      left: Math.max(8, Math.floor((viewportWidth - launcherWidth) / 2)),
      top: Math.max(8, Math.floor((viewportHeight - launcherHeight) / 2))
    };
  }

  function getFloatingLauncherPosition() {
    const fallback = getFloatingLauncherCenteredPosition();
    const stored = resolveGame()?.settings?.get?.(moduleId, settings?.FLOATING_LAUNCHER_POS);
    if (!stored || typeof stored !== "object") return fallback;
    const left = Number(stored.left);
    const top = Number(stored.top);
    return {
      left: Number.isFinite(left) ? left : fallback.left,
      top: Number.isFinite(top) ? top : fallback.top
    };
  }

  function getFloatingLauncherLeftInset() {
    const documentRef = resolveDocument();
    const controls = documentRef?.getElementById?.("controls");
    if (!controls) return 8;
    const rect = controls.getBoundingClientRect?.();
    if (!rect || !Number.isFinite(rect.right)) return 8;
    return Math.max(8, Math.floor(rect.right + 12));
  }

  function isFloatingLauncherLocked() {
    return Boolean(resolveGame()?.settings?.get?.(moduleId, settings?.FLOATING_LAUNCHER_LOCKED));
  }

  function applyFloatingLauncherLockUi(launcher, locked) {
    if (!launcher) return;
    launcher.classList?.toggle?.("is-locked", Boolean(locked));
    launcher.classList?.toggle?.("is-unlocked", !Boolean(locked));
    const lockBtn = launcher.querySelector?.(".po-floating-lock");
    const unlockBtn = launcher.querySelector?.(".po-floating-unlock");
    const handle = launcher.querySelector?.(".po-floating-handle");
    if (lockBtn?.style) lockBtn.style.display = locked ? "none" : "";
    if (unlockBtn?.style) unlockBtn.style.display = locked ? "" : "none";
    if (handle?.setAttribute) {
      handle.setAttribute("title", locked ? "Launcher locked (click unlock to move)" : "Drag to move");
    }
  }

  function clampFloatingLauncherPosition(pos, options = {}) {
    const windowRef = resolveWindow();
    const documentRef = resolveDocument();
    const width = Math.max(240, Number(windowRef?.innerWidth ?? 1200));
    const height = Math.max(240, Number(windowRef?.innerHeight ?? 800));
    const launcher = documentRef?.getElementById?.("po-floating-launcher");
    const launcherWidth = Math.max(48, Number(launcher?.offsetWidth ?? 48));
    const launcherHeight = Math.max(140, Number(launcher?.offsetHeight ?? 140));
    const lockAware = options?.lockAware !== false;
    const locked = lockAware ? isFloatingLauncherLocked() : false;
    const maxLeft = Math.max(8, width - launcherWidth - 8);
    const requestedMinLeft = locked ? 8 : getFloatingLauncherLeftInset();
    const minLeft = Math.min(Math.max(8, requestedMinLeft), maxLeft);
    return {
      left: Math.max(minLeft, Math.min(maxLeft, Number(pos?.left ?? minLeft))),
      top: Math.max(8, Math.min(height - launcherHeight - 8, Number(pos?.top ?? 180)))
    };
  }

  async function saveFloatingLauncherPosition(pos) {
    const clamped = clampFloatingLauncherPosition(pos);
    await resolveGame()?.settings?.set?.(moduleId, settings?.FLOATING_LAUNCHER_POS, clamped);
  }

  function applyClickOpenerInlineStyles(opener) {
    if (!opener?.style) return;
    opener.style.position = "fixed";
    opener.style.left = "58px";
    opener.style.bottom = "84px";
    opener.style.zIndex = "10050";
    opener.style.display = "flex";
    opener.style.visibility = "visible";
    opener.style.opacity = "1";
    opener.style.alignItems = "center";
    opener.style.justifyContent = "center";
    opener.style.width = "40px";
    opener.style.height = "40px";
    opener.style.pointerEvents = "auto";
  }

  function applyFloatingLauncherInlineStyles(launcher, position = null) {
    if (!launcher?.style) return;
    launcher.style.position = "fixed";
    launcher.style.zIndex = "10050";
    launcher.style.display = "flex";
    launcher.style.visibility = "visible";
    launcher.style.opacity = "1";
    launcher.style.pointerEvents = "auto";
    launcher.style.flexDirection = "column";
    launcher.style.gap = "6px";
    const pos = position ?? clampFloatingLauncherPosition(getFloatingLauncherPosition());
    launcher.style.left = `${pos.left}px`;
    launcher.style.top = `${pos.top}px`;
  }

  function ensureLauncherInViewport() {
    const documentRef = resolveDocument();
    const windowRef = resolveWindow();
    const launcher = documentRef?.getElementById?.("po-floating-launcher");
    if (!launcher) return;
    const rect = launcher.getBoundingClientRect?.();
    if (!rect) return;
    const outsideViewport =
      rect.right < 0 ||
      rect.left > Number(windowRef?.innerWidth ?? 0) ||
      rect.bottom < 0 ||
      rect.top > Number(windowRef?.innerHeight ?? 0);
    if (!outsideViewport) return;
    const centered = getFloatingLauncherCenteredPosition();
    const clamped = clampFloatingLauncherPosition(centered, { lockAware: false });
    applyFloatingLauncherInlineStyles(launcher, clamped);
    void saveFloatingLauncherPosition(clamped);
  }

  function removeClickOpener() {
    resolveDocument()?.getElementById?.("po-click-opener")?.remove?.();
  }

  function removeFloatingLauncher() {
    resolveDocument()?.getElementById?.("po-floating-launcher")?.remove?.();
  }

  function removeSidebarLauncher() {
    const documentRef = resolveDocument();
    documentRef?.getElementById?.("po-sidebar-launcher")?.remove?.();
    documentRef
      ?.querySelectorAll?.(".po-sidebar-launcher, [data-po-sidebar-launcher]")
      ?.forEach?.((launcher) => launcher?.remove?.());
  }

  function getSidebarLauncherHosts() {
    const documentRef = resolveDocument();
    const sidebar = documentRef?.getElementById?.("sidebar");
    if (!sidebar) return [];

    const selector = [
      "#sidebar-content .sidebar-tab",
      "#sidebar-content .tab.sidebar-tab",
      ".sidebar-content .sidebar-tab",
      ".sidebar-content .tab.sidebar-tab",
      "[data-application-part='content'] .sidebar-tab",
      "[data-application-part='content'] .tab.sidebar-tab"
    ].join(", ");
    const hosts = Array.from(sidebar.querySelectorAll?.(selector) ?? []).filter((host) => host && host.nodeType === 1);
    if (hosts.length > 0) return [...new Set(hosts)];

    const content =
      sidebar.querySelector?.("#sidebar-content") ??
      sidebar.querySelector?.(".sidebar-content") ??
      sidebar.querySelector?.("[data-application-part='content']");
    return [content ?? sidebar].filter(Boolean);
  }

  function getSidebarLauncherHost() {
    const hosts = getSidebarLauncherHosts();
    return hosts.find((host) => host?.classList?.contains?.("active")) ?? hosts[0] ?? null;
  }

  function getDirectSidebarLauncher(host) {
    return (
      Array.from(host?.children ?? []).find((child) => child?.classList?.contains?.("po-sidebar-launcher")) ?? null
    );
  }

  function scheduleLauncherRecoveryPass() {
    if (launcherRecoveryScheduled) return;
    launcherRecoveryScheduled = true;
    const windowRef = resolveWindow();
    const delays = Array.isArray(launcherRecoveryDelaysMs) ? launcherRecoveryDelaysMs : [];
    const finalDelay = delays[delays.length - 1];

    for (const delay of delays) {
      windowRef?.setTimeout?.(() => {
        try {
          if (shouldShowFloatingLauncher()) {
            ensureClickOpener();
            ensureFloatingLauncher();
            ensureLauncherInViewport();
          } else {
            removeClickOpener();
            removeFloatingLauncher();
          }
          if (shouldShowSidebarLauncher()) ensureSidebarLauncher();
          else removeSidebarLauncher();
        } catch (error) {
          console.warn(`${moduleId}: launcher recovery pass failed`, error);
        } finally {
          if (delay === finalDelay) {
            launcherRecoveryScheduled = false;
          }
        }
      }, delay);
    }

    if (!delays.length) launcherRecoveryScheduled = false;
  }

  async function resetFloatingLauncherPosition() {
    const resetPos = getFloatingLauncherCenteredPosition();
    await resolveGame()?.settings?.set?.(moduleId, settings?.FLOATING_LAUNCHER_POS, resetPos);
    const documentRef = resolveDocument();
    let launcher = documentRef?.getElementById?.("po-floating-launcher");
    if (!launcher) {
      ensureFloatingLauncher();
      launcher = documentRef?.getElementById?.("po-floating-launcher");
    }
    if (launcher) {
      const pos = clampFloatingLauncherPosition(resetPos);
      applyFloatingLauncherInlineStyles(launcher, pos);
    }
  }

  async function setLauncherPlacement(placement) {
    const normalized = normalizeLauncherPlacement(placement);
    if (typeof setModuleSettingWithLocalRefreshSuppressed === "function") {
      await setModuleSettingWithLocalRefreshSuppressed(settings?.LAUNCHER_PLACEMENT, normalized);
    } else {
      await resolveGame()?.settings?.set?.(moduleId, settings?.LAUNCHER_PLACEMENT, normalized);
    }
    return normalized;
  }

  function buildSidebarLauncherAudioContext() {
    if (!canAccessAllPlayerOps?.()) return { visible: false };
    const catalog = getAudioLibraryCatalog?.() ?? { items: [] };
    const selectedPreset = getSelectedAudioMixPreset?.() ?? null;
    const playback = getAudioMixPlaybackState?.(catalog) ?? {};
    const playableCandidates = getPlayableAudioMixCandidates?.(catalog, selectedPreset) ?? [];
    const catalogItems = Array.isArray(catalog?.items) ? catalog.items : [];
    const hasCatalog = catalogItems.length > 0;
    const isSelectedPresetActive = String(playback?.presetId ?? "").trim() === String(selectedPreset?.id ?? "").trim();
    const canResumeSelectedPreset = Boolean(playback?.isPaused && playback?.hasQueue && isSelectedPresetActive);
    const statusLabel = !hasCatalog
      ? "Scan audio in GM > Audio to enable launcher controls."
      : playback?.hasActiveTrack
        ? `${playback?.presetLabel}: ${playback?.activeTrackName}`
        : playback?.isPaused && playback?.hasQueue
          ? `${playback?.presetLabel} paused.`
          : String(selectedPreset?.description ?? "").trim() ||
            "Pick a preset deck and use the transport controls here.";
    return {
      visible: true,
      presets: (getAllAudioMixPresets?.() ?? []).map((preset) => ({
        id: String(preset?.id ?? "").trim(),
        label: String(preset?.label ?? "Mix").trim() || "Mix",
        selected: String(preset?.id ?? "").trim() === String(selectedPreset?.id ?? "").trim()
      })),
      statusLabel,
      isPlaying: Boolean(playback?.isPlaying),
      isPaused: Boolean(playback?.isPaused),
      canPlay: canResumeSelectedPreset || playableCandidates.length > 0,
      canNext: Boolean(playback?.canSkipNext),
      canStop: Boolean(playback?.hasActiveTrack || playback?.hasQueue || playback?.playbackId),
      playTitle: canResumeSelectedPreset ? "Resume selected preset deck" : "Play selected preset deck",
      nextTitle: "Advance the current mix to the next track",
      stopTitle: "Stop the current mix"
    };
  }

  function buildSidebarLauncherAudioMarkup() {
    const context = buildSidebarLauncherAudioContext();
    if (!context.visible) return "";
    const optionsMarkup = context.presets
      .map(
        (preset) =>
          `<option value="${poEscapeHtml(preset.id)}" ${preset.selected ? "selected" : ""}>${poEscapeHtml(preset.label)}</option>`
      )
      .join("");
    const statusClass = context.isPlaying ? " is-playing" : context.isPaused ? " is-paused" : "";
    return `
    <div class="po-sidebar-launcher-audio-compact${statusClass}" title="${poEscapeHtml(context.statusLabel)}">
      <select class="po-sidebar-launcher-select po-sidebar-launcher-audio-select" data-action="launcher-audio-select" aria-label="Preset Deck">
        ${optionsMarkup}
      </select>
      <div class="po-sidebar-launcher-audio-controls">
        <button type="button" class="po-sidebar-btn po-sidebar-launcher-audio-btn is-primary" data-action="launcher-audio-play" title="${poEscapeHtml(context.playTitle)}" aria-label="${poEscapeHtml(context.playTitle)}" ${context.canPlay ? "" : "disabled"}>
          <i class="fas fa-play"></i><span>Play</span>
        </button>
        <button type="button" class="po-sidebar-btn po-sidebar-launcher-audio-btn" data-action="launcher-audio-next" title="${poEscapeHtml(context.nextTitle)}" aria-label="${poEscapeHtml(context.nextTitle)}" ${context.canNext ? "" : "disabled"}>
          <i class="fas fa-step-forward"></i><span>Next</span>
        </button>
        <button type="button" class="po-sidebar-btn po-sidebar-launcher-audio-btn" data-action="launcher-audio-stop" title="${poEscapeHtml(context.stopTitle)}" aria-label="${poEscapeHtml(context.stopTitle)}" ${context.canStop ? "" : "disabled"}>
          <i class="fas fa-stop"></i><span>Stop</span>
        </button>
      </div>
    </div>
  `;
  }

  function syncSidebarLauncherAudioUi(launcher) {
    if (!launcher) return;
    let audioSection = launcher.querySelector?.("[data-po-sidebar-launcher-audio]");
    if (!canAccessAllPlayerOps?.()) {
      audioSection?.remove?.();
      return;
    }
    if (!audioSection) {
      const documentRef = resolveDocument();
      audioSection = documentRef?.createElement?.("section");
      audioSection?.classList?.add?.("po-sidebar-launcher-audio");
      if (audioSection?.dataset) audioSection.dataset.poSidebarLauncherAudio = "1";
      launcher.appendChild?.(audioSection);
    }
    if (audioSection) audioSection.innerHTML = buildSidebarLauncherAudioMarkup();
  }

  function refreshLauncherAudioUi() {
    const documentRef = resolveDocument();
    documentRef?.querySelectorAll?.(".po-sidebar-launcher, [data-po-sidebar-launcher]")?.forEach?.((launcher) => {
      syncSidebarLauncherAudioUi(launcher);
    });
  }

  function handleSidebarLauncherAudioPresetSelection(element) {
    selectAudioMixPreset?.(element);
    refreshOpenApps?.({ scope: refreshScopeKeys?.LOOT });
  }

  async function handleLauncherAudioTransportAction(action) {
    const command = String(action ?? "").trim();
    if (!command) return;
    try {
      clearAudioLibraryError?.();
      if (command === "launcher-audio-play") {
        const catalog = getAudioLibraryCatalog?.() ?? { items: [] };
        const selectedPreset = getSelectedAudioMixPreset?.() ?? null;
        const playback = getAudioMixPlaybackState?.(catalog) ?? {};
        const isSelectedPresetActive =
          String(playback?.presetId ?? "").trim() === String(selectedPreset?.id ?? "").trim();
        if (playback?.isPaused && playback?.hasQueue && isSelectedPresetActive) {
          await toggleAudioMixPlayback?.();
        } else {
          await playAudioMixPresetById?.(selectedPreset?.id);
        }
      } else if (command === "launcher-audio-next") {
        await playNextAudioMixTrack?.();
      } else if (command === "launcher-audio-stop") {
        await stopAudioMixPlayback?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
      setAudioLibraryError?.(message);
      const prefix = command === "launcher-audio-stop" ? "Audio stop failed" : "Audio mix failed";
      resolveUi()?.notifications?.warn?.(`${prefix}: ${message}`);
    } finally {
      refreshLauncherAudioUi();
    }
  }

  function handleLauncherAction(action, context = {}) {
    const tabId = getMainTabIdFromAction?.(action);
    if (tabId) {
      logUiDebug?.("launcher", "opening launcher action", {
        action,
        tabId,
        template: getTemplateForMainTab?.(tabId)
      });
      try {
        openMainTab?.(tabId, { force: true });
      } catch (error) {
        console.error(`${moduleId}: launcher action failed`, { action, error });
        resolveUi()?.notifications?.error?.(`Party Operations failed to open ${tabId}. Check console for details.`);
      }
      return;
    }
    if (action === "lock") {
      const documentRef = resolveDocument();
      const launcher = context.launcherElement ?? documentRef?.getElementById?.("po-floating-launcher");
      if (!launcher) return;
      const current = clampFloatingLauncherPosition(
        {
          left: parseFloat(launcher.style?.left || "16"),
          top: parseFloat(launcher.style?.top || "180")
        },
        { lockAware: false }
      );
      if (launcher.style) {
        launcher.style.left = `${current.left}px`;
        launcher.style.top = `${current.top}px`;
      }
      void saveFloatingLauncherPosition(current);
      void resolveGame()?.settings?.set?.(moduleId, settings?.FLOATING_LAUNCHER_LOCKED, true);
      return;
    }
    if (action === "unlock") {
      void resolveGame()?.settings?.set?.(moduleId, settings?.FLOATING_LAUNCHER_LOCKED, false);
      return;
    }
    if (action === "dock-sidebar") {
      void setLauncherPlacement(launcherPlacements?.SIDEBAR);
      return;
    }
    if (action === "dock-floating") {
      void setLauncherPlacement(launcherPlacements?.FLOATING);
      return;
    }
    if (action === "launcher-audio-play" || action === "launcher-audio-next" || action === "launcher-audio-stop") {
      void handleLauncherAudioTransportAction(action);
    }
  }

  function ensureClickOpener() {
    const documentRef = resolveDocument();
    let opener = documentRef?.getElementById?.("po-click-opener");
    if (!opener) {
      opener = documentRef?.createElement?.("button");
      if (!opener) return null;
      opener.id = "po-click-opener";
      opener.type = "button";
      opener.setAttribute?.("title", "Open Party Operations");
      opener.setAttribute?.("aria-label", "Open Party Operations");
      opener.innerHTML = '<i class="fas fa-compass"></i>';
      opener.addEventListener?.("click", () => {
        ensureFloatingLauncher();
        handleLauncherAction("rest");
      });
      documentRef?.body?.appendChild?.(opener);
    }

    applyClickOpenerInlineStyles(opener);
    return opener;
  }

  function ensureSidebarLauncher() {
    const documentRef = resolveDocument();
    const sidebar = documentRef?.getElementById?.("sidebar");
    const hosts = getSidebarLauncherHosts();
    if (!sidebar || hosts.length <= 0) return null;

    const setLauncherMarkup = (target, host) => {
      const visibleItems = sidebarViewItems.filter((item) => !item.gmOnly || canAccessGmPage?.());
      const buttonsMarkup = visibleItems
        .map(
          (item) => `
        <button type="button" class="po-sidebar-btn${item.gmOnly ? " po-sidebar-gm" : ""}" data-action="${item.action}" data-tab-id="${item.id}" data-target="${item.target}" title="${item.title}" aria-label="${item.title}">
          <i class="${item.icon}"></i><span>${item.label}</span>
        </button>`
        )
        .join("");

      target.innerHTML = `
      <header class="po-sidebar-launcher-header">
        <h4 class="po-sidebar-launcher-title">Party Ops</h4>
        <button type="button" class="po-sidebar-btn po-sidebar-dock" data-action="dock-floating" title="Dock launcher on screen" aria-label="Dock launcher on screen">
          <i class="fas fa-external-link-alt"></i>
        </button>
      </header>
      <div class="po-sidebar-launcher-grid">
        ${buttonsMarkup}
      </div>
      <section class="po-sidebar-launcher-audio" data-po-sidebar-launcher-audio></section>
    `;
      logUiDebug?.("sidebar-launcher", "rebuilt sidebar launcher", {
        hostId: String(host?.id ?? "").trim() || null,
        hostClass: String(host?.className ?? "").trim() || null,
        items: visibleItems.map((item) => ({ id: item.id, action: item.action, target: item.target }))
      });
    };

    let firstLauncher = null;
    hosts.forEach((host, index) => {
      let launcher = getDirectSidebarLauncher(host);
      if (!launcher) {
        launcher = documentRef?.createElement?.("section");
        if (!launcher) return;
        launcher.classList?.add?.("po-sidebar-launcher");
        if (launcher.dataset) launcher.dataset.poSidebarLauncher = "1";
      }
      if (index === 0) launcher.id = "po-sidebar-launcher";
      else if (launcher.id === "po-sidebar-launcher") launcher.removeAttribute?.("id");

      if (launcher.parentElement !== host) {
        if (host === sidebar) host.appendChild?.(launcher);
        else host.prepend?.(launcher);
      } else if (host !== sidebar && host.firstElementChild !== launcher) {
        host.prepend?.(launcher);
      }

      const hasRestBtn = Boolean(launcher.querySelector?.('.po-sidebar-btn[data-tab-id="rest-watch"]'));
      const hasOperationsBtn = Boolean(launcher.querySelector?.('.po-sidebar-btn[data-tab-id="operations"]'));
      const hasMarchBtn = Boolean(launcher.querySelector?.('.po-sidebar-btn[data-tab-id="marching-order"]'));
      const hasGmBtn = !canAccessGmPage?.() || Boolean(launcher.querySelector?.('.po-sidebar-btn[data-tab-id="gm"]'));
      const hasDockBtn = Boolean(launcher.querySelector?.('.po-sidebar-btn[data-action="dock-floating"]'));
      if (!hasRestBtn || !hasOperationsBtn || !hasMarchBtn || !hasGmBtn || !hasDockBtn) {
        setLauncherMarkup(launcher, host);
      }

      if (launcher.dataset?.poSidebarLauncherBound !== "1") {
        if (launcher.dataset) launcher.dataset.poSidebarLauncherBound = "1";
        launcher.addEventListener?.("click", (event) => {
          const button = event.target?.closest?.(".po-sidebar-btn");
          if (!button) return;
          const action = button.dataset?.action;
          if (!action) return;
          logUiDebug?.("sidebar-launcher", "sidebar launcher click", {
            action,
            tabId: button.dataset?.tabId,
            target: button.dataset?.target,
            template: getTemplateForMainTab?.(button.dataset?.tabId)
          });
          handleLauncherAction(action);
        });
        launcher.addEventListener?.("change", (event) => {
          const select = event.target?.closest?.(".po-sidebar-launcher-audio-select");
          if (!select) return;
          handleSidebarLauncherAudioPresetSelection(select);
        });
      }

      const gmButton = launcher.querySelector?.('.po-sidebar-btn[data-tab-id="gm"]');
      if (gmButton?.style) gmButton.style.display = canAccessGmPage?.() ? "" : "none";
      syncSidebarLauncherAudioUi(launcher);
      if (!firstLauncher) firstLauncher = launcher;
    });
    return firstLauncher;
  }

  function ensureFloatingLauncher() {
    const documentRef = resolveDocument();
    const windowRef = resolveWindow();
    let launcher = documentRef?.getElementById?.("po-floating-launcher");

    const setLauncherMarkup = (target) => {
      target.innerHTML = `
      <div class="po-floating-handle" title="Drag to move" aria-label="Drag to move"><i class="fas fa-grip-lines-vertical"></i></div>
      <button type="button" class="po-floating-btn" data-action="rest" title="Open Rest Watch" aria-label="Open Rest Watch">
        <i class="fas fa-moon"></i>
      </button>
      <button type="button" class="po-floating-btn" data-action="operations" title="Open Operations" aria-label="Open Operations">
        <i class="fas fa-clipboard-list"></i>
      </button>
      <button type="button" class="po-floating-btn" data-action="march" title="Open Marching Order" aria-label="Open Marching Order"><i class="fas fa-arrow-up"></i></button>
      <button type="button" class="po-floating-btn po-floating-gm" data-action="gm" title="Open GM Section" aria-label="Open GM Section">
        <i class="fas fa-user-shield"></i>
      </button>
      <button type="button" class="po-floating-btn po-floating-dock" data-action="dock-sidebar" title="Dock launcher in sidebar" aria-label="Dock launcher in sidebar">
        <i class="fas fa-columns"></i>
      </button>
      <button type="button" class="po-floating-btn po-floating-lock" data-action="lock" title="Lock launcher" aria-label="Lock launcher">
        <i class="fas fa-lock"></i>
      </button>
      <button type="button" class="po-floating-btn po-floating-unlock" data-action="unlock" title="Unlock launcher" aria-label="Unlock launcher">
        <i class="fas fa-lock-open"></i>
      </button>
    `;
    };

    if (!launcher) {
      launcher = documentRef?.createElement?.("div");
      if (!launcher) return null;
      launcher.id = "po-floating-launcher";
      launcher.classList?.add?.("po-floating-launcher");
      setLauncherMarkup(launcher);
      documentRef?.body?.appendChild?.(launcher);

      launcher.addEventListener?.("click", (event) => {
        const button = event.target?.closest?.(".po-floating-btn");
        if (!button) return;
        const action = button.dataset?.action;
        if (!action) return;
        handleLauncherAction(action, { launcherElement: launcher });
      });

      const handle = launcher.querySelector?.(".po-floating-handle");
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originLeft = 0;
      let originTop = 0;
      let lastLockedDragNoticeAt = 0;

      const onMove = (event) => {
        if (!dragging) return;
        const next = clampFloatingLauncherPosition({
          left: originLeft + (event.clientX - startX),
          top: originTop + (event.clientY - startY)
        });
        if (launcher.style) {
          launcher.style.left = `${next.left}px`;
          launcher.style.top = `${next.top}px`;
        }
      };

      const onUp = async () => {
        if (!dragging) return;
        dragging = false;
        documentRef?.removeEventListener?.("pointermove", onMove);
        documentRef?.removeEventListener?.("pointerup", onUp);
        await saveFloatingLauncherPosition({
          left: parseFloat(launcher.style?.left || String(getFloatingLauncherLeftInset())),
          top: parseFloat(launcher.style?.top || "180")
        });
      };

      const startDrag = (event) => {
        if (isFloatingLauncherLocked()) {
          const now = Date.now();
          if (now - lastLockedDragNoticeAt > 1500) {
            lastLockedDragNoticeAt = now;
            resolveUi()?.notifications?.info?.("Launcher position is locked. Click unlock to move it.");
          }
          event.preventDefault?.();
          return;
        }
        if (event.target?.closest?.(".po-floating-btn")) return;
        if (event.button !== undefined && event.button !== 0) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        originLeft = parseFloat(launcher.style?.left || String(getFloatingLauncherLeftInset()));
        originTop = parseFloat(launcher.style?.top || "180");
        documentRef?.addEventListener?.("pointermove", onMove);
        documentRef?.addEventListener?.("pointerup", onUp);
        event.preventDefault?.();
      };

      handle?.addEventListener?.("pointerdown", startDrag);
      launcher.addEventListener?.("pointerdown", startDrag);

      windowRef?.addEventListener?.("resize", () => {
        const clamped = clampFloatingLauncherPosition({
          left: parseFloat(launcher.style?.left || String(getFloatingLauncherLeftInset())),
          top: parseFloat(launcher.style?.top || "180")
        });
        if (launcher.style) {
          launcher.style.left = `${clamped.left}px`;
          launcher.style.top = `${clamped.top}px`;
        }
      });
    } else {
      const hasRestBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="rest"]'));
      const hasOperationsBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="operations"]'));
      const hasMarchBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="march"]'));
      const hasGmBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="gm"]'));
      const hasDockBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="dock-sidebar"]'));
      const hasLockBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="lock"]'));
      const hasUnlockBtn = Boolean(launcher.querySelector?.('.po-floating-btn[data-action="unlock"]'));
      if (
        !hasRestBtn ||
        !hasOperationsBtn ||
        !hasMarchBtn ||
        !hasGmBtn ||
        !hasDockBtn ||
        !hasLockBtn ||
        !hasUnlockBtn
      ) {
        setLauncherMarkup(launcher);
      }
    }

    const gmButton = launcher.querySelector?.('.po-floating-btn[data-action="gm"]');
    if (gmButton?.style) gmButton.style.display = canAccessGmPage?.() ? "" : "none";

    const pos = clampFloatingLauncherPosition(getFloatingLauncherPosition());
    applyFloatingLauncherInlineStyles(launcher, pos);
    applyFloatingLauncherLockUi(launcher, isFloatingLauncherLocked());
    return launcher;
  }

  function ensureLauncherUi() {
    let error = null;
    const placement = getLauncherPlacement();
    try {
      if (shouldShowFloatingLauncher()) {
        ensureClickOpener();
        ensureFloatingLauncher();
        ensureLauncherInViewport();
        scheduleLauncherRecoveryPass();
      } else {
        removeClickOpener();
        removeFloatingLauncher();
      }

      if (shouldShowSidebarLauncher()) ensureSidebarLauncher();
      else removeSidebarLauncher();
    } catch (caught) {
      error = caught;
      console.error(`${moduleId}: ensureLauncherUi failed`, caught);
    }

    const documentRef = resolveDocument();
    const clickOpener = documentRef?.getElementById?.("po-click-opener");
    const floatingLauncher = documentRef?.getElementById?.("po-floating-launcher");
    const sidebarLauncher = documentRef?.querySelector?.(".po-sidebar-launcher, [data-po-sidebar-launcher]");
    return {
      ok: Boolean(clickOpener || floatingLauncher || sidebarLauncher) && !error,
      placement,
      clickOpener: Boolean(clickOpener),
      floatingLauncher: Boolean(floatingLauncher),
      sidebarLauncher: Boolean(sidebarLauncher),
      error: error ? String(error?.message ?? error) : null
    };
  }

  function getLauncherStatusSnapshot() {
    const documentRef = resolveDocument();
    const clickOpener = documentRef?.getElementById?.("po-click-opener");
    const floatingLauncher = documentRef?.getElementById?.("po-floating-launcher");
    const sidebarLaunchers = Array.from(
      documentRef?.querySelectorAll?.(".po-sidebar-launcher, [data-po-sidebar-launcher]") ?? []
    );
    const sidebarLauncher = sidebarLaunchers[0] ?? null;
    const sidebarLauncherHost = sidebarLauncher?.parentElement ?? getSidebarLauncherHost();
    const placement = getLauncherPlacement();
    return {
      ok: Boolean(clickOpener || floatingLauncher || sidebarLauncher),
      placement,
      clickOpener: Boolean(clickOpener),
      floatingLauncher: Boolean(floatingLauncher),
      sidebarLauncher: Boolean(sidebarLauncher),
      sidebarLauncherCount: sidebarLaunchers.length,
      sidebarPresent: Boolean(documentRef?.getElementById?.("sidebar")),
      sidebarLauncherHostId: String(sidebarLauncherHost?.id ?? "").trim() || null,
      sidebarLauncherHostClass: String(sidebarLauncherHost?.className ?? "").trim() || null,
      moduleId
    };
  }

  async function forceLauncherRecovery(reason = "unknown") {
    let status = ensureLauncherUi();
    if (status?.ok) return { ...status, recovered: false, reason };

    try {
      await setLauncherPlacement(launcherPlacements?.BOTH);
    } catch {}

    try {
      await resetFloatingLauncherPosition();
    } catch {}

    removeClickOpener();
    removeFloatingLauncher();
    removeSidebarLauncher();

    ensureClickOpener();
    ensureFloatingLauncher();
    ensureSidebarLauncher();
    ensureLauncherInViewport();

    status = ensureLauncherUi();
    const snapshot = getLauncherStatusSnapshot();
    if (!status?.ok && !snapshot.ok) {
      console.warn(`${moduleId}: launcher recovery failed`, { reason, status, snapshot });
    }

    return {
      ...status,
      recovered: Boolean(status?.ok),
      reason,
      snapshot
    };
  }

  return {
    normalizeLauncherPlacement,
    getLauncherPlacement,
    setLauncherPlacement,
    isFloatingLauncherLocked,
    resetFloatingLauncherPosition,
    buildSidebarLauncherAudioContext,
    buildSidebarLauncherAudioMarkup,
    refreshLauncherAudioUi,
    handleLauncherAudioTransportAction,
    handleLauncherAction,
    ensureLauncherUi,
    getLauncherStatusSnapshot,
    forceLauncherRecovery
  };
}
