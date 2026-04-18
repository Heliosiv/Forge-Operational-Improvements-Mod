import { sanitizeSocketIdentifier } from "./socket-validation.js";

export function resolveSocketRequester(userOrId, options = {}) {
  const gameRef = options.gameRef ?? globalThis.game;
  const allowGM = options.allowGM !== false;
  const requireActive = options.requireActive === true;
  const requester = typeof userOrId === "string" ? gameRef?.users?.get?.(userOrId) : userOrId;
  if (!requester) return null;
  if (!allowGM && requester.isGM) return null;
  if (requireActive && !requester.active) return null;
  return requester;
}

export function getSocketRequesterFromMessage(message, options = {}) {
  const userId = sanitizeSocketIdentifier(message?.userId, { maxLength: 64 });
  if (!userId) return null;
  return resolveSocketRequester(userId, options);
}
