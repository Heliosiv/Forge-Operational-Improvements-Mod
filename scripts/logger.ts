const MODULE_ID = "party-operations";
const LOG_PREFIX = "[party-operations]";
const DEBUG_SETTING_KEY = "debugEnabled";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFn = (...args: unknown[]) => void;

interface FoundrySettingsLike {
  get(namespace: string, key: string): unknown;
}

interface FoundryGameLike {
  settings?: FoundrySettingsLike;
}

function getGame(): FoundryGameLike {
  return (globalThis as { game?: FoundryGameLike }).game ?? {};
}

function isDebugEnabled(): boolean {
  try {
    return Boolean(getGame().settings?.get(MODULE_ID, DEBUG_SETTING_KEY));
  } catch {
    return false;
  }
}

function getConsoleMethod(level: LogLevel): LogFn {
  if (level === "debug") return console.debug.bind(console);
  if (level === "info") return console.info.bind(console);
  if (level === "warn") return console.warn.bind(console);
  return console.error.bind(console);
}

function buildPrefix(scope: string): string {
  const cleanScope = String(scope ?? "core").trim() || "core";
  return `${LOG_PREFIX}[${cleanScope}]`;
}

function writeLog(level: LogLevel, scope: string, ...args: unknown[]): void {
  if (level === "debug" && !isDebugEnabled()) return;
  const logger = getConsoleMethod(level);
  logger(buildPrefix(scope), ...args);
}

export interface PartyOpsLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  time: <T>(label: string, fn: () => T | Promise<T>) => Promise<T>;
}

export function createLogger(scope = "core"): PartyOpsLogger {
  const resolvedScope = String(scope ?? "core").trim() || "core";

  return {
    debug: (...args: unknown[]) => writeLog("debug", resolvedScope, ...args),
    info: (...args: unknown[]) => writeLog("info", resolvedScope, ...args),
    warn: (...args: unknown[]) => writeLog("warn", resolvedScope, ...args),
    error: (...args: unknown[]) => writeLog("error", resolvedScope, ...args),
    async time<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
      const runLabel = String(label ?? "operation").trim() || "operation";
      const start = globalThis.performance?.now?.() ?? Date.now();
      try {
        return await fn();
      } finally {
        if (!isDebugEnabled()) return;
        const end = globalThis.performance?.now?.() ?? Date.now();
        const elapsedMs = Math.max(0, end - start);
        writeLog("debug", resolvedScope, `${runLabel} completed in ${elapsedMs.toFixed(2)}ms`);
      }
    }
  };
}

export const logger = createLogger("core");
