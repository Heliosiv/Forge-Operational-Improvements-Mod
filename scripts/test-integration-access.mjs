import assert from "node:assert/strict";

import { createIntegrationAccess } from "./core/integration-access.js";

const settingsState = {
  integrationMode: "auto"
};
const modules = new Map();

const mockSettings = {
  get(moduleId, key) {
    assert.equal(moduleId, "party-operations");
    return settingsState[key];
  }
};

const integration = createIntegrationAccess({
  moduleId: "party-operations",
  settings: mockSettings,
  settingKey: "integrationMode",
  gameRef: {
    modules: {
      get(id) {
        return modules.get(id);
      }
    }
  }
});

// AUTO mode, no DAE available → resolves to FLAGS
assert.equal(integration.getIntegrationModeSetting(), "auto");
assert.equal(integration.isDaeAvailable(), false);
assert.equal(integration.resolveIntegrationMode(), "flags");

// AUTO mode, DAE becomes available → resolves to DAE
modules.set("dae", { active: true });
assert.equal(integration.isDaeAvailable(), true);
assert.equal(integration.resolveIntegrationMode(), "dae");

// Explicit OFF setting
settingsState.integrationMode = "off";
assert.equal(integration.getIntegrationModeSetting(), "off");
assert.equal(integration.resolveIntegrationMode(), "off");

// Explicit FLAGS setting
settingsState.integrationMode = "flags";
assert.equal(integration.resolveIntegrationMode(), "flags");

// Explicit DAE setting (even with DAE module inactive)
settingsState.integrationMode = "dae";
modules.set("dae", { active: false });
assert.equal(integration.resolveIntegrationMode(), "dae");

// Invalid setting value falls back to AUTO, then resolves via module availability
settingsState.integrationMode = "invalid";
assert.equal(integration.getIntegrationModeSetting(), "auto");
// DAE module is inactive → AUTO resolves to FLAGS
assert.equal(integration.resolveIntegrationMode(), "flags");

process.stdout.write("integration access validation passed\n");
