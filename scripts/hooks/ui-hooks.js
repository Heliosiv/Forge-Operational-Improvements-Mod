export function registerPartyOperationsUiHooks({
  HooksRef = globalThis.Hooks,
  openMainTab,
  canAccessAllPlayerOps,
  ensureLauncherUi,
  hideManagedAudioMixPlaylistUi,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window) ?? globalThis.setTimeout,
  documentRef = globalThis.document
} = {}) {
  if (typeof HooksRef?.on !== "function") return;

  HooksRef.on("getSceneControlButtons", (controls) => {
    if (!Array.isArray(controls)) return;
    if (controls.some((control) => control?.name === "party-operations")) return;

    const tools = [
      {
        name: "po-rest-watch",
        title: "Open Rest Watch",
        icon: "fas fa-moon",
        button: true,
        onClick: () => openMainTab?.("rest-watch", { force: true })
      },
      {
        name: "po-marching-order",
        title: "Open Marching Order",
        icon: "fas fa-arrow-up",
        button: true,
        onClick: () => openMainTab?.("marching-order", { force: true })
      },
      {
        name: "po-operations",
        title: "Open Operations",
        icon: "fas fa-clipboard-list",
        button: true,
        onClick: () => openMainTab?.("operations", { force: true })
      }
    ];

    if (canAccessAllPlayerOps?.()) {
      tools.push({
        name: "po-gm",
        title: "Open GM",
        icon: "fas fa-user-shield",
        button: true,
        onClick: () => openMainTab?.("gm", { force: true })
      });
    }

    controls.push({
      name: "party-operations",
      title: "Party Operations",
      icon: "fas fa-compass",
      visible: true,
      tools,
      activeTool: "po-rest-watch"
    });
  });

  HooksRef.on("renderSceneControls", () => {
    ensureLauncherUi?.();
  });

  HooksRef.on("canvasReady", () => {
    ensureLauncherUi?.();
  });

  HooksRef.on("renderHotbar", () => {
    ensureLauncherUi?.();
  });

  HooksRef.on("renderSidebarTab", (_app, html) => {
    ensureLauncherUi?.();
    setTimeoutFn?.(() => ensureLauncherUi?.(), 30);
    hideManagedAudioMixPlaylistUi?.(html?.[0] ?? html ?? documentRef);
    setTimeoutFn?.(() => hideManagedAudioMixPlaylistUi?.(documentRef), 30);
  });

  HooksRef.on("renderNavigation", () => {
    ensureLauncherUi?.();
    setTimeoutFn?.(() => ensureLauncherUi?.(), 30);
  });
}
