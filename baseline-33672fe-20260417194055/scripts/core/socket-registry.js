import { SOCKET_CHANNEL } from "./constants.js";

const registeredSocketChannels = new Set();

function getGame() {
  return globalThis.game ?? {};
}

export function registerModuleSocketHandler({ channel = SOCKET_CHANNEL, handler } = {}) {
  const socket = getGame().socket;
  if (!socket?.on || typeof handler !== "function") return false;
  if (registeredSocketChannels.has(channel)) return false;

  registeredSocketChannels.add(channel);
  socket.on(channel, (message) => handler(message));
  return true;
}

export function emitModuleSocket(message, { channel = SOCKET_CHANNEL } = {}) {
  getGame().socket?.emit?.(channel, message);
}
