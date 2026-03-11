import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(repoRoot, "scripts", "party-operations.js");
const source = await readFile(sourcePath, "utf8");

function expect(pattern, message) {
  assert.match(source, pattern, message);
}

expect(
  /function buildSidebarLauncherAudioMarkup\(\)\s*\{[\s\S]*?<div class="po-sidebar-launcher-audio-title">Audio Deck<\/div>/,
  "Sidebar launcher audio markup should render the Audio Deck title."
);

expect(
  /data-action="launcher-audio-play"[\s\S]*?<i class="fas fa-play"><\/i><span>Play<\/span>/,
  "Sidebar launcher audio markup should render the Play control."
);

expect(
  /data-action="launcher-audio-next"[\s\S]*?<i class="fas fa-step-forward"><\/i><span>Next<\/span>/,
  "Sidebar launcher audio markup should render the Next control with the step-forward icon."
);

expect(
  /data-action="launcher-audio-stop"[\s\S]*?<i class="fas fa-stop"><\/i><span>Stop<\/span>/,
  "Sidebar launcher audio markup should render the Stop control."
);

expect(
  /<section class="po-sidebar-launcher-audio" data-po-sidebar-launcher-audio><\/section>/,
  "Sidebar launcher shell should include the audio deck section placeholder."
);

expect(
  /if \(command === "launcher-audio-play"\) \{[\s\S]*?\} else if \(command === "launcher-audio-next"\) \{\s*await playNextAudioMixTrack\(\);\s*\} else if \(command === "launcher-audio-stop"\) \{\s*await stopAudioMixPlayback\(\);\s*\}/,
  "Launcher transport actions should route Play, Next, and Stop commands to the managed audio handlers."
);

expect(
  /if \(action === "launcher-audio-play" \|\| action === "launcher-audio-next" \|\| action === "launcher-audio-stop"\) \{[\s\S]*?void handleLauncherAudioTransportAction\(action\);/,
  "Launcher action handling should delegate audio transport actions."
);

process.stdout.write("audio launcher controls validation passed\n");
