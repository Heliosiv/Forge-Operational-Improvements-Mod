import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getLegacySourceSlices } from "../runtime/rebuild/legacy-source-map.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const sourceMarker = "----- legacy source begins -----\n";
let fullSourceCache = null;
const sliceBodyCache = new Map();

function normalizeSliceIds(sliceIds) {
  if (sliceIds == null) return [];
  const rawIds = Array.isArray(sliceIds) ? sliceIds : [sliceIds];
  return rawIds.map((id) => String(id ?? "").trim()).filter(Boolean);
}

function readSliceBody(slice) {
  if (sliceBodyCache.has(slice.id)) return sliceBodyCache.get(slice.id);

  const raw = readFileSync(join(repoRoot, slice.slicePath), "utf8").replace(/\r\n/g, "\n");
  const markerIndex = raw.indexOf(sourceMarker);
  if (markerIndex < 0) {
    throw new Error(`Legacy slice ${slice.slicePath} is missing the source marker.`);
  }

  const body = raw.slice(markerIndex + sourceMarker.length).replace(/\n$/, "");
  sliceBodyCache.set(slice.id, body);
  return body;
}

export function readLegacyRuntimeSource(sliceIds = []) {
  const requestedIds = normalizeSliceIds(sliceIds);
  const slices = getLegacySourceSlices();

  if (requestedIds.length === 0) {
    fullSourceCache ??= slices.map(readSliceBody).join("\n\n");
    return fullSourceCache;
  }

  const requested = new Set(requestedIds);
  const missing = requestedIds.filter((id) => !slices.some((slice) => slice.id === id));
  if (missing.length > 0) {
    throw new Error(`Unknown legacy runtime source slice id(s): ${missing.join(", ")}`);
  }

  return slices
    .filter((slice) => requested.has(slice.id))
    .map(readSliceBody)
    .join("\n\n");
}
