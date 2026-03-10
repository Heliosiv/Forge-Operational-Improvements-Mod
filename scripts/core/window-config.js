export const LAUNCHER_PLACEMENTS = Object.freeze({
  FLOATING: "floating",
  SIDEBAR: "sidebar",
  BOTH: "both"
});

export const PLAYER_HUB_MODES = Object.freeze({
  SIMPLE: "simple",
  ADVANCED: "advanced"
});

export const PLAYER_HUB_ACTION_TYPES = Object.freeze({
  ASSIGN_WATCH: "assignWatch",
  SET_MARCH_RANK: "setMarchRank",
  CLAIM_LOOT: "claimLoot",
  SUBMIT_DOWNTIME: "submitDowntime"
});

export const PLAYER_HUB_CLAIM_VARIANTS = Object.freeze({
  ITEM: "item",
  CURRENCY: "currency"
});

export const REFRESH_SCOPE_KEYS = Object.freeze({
  REST: "rest",
  MARCH: "march",
  OPERATIONS: "operations",
  LOOT: "loot",
  INJURY: "injury",
  SETTINGS: "settings"
});

export const PARTY_OPS_REFRESHABLE_WINDOW_IDS = Object.freeze([
  "rest-watch-app",
  "marching-order-app",
  "rest-watch-player-app",
  "party-operations-global-modifier-summary",
  "party-operations-gm-environment-page",
  "party-operations-gm-downtime-page",
  "party-operations-gm-merchants-page",
  "party-operations-gm-audio-page",
  "party-operations-gm-loot-page",
  "party-operations-gm-loot-claims-board"
]);

export const REFRESH_SCOPE_TO_WINDOW_IDS = Object.freeze({
  [REFRESH_SCOPE_KEYS.REST]: Object.freeze([
    "rest-watch-app",
    "rest-watch-player-app"
  ]),
  [REFRESH_SCOPE_KEYS.MARCH]: Object.freeze([
    "marching-order-app",
    "rest-watch-player-app"
  ]),
  [REFRESH_SCOPE_KEYS.OPERATIONS]: Object.freeze([
    "rest-watch-app",
    "rest-watch-player-app",
    "party-operations-global-modifier-summary",
    "party-operations-gm-environment-page",
    "party-operations-gm-downtime-page",
    "party-operations-gm-merchants-page",
    "party-operations-gm-audio-page",
    "party-operations-gm-loot-page",
    "party-operations-gm-loot-claims-board"
  ]),
  [REFRESH_SCOPE_KEYS.LOOT]: Object.freeze([
    "rest-watch-app",
    "party-operations-gm-audio-page",
    "party-operations-gm-loot-page",
    "party-operations-gm-loot-claims-board"
  ]),
  [REFRESH_SCOPE_KEYS.INJURY]: Object.freeze([
    "rest-watch-app"
  ]),
  [REFRESH_SCOPE_KEYS.SETTINGS]: PARTY_OPS_REFRESHABLE_WINDOW_IDS
});

export const PO_TEMPLATE_MAP = Object.freeze({
  "rest-watch": "modules/party-operations/templates/rest-watch.hbs",
  "rest-watch-player": "modules/party-operations/templates/rest-watch-player.hbs",
  "marching-order": "modules/party-operations/templates/marching-order.hbs",
  "global-modifiers": "modules/party-operations/templates/global-modifiers.hbs",
  "gm-environment": "modules/party-operations/templates/gm-environment.hbs",
  "gm-downtime": "modules/party-operations/templates/gm-downtime.hbs",
  "gm-merchants": "modules/party-operations/templates/gm-merchants.hbs",
  "gm-audio": "modules/party-operations/templates/gm-audio.hbs",
  "gm-loot": "modules/party-operations/templates/gm-loot.hbs",
  "gm-loot-claims-board": "modules/party-operations/templates/gm-loot-claims-board.hbs",
  "settings-hub": "modules/party-operations/templates/settings-hub.hbs",
  "merchant-shop": "modules/party-operations/templates/merchant-shop.hbs",
  "party-operations-app": "modules/party-operations/templates/party-operations-app.hbs"
});

export const LAUNCHER_RECOVERY_DELAYS_MS = Object.freeze([120, 500, 1400, 3200]);
