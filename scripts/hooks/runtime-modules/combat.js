export function buildCombatHookModule({
  onMarchCombatRound,
  onMarchCombatEnded,
  gameRef
} = {}) {
  return {
    id: "combat",
    registrations: [
      ["combatStart", async (combat) => {
        if (!gameRef?.user?.isGM) return;
        await onMarchCombatRound?.(combat, { source: "combat-start" });
      }],
      ["updateCombat", async (combat, changed) => {
        if (!gameRef?.user?.isGM) return;
        if (!changed || changed.round === undefined) return;
        await onMarchCombatRound?.(combat, changed ?? {});
      }],
      ["deleteCombat", (combat) => {
        onMarchCombatEnded?.(combat);
      }]
    ]
  };
}