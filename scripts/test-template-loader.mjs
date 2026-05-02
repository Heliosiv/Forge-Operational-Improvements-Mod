import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  PO_PARTIAL_TEMPLATE_PATHS,
  listPartyOperationsTemplatePaths,
  preloadPartyOperationsPartialTemplates,
  validatePartyOperationsTemplates
} from "./core/template-loader.js";

assert.ok(Array.isArray(PO_PARTIAL_TEMPLATE_PATHS));

{
  const paths = listPartyOperationsTemplatePaths({
    templateMap: { a: "path/a.hbs", b: "path/b.hbs" },
    partialTemplatePaths: ["path/a.hbs", "path/c.hbs"]
  });
  assert.deepEqual(paths, ["path/a.hbs", "path/b.hbs", "path/c.hbs"]);
}

{
  const loaded = [];
  await preloadPartyOperationsPartialTemplates({
    partialTemplatePaths: ["path/a.hbs", "path/b.hbs"],
    loadTemplatesFn(paths) {
      loaded.push(...paths);
    }
  });
  assert.deepEqual(loaded, ["path/a.hbs", "path/b.hbs"]);
}

{
  const resolved = [];
  const errors = [];
  await validatePartyOperationsTemplates({
    templateMap: { one: "path/a.hbs" },
    partialTemplatePaths: ["path/b.hbs"],
    async getTemplateFn(path) {
      resolved.push(path);
      if (path === "path/b.hbs") throw new Error("missing");
    },
    logUiDebug: () => {},
    logError: (...args) => errors.push(args)
  });
  assert.deepEqual(resolved, ["path/a.hbs", "path/b.hbs"]);
  assert.equal(errors.length, 1);
}

{
  const gmWeatherTemplate = readFileSync("templates/gm-weather.hbs", "utf8");
  const moduleManifest = JSON.parse(readFileSync("module.json", "utf8"));
  const gmPanelNavPartial = readFileSync("templates/partials/gm-panel-nav.hbs", "utf8");
  const weatherUiSource = readFileSync("scripts/features/weather-ui.js", "utf8");
  const pageActionHelpersSource = readFileSync("scripts/features/page-action-helpers.js", "utf8");
  const partyOperationsSource = readFileSync("scripts/party-operations.js", "utf8");

  assert.ok(gmPanelNavPartial.includes('role="tablist"'), "GM workspace nav should expose tablist semantics.");
  assert.ok(gmPanelNavPartial.includes('role="tab"'), "GM workspace nav buttons should expose tab semantics.");
  assert.ok(gmPanelNavPartial.includes("aria-selected"), "GM workspace nav should sync selected tab state.");
  assert.ok(
    !gmPanelNavPartial.trimStart().startsWith("{{#if isCockpit}}"),
    "GM workspace nav should render for every GM panel partial include, not only cockpit."
  );
  assert.ok(
    !moduleManifest.templates.includes("templates/party-operations-app.hbs"),
    "Dead legacy app template should not be preloaded by module.json."
  );
  assert.match(
    pageActionHelpersSource,
    /await app\.close\?\.\(\);[\s\S]*openPanelByKey\(panelKey,\s*\{\s*force:\s*true\s*\}\)/,
    "GM panel tab switching should close the current sibling page before opening another panel."
  );
  assert.ok(!gmPanelNavPartial.includes("po-gm-nav-more"), "GM workspace nav should not hide panels behind More.");
  assert.ok(!gmPanelNavPartial.includes("<details"), "GM workspace nav should keep panels as direct buttons.");
  assert.ok(gmPanelNavPartial.includes('data-panel="faction"'), "GM workspace nav should expose Reputation directly.");
  assert.ok(gmPanelNavPartial.includes('data-panel="settings"'), "GM workspace nav should expose Settings directly.");

  for (const requiredText of [
    "Weather",
    "Roll And Log Weather",
    "Save 7 Days To Calendar",
    "Current Location",
    "Moon And Season",
    "Moon Meaning",
    "Forecast",
    "History",
    "Open Archive"
  ]) {
    assert.ok(gmWeatherTemplate.includes(requiredText), `GM weather page should include ${requiredText}.`);
  }

  for (const removedText of [
    "Assigned Actors",
    "Outcome Summary",
    "Configure Library",
    "Weather Preset",
    "Preset Name",
    "Save Custom Preset",
    "Push Check",
    "Recent Check Results",
    "Environment Logs",
    "Weather Climate Maker",
    "Map PNG Terrain Import",
    "Terrain PNG",
    "Browse PNG",
    "Import PNG Terrain"
  ]) {
    assert.ok(!gmWeatherTemplate.includes(removedText), `GM weather page should not include ${removedText}.`);
  }

  for (const removedWeatherText of ["% illumination", "Travel speed", "Travel:"]) {
    assert.ok(
      !gmWeatherTemplate.includes(removedWeatherText),
      `GM weather page should not expose ${removedWeatherText}.`
    );
  }

  assert.ok(
    gmWeatherTemplate.includes('data-action="gm-weather-plot-week"'),
    "GM weather page should expose the week save action."
  );
  assert.ok(
    weatherUiSource.includes('"gm-weather-plot-week"'),
    "GM weather page app should handle the week save action."
  );

  for (const removedAction of [
    "gm-quick-weather-save-preset",
    "gm-quick-weather-delete-preset",
    "gm-quick-weather-select",
    "gm-quick-submit-weather",
    "set-environment-preset-field",
    "toggle-environment-actor",
    "request-environment-checks",
    "load-weather-log",
    "gm-calendar-weather-roll",
    "gm-environment-page-refresh",
    "gm-environment-page-back",
    "gm-weather-set-climate",
    "gm-weather-set-terrain",
    "gm-weather-clear-terrain",
    "gm-weather-set-terrain-image",
    "gm-weather-browse-terrain-image",
    "gm-weather-preview-terrain-image",
    "gm-weather-import-terrain-image",
    "gm-weather-toggle-auto-climate",
    "gm-weather-apply-suggested-climate"
  ]) {
    assert.ok(!gmWeatherTemplate.includes(removedAction), `GM weather page should not emit ${removedAction}.`);
    assert.ok(
      !weatherUiSource.includes(`"${removedAction}"`),
      `GM weather page app should not handle ${removedAction}.`
    );
  }

  const functionBody = (name) => {
    const start = partyOperationsSource.indexOf(`async function ${name}`);
    assert.ok(start >= 0, `Expected ${name} to exist.`);
    const nextAsyncFunction = partyOperationsSource.indexOf("\nasync function ", start + 1);
    const nextFunction = partyOperationsSource.indexOf("\nfunction ", start + 1);
    const candidates = [nextAsyncFunction, nextFunction].filter((index) => index > start);
    const end = candidates.length > 0 ? Math.min(...candidates) : partyOperationsSource.length;
    return partyOperationsSource.slice(start, end);
  };

  for (const weatherPersistenceFunction of [
    "persistCalendarWeatherRollMetadata",
    "persistWeatherJournalEntryId",
    "commitWeatherSnapshot",
    "removeWeatherLogById"
  ]) {
    const body = functionBody(weatherPersistenceFunction);
    assert.ok(
      !body.includes("ensureEnvironmentState") && !body.includes("environment.logs"),
      `${weatherPersistenceFunction} should write only operations.weather logs.`
    );
  }
}
