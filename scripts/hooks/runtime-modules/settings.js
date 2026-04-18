export function buildSettingHookModule({
  moduleId,
  settings,
  consumeSuppressedSettingRefresh,
  refreshOpenApps,
  getRefreshScopesForSettingKey,
  scheduleIntegrationSync,
  gameRef,
  perfTracker
} = {}) {
  const restKey = `${moduleId}.${settings?.REST_STATE}`;
  const marchKey = `${moduleId}.${settings?.MARCH_STATE}`;
  const actKey = `${moduleId}.${settings?.REST_ACTIVITIES}`;
  const opsKey = `${moduleId}.${settings?.OPS_LEDGER}`;
  const injuryKey = `${moduleId}.${settings?.INJURY_RECOVERY}`;
  const lootSourceKey = `${moduleId}.${settings?.LOOT_SOURCE_CONFIG}`;
  const integrationModeKey = `${moduleId}.${settings?.INTEGRATION_MODE}`;
  const journalVisibilityKey = `${moduleId}.${settings?.JOURNAL_ENTRY_VISIBILITY}`;
  const sessionSummaryRangeKey = `${moduleId}.${settings?.SESSION_SUMMARY_RANGE}`;
  const refreshKeys = new Set([
    restKey,
    marchKey,
    actKey,
    opsKey,
    injuryKey,
    lootSourceKey,
    journalVisibilityKey,
    sessionSummaryRangeKey
  ]);
  const integrationSyncKeys = new Set([restKey, marchKey, opsKey, injuryKey, integrationModeKey]);

  return {
    id: "settings",
    registrations: [
      ["updateSetting", (setting) => {
        const settingKey = String(setting?.key ?? "").trim();
        if (!settingKey) return;
        perfTracker?.increment?.("setting.updated", 1, { settingKey });
        if (consumeSuppressedSettingRefresh?.(settingKey)) return;
        if (refreshKeys.has(settingKey)) {
          perfTracker?.increment?.("refresh-open-apps", 1, { settingKey });
          refreshOpenApps?.({ scopes: getRefreshScopesForSettingKey?.(settingKey) });
        }
        if (gameRef?.user?.isGM && integrationSyncKeys.has(settingKey)) {
          perfTracker?.increment?.("integration-sync", 1, { reason: "update-setting", settingKey });
          scheduleIntegrationSync?.("update-setting");
        }
      }]
    ]
  };
}
