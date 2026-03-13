import { routePartyOperationsSocketMessage } from "./socket-routes.js";

export function createPartyOperationsSocketMessageHandler({
  game = globalThis.game,
  applyPlayerGatherRequest,
  promptLocalGatherCheckRoll,
  promptLocalGatherYieldRoll,
  resolvePendingGatherCheckRequest,
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

    if (message?.type === "ops:gather-check-request") {
      await promptLocalGatherCheckRoll?.(message);
      return;
    }

    if (message?.type === "ops:gather-check-response") {
      if (game?.user?.isGM) {
        resolvePendingGatherCheckRequest?.(message?.requestId, message);
      }
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
