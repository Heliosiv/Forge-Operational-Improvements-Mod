import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLegacyRuntimeSource } from "./test-utils/legacy-runtime-source.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const audioPresetManagerPath = path.join(repoRoot, "scripts", "features", "audio-preset-manager.js");
const audioUiPath = path.join(repoRoot, "scripts", "features", "audio-ui.js");
const stylesPath = path.join(repoRoot, "styles", "party-operations.css");
const templatePath = path.join(repoRoot, "templates", "gm-audio.hbs");
const source = readLegacyRuntimeSource(["bootstrap-shared", "state-defaults-audio"]);

const [audioPresetManagerSource, audioUiSource, styles, template] = await Promise.all([
  readFile(audioPresetManagerPath, "utf8"),
  readFile(audioUiPath, "utf8"),
  readFile(stylesPath, "utf8"),
  readFile(templatePath, "utf8")
]);

function expect(content, pattern, message) {
  assert.match(content, pattern, message);
}

expect(
  source,
  /import \{ createAudioMixPresetManager \} from "\.\/features\/audio-preset-manager\.js";/,
  "Party operations should import the extracted audio preset manager."
);

expect(
  source,
  /const audioMixPresetManager = createAudioMixPresetManager\(\{/,
  "Party operations should construct the extracted audio preset manager."
);

expect(
  source,
  /async function createAudioMixPresetFromSelection\(\)\s*\{[\s\S]*?audioMixPresetManager\.createAudioMixPresetFromSelection\(\)[\s\S]*?setAudioMixStatus\(`Created and saved custom preset: \$\{preset\.label\}`\);/s,
  "Custom preset creation should try the extracted manager and fall back to a direct saved preset path."
);

expect(
  source,
  /async function setSelectedAudioMixPresetTextField\(actionElement\)\s*\{\s*return audioMixPresetManager\.setSelectedAudioMixPresetTextField\(actionElement\);\s*\}/,
  "Preset text field autosave should delegate through the extracted audio preset manager."
);

expect(
  audioPresetManagerSource,
  /setAudioMixStatus\?\.\(`Created and saved custom preset: \$\{preset\.label\}`\);/,
  "Creating a custom audio preset should report that it was saved immediately."
);

expect(
  audioPresetManagerSource,
  /async function setSelectedAudioMixPresetTextField\(actionElement\)\s*\{[\s\S]*?\["label", "description"\]\.includes\(field\)[\s\S]*?await updateSelectedAudioMixPreset\(\(entry\) => \(\{[\s\S]*?\[field\]: nextValue[\s\S]*?\}\)\);/,
  "Audio preset text fields should autosave label and description changes."
);

expect(
  audioPresetManagerSource,
  /setAudioMixStatus\?\.\(`Saved \$\{updatedPreset\?\.\label\} track list\.`\);/,
  "Adding a track to a selected mix preset should confirm the saved track list."
);

expect(
  audioUiSource,
  /"set-audio-mix-preset-text-field": rerenderAlways\(\(actionElement\) => \{\s*return setSelectedAudioMixPresetTextField\(actionElement\);/s,
  "The audio UI should route preset text field changes through the autosave handler."
);

expect(
  template,
  /Preset names and descriptions save automatically\./,
  "The GM audio template should communicate preset autosave behavior."
);

expect(
  template,
  /data-action="set-audio-mix-preset-text-field"[\s\S]*?data-field="label"[\s\S]*?data-action="set-audio-mix-preset-text-field"[\s\S]*?data-field="description"/,
  "The GM audio template should expose inline autosave fields for preset name and description."
);

expect(
  template,
  /po-audio-editor-field-description/,
  "The GM audio template should mark the description field for wide editor layout styling."
);

expect(
  template,
  /#if audio\.mix\.playback\.activeTrackKindLabel[\s\S]*#if audio\.mix\.playback\.activeTrackUsageLabel[\s\S]*#if audio\.mix\.playback\.channelLabel[\s\S]*#if audio\.mix\.playback\.transportLabel/s,
  "The GM audio template should only render now-playing pills when those labels exist."
);

expect(
  styles,
  /\.po-audio-mixer-shell \.po-pill[\s\S]*?color:/s,
  "GM audio styles should provide explicit readable pill colors inside the mixer shell."
);

expect(
  styles,
  /\.po-audio-editor-field-description[\s\S]*?grid-column: 2 \/ 4;[\s\S]*?textarea[\s\S]*?min-height: 78px;/s,
  "GM audio styles should widen the description field and give it usable height."
);

process.stdout.write("audio mix preset autosave validation passed\n");
