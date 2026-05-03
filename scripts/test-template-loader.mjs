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
  const gmMerchantsTemplate = readFileSync("templates/gm-merchants.hbs", "utf8");
  const merchantShopTemplate = readFileSync("templates/merchant-shop.hbs", "utf8");
  const pageActionHelpersSource = readFileSync("scripts/features/page-action-helpers.js", "utf8");
  const settingsHubSource = readFileSync("scripts/core/settings-hub.js", "utf8");
  const settingsHubTemplate = readFileSync("templates/settings-hub.hbs", "utf8");
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
    /await app\.close\?\.\(\);[\s\S]*returnTarget = \{ type: "gm-panel", panel: normalizePanelKey\(currentPanelKey\) \};[\s\S]*openPanelByKey\(panelKey,\s*renderOptions\)/,
    "GM panel tab switching should close the current sibling page before opening another panel."
  );
  assert.ok(
    settingsHubTemplate.includes('data-action="return-from-settings-hub"'),
    "Settings hub should expose a Back action."
  );
  assert.ok(
    settingsHubSource.includes("openSettingsHubReturnTarget(target)"),
    "Settings hub Back action should delegate to the supplied return handler."
  );
  assert.ok(
    partyOperationsSource.includes("buildSettingsHubReturnTargetForRestWatchApp(this)"),
    "Settings hub opens from the main shell should capture the current screen as a return target."
  );
  assert.ok(!gmPanelNavPartial.includes("po-gm-nav-more"), "GM workspace nav should not hide panels behind More.");
  assert.ok(!gmPanelNavPartial.includes("<details"), "GM workspace nav should keep panels as direct buttons.");
  assert.ok(gmPanelNavPartial.includes('data-panel="faction"'), "GM workspace nav should expose Reputation directly.");
  assert.ok(gmPanelNavPartial.includes('data-panel="settings"'), "GM workspace nav should expose Settings directly.");
  assert.ok(
    !gmMerchantsTemplate.includes(">Live Shop</button>"),
    "GM merchants should not expose a separate redundant Live Shop tab."
  );
  assert.ok(
    gmMerchantsTemplate.includes("po-merchant-definition-list"),
    "Configured merchants should render as compact rows instead of tall collapsible cards."
  );
  assert.ok(
    !gmMerchantsTemplate.includes('<details class="po-op-role-row po-merchant-definition-card'),
    "Configured merchant rows should not require expanding each merchant card."
  );
  assert.ok(
    gmMerchantsTemplate.includes('data-action="merchant-refresh-stock" data-merchant-id="{{id}}"'),
    "Configured merchant rows should expose per-merchant stock refresh."
  );
  assert.ok(
    gmMerchantsTemplate.includes(
      'data-action="merchant-shop-bell" title="Ring dinner bell for the current live shop list"'
    ),
    "Configured merchant rows should expose the dinner bell action."
  );
  assert.ok(
    !gmMerchantsTemplate.includes('data-action="merchant-toggle-shop-tradable"'),
    "Configured merchant rows should not expose a second shop on/off button beside live availability."
  );
  assert.ok(
    gmMerchantsTemplate.includes("{{#if availableNow}}Show On{{else}}Show Off{{/if}}"),
    "Configured merchant rows should collapse live availability into one Show On/Show Off button."
  );
  assert.match(
    partyOperationsSource,
    /function findExistingMerchantActor\(merchant = \{\}\)[\s\S]*?getMerchantLinkedActorIds\(merchant\)[\s\S]*?getMerchantActorFlagMerchantId\(actor\) === merchantId[\s\S]*?getMerchantStockActorName\(merchant\)/,
    "Merchant stock refresh should reuse a linked, flagged, or same-name stock actor before creating a new one."
  );
  assert.match(
    partyOperationsSource,
    /async function openMerchantShopById[\s\S]*await ensureMerchantActor\(merchant, \{ skipLedgerUpdate: !canAccessGmPage\(\) \}\)[\s\S]*async function openMerchantActorFromElement[\s\S]*await ensureMerchantActor\(merchant\)/,
    "Merchant shop and actor open actions should recover stale merchant actor links through the shared actor resolver."
  );
  assert.doesNotMatch(
    partyOperationsSource,
    /const existing = merchant\.actorId \? game\.actors\.get\(String\(merchant\.actorId \?\? ""\)\) : null;/,
    "Merchant actor resolution should not only trust the stored actorId before creating a replacement actor."
  );
  assert.doesNotMatch(
    partyOperationsSource,
    /merchantActor = merchant\??\.actorId \? game\.actors\.get/,
    "Merchant display and open paths should not read only merchant.actorId when resolving stock actors."
  );
  assert.doesNotMatch(
    partyOperationsSource,
    /hasMerchantActor = Boolean\(merchant\.actorId && game\.actors\.get/,
    "Merchant shop availability should not disable open actions from stale merchant.actorId checks."
  );
  assert.match(
    partyOperationsSource,
    /async function upsertMerchant[\s\S]*const resolvedMerchantActorId = findExistingMerchantActor\(normalized\)\?\.id \?\? normalized\.actorId[\s\S]*normalizeMerchantStockStateEntry/,
    "Merchant edits should preserve stock state through the shared actor resolver when actor links are stale."
  );
  assert.match(
    partyOperationsSource,
    /async function syncMerchantActorLink[\s\S]*currentName\.startsWith\("Merchant Stock:"\)[\s\S]*actorUpdates\.name = nextName[\s\S]*await actor\.update\(actorUpdates\)/,
    "Merchant stock actor links should keep module-owned stock actor identity aligned with renamed merchants."
  );
  assert.ok(
    merchantShopTemplate.includes('data-merchant-search="buy"') &&
      merchantShopTemplate.includes('data-merchant-search="sell"') &&
      merchantShopTemplate.includes('data-merchant-sort="buy"') &&
      merchantShopTemplate.includes('data-merchant-sort="sell"'),
    "Merchant shop should expose search and sort controls for both buy and sell tables."
  );
  assert.ok(
    merchantShopTemplate.includes("data-merchant-currency-tender") &&
      merchantShopTemplate.includes("data-merchant-buy-target") &&
      merchantShopTemplate.includes("data-merchant-fill-tender-balance") &&
      merchantShopTemplate.includes("data-merchant-clear-tender"),
    "Merchant shop should support coin tender, quick tender balancing, and a bought-item destination."
  );
  assert.match(
    partyOperationsSource,
    /currencyTenderCp[\s\S]*actorCurrencyDebitCp[\s\S]*transferItemBetweenActors\(merchantActor, buyTargetActor/,
    "Merchant finalization should deduct coin tender and deliver bought items to the selected destination."
  );
  assert.match(
    partyOperationsSource,
    /actorCurrencyCp[\s\S]*readMerchantTradeCurrencyTenderFromRoot[\s\S]*setMerchantTradeCurrencyTenderFromCp/,
    "Merchant trade dialog should track actor funds and use shared helpers for quick coin tender balancing."
  );
  assert.match(
    partyOperationsSource,
    /maximumApplicableTenderCp[\s\S]*Coin tender exceeds the remaining balance[\s\S]*setMerchantTradeCurrencyTenderFromCp[\s\S]*row\.dataset\.sortUnitCp = String\(unitCp\)/,
    "Merchant trade should reject excess coin tender, offer quick tender balancing, and keep sortable unit prices aligned with repricing."
  );

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
