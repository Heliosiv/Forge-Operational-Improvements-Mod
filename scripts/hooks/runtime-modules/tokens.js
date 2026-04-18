export function buildTokenHookModule({
  applyAutoInventoryToUnlinkedToken,
  environmentMoveOriginByToken,
  maybePromptEnvironmentMovementCheck,
  onMarchTokenMoved
} = {}) {
  return {
    id: "tokens",
    registrations: [
      ["createToken", async (tokenDoc, options, userId) => {
        await applyAutoInventoryToUnlinkedToken?.(tokenDoc, options ?? {}, userId ?? null);
      }],
      ["preUpdateToken", (tokenDoc, changed, options) => {
        if (options?.poEnvironmentClamp) return;
        if (!changed || (changed.x === undefined && changed.y === undefined)) return;

        environmentMoveOriginByToken?.set?.(tokenDoc.id, {
          x: Number(tokenDoc.x ?? 0),
          y: Number(tokenDoc.y ?? 0)
        });
      }],
      ["updateToken", async (tokenDoc, changed, options) => {
        await maybePromptEnvironmentMovementCheck?.(tokenDoc, changed, options ?? {});
        if (changed && (changed.x !== undefined || changed.y !== undefined)) {
          onMarchTokenMoved?.(tokenDoc);
        }
      }]
    ]
  };
}
