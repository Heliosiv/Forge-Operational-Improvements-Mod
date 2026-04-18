import assert from "node:assert/strict";

import { createIntegrationAccess } from "./core/integration-access.js";

const settingsState = {
  integrationMode: "auto"
};
const modules = new Map();

const integration = createIntegrationAccess({
  moduleId: "party-operations",
  settings: {
    INTEGRATION_MODE: "integrationMode"
  },
  integrationModes: {
    AUTO: "auto",
    OFF: "off",
    FLAGS: "flags",
    DAE: "dae"
  },
  gameRef: {
    settings: {
      get(moduleId, key) {
        assert.equal(moduleId, "party-operations");
        return settingsState[key];
      }
    },
    modules: {
      get(id) {
        return modules.get(id);
      }
    }
  }
});

assert.equal(integration.getIntegrationModeSetting(), "auto");
assert.equal(integration.isDaeAvailable(), false);
assert.equal(integration.resolveIntegrationMode(), "flags");

modules.set("dae", { active: true });
assert.equal(integration.isDaeAvailable(), true);
assert.equal(integration.resolveIntegrationMode(), "dae");

settingsState.integrationMode = "off";
assert.equal(integration.resolveIntegrationMode(), "off");
settingsState.integrationMode = "flags";
assert.equal(integration.resolveIntegrationMode(), "flags");
settingsState.integrationMode = "dae";
modules.set("dae", { active: false });
assert.equal(integration.resolveIntegrationMode(), "flags");

process.stdout.write("integration access validation passed\n");
