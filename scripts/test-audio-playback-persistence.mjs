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
  /async function syncManagedAudioMixPlaybackForCurrentUser\(options = \{\}\)\s*\{[\s\S]*?const allowAutostart = Boolean\(options\?\.allowAutostart\);[\s\S]*?return startLocalManagedAudioMixPlayback\(\{/,
  "Managed audio playback sync should restore local playback state and honor ready-time autostart."
);

expect(
  /function hideManagedAudioMixPlaylistUi\(root = document\)\s*\{\s*\/\/ Keep the managed playlist visible in Foundry's audio deck so deck controls\s*\/\/ remain the source of truth for playback\.\s*return root;\s*\}/,
  "Managed audio playlists should stay visible so the Foundry audio deck remains authoritative."
);

expect(
  /async function syncManagedAudioMixPlaybackForCurrentUser\(options = \{\}\)\s*\{[\s\S]*?const activeSound = playlist \? getManagedAudioMixPlayingSound\(playlist, mixState\.playlistSoundId\) : null;[\s\S]*?if \(!activeSound\) \{[\s\S]*?await stopLocalManagedAudioMixPlayback\(\{ fade: 0 \}\);[\s\S]*?await syncManagedAudioMixStateFromPlaylist\(playlist, \{[\s\S]*?refresh: options\?\.refresh === true[\s\S]*?\}\);[\s\S]*?return false;\s*\}/,
  "Playback sync should stop local audio and clear stale GM state when the playlist deck has no active sound."
);

expect(
  /async function autoStartManagedAudioMixFromSavedState\(\)\s*\{[\s\S]*?const queuedTrackIds = normalizeAudioMixPresetTrackIds\([\s\S]*?playAudioMixPresetById\(preset\.id, \{[\s\S]*?preferredTrackId: queuedTrackIds\[0\]/,
  "Ready-time audio autostart should restart the saved queue from the beginning."
);

expect(
  /function queueManagedAudioMixPlaybackResync\(delayMs = 60, options = \{\}\)\s*\{[\s\S]*?window\.setTimeout\(async \(\) => \{[\s\S]*?if \(game\.user\?\.isGM && options\?\.syncState !== false\) \{[\s\S]*?await syncManagedAudioMixStateFromPlaylist\([\s\S]*?\);[\s\S]*?\}[\s\S]*?await syncManagedAudioMixPlaybackForCurrentUser\(\{[\s\S]*?refresh: options\?\.refresh === true[\s\S]*?\}\);[\s\S]*?\}/,
  "Playback resync should refresh GM playlist state before mirroring audio locally."
);

expect(
  /await setModuleSettingWithLocalRefreshSuppressed\(SETTINGS\.AUDIO_LIBRARY_CATALOG, catalog\);\s*saveSharedAudioLibraryCatalog\(catalog\);/,
  "Scanning the audio library should also persist the shared catalog cache."
);

expect(
  /function selectAudioMixPreset\(actionElement\)\s*\{[\s\S]*?setSelectedAudioMixPresetId\(preset\.id\);/,
  "Selecting a preset should persist the shared preset selection."
);

process.stdout.write("audio playback persistence validation passed\n");
