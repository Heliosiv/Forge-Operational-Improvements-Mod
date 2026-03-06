import { PARTY_OPS_MODULE_ID } from "./constants.js";

const LOG_PREFIX = `[${PARTY_OPS_MODULE_ID}]`;
const DEBUG_SETTING_KEY = "debugEnabled";

function getGame() {
  return globalThis.game ?? {};
}

function isDebugEnabled() {
  try {
    return Boolean(getGame().settings?.get?.(PARTY_OPS_MODULE_ID, DEBUG_SETTING_KEY));
  } catch {
    return false;
  }
}

function getConsoleMethod(level) {
  if (level === "debug") return console.debug.bind(console);
  if (level === "info") return console.info.bind(console);
  if (level === "warn") return console.warn.bind(console);
  return console.error.bind(console);
}

function buildPrefix(scope) {
  const cleanScope = String(scope ?? "core").trim() || "core";
  return `${LOG_PREFIX}[${cleanScope}]`;
}

function writeLog(level, scope, ...args) {
  if (level === "debug" && !isDebugEnabled()) return;
  const logger = getConsoleMethod(level);
  logger(buildPrefix(scope), ...args);
}

export function createLogger(scope = "core") {
  const resolvedScope = String(scope ?? "core").trim() || "core";
  return {
    debug: (...args) => writeLog("debug", resolvedScope, ...args),
    info: (...args) => writeLog("info", resolvedScope, ...args),
    warn: (...args) => writeLog("warn", resolvedScope, ...args),
    error: (...args) => writeLog("error", resolvedScope, ...args),
    async time(label, fn) {
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
