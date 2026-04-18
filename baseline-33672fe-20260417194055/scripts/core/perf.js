import { createLogger } from "./logger.js";

const PERF_STATE_KEY = "__partyOpsPerfState";
const MAX_RECENT_EVENTS = 25;
const MAX_BUCKET_SAMPLES = 200;

function getNow(clock = globalThis.performance?.now?.bind(globalThis.performance)) {
  if (typeof clock === "function") return Number(clock()) || 0;
  return Date.now();
}

function cloneMeta(meta) {
  if (!meta || typeof meta !== "object") return {};
  return { ...meta };
}

function createMetricBucket() {
  return {
    count: 0,
    total: 0,
    min: null,
    max: null,
    last: null,
    lastMeta: null,
    updatedAt: 0,
    samples: []
  };
}

function createScopeState() {
  return {
    counters: {},
    timings: {},
    values: {},
    recent: []
  };
}

export function getPartyOpsPerfState(root = globalThis) {
  if (!root[PERF_STATE_KEY] || typeof root[PERF_STATE_KEY] !== "object") {
    root[PERF_STATE_KEY] = {
      scopes: {}
    };
  }
  return root[PERF_STATE_KEY];
}

function getScopeState(root, scope) {
  const state = getPartyOpsPerfState(root);
  const scopeKey = String(scope ?? "core").trim() || "core";
  state.scopes[scopeKey] ??= createScopeState();
  return state.scopes[scopeKey];
}

function recordMetric(container, metricName, value, meta, clock) {
  const key = String(metricName ?? "metric").trim() || "metric";
  container[key] ??= createMetricBucket();
  const bucket = container[key];
  const numericValue = Number(value);
  const resolvedValue = Number.isFinite(numericValue) ? numericValue : 0;

  bucket.count += 1;
  bucket.total += resolvedValue;
  bucket.min = bucket.min === null ? resolvedValue : Math.min(bucket.min, resolvedValue);
  bucket.max = bucket.max === null ? resolvedValue : Math.max(bucket.max, resolvedValue);
  bucket.last = resolvedValue;
  bucket.lastMeta = cloneMeta(meta);
  bucket.updatedAt = Date.now();
  bucket.samples.push(resolvedValue);
  if (bucket.samples.length > MAX_BUCKET_SAMPLES) {
    bucket.samples.splice(0, bucket.samples.length - MAX_BUCKET_SAMPLES);
  }

  return {
    key,
    value: resolvedValue,
    at: getNow(clock),
    meta: cloneMeta(meta)
  };
}

function pushRecentEvent(scopeState, event) {
  scopeState.recent.push(event);
  if (scopeState.recent.length > MAX_RECENT_EVENTS) {
    scopeState.recent.splice(0, scopeState.recent.length - MAX_RECENT_EVENTS);
  }
}

export function createModulePerfTracker(scope = "core", {
  root = globalThis,
  logger = createLogger(`perf:${scope}`),
  clock = globalThis.performance?.now?.bind(globalThis.performance),
  emitLogs = false
} = {}) {
  const resolvedScope = String(scope ?? "core").trim() || "core";

  function write(kind, metricName, value, meta = {}) {
    const scopeState = getScopeState(root, resolvedScope);
    const container = kind === "timing"
      ? scopeState.timings
      : kind === "value"
        ? scopeState.values
        : scopeState.counters;

    const event = recordMetric(container, metricName, value, meta, clock);
    pushRecentEvent(scopeState, {
      type: kind,
      name: event.key,
      value: event.value,
      at: event.at,
      meta: event.meta
    });

    if (emitLogs) {
      logger.debug(`${kind}:${event.key}`, {
        value: event.value,
        meta: event.meta
      });
    }

    return event.value;
  }

  return Object.freeze({
    scope: resolvedScope,
    start(metricName, meta = {}) {
      return {
        metricName: String(metricName ?? "operation").trim() || "operation",
        startedAt: getNow(clock),
        meta: cloneMeta(meta)
      };
    },
    end(token, meta = {}) {
      if (!token || typeof token !== "object") return 0;
      const durationMs = Math.max(0, getNow(clock) - Number(token.startedAt ?? 0));
      write("timing", token.metricName, durationMs, {
        ...cloneMeta(token.meta),
        ...cloneMeta(meta)
      });
      return durationMs;
    },
    time(metricName, operation, meta = {}) {
      const token = this.start(metricName, meta);
      try {
        const result = typeof operation === "function" ? operation() : undefined;
        if (result && typeof result.finally === "function") {
          return result.finally(() => {
            this.end(token);
          });
        }
        this.end(token);
        return result;
      } catch (error) {
        this.end(token, { failed: true });
        throw error;
      }
    },
    increment(metricName, amount = 1, meta = {}) {
      return write("counter", metricName, amount, meta);
    },
    record(metricName, value, meta = {}) {
      return write("value", metricName, value, meta);
    },
    snapshot() {
      const scopeState = getScopeState(root, resolvedScope);
      return JSON.parse(JSON.stringify(scopeState));
    },
    summarize() {
      const scopeState = getScopeState(root, resolvedScope);
      return summarizePerfScope(scopeState);
    }
  });
}

function roundMetric(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Number(numericValue.toFixed(2));
}

function percentileFromSamples(samples, percentile) {
  if (!Array.isArray(samples) || samples.length <= 0) return 0;
  const sorted = [...samples].sort((left, right) => left - right);
  const normalizedPercentile = Math.max(0, Math.min(100, Number(percentile) || 0));
  const index = Math.ceil((normalizedPercentile / 100) * sorted.length) - 1;
  const resolvedIndex = Math.max(0, Math.min(sorted.length - 1, index));
  return sorted[resolvedIndex];
}

export function summarizeMetricBucket(bucket = {}) {
  const count = Number(bucket?.count ?? 0) || 0;
  const total = Number(bucket?.total ?? 0) || 0;
  const samples = Array.isArray(bucket?.samples) ? bucket.samples.filter((value) => Number.isFinite(Number(value))).map(Number) : [];

  return {
    count,
    total: roundMetric(total),
    avg: count > 0 ? roundMetric(total / count) : 0,
    min: roundMetric(bucket?.min ?? 0),
    max: roundMetric(bucket?.max ?? 0),
    median: roundMetric(percentileFromSamples(samples, 50)),
    p95: roundMetric(percentileFromSamples(samples, 95)),
    last: roundMetric(bucket?.last ?? 0),
    updatedAt: Number(bucket?.updatedAt ?? 0) || 0,
    sampleCount: samples.length,
    lastMeta: cloneMeta(bucket?.lastMeta)
  };
}

function summarizeMetricMap(metricMap = {}) {
  return Object.fromEntries(
    Object.entries(metricMap).map(([metricName, bucket]) => [metricName, summarizeMetricBucket(bucket)])
  );
}

export function summarizePerfScope(scopeState = {}) {
  return {
    counters: summarizeMetricMap(scopeState?.counters ?? {}),
    timings: summarizeMetricMap(scopeState?.timings ?? {}),
    values: summarizeMetricMap(scopeState?.values ?? {}),
    recent: Array.isArray(scopeState?.recent) ? [...scopeState.recent] : []
  };
}

export function summarizePartyOpsPerfState(state = {}) {
  const scopes = state?.scopes ?? {};
  return {
    scopes: Object.fromEntries(
      Object.entries(scopes).map(([scopeName, scopeState]) => [scopeName, summarizePerfScope(scopeState)])
    )
  };
}

export function summarizeCurrentPartyOpsPerfState(root = globalThis) {
  return summarizePartyOpsPerfState(getPartyOpsPerfState(root));
}