import assert from "node:assert/strict";

import { createAudioLibraryScanCacheStore } from "./features/audio-library-scan-cache.js";

{
  let now = 1000;
  const cache = createAudioLibraryScanCacheStore({
    normalizeSource: (value) => String(value ?? "").trim().toLowerCase(),
    normalizeRootPath: (value) => String(value ?? "").trim().replace(/\\/g, "/"),
    normalizePath: (value) => String(value ?? "").trim().replace(/\\/g, "/"),
    ttlMs: 50,
    maxEntries: 2,
    nowFn: () => now
  });

  const key = cache.buildKey("Data", "music\\boss");
  cache.set(key, ["music\\boss\\a.mp3", "music\\boss\\b.mp3"]);
  assert.deepEqual(cache.get(key), ["music/boss/a.mp3", "music/boss/b.mp3"]);

  now += 60;
  assert.equal(cache.get(key), null);
}

{
  let now = 2000;
  const cache = createAudioLibraryScanCacheStore({
    normalizeSource: (value) => String(value ?? "").trim(),
    normalizeRootPath: (value) => String(value ?? "").trim(),
    normalizePath: (value) => String(value ?? "").trim(),
    ttlMs: 1000,
    maxEntries: 2,
    nowFn: () => now
  });

  const keyA = cache.buildKey("data", "a");
  const keyB = cache.buildKey("data", "b");
  const keyC = cache.buildKey("data", "c");

  cache.set(keyA, ["a.mp3"]);
  now += 10;
  cache.set(keyB, ["b.mp3"]);
  now += 10;
  cache.set(keyC, ["c.mp3"]);

  assert.equal(cache.get(keyA), null);
  assert.deepEqual(cache.get(keyB), ["b.mp3"]);
  assert.deepEqual(cache.get(keyC), ["c.mp3"]);
}

process.stdout.write("audio library scan cache validation passed\n");
