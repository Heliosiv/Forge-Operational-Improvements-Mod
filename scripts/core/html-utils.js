function escapeHtmlFallback(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeHtml(value, foundryRef = globalThis.foundry) {
  try {
    const escapeFn = foundryRef?.utils?.escapeHTML;
    if (typeof escapeFn === "function") return escapeFn(String(value ?? ""));
  } catch {
    // Fall through to fallback encoder.
  }
  return escapeHtmlFallback(value);
}

export function buildUuidJournalLink(uuid, label, { escape = escapeHtml } = {}) {
  const safeLabel = escape(String(label ?? "").trim() || "Unknown");
  const safeUuid = String(uuid ?? "").trim();
  if (!safeUuid) return safeLabel;
  return `@UUID[${safeUuid}]{${safeLabel}}`;
}

export function installFoundryEscapeHtmlShim(foundryRef = globalThis.foundry) {
  try {
    if (typeof foundryRef?.utils?.escapeHTML !== "function" && foundryRef?.utils && typeof foundryRef.utils === "object") {
      foundryRef.utils.escapeHTML = escapeHtmlFallback;
    }
  } catch {
    // Ignore shim failures; local fallbacks exist in call-sites.
  }
}
