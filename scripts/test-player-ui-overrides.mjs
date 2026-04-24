import assert from "node:assert/strict";

import { createPlayerUiOverrideTools } from "./core/player-ui-overrides.js";

const stored = new Map();
const tools = createPlayerUiOverrideTools({
  gameRef: {
    user: { id: "player-1", isGM: false },
    settings: {
      get: (_moduleId, key) => ({ fromWorld: key })
    }
  },
  moduleId: "party-operations",
  readSessionStorageJson: (key, fallback) => stored.get(key) ?? fallback,
  writeSessionStorageJson: (key, value) => stored.set(key, value),
  deepClone: (value) => structuredClone(value),
  canAccessAllPlayerOps: () => false,
  hasActiveGmClient: () => false,
  overrideSettingKeys: new Set(["restState"])
});

assert.equal(
  tools.canUsePlayerUiLocalOverride("restState", { id: "player-1", isGM: false }),
  true,
  "approved player-facing settings should support local fallback without shared GM permissions"
);
assert.equal(
  tools.canUsePlayerUiLocalOverride("gmOnlyState", { id: "player-1", isGM: false }),
  false,
  "unapproved settings must not use player local fallback"
);
assert.equal(
  tools.canUsePlayerUiLocalOverride("restState", { id: "gm-1", isGM: true }),
  false,
  "GMs should not use player local fallback"
);

assert.equal(tools.setPlayerUiLocalSettingOverride("restState", { slots: ["watch-1"] }), true);
assert.deepEqual(tools.getModuleSettingWithPlayerUiOverride("restState"), { slots: ["watch-1"] });
assert.deepEqual(tools.getModuleSettingWithPlayerUiOverride("marchState"), { fromWorld: "marchState" });

process.stdout.write("player UI overrides validation passed\n");
