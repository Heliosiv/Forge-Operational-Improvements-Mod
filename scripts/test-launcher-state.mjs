import assert from "node:assert/strict";

import { createLauncherStateAccess } from "./core/launcher-state.js";

let controller = null;

const stateAccess = createLauncherStateAccess({
  resolveController: () => controller,
  launcherPlacements: {
    FLOATING: "floating",
    SIDEBAR: "sidebar",
    BOTH: "both"
  }
});

assert.equal(stateAccess.getLauncherPlacement(), "floating");
assert.equal(stateAccess.isFloatingLauncherLocked(), false);
assert.equal(stateAccess.resetFloatingLauncherPosition(), false);

controller = {
  getLauncherPlacement: () => "both",
  isFloatingLauncherLocked: () => true,
  resetFloatingLauncherPosition: () => "reset"
};

assert.equal(stateAccess.getLauncherPlacement(), "both");
assert.equal(stateAccess.isFloatingLauncherLocked(), true);
assert.equal(stateAccess.resetFloatingLauncherPosition(), "reset");

process.stdout.write("launcher state validation passed\n");
