export function registerReadyHooks({
  HooksRef = globalThis.Hooks,
  onReady,
  readyHandlers = []
} = {}) {
  if (typeof HooksRef?.once !== "function") return;
  if (typeof onReady === "function") HooksRef.once("ready", onReady);

  for (const handler of readyHandlers) {
    if (typeof handler !== "function") continue;
    HooksRef.once("ready", handler);
  }
}
