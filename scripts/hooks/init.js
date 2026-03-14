export function registerInitHooks({
  HooksRef = globalThis.Hooks,
  gameRef = globalThis.game,
  onInit
} = {}) {
  if (typeof HooksRef?.once !== "function" || typeof onInit !== "function") return;
  HooksRef.once("init", onInit);
  if (gameRef?.ready === true) onInit();
}
