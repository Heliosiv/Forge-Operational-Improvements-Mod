import { routePartyOperationsSocketMessage } from "./socket-routes.js";

export function createPartyOperationsSocketMessageHandler({
  game = globalThis.game,
  applyPlayerGatherRequest,
  promptLocalGatherYieldRoll,
  resolvePendingGatherYieldRequest,
  routeSocketDeps = {},
  routeSocketMessage = routePartyOperationsSocketMessage
} = {}) {
  return async function handlePartyOperationsSocketMessage(message) {
    if (message?.type === "ops:gather-request") {
      if (game?.user?.isGM) await applyPlayerGatherRequest?.(message);
      return;
    }

    if (message?.type === "ops:gather-yield-request") {
      await promptLocalGatherYieldRoll?.(message);
      return;
    }

    if (message?.type === "ops:gather-yield-response") {
      if (game?.user?.isGM) {
        resolvePendingGatherYieldRequest?.(message?.requestId, message);
      }
      return;
    }

    return routeSocketMessage(message, {
      game,
      ...routeSocketDeps
    });
  };
}
