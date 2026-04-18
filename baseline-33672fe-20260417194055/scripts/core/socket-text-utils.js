import { escapeHtml } from "./html-utils.js";
import { SOCKET_NOTE_MAX_LENGTH } from "./socket-constants.js";

export function clampSocketText(value, maxLength = SOCKET_NOTE_MAX_LENGTH) {
  const cap = Number.isFinite(Number(maxLength)) ? Math.max(0, Math.floor(Number(maxLength))) : SOCKET_NOTE_MAX_LENGTH;
  return String(value ?? "").slice(0, cap);
}

export function clampRestWatchRichNoteText(value, maxLength = SOCKET_NOTE_MAX_LENGTH) {
  const cap = Number.isFinite(Number(maxLength)) ? Math.max(0, Math.floor(Number(maxLength))) : SOCKET_NOTE_MAX_LENGTH;
  const raw = String(value ?? "");
  if (!raw || cap <= 0) return "";
  if (typeof document === "undefined" || typeof document.createElement !== "function") {
    return clampSocketText(raw, cap);
  }
  const scratch = document.createElement("div");
  scratch.innerHTML = raw;
  const plainText = String(scratch.textContent ?? "");
  if (plainText.length <= cap) return raw;
  const truncated = plainText.slice(0, cap);
  return `<p>${escapeHtml(truncated).replace(/\n/g, "<br>")}</p>`;
}

export function normalizeRestNoteSaveSource(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "manual" ? "manual" : "autosave";
}
