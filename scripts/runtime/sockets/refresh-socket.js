import { emitModuleSocket } from "../../core/socket-registry.js";
import { recordRuntimeRefresh, recordSocketMessage } from "../state/runtime-state.js";

export function emitSocketRefresh(options = {}) {
  const payload = {
    type: "refresh",
    refactorShell: true,
    ...options
  };
  recordRuntimeRefresh(payload);
  emitModuleSocket(payload);
  return payload;
}

export function handleRefactorSocketMessage(message = {}) {
  recordSocketMessage(message);
  return false;
}
