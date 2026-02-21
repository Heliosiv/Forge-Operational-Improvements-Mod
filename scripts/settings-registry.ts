export const PARTY_OPS_MODULE_ID = "party-operations";

export const PARTY_OPS_SETTING_KEYS = {
  debugEnabled: "debugEnabled",
  lootScarcity: "lootScarcity",
  restAutomationEnabled: "restAutomationEnabled",
  marchingOrderLockPlayers: "marchingOrderLockPlayers"
} as const;

export type LootScarcity = "abundant" | "normal" | "scarce";

export interface PartyOpsSettingValueMap {
  debugEnabled: boolean;
  lootScarcity: LootScarcity;
  restAutomationEnabled: boolean;
  marchingOrderLockPlayers: boolean;
}

export type PartyOpsSettingKey = keyof PartyOpsSettingValueMap;

export type OnSettingsChanged = <K extends PartyOpsSettingKey>(
  key: K,
  value: PartyOpsSettingValueMap[K]
) => void;

export function registerPartyOpsSettings(onSettingsChanged: OnSettingsChanged): void {
  game.settings.register(PARTY_OPS_MODULE_ID, PARTY_OPS_SETTING_KEYS.debugEnabled, {
    name: "Enable Debug Logging",
    hint: "Turn on verbose Party Operations debug output for troubleshooting.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      onSettingsChanged("debugEnabled", Boolean(value));
    }
  });

  game.settings.register(PARTY_OPS_MODULE_ID, PARTY_OPS_SETTING_KEYS.lootScarcity, {
    name: "Loot Scarcity",
    hint: "Set overall loot availability used by Party Operations loot systems.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      abundant: "Abundant",
      normal: "Normal",
      scarce: "Scarce"
    },
    default: "normal",
    onChange: (value: unknown) => {
      const raw = String(value ?? "normal").trim().toLowerCase();
      const normalized: LootScarcity = raw === "abundant" || raw === "scarce" ? raw : "normal";
      onSettingsChanged("lootScarcity", normalized);
    }
  });

  game.settings.register(PARTY_OPS_MODULE_ID, PARTY_OPS_SETTING_KEYS.restAutomationEnabled, {
    name: "Enable Rest Automation",
    hint: "Allow Party Operations to automate supported rest workflows.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value: unknown) => {
      onSettingsChanged("restAutomationEnabled", Boolean(value));
    }
  });

  game.settings.register(PARTY_OPS_MODULE_ID, PARTY_OPS_SETTING_KEYS.marchingOrderLockPlayers, {
    name: "Lock Marching Order For Players",
    hint: "Prevent non-GM players from changing marching order positions.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value: unknown) => {
      onSettingsChanged("marchingOrderLockPlayers", Boolean(value));
    }
  });
}

export function getSetting<K extends PartyOpsSettingKey>(key: K): PartyOpsSettingValueMap[K] {
  return game.settings.get(PARTY_OPS_MODULE_ID, key) as PartyOpsSettingValueMap[K];
}

export async function setSetting<K extends PartyOpsSettingKey>(
  key: K,
  value: PartyOpsSettingValueMap[K]
): Promise<PartyOpsSettingValueMap[K]> {
  await game.settings.set(PARTY_OPS_MODULE_ID, key, value);
  return value;
}
