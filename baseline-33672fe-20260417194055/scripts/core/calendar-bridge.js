const DEFAULT_TIME_CONFIGURATION = Object.freeze({
  hoursInDay: 24,
  minutesInHour: 60,
  secondsInMinute: 60
});

export const SIMPLE_CALENDAR_MODULE_IDS = Object.freeze([
  "foundryvtt-simple-calendar",
  "simple-calendar",
  "foundryvtt-simple-calendar-compat"
]);

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toPositiveInteger(value, fallback) {
  const numeric = Math.floor(Number(value));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function formatClockLabel(hours24, minutes) {
  const hh = String(Math.max(0, Math.floor(Number(hours24) || 0))).padStart(2, "0");
  const mm = String(Math.max(0, Math.floor(Number(minutes) || 0))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function getModuleRecord(gameRef, moduleId) {
  try {
    return gameRef?.modules?.get?.(moduleId) ?? null;
  } catch {
    return null;
  }
}

export function getCurrentWorldTimestamp({ gameRef = globalThis.game } = {}) {
  return toFiniteNumber(gameRef?.time?.worldTime, 0);
}

export function getSimpleCalendarApiCandidates({
  gameRef = globalThis.game,
  globalRef = globalThis
} = {}) {
  const rawCandidates = [
    globalRef?.SimpleCalendar?.api,
    globalRef?.SimpleCalendar,
    gameRef?.simpleCalendar?.api,
    gameRef?.simpleCalendar,
    ...SIMPLE_CALENDAR_MODULE_IDS.map((moduleId) => getModuleRecord(gameRef, moduleId)?.api)
  ];

  const unique = [];
  const seen = new Set();
  for (const candidate of rawCandidates) {
    if (!candidate || typeof candidate !== "object") continue;
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    unique.push(candidate);
  }
  return unique;
}

export function getSimpleCalendarApi(options = {}) {
  const candidates = getSimpleCalendarApiCandidates(options);
  if (!candidates.length) return null;
  return candidates.find((api) => typeof api?.timestampToDate === "function") ?? candidates[0];
}

export function isSimpleCalendarActive({
  gameRef = globalThis.game,
  globalRef = globalThis
} = {}) {
  if (getSimpleCalendarApi({ gameRef, globalRef })) return true;
  return SIMPLE_CALENDAR_MODULE_IDS.some((moduleId) => Boolean(getModuleRecord(gameRef, moduleId)?.active));
}

export function getCalendarTimeConfiguration({
  api = null,
  gameRef = globalThis.game,
  globalRef = globalThis
} = {}) {
  const resolvedApi = api ?? getSimpleCalendarApi({ gameRef, globalRef });
  if (typeof resolvedApi?.getTimeConfiguration === "function") {
    try {
      const config = resolvedApi.getTimeConfiguration();
      return {
        hoursInDay: toPositiveInteger(config?.hoursInDay, DEFAULT_TIME_CONFIGURATION.hoursInDay),
        minutesInHour: toPositiveInteger(config?.minutesInHour, DEFAULT_TIME_CONFIGURATION.minutesInHour),
        secondsInMinute: toPositiveInteger(config?.secondsInMinute, DEFAULT_TIME_CONFIGURATION.secondsInMinute)
      };
    } catch {
      // Fall through to defaults.
    }
  }
  return { ...DEFAULT_TIME_CONFIGURATION };
}

export function getCalendarSecondsPerDay(options = {}) {
  const config = getCalendarTimeConfiguration(options);
  return config.hoursInDay * config.minutesInHour * config.secondsInMinute;
}

export function getCalendarDayStartTimestamp(timestamp, options = {}) {
  const resolvedTimestamp = Math.floor(toFiniteNumber(timestamp, NaN));
  if (!Number.isFinite(resolvedTimestamp)) return 0;

  const api = options.api ?? getSimpleCalendarApi(options);
  if (typeof api?.timestampToDate === "function" && typeof api?.dateToTimestamp === "function") {
    try {
      const date = api.timestampToDate(resolvedTimestamp);
      const startTimestamp = Number(api.dateToTimestamp({
        year: toFiniteNumber(date?.year, 0),
        month: toFiniteNumber(date?.month, 0),
        day: toFiniteNumber(date?.day, 0),
        hour: 0,
        minute: 0,
        second: 0
      }));
      if (Number.isFinite(startTimestamp)) return Math.floor(startTimestamp);
    } catch {
      // Fall through to arithmetic fallback.
    }
  }

  const daySeconds = getCalendarSecondsPerDay({ ...options, api });
  return Math.floor(resolvedTimestamp / daySeconds) * daySeconds;
}

export function getCalendarDayKey(timestamp, options = {}) {
  const resolvedTimestamp = Math.floor(toFiniteNumber(timestamp, NaN));
  if (!Number.isFinite(resolvedTimestamp)) return "D0";

  const api = options.api ?? getSimpleCalendarApi(options);
  if (typeof api?.timestampToDate === "function") {
    try {
      const date = api.timestampToDate(resolvedTimestamp);
      return `Y${toFiniteNumber(date?.year, 0)}-M${toFiniteNumber(date?.month, 0)}-D${toFiniteNumber(date?.day, 0)}`;
    } catch {
      // Fall through to arithmetic fallback.
    }
  }

  const dayStart = getCalendarDayStartTimestamp(resolvedTimestamp, { ...options, api });
  const daySeconds = getCalendarSecondsPerDay({ ...options, api });
  return `D${Math.floor(dayStart / daySeconds)}`;
}

function getRelativeBoundaryOffsetSeconds(boundaryMinutes, daySeconds) {
  const normalizedMinutes = Math.max(0, Number(boundaryMinutes) || 0);
  const defaultDayMinutes = DEFAULT_TIME_CONFIGURATION.hoursInDay * DEFAULT_TIME_CONFIGURATION.minutesInHour;
  return Math.floor((normalizedMinutes / defaultDayMinutes) * daySeconds);
}

export function getCalendarDueCount(timestamp, {
  boundaryMinutes = 0,
  ...options
} = {}) {
  const resolvedTimestamp = toFiniteNumber(timestamp, NaN);
  if (!Number.isFinite(resolvedTimestamp)) return 0;
  const daySeconds = getCalendarSecondsPerDay(options);
  const boundaryOffsetSeconds = getRelativeBoundaryOffsetSeconds(boundaryMinutes, daySeconds);
  return Math.floor((resolvedTimestamp - boundaryOffsetSeconds) / daySeconds);
}

export function getElapsedCalendarDays(lastTimestamp, currentTimestamp, {
  boundaryMinutes = 0,
  ...options
} = {}) {
  const current = toFiniteNumber(currentTimestamp, NaN);
  const last = toFiniteNumber(lastTimestamp, NaN);
  if (!Number.isFinite(current) || !Number.isFinite(last) || current <= last) return 0;

  const daySeconds = getCalendarSecondsPerDay(options);
  const boundaryOffsetSeconds = getRelativeBoundaryOffsetSeconds(boundaryMinutes, daySeconds);
  const currentDayStart = getCalendarDayStartTimestamp(current - boundaryOffsetSeconds, options);
  const lastDayStart = getCalendarDayStartTimestamp(last - boundaryOffsetSeconds, options);
  if (!Number.isFinite(currentDayStart) || !Number.isFinite(lastDayStart) || currentDayStart <= lastDayStart) return 0;
  return Math.max(0, Math.floor((currentDayStart - lastDayStart) / daySeconds));
}

export function addCalendarDays(timestamp, dayCount, options = {}) {
  const resolvedTimestamp = Math.floor(toFiniteNumber(timestamp, NaN));
  const resolvedDayCount = Math.trunc(Number(dayCount) || 0);
  if (!Number.isFinite(resolvedTimestamp) || resolvedDayCount === 0) {
    return Number.isFinite(resolvedTimestamp) ? resolvedTimestamp : 0;
  }

  const api = options.api ?? getSimpleCalendarApi(options);
  if (typeof api?.timestampPlusInterval === "function") {
    try {
      const result = Number(api.timestampPlusInterval(resolvedTimestamp, { day: resolvedDayCount }));
      if (Number.isFinite(result)) return Math.floor(result);
    } catch {
      // Fall back to fixed-length day math.
    }
  }

  const daySeconds = getCalendarSecondsPerDay({ ...options, api });
  return Math.floor(resolvedTimestamp + (resolvedDayCount * daySeconds));
}

export function formatCalendarDateTimeLabel(timestamp, options = {}) {
  const resolvedTimestamp = Math.floor(toFiniteNumber(timestamp, NaN));
  if (!Number.isFinite(resolvedTimestamp)) return "-";

  const api = options.api ?? getSimpleCalendarApi(options);
  if (typeof api?.timestampToDate === "function") {
    try {
      const date = api.timestampToDate(resolvedTimestamp);
      const year = toFiniteNumber(date?.year, 0);
      const monthIndex = toFiniteNumber(date?.month, 0);
      const dayIndex = toFiniteNumber(date?.day, 0);
      const hour = toFiniteNumber(date?.hour ?? date?.hours, 0);
      const minute = toFiniteNumber(date?.minute ?? date?.minutes, 0);
      const monthName = String(
        date?.monthName
        ?? date?.display?.monthName
        ?? date?.display?.month
        ?? ""
      ).trim();
      const dayLabel = String(dayIndex + 1);
      if (monthName) return `Y${year} ${monthName} ${dayLabel} ${formatClockLabel(hour, minute)}`;
      return `Y${year} M${monthIndex + 1} D${dayIndex + 1} ${formatClockLabel(hour, minute)}`;
    } catch {
      // Fall through to arithmetic fallback.
    }
  }

  const config = getCalendarTimeConfiguration({ ...options, api });
  const daySeconds = getCalendarSecondsPerDay({ ...options, api });
  const secondsPerHour = config.minutesInHour * config.secondsInMinute;
  const secondsIntoDay = ((resolvedTimestamp % daySeconds) + daySeconds) % daySeconds;
  const hour = Math.floor(secondsIntoDay / secondsPerHour);
  const minute = Math.floor((secondsIntoDay % secondsPerHour) / config.secondsInMinute);
  const day = Math.floor(resolvedTimestamp / daySeconds);
  return `Day ${day} ${formatClockLabel(hour, minute)}`;
}

export function getCalendarClockContext(timestamp, options = {}) {
  const resolvedTimestamp = Math.floor(toFiniteNumber(timestamp, NaN));
  const api = options.api ?? getSimpleCalendarApi(options);
  const hasSimpleCalendar = isSimpleCalendarActive(options) && typeof api?.timestampToDate === "function";

  if (Number.isFinite(resolvedTimestamp) && hasSimpleCalendar) {
    try {
      const date = api.timestampToDate(resolvedTimestamp);
      const hour = toFiniteNumber(date?.hour ?? date?.hours, 0);
      const minute = toFiniteNumber(date?.minute ?? date?.minutes, 0);
      return {
        totalMinutes: (Math.max(0, Math.floor(hour)) * 60) + Math.max(0, Math.floor(minute)),
        label: formatClockLabel(hour, minute),
        source: "Simple Calendar"
      };
    } catch {
      // Fall through to arithmetic fallback.
    }
  }

  const safeTimestamp = Number.isFinite(resolvedTimestamp) ? resolvedTimestamp : 0;
  const config = getCalendarTimeConfiguration({ ...options, api });
  const daySeconds = getCalendarSecondsPerDay({ ...options, api });
  const secondsPerHour = config.minutesInHour * config.secondsInMinute;
  const secondsIntoDay = ((safeTimestamp % daySeconds) + daySeconds) % daySeconds;
  const hour = Math.floor(secondsIntoDay / secondsPerHour);
  const minute = Math.floor((secondsIntoDay % secondsPerHour) / config.secondsInMinute);
  return {
    totalMinutes: (Math.max(0, hour) * 60) + Math.max(0, minute),
    label: formatClockLabel(hour, minute),
    source: "World Time"
  };
}
