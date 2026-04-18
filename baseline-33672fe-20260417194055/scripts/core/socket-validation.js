import { SOCKET_ACTIVITY_TYPES } from "./socket-constants.js";

export function sanitizeSocketIdentifier(value, options = {}) {
  const maxLength = Number.isFinite(Number(options.maxLength)) ? Math.max(1, Math.floor(Number(options.maxLength))) : 128;
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) return "";
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) return "";
  return normalized;
}

export function normalizeSocketActivityType(value, allowedTypes = SOCKET_ACTIVITY_TYPES) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowedTypes.has(normalized) ? normalized : "";
}
