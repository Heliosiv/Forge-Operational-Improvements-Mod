import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioStorePath = path.join(repoRoot, "scripts", "features", "audio-store.js");
const source = readLegacyRuntimeSource(["bootstrap-shared", "state-defaults-audio"]);
const audioStoreSource = await readFile(audioStorePath, "utf8");

function expect(content, pattern, message) {
  assert.match(content, pattern, message);
}

expect(
  source,
  /import \{ createAudioStore \} from "\.\/features\/audio-store\.js";/,
  "Party operations should import the extracted audio store module."
);

expect(
  source,
  /const audioStore = createAudioStore\(\{/,
  "Party operations should construct the extracted audio store."
);

expect(
  source,
  /function normalizeAudioLibraryCatalog\(catalog = \{\}\)\s*\{\s*return audioStore\.normalizeAudioLibraryCatalog\(catalog\);\s*\}/,
  "Audio catalog normalization should delegate through the extracted audio store."
);

expect(
  source,
  /async function updateStoredAudioMixPresets\(mutator\)\s*\{\s*return audioStore\.updateStoredAudioMixPresets\(mutator\);\s*\}/,
  "Audio mix preset persistence should delegate through the extracted audio store."
);

expect(
  audioStoreSource,
  /function normalizeStoredAudioLibraryValue\(value, \{ allowArray = false \} = \{\}\)\s*\{[\s\S]*?typeof value === "string"[\s\S]*?JSON\.parse\(raw\)/,
  "Audio settings normalization should recover stringified JSON payloads."
);

expect(
  audioStoreSource,
  /function normalizeAudioLibraryCatalog\(catalog = \{\}\)\s*\{[\s\S]*?normalizedCatalog\?\.items[\s\S]*?normalizedCatalog\?\.tracks[\s\S]*?normalizedCatalog\?\.entries[\s\S]*?normalizedCatalog\?\.catalog/,
  "Audio catalog normalization should accept legacy item collection aliases."
);

expect(
  audioStoreSource,
  /function normalizeAudioLibraryItem\(entry = \{\}\)\s*\{[\s\S]*?normalizedEntry\.path[\s\S]*?normalizedEntry\.file[\s\S]*?normalizedEntry\.src[\s\S]*?normalizedEntry\.url[\s\S]*?normalizedEntry\.relativePath/,
  "Audio item normalization should recover legacy path aliases."
);

expect(
  audioStoreSource,
  /function normalizeAudioLibraryHiddenTrackStore\(store = \{\}\)\s*\{[\s\S]*?normalizedStore\?\.trackIds[\s\S]*?normalizedStore\?\.hiddenTrackIds[\s\S]*?normalizedStore\?\.ids/,
  "Hidden track normalization should accept legacy hidden-track aliases."
);

process.stdout.write("audio catalog compatibility validation passed\n");
