import { createModulePerfTracker } from "../core/perf.js";

export function registerPartyOperationsUiHooks({
  HooksRef = globalThis.Hooks,
  openMainTab,
  canAccessAllPlayerOps,
  canAccessGmPage = canAccessAllPlayerOps,
  ensureLauncherUi,
  hideManagedAudioMixPlaylistUi,
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window) ?? globalThis.setTimeout,
  documentRef = globalThis.document,
  perfTracker = createModulePerfTracker("ui-hooks"),
  launcherEnsureCooldownMs = 30,
  nowFn = Date.now
} = {}) {
  if (typeof HooksRef?.on !== "function") return;

  const lastLauncherEnsureAtByFamily = new Map();

  function requestLauncherEnsure(reason, meta = {}) {
    const family = String(meta?.family ?? "launcher-ui").trim() || "launcher-ui";
    const nowRaw = Number(nowFn?.() ?? Date.now());
    const now = Number.isFinite(nowRaw) ? nowRaw : Date.now();
    const lastAt = Number(lastLauncherEnsureAtByFamily.get(family) ?? Number.NEGATIVE_INFINITY);
    if ((now - lastAt) < launcherEnsureCooldownMs) {
      perfTracker.increment("launcher.ensure-skipped", 1, {
        reason,
        family,
        cooldownMs: launcherEnsureCooldownMs,
        ...meta
      });
      return;
    }
    lastLauncherEnsureAtByFamily.set(family, now);
    perfTracker.increment("launcher.ensure-request", 1, {
      reason,
      family,
      ...meta
    });
    ensureLauncherUi?.();
  }

  function registerEnsureHook(eventName) {
    if (!eventName) return;
    HooksRef.on(eventName, () => {
      requestLauncherEnsure(eventName, { family: "ui-render" });
      setTimeoutFn?.(() => requestLauncherEnsure(eventName, {
        family: "ui-render",
        deferred: true,
        delayMs: 30
      }), 30);
    });
  }

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

    if (canAccessGmPage?.()) {
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
    requestLauncherEnsure("renderSceneControls", { family: "ui-render" });
  });

  HooksRef.on("canvasReady", () => {
    requestLauncherEnsure("canvasReady", { family: "ui-render" });
  });

  HooksRef.on("renderHotbar", () => {
    requestLauncherEnsure("renderHotbar", { family: "ui-render" });
  });

  HooksRef.on("renderSidebarTab", (_app, html) => {
    requestLauncherEnsure("renderSidebarTab", { family: "ui-render" });
    setTimeoutFn?.(() => requestLauncherEnsure("renderSidebarTab", {
      family: "ui-render",
      deferred: true,
      delayMs: 30
    }), 30);
    perfTracker.increment("audio.playlist-hide", 1, { reason: "renderSidebarTab" });
    hideManagedAudioMixPlaylistUi?.(html?.[0] ?? html ?? documentRef);
    setTimeoutFn?.(() => {
      perfTracker.increment("audio.playlist-hide", 1, { reason: "renderSidebarTab", deferred: true, delayMs: 30 });
      hideManagedAudioMixPlaylistUi?.(documentRef);
    }, 30);
  });

  registerEnsureHook("renderNavigation");
  registerEnsureHook("renderSceneNavigation");
}
