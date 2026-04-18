export function buildTimeHookModule({
  notifyDailyInjuryReminders,
  handleAutomaticOperationalUpkeepTick,
  handleAutomaticMerchantAutoRefreshTick,
  gameRef
} = {}) {
  return {
    id: "time",
    registrations: [
      ["updateWorldTime", async () => {
        await notifyDailyInjuryReminders?.();
        if (!gameRef?.user?.isGM) return;
        await handleAutomaticOperationalUpkeepTick?.();
        await handleAutomaticMerchantAutoRefreshTick?.();
      }]
    ]
  };
}
