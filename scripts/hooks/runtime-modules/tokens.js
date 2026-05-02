export function buildTokenHookModule({ applyAutoInventoryToUnlinkedToken, onMarchTokenMoved } = {}) {
  return {
    id: "tokens",
    registrations: [
      [
        "createToken",
        async (tokenDoc, options, userId) => {
          await applyAutoInventoryToUnlinkedToken?.(tokenDoc, options ?? {}, userId ?? null);
        }
      ],
      [
        "updateToken",
        async (tokenDoc, changed, _options) => {
          if (changed && (changed.x !== undefined || changed.y !== undefined)) {
            onMarchTokenMoved?.(tokenDoc);
          }
        }
      ]
    ]
  };
}
