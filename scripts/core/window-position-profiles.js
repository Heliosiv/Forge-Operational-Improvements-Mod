const NEAR_FULLSCREEN_WINDOW_PROFILE = Object.freeze({
  width: 1520,
  height: 900,
  minWidth: 860,
  minHeight: 600,
  maxWidthRatio: 0.94,
  maxHeightRatio: 0.9
});

const MAIN_OPERATIONS_WINDOW_PROFILE = Object.freeze({
  width: 1560,
  height: 900,
  minWidth: 980,
  minHeight: 600,
  maxWidthRatio: 0.96,
  maxHeightRatio: 0.9
});

export const APP_WINDOW_SIZE_PROFILES = Object.freeze({
  default: NEAR_FULLSCREEN_WINDOW_PROFILE,
  "rest-watch": MAIN_OPERATIONS_WINDOW_PROFILE,
  "operations-shell": MAIN_OPERATIONS_WINDOW_PROFILE,
  "rest-watch-player": NEAR_FULLSCREEN_WINDOW_PROFILE,
  "marching-order": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-factions": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-weather": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-downtime": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-merchants": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-audio": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-loot": MAIN_OPERATIONS_WINDOW_PROFILE,
  "gm-loot-claims-board": MAIN_OPERATIONS_WINDOW_PROFILE
});

export const APP_WINDOW_PROFILE_BY_ID = Object.freeze({
  "rest-watch-app": "rest-watch",
  "operations-shell-app": "operations-shell",
  "rest-watch-player-app": "rest-watch-player",
  "marching-order-app": "marching-order",
  "party-operations-gm-factions-page": "gm-factions",
  "party-operations-gm-weather-page": "gm-weather",
  "party-operations-gm-downtime-page": "gm-downtime",
  "party-operations-gm-merchants-page": "gm-merchants",
  "party-operations-gm-audio-page": "gm-audio",
  "party-operations-gm-loot-page": "gm-loot",
  "party-operations-gm-loot-claims-board": "gm-loot-claims-board"
});

export const APP_WINDOW_POSITION_STORAGE_KEYS = Object.freeze({
  "rest-watch": "main-ops",
  "operations-shell": "main-ops",
  "marching-order": "main-ops",
  "gm-factions": "main-ops",
  "gm-weather": "main-ops",
  "gm-downtime": "main-ops",
  "gm-merchants": "main-ops",
  "gm-audio": "main-ops",
  "gm-loot": "main-ops",
  "rest-watch-player": "rest-watch-player",
  "gm-loot-claims-board": "gm-loot-claims-board"
});
