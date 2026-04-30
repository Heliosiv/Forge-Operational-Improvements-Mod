export function buildTimeHookModule({
  notifyDailyInjuryReminders,
  handleAutomaticOperationalUpkeepTick,
  handleAutomaticMerchantAutoRefreshTick,
  handleAutomaticCalendarWeatherTick,
  gameRef
} = {}) {
  return {
    id: "time",
    registrations: [
      [
        "updateWorldTime",
        async () => {
          await notifyDailyInjuryReminders?.();
          if (!gameRef?.user?.isGM) return;
          await handleAutomaticOperationalUpkeepTick?.();
          await handleAutomaticMerchantAutoRefreshTick?.();
          await handleAutomaticCalendarWeatherTick?.();
        }
      ]
    ]
  };
}
