import assert from "node:assert/strict";

import {
  APP_WINDOW_POSITION_STORAGE_KEYS,
  APP_WINDOW_PROFILE_BY_ID,
  APP_WINDOW_SIZE_PROFILES
} from "./core/window-position-profiles.js";

assert.equal(APP_WINDOW_PROFILE_BY_ID["operations-shell-app"], "operations-shell");
assert.equal(APP_WINDOW_PROFILE_BY_ID["party-operations-gm-loot-page"], "gm-loot");
assert.equal(APP_WINDOW_POSITION_STORAGE_KEYS["operations-shell"], "main-ops");
assert.equal(APP_WINDOW_POSITION_STORAGE_KEYS["rest-watch-player"], "rest-watch-player");
assert.deepEqual(APP_WINDOW_SIZE_PROFILES.default, {
  width: 1520,
  height: 900,
  minWidth: 860,
  minHeight: 600,
  maxWidthRatio: 0.94,
  maxHeightRatio: 0.9
});
assert.deepEqual(APP_WINDOW_SIZE_PROFILES["operations-shell"], {
  width: 1560,
  height: 900,
  minWidth: 980,
  minHeight: 600,
  maxWidthRatio: 0.96,
  maxHeightRatio: 0.9
});
assert.equal(APP_WINDOW_SIZE_PROFILES["gm-loot"], APP_WINDOW_SIZE_PROFILES["operations-shell"]);
assert.equal(APP_WINDOW_SIZE_PROFILES["rest-watch-player"], APP_WINDOW_SIZE_PROFILES.default);

process.stdout.write("window position profiles validation passed\n");
