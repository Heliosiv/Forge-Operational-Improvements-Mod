import assert from "node:assert/strict";

import { createAppWindowPositionManager } from "./core/window-position-manager.js";

function normalizeWindowStateLike(state) {
  if (!state || typeof state !== "object") return null;
  const left = Number(state.left);
  const top = Number(state.top);
  const width = Number(state.width);
  const height = Number(state.height);
  if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height))
    return null;
  if (width < 120 || height < 120) return null;
  return { left, top, width, height };
}

function areWindowStatesEquivalent(leftState, rightState, options = {}) {
  const left = normalizeWindowStateLike(leftState);
  const right = normalizeWindowStateLike(rightState);
  if (!left || !right) return false;
  const tolerance = Math.max(0.5, Number(options.tolerance ?? 1.25));
  return (
    Math.abs(left.left - right.left) <= tolerance &&
    Math.abs(left.top - right.top) <= tolerance &&
    Math.abs(left.width - right.width) <= tolerance &&
    Math.abs(left.height - right.height) <= tolerance
  );
}

function mergeObject(target, source) {
  return {
    ...target,
    ...source,
    position: {
      ...(target?.position ?? {}),
      ...(source?.position ?? {})
    }
  };
}

{
  let storedWindowPositions = {
    "main-ops": { left: 24, top: 30, width: 880, height: 640 }
  };
  const settingsWrites = [];
  const scheduledTimers = [];
  const clearedTimers = [];
  const pendingPersistTimers = new Map();

  const manager = createAppWindowPositionManager({
    moduleId: "party-operations",
    appWindowPositionsSettingKey: "appWindowPositions",
    normalizeWindowStateLike,
    areWindowStatesEquivalent,
    captureWindowState: (app) => normalizeWindowStateLike(app?.position),
    gameInstance: {
      settings: {
        get: () => storedWindowPositions,
        set: async (_moduleId, _key, value) => {
          settingsWrites.push(value);
          storedWindowPositions = value;
        }
      }
    },
    foundryInstance: {
      utils: {
        mergeObject
      }
    },
    globalObject: {
      window: {
        innerWidth: 1000,
        innerHeight: 700
      },
      setTimeout: (callback, delay) => {
        const timer = { callback, delay };
        scheduledTimers.push(timer);
        return timer;
      },
      clearTimeout: (timer) => {
        clearedTimers.push(timer);
      }
    },
    pendingPersistTimers
  });

  assert.equal(manager.normalizeWindowProfileId("gm-loot"), "gm-loot");
  assert.equal(manager.normalizeWindowProfileId({ options: { id: "operations-shell-app" } }), "operations-shell");

  const responsivePosition = manager.getResponsiveWindowPosition("operations-shell", {
    left: 980,
    top: 690
  });
  assert.deepEqual(responsivePosition, {
    width: 980,
    height: 630,
    left: 12,
    top: 62
  });

  const responsiveOptions = manager.getResponsiveWindowOptions("operations-shell", {
    classes: ["sheet"],
    position: { left: 999 }
  });
  assert.deepEqual(responsiveOptions, {
    classes: ["sheet"],
    position: {
      width: 980,
      height: 630,
      left: 12,
      top: 30
    }
  });

  manager.queuePersistRememberedWindowState(
    "operations-shell",
    {
      left: 50,
      top: 60,
      width: 880,
      height: 620
    },
    { delayMs: 75 }
  );
  assert.equal(scheduledTimers.length, 1);
  assert.equal(scheduledTimers[0].delay, 75);
  assert.equal(pendingPersistTimers.size, 1);

  manager.queuePersistRememberedWindowState(
    "operations-shell",
    {
      left: 70,
      top: 80,
      width: 870,
      height: 610
    },
    { delayMs: 90 }
  );
  assert.equal(scheduledTimers.length, 2);
  assert.deepEqual(clearedTimers, [scheduledTimers[0]]);

  await scheduledTimers[1].callback();
  await Promise.resolve();
  assert.equal(settingsWrites.length, 1);
  assert.deepEqual(settingsWrites[0], {
    "main-ops": {
      left: 70,
      top: 80,
      width: 870,
      height: 610
    }
  });
  assert.equal(pendingPersistTimers.size, 0);

  manager.queuePersistRememberedWindowState(
    "operations-shell",
    {
      left: 70.5,
      top: 80.25,
      width: 870.5,
      height: 610.5
    },
    { delayMs: 90 }
  );
  assert.equal(scheduledTimers.length, 2);

  class FakeApp {
    constructor() {
      this.options = { id: "operations-shell-app" };
      this.position = { left: 15, top: 20, width: 900, height: 650 };
      this.closeCalls = 0;
    }

    setPosition(position = {}) {
      this.position = { ...this.position, ...position };
      return this.position;
    }

    close(options = {}) {
      this.closeCalls += 1;
      return options;
    }
  }

  manager.installRememberedWindowPositionBehavior(FakeApp);
  const app = new FakeApp();
  const returnedPosition = app.setPosition({ left: 40, top: 55, width: 910, height: 640 });
  assert.deepEqual(returnedPosition, { left: 40, top: 55, width: 910, height: 640 });
  assert.equal(scheduledTimers.length, 3);
  await app.close({ force: true });
  await Promise.resolve();
  assert.equal(settingsWrites.length, 2);
  assert.deepEqual(settingsWrites[1], {
    "main-ops": {
      left: 40,
      top: 55,
      width: 910,
      height: 640
    }
  });
  assert.equal(app.closeCalls, 1);
}

process.stdout.write("app window position manager validation passed\n");
