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
  const weatherUiSource = readFileSync("scripts/features/weather-ui.js", "utf8");
  const partyOperationsSource = readFileSync("scripts/party-operations.js", "utf8");

  for (const requiredText of [
    "Weather",
    "Roll And Log Weather",
    "Climate",
    "Terrain",
    "Map PNG Terrain Import",
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
    "Weather Climate Maker"
  ]) {
    assert.ok(!gmWeatherTemplate.includes(removedText), `GM weather page should not include ${removedText}.`);
  }

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
    "gm-environment-page-back"
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
