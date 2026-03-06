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

const WINDOW_SELECTOR = ".party-operations .po-window";
const ACTIVE_CLASS = "is-click-animating";
const cleanupTimers = new WeakMap();
let animationsRegistered = false;

function prefersReducedMotion() {
  return globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function isDisabled(element) {
  if (!element) return true;
  if (element.matches?.(":disabled, [disabled], [aria-disabled='true']")) return true;
  return element.closest?.("[disabled], [aria-disabled='true']") != null;
}

function getInteractiveTarget(target) {
  if (!(target instanceof Element)) return null;
  const interactiveElement = target.closest(INTERACTIVE_SELECTOR);
  if (!interactiveElement || isDisabled(interactiveElement)) return null;
  if (!interactiveElement.closest(WINDOW_SELECTOR)) return null;
  return interactiveElement;
}

function setAnimationOrigin(element, clientX, clientY) {
  const rect = element.getBoundingClientRect();
  const fallbackX = rect.width / 2;
  const fallbackY = rect.height / 2;
  const originX = Number.isFinite(clientX) ? clientX - rect.left : fallbackX;
  const originY = Number.isFinite(clientY) ? clientY - rect.top : fallbackY;

  element.style.setProperty("--po-click-origin-x", `${Math.max(0, Math.min(rect.width, originX))}px`);
  element.style.setProperty("--po-click-origin-y", `${Math.max(0, Math.min(rect.height, originY))}px`);
}

function triggerInteractionAnimation(element, clientX, clientY) {
  if (!element || prefersReducedMotion()) return;

  setAnimationOrigin(element, clientX, clientY);
  element.classList.remove(ACTIVE_CLASS);
  void element.offsetWidth;
  element.classList.add(ACTIVE_CLASS);

  const priorTimer = cleanupTimers.get(element);
  if (priorTimer) globalThis.clearTimeout(priorTimer);

  const timerId = globalThis.setTimeout(() => {
    element.classList.remove(ACTIVE_CLASS);
    cleanupTimers.delete(element);
  }, 420);

  cleanupTimers.set(element, timerId);
}

function onPointerDown(event) {
  const interactiveElement = getInteractiveTarget(event.target);
  if (!interactiveElement) return;
  triggerInteractionAnimation(interactiveElement, event.clientX, event.clientY);
}

function onKeyboardActivate(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const interactiveElement = getInteractiveTarget(event.target);
  if (!interactiveElement) return;
  triggerInteractionAnimation(interactiveElement);
}

export function registerInteractionAnimations() {
  if (animationsRegistered || !globalThis.document?.addEventListener) return;
  animationsRegistered = true;

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyboardActivate, true);
}
