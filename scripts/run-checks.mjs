import { spawn } from "node:child_process";

const CHECK_COMMANDS = [
  [process.execPath, ["scripts/validate-module.mjs"]],
  [process.execPath, ["scripts/validate-governance.mjs"]],
  [process.execPath, ["scripts/test-app-refresh.mjs"]],
  [process.execPath, ["scripts/test-app-window-position-manager.mjs"]],
  [process.execPath, ["scripts/test-audio-launcher-controls.mjs"]],
  [process.execPath, ["scripts/test-audio-catalog-compat.mjs"]],
  [process.execPath, ["scripts/test-audio-library-catalog-signature.mjs"]],
  [process.execPath, ["scripts/test-audio-library-scan-cache.mjs"]],
  [process.execPath, ["scripts/test-audio-library-ui-draft-actions.mjs"]],
  [process.execPath, ["scripts/test-audio-library-ui-filter-actions.mjs"]],
  [process.execPath, ["scripts/test-audio-library-ui-picker-upload-actions.mjs"]],
  [process.execPath, ["scripts/test-audio-library-ui-selection-actions.mjs"]],
  [process.execPath, ["scripts/test-audio-store-shared-cache.mjs"]],
  [process.execPath, ["scripts/test-audio-playback-persistence.mjs"]],
  [process.execPath, ["scripts/test-audio-mix-preset-autosave.mjs"]],
  [process.execPath, ["scripts/test-audio-preset-manager.mjs"]],
  [process.execPath, ["scripts/test-bootstrap-lifecycle.mjs"]],
  [process.execPath, ["scripts/test-bootstrap-runtime.mjs"]],
  [process.execPath, ["scripts/test-bootstrap-config.mjs"]],
  [process.execPath, ["scripts/test-config-access.mjs"]],
  [process.execPath, ["scripts/test-deep-design-corrections.mjs"]],
  [process.execPath, ["scripts/test-downtime-policy.mjs"]],
  [process.execPath, ["scripts/test-downtime-v2-service.mjs"]],
  [process.execPath, ["scripts/test-downtime-phase1-service.mjs"]],
  [process.execPath, ["scripts/test-downtime-submission-ui.mjs"]],
  [process.execPath, ["scripts/test-downtime-effects-ledger.mjs"]],
  [process.execPath, ["scripts/test-downtime-ui-draft-storage.mjs"]],
  [process.execPath, ["scripts/test-gather-history-view.mjs"]],
  [process.execPath, ["scripts/test-gather-settings.mjs"]],
  [process.execPath, ["scripts/test-gm-downtime-view.mjs"]],
  [process.execPath, ["scripts/test-gm-quick-weather-draft.mjs"]],
  [process.execPath, ["scripts/test-integration-access.mjs"]],
  [process.execPath, ["scripts/test-launcher-state.mjs"]],
  [process.execPath, ["scripts/test-legacy-source-map.mjs"]],
  [process.execPath, ["scripts/test-main-tab-registry.mjs"]],
  [process.execPath, ["scripts/test-main-tab-navigation.mjs"]],
  [process.execPath, ["scripts/test-module-api.mjs"]],
  [process.execPath, ["scripts/test-note-draft-cache.mjs"]],
  [process.execPath, ["scripts/test-perf.mjs"]],
  [process.execPath, ["scripts/test-permission-split.mjs"]],
  [process.execPath, ["scripts/test-player-ui-overrides.mjs"]],
  [process.execPath, ["scripts/test-player-hub-actions.mjs"]],
  [process.execPath, ["scripts/test-player-request-handlers.mjs"]],
  [process.execPath, ["scripts/test-operations-player-handlers.mjs"]],
  [process.execPath, ["scripts/test-reputation-draft-storage.mjs"]],
  [process.execPath, ["scripts/test-settings-access.mjs"]],
  [process.execPath, ["scripts/test-sync-effects-session-state.mjs"]],
  [process.execPath, ["scripts/test-template-loader.mjs"]],
  [process.execPath, ["scripts/test-socket-gm-requester-routes.mjs"]],
  [process.execPath, ["scripts/test-socket-route-deps.mjs"]],
  [process.execPath, ["scripts/test-calendar-bridge.mjs"]],
  [process.execPath, ["scripts/test-loot-ammo-cr-frequency.mjs"]],
  [process.execPath, ["scripts/test-module-entry.mjs"]],
  [process.execPath, ["scripts/test-runtime-hooks.mjs"]],
  [process.execPath, ["scripts/test-ui-hooks.mjs"]],
  [process.execPath, ["scripts/test-settings-bootstrap.mjs"]],
  [process.execPath, ["scripts/test-settings-registration.mjs"]],
  [process.execPath, ["scripts/test-settings-ui.mjs"]],
  [process.execPath, ["scripts/test-weather-preset-helpers.mjs"]],
  [process.execPath, ["scripts/test-window-position-profiles.mjs"]],
  [process.execPath, ["scripts/test-merchant-ui-state.mjs"]],
  [process.execPath, ["scripts/test-merchant-domain.mjs"]],
  [process.execPath, ["scripts/test-loot-board-ready-bundle.mjs"]],
  [process.execPath, ["scripts/test-loot-ui-state.mjs"]],
  [process.execPath, ["scripts/test-loot-budget.mjs"]],
  [process.execPath, ["scripts/test-loot-budget-source-policy.mjs"]],
  [process.execPath, ["scripts/test-loot-compendium-manifest-source.mjs"]],
  [process.execPath, ["scripts/test-loot-item-count.mjs"]],
  [process.execPath, ["scripts/test-loot-item-candidate-sources.mjs"]],
  [process.execPath, ["scripts/test-loot-item-overrides.mjs"]],
  [process.execPath, ["scripts/test-loot-picker-item-cap.mjs"]],
  [process.execPath, ["scripts/test-loot-preview-display.mjs"]],
  [process.execPath, ["scripts/test-loot-preview-draft-storage.mjs"]],
  [process.execPath, ["scripts/test-loot-rarity-caps.mjs"]],
  [process.execPath, ["scripts/test-loot-variable-treasure.mjs"]],
  [process.execPath, ["scripts/test-loot-selection-intelligence.mjs"]],
  [process.execPath, ["scripts/test-loot-selection-cohesion.mjs"]],
  [process.execPath, ["scripts/test-loot-horde-major-bias.mjs"]],
  [process.execPath, ["scripts/test-loot-valuables-allocation.mjs"]],
  [process.execPath, ["scripts/test-loot-horde-budget-reconciliation.mjs"]],
  [process.execPath, ["scripts/test-loot-budget-corrective-picks.mjs"]],
  [process.execPath, ["scripts/test-loot-entry-stacking.mjs"]],
  [process.execPath, ["scripts/test-loot-recent-rolls-cache.mjs"]],
  [process.execPath, ["scripts/test-navigation-ui-state.mjs"]],
  [process.execPath, ["scripts/test-operations-journal.mjs"]],
  [process.execPath, ["scripts/test-operations-journal-service.mjs"]],
  [process.execPath, ["scripts/test-operations-journal-settings.mjs"]],
  [process.execPath, ["scripts/test-rest-feature.mjs"]],
  [process.execPath, ["scripts/test-rest-watch-summary.mjs"]],
  [process.execPath, ["scripts/test-march-feature.mjs"]],
  [process.execPath, ["scripts/test-march-doctrine.mjs"]],
  [process.execPath, ["scripts/test-socket-routes.mjs"]]
];

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `Command failed: ${command} ${args.join(" ")}${signal ? ` (signal: ${signal})` : ` (exit code: ${code ?? "unknown"})`}`
        )
      );
    });
  });
}

for (const [command, args] of CHECK_COMMANDS) {
  await runCommand(command, args);
}

process.stdout.write(`all checks passed (${CHECK_COMMANDS.length} commands)\n`);
