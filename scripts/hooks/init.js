export function registerInitHooks({
  HooksRef = globalThis.Hooks,
  onInit
} = {}) {
  if (typeof HooksRef?.once !== "function" || typeof onInit !== "function") return;
  HooksRef.once("init", onInit);
}
