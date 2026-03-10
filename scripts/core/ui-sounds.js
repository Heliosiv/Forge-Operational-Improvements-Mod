import { MODULE_ID } from "./constants.js";

const INTERACTIVE_SELECTOR = [
  ".po-btn",
  ".po-icon-btn",
  ".po-tab",
  ".po-entry-handle",
  ".po-char-btn",
  ".po-exh-btn",
  ".po-campfire-toggle",
  ".po-panel-disclosure > summary",
  "button"
].join(", ");

const ROOT_SELECTOR = [
  ".party-operations .po-window",
  "#po-floating-launcher",
  "#po-sidebar-launcher",
  "#po-click-opener"
].join(", ");
const BUTTON_SOUNDS_ENABLED_SETTING = "uiButtonSoundsEnabled";
const BUTTON_SOUND_PATH_SETTING = "uiButtonSoundPath";
const DEFAULT_BUTTON_SOUND_PATH = "sounds/lock.wav";
const DEFAULT_BUTTON_SOUND_VOLUME = 0.18;
const SOUND_COOLDOWN_MS = 90;

let buttonSoundsRegistered = false;
let lastSoundTimestamp = 0;

function isDisabled(element) {
  if (!element) return true;
  if (element.matches?.(":disabled, [disabled], [aria-disabled='true']")) return true;
  return element.closest?.("[disabled], [aria-disabled='true']") != null;
}

function getInteractiveTarget(target) {
  if (!(target instanceof Element)) return null;
  const interactiveElement = target.closest(INTERACTIVE_SELECTOR);
  if (!interactiveElement || isDisabled(interactiveElement)) return null;
  if (!interactiveElement.closest(ROOT_SELECTOR)) return null;
  return interactiveElement;
}

function areButtonSoundsEnabled() {
  try {
    return game.settings?.get?.(MODULE_ID, BUTTON_SOUNDS_ENABLED_SETTING) !== false;
  } catch {
    return true;
  }
}

function getButtonSoundPath() {
  try {
    const configured = String(game.settings?.get?.(MODULE_ID, BUTTON_SOUND_PATH_SETTING) ?? "").trim();
    return configured || DEFAULT_BUTTON_SOUND_PATH;
  } catch {
    return DEFAULT_BUTTON_SOUND_PATH;
  }
}

async function playButtonSound() {
  if (typeof AudioHelper?.play !== "function") return;
  const now = Date.now();
  if ((now - lastSoundTimestamp) < SOUND_COOLDOWN_MS) return;

  lastSoundTimestamp = now;

  try {
    const result = AudioHelper.play({
      src: getButtonSoundPath(),
      volume: DEFAULT_BUTTON_SOUND_VOLUME,
      autoplay: true,
      loop: false
    });
    if (result && typeof result.then === "function") await result;
  } catch (error) {
    console.warn(`${MODULE_ID}: UI button sound failed`, error);
  }
}

function onPointerDown(event) {
  const interactiveElement = getInteractiveTarget(event.target);
  if (!interactiveElement || !areButtonSoundsEnabled()) return;
  void playButtonSound();
}

function onKeyboardActivate(event) {
  if (event.repeat) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const interactiveElement = getInteractiveTarget(event.target);
  if (!interactiveElement || !areButtonSoundsEnabled()) return;
  void playButtonSound();
}

export function registerUiButtonSounds() {
  if (buttonSoundsRegistered || !globalThis.document?.addEventListener) return;
  buttonSoundsRegistered = true;

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyboardActivate, true);
}
