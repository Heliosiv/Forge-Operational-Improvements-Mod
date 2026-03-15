const DEFAULT_DOWNTIME_HOURS = 4;
const DEFAULT_DOWNTIME_ACTION_KEY = "browsing";
const DOWNTIME_ACTION_KEYS = new Set([
  "browsing",
  "crafting",
  "profession"
]);
const LEGACY_DOWNTIME_ACTION_ALIASES = Object.freeze({
  carousing: "browsing"
});

export function clampDowntimeHours(value, fallback = DEFAULT_DOWNTIME_HOURS) {
  const fallbackHours = Number.isFinite(Number(fallback))
    ? Math.max(1, Math.min(24, Math.floor(Number(fallback))))
    : DEFAULT_DOWNTIME_HOURS;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallbackHours;
  return Math.max(1, Math.min(24, Math.floor(numericValue)));
}

export function normalizeDowntimeActionKey(value, fallback = DEFAULT_DOWNTIME_ACTION_KEY) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const aliased = LEGACY_DOWNTIME_ACTION_ALIASES[normalized] ?? normalized;
  return DOWNTIME_ACTION_KEYS.has(aliased) ? aliased : fallback;
}

export function normalizeDowntimePublication(rawState = {}, configuredHoursGranted = DEFAULT_DOWNTIME_HOURS) {
  const configuredHours = clampDowntimeHours(configuredHoursGranted, DEFAULT_DOWNTIME_HOURS);
  const publishedHoursRaw = Number(rawState?.publishedHoursGranted ?? 0);
  const publishedHoursGranted = Number.isFinite(publishedHoursRaw)
    ? Math.max(0, Math.min(24, Math.floor(publishedHoursRaw)))
    : 0;
  const publishedAtRaw = Number(rawState?.publishedAt ?? 0);
  const publishedAt = Number.isFinite(publishedAtRaw) && publishedAtRaw > 0 ? publishedAtRaw : 0;
  const publishedBy = String(rawState?.publishedBy ?? "").trim();
  const isPublished = publishedHoursGranted > 0 && publishedAt > 0;
  return {
    configuredHoursGranted: configuredHours,
    publishedHoursGranted: isPublished ? publishedHoursGranted : 0,
    publishedAt: isPublished ? publishedAt : 0,
    publishedBy: isPublished ? publishedBy : "",
    isPublished
  };
}

export function resolveDowntimeVisibleHours({
  configuredHoursGranted = DEFAULT_DOWNTIME_HOURS,
  publishedHoursGranted = 0,
  isPublished = false,
  isGM = false
} = {}) {
  if (isGM) return clampDowntimeHours(configuredHoursGranted, DEFAULT_DOWNTIME_HOURS);
  if (!isPublished) return 0;
  return Math.max(0, Math.min(24, Math.floor(Number(publishedHoursGranted) || 0)));
}

export function canSubmitPublishedDowntime({
  isGM = false,
  isPublished = false
} = {}) {
  return Boolean(isGM || isPublished);
}
