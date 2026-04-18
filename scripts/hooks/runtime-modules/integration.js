export function buildIntegrationHookModule({
  scheduleIntegrationSync,
  onMarchSceneEntry,
  bindFolderOwnershipProxySubmit,
  gameRef,
  perfTracker
} = {}) {
  return {
    id: "integration",
    registrations: [
      ["canvasReady", async () => {
        if (!gameRef?.user?.isGM) return;
        await onMarchSceneEntry?.();
        perfTracker?.increment?.("integration-sync", 1, { reason: "canvas-ready" });
        scheduleIntegrationSync?.("canvas-ready");
      }],
      ["renderDocumentOwnershipConfig", (app, html) => {
        bindFolderOwnershipProxySubmit?.(app, html);
      }]
    ]
  };
}
