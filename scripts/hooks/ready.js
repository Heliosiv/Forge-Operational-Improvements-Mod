export function registerReadyHooks({
  HooksRef = globalThis.Hooks,
  gameRef = globalThis.game,
  onReady,
  readyHandlers = []
} = {}) {
  if (typeof HooksRef?.once !== "function") return;
  if (typeof onReady === "function") HooksRef.once("ready", onReady);

  for (const handler of readyHandlers) {
    if (typeof handler !== "function") continue;
    HooksRef.once("ready", handler);
  }

  if (gameRef?.ready === true) {
    if (typeof onReady === "function") onReady();
    for (const handler of readyHandlers) {
      if (typeof handler !== "function") continue;
      handler();
    }
  }
}
