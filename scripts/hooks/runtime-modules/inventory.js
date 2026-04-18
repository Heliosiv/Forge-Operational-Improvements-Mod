export function buildInventoryHookModule({
  hasInventoryDelta,
  queueInventoryRefresh,
  foundryRef
} = {}) {
  return {
    id: "inventory",
    registrations: [
      ["updateActor", (actor, changed) => {
        if (!hasInventoryDelta?.(changed)) return;
        queueInventoryRefresh?.(actor, "inventory-update-actor");
      }],
      ["createItem", (item) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        queueInventoryRefresh?.(actor, "inventory-create-item");
      }],
      ["updateItem", (item, changed) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        if (!changed || typeof changed !== "object") return;

        const touchesQuantity = foundryRef?.utils?.getProperty?.(changed, "system.quantity") !== undefined;
        const touchesContainer = foundryRef?.utils?.getProperty?.(changed, "system.container") !== undefined;
        const touchesEquipped = foundryRef?.utils?.getProperty?.(changed, "system.equipped") !== undefined;
        const touchesWeight = foundryRef?.utils?.getProperty?.(changed, "system.weight") !== undefined;
        const touchesName = Object.prototype.hasOwnProperty.call(changed, "name");

        if (!touchesQuantity && !touchesContainer && !touchesEquipped && !touchesWeight && !touchesName) return;
        queueInventoryRefresh?.(actor, "inventory-update-item");
      }],
      ["deleteItem", (item) => {
        const actor = item?.parent;
        if (!actor || actor.documentName !== "Actor") return;
        queueInventoryRefresh?.(actor, "inventory-delete-item");
      }]
    ]
  };
}
