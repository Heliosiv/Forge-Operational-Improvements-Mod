const MODULE_ID = "party-operations";
const SNAPSHOTS_KEY = "snapshots";
const MARCH_STATE_KEY = "marchingOrderState";
const REST_STATE_KEY = "restWatchState";
const REST_ACTIVITIES_KEY = "restActivities";
const MAX_SNAPSHOTS = 25;

type SnapshotKind = "marching-order" | "rest-watch";

export interface MarchingOrderSnapshot {
  id: string;
  kind: "marching-order";
  createdAt: number;
  partyId: string;
  formation: string;
  ranks: string[];
}

export interface RestWatchSnapshot {
  id: string;
  kind: "rest-watch";
  createdAt: number;
  assignments: Array<{
    actorId: string;
    watchSlot: string;
    activity: string;
  }>;
}

export type PartyOpsSnapshot = MarchingOrderSnapshot | RestWatchSnapshot;

interface FoundrySettingsApi {
  get(namespace: string, key: string): unknown;
  set(namespace: string, key: string, value: unknown): Promise<unknown>;
}

interface FoundryGameLike {
  user?: {
    isGM?: boolean;
  };
  settings?: FoundrySettingsApi;
  partyOperations?: {
    refreshAll?: () => unknown;
  };
}

function getGame(): FoundryGameLike {
  return (globalThis as { game?: FoundryGameLike }).game ?? {};
}

function now(): number {
  return Date.now();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createStableId(prefix: SnapshotKind, createdAt: number): string {
  const randomId = (() => {
    const foundryRandom = (globalThis as { foundry?: { utils?: { randomID?: (length?: number) => string } } }).foundry?.utils?.randomID;
    if (typeof foundryRandom === "function") return foundryRandom(10);
    return Math.random().toString(36).slice(2, 12);
  })();
  return `${prefix}-${createdAt}-${randomId}`;
}

function getSetting<T = unknown>(key: string, fallback: T): T {
  try {
    const value = getGame().settings?.get(MODULE_ID, key);
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function requireGm(): void {
  if (!getGame().user?.isGM) {
    throw new Error("Only the GM can create, save, or restore Party Operations snapshots.");
  }
}

function getMarchingStateRaw(): Record<string, unknown> {
  const fallback: Record<string, unknown> = { formation: "", ranks: {} };
  const state = getSetting<Record<string, unknown>>(MARCH_STATE_KEY, fallback);
  return isPlainObject(state) ? state : fallback;
}

function getRestStateRaw(): Record<string, unknown> {
  const fallback: Record<string, unknown> = { slots: [] };
  const state = getSetting<Record<string, unknown>>(REST_STATE_KEY, fallback);
  return isPlainObject(state) ? state : fallback;
}

function getRestActivitiesRaw(): Record<string, unknown> {
  const fallback: Record<string, unknown> = { activities: {} };
  const state = getSetting<Record<string, unknown>>(REST_ACTIVITIES_KEY, fallback);
  return isPlainObject(state) ? state : fallback;
}

function normalizeSnapshotList(raw: unknown): PartyOpsSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => isPlainObject(entry))
    .map((entry) => {
      const kind = String(entry.kind ?? "").trim();
      const createdAt = Number(entry.createdAt ?? 0);
      const id = String(entry.id ?? "").trim();

      if (kind === "marching-order") {
        return {
          id: id || createStableId("marching-order", createdAt || now()),
          kind: "marching-order",
          createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now(),
          partyId: String(entry.partyId ?? "").trim(),
          formation: String(entry.formation ?? "").trim(),
          ranks: Array.isArray(entry.ranks) ? entry.ranks.map((value) => String(value ?? "").trim()).filter(Boolean) : []
        } as MarchingOrderSnapshot;
      }

      return {
        id: id || createStableId("rest-watch", createdAt || now()),
        kind: "rest-watch",
        createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now(),
        assignments: Array.isArray(entry.assignments)
          ? entry.assignments
            .filter((a) => isPlainObject(a))
            .map((a) => ({
              actorId: String(a.actorId ?? "").trim(),
              watchSlot: String(a.watchSlot ?? "").trim(),
              activity: String(a.activity ?? "").trim()
            }))
            .filter((a) => a.actorId && a.watchSlot)
          : []
      } as RestWatchSnapshot;
    });
}

export function createMarchingOrderSnapshot(): MarchingOrderSnapshot {
  requireGm();
  const createdAt = now();
  const state = getMarchingStateRaw();

  const ranksRaw = isPlainObject(state.ranks) ? state.ranks : {};
  const ranks: string[] = Object.values(ranksRaw)
    .flatMap((entry) => Array.isArray(entry) ? entry : [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  const partyId = String(state.partyId ?? "").trim();
  const formation = String(state.formation ?? "").trim();

  return {
    id: createStableId("marching-order", createdAt),
    kind: "marching-order",
    createdAt,
    partyId,
    formation,
    ranks
  };
}

export function createRestWatchSnapshot(): RestWatchSnapshot {
  requireGm();
  const createdAt = now();
  const restState = getRestStateRaw();
  const restActivities = getRestActivitiesRaw();
  const activitiesByActor = isPlainObject(restActivities.activities) ? restActivities.activities : {};

  const slots = Array.isArray(restState.slots) ? restState.slots : [];
  const assignments: RestWatchSnapshot["assignments"] = [];

  for (const slotRaw of slots) {
    if (!isPlainObject(slotRaw)) continue;
    const watchSlot = String(slotRaw.id ?? "").trim();
    if (!watchSlot) continue;

    const entries = Array.isArray(slotRaw.entries)
      ? slotRaw.entries
      : (slotRaw.actorId ? [{ actorId: slotRaw.actorId }] : []);

    for (const entryRaw of entries) {
      const actorId = isPlainObject(entryRaw)
        ? String(entryRaw.actorId ?? "").trim()
        : "";
      if (!actorId) continue;

      const actorActivityRaw = isPlainObject(activitiesByActor[actorId]) ? activitiesByActor[actorId] : {};
      const activity = String(actorActivityRaw.activity ?? "").trim();

      assignments.push({
        actorId,
        watchSlot,
        activity
      });
    }
  }

  return {
    id: createStableId("rest-watch", createdAt),
    kind: "rest-watch",
    createdAt,
    assignments
  };
}

export async function saveSnapshot(snapshot: PartyOpsSnapshot): Promise<PartyOpsSnapshot[]> {
  requireGm();
  const current = normalizeSnapshotList(getSetting<unknown>(SNAPSHOTS_KEY, []));
  const deduped = current.filter((entry) => entry.id !== snapshot.id);
  const next = [snapshot, ...deduped]
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
    .slice(0, MAX_SNAPSHOTS);

  await getGame().settings?.set(MODULE_ID, SNAPSHOTS_KEY, next);
  return next;
}

export function listSnapshots(): PartyOpsSnapshot[] {
  return normalizeSnapshotList(getSetting<unknown>(SNAPSHOTS_KEY, []))
    .sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
}

function buildMarchingStateFromSnapshot(snapshot: MarchingOrderSnapshot): Record<string, unknown> {
  return {
    ...getMarchingStateRaw(),
    partyId: snapshot.partyId,
    formation: snapshot.formation,
    ranks: {
      front: [...snapshot.ranks],
      middle: [],
      rear: []
    }
  };
}

function buildRestStateFromSnapshot(snapshot: RestWatchSnapshot): Record<string, unknown> {
  const grouped = new Map<string, Array<{ actorId: string; notes: string }>>();
  for (const assignment of snapshot.assignments) {
    const bucket = grouped.get(assignment.watchSlot) ?? [];
    bucket.push({ actorId: assignment.actorId, notes: "" });
    grouped.set(assignment.watchSlot, bucket);
  }

  const base = getRestStateRaw();
  const originalSlots = Array.isArray(base.slots) ? base.slots : [];
  const restoredSlots = originalSlots.map((slotRaw) => {
    if (!isPlainObject(slotRaw)) return slotRaw;
    const slotId = String(slotRaw.id ?? "").trim();
    if (!slotId) return slotRaw;
    return {
      ...slotRaw,
      actorId: null,
      notes: "",
      entries: grouped.get(slotId) ?? []
    };
  });

  return {
    ...base,
    slots: restoredSlots
  };
}

function buildRestActivitiesFromSnapshot(snapshot: RestWatchSnapshot): Record<string, unknown> {
  const activities: Record<string, unknown> = {};
  for (const assignment of snapshot.assignments) {
    activities[assignment.actorId] = {
      activity: assignment.activity || ""
    };
  }
  return {
    ...getRestActivitiesRaw(),
    activities
  };
}

export async function restoreSnapshot(idOrCreatedAt: string | number): Promise<PartyOpsSnapshot | null> {
  requireGm();
  const snapshots = listSnapshots();
  const needle = String(idOrCreatedAt ?? "").trim();
  if (!needle) return null;

  const found = snapshots.find((entry) => entry.id === needle || String(entry.createdAt) === needle) ?? null;
  if (!found) return null;

  if (found.kind === "marching-order") {
    await getGame().settings?.set(MODULE_ID, MARCH_STATE_KEY, buildMarchingStateFromSnapshot(found));
  } else {
    await getGame().settings?.set(MODULE_ID, REST_STATE_KEY, buildRestStateFromSnapshot(found));
    await getGame().settings?.set(MODULE_ID, REST_ACTIVITIES_KEY, buildRestActivitiesFromSnapshot(found));
  }

  getGame().partyOperations?.refreshAll?.();
  return found;
}
