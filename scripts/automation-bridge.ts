const MODULE_ID = "party-operations";

export interface ActiveEffectChangeData {
  key: string;
  mode: number;
  value: string;
  priority?: number;
}

export interface ActiveEffectData {
  label: string;
  icon?: string;
  changes: ActiveEffectChangeData[];
  disabled?: boolean;
  duration?: {
    rounds?: number;
    seconds?: number;
    startRound?: number;
    startTime?: number;
  };
  flags?: Record<string, unknown>;
}

interface BuildEffectInput {
  label: string;
  icon?: string;
  changes?: ActiveEffectChangeData[];
  durationRounds?: number;
  durationSeconds?: number;
}

interface FoundryActorLike {
  effects?: Iterable<unknown>;
  createEmbeddedDocuments?: (embeddedName: string, data: unknown[]) => Promise<unknown>;
  deleteEmbeddedDocuments?: (embeddedName: string, ids: string[]) => Promise<unknown>;
  updateEmbeddedDocuments?: (embeddedName: string, updates: unknown[]) => Promise<unknown>;
}

function getEffectModeAdd(): number {
  const value = (globalThis as { CONST?: { ACTIVE_EFFECT_MODES?: { ADD?: number } } }).CONST?.ACTIVE_EFFECT_MODES?.ADD;
  return Number.isFinite(value) ? Number(value) : 2;
}

function getEffectModeOverride(): number {
  const value = (globalThis as { CONST?: { ACTIVE_EFFECT_MODES?: { OVERRIDE?: number } } }).CONST?.ACTIVE_EFFECT_MODES?.OVERRIDE;
  return Number.isFinite(value) ? Number(value) : 5;
}

function isDaeActive(): boolean {
  try {
    const gameRef = (globalThis as { game?: { modules?: { get: (id: string) => { active?: boolean } | undefined } } }).game;
    return Boolean(gameRef?.modules?.get?.("dae")?.active);
  } catch {
    return false;
  }
}

function normalizeDuration(input: BuildEffectInput): ActiveEffectData["duration"] | undefined {
  const rounds = Number(input.durationRounds);
  const seconds = Number(input.durationSeconds);
  const hasRounds = Number.isFinite(rounds) && rounds > 0;
  const hasSeconds = Number.isFinite(seconds) && seconds > 0;
  if (!hasRounds && !hasSeconds) return undefined;

  const duration: NonNullable<ActiveEffectData["duration"]> = {};
  if (hasRounds) duration.rounds = Math.floor(rounds);
  if (hasSeconds) duration.seconds = seconds;

  const combat = (globalThis as { game?: { combat?: { round?: number } } }).game?.combat;
  const worldTime = (globalThis as { game?: { time?: { worldTime?: number } } }).game?.time?.worldTime;
  if (Number.isFinite(Number(combat?.round))) duration.startRound = Number(combat?.round);
  if (Number.isFinite(Number(worldTime))) duration.startTime = Number(worldTime);

  return duration;
}

function withDaePreferredFlags(data: ActiveEffectData): ActiveEffectData {
  if (!isDaeActive()) return data;
  const existingFlags = data.flags ?? {};
  const daeFlags = {
    ...(typeof existingFlags["dae"] === "object" && existingFlags["dae"] !== null ? (existingFlags["dae"] as Record<string, unknown>) : {}),
    transfer: true,
    stackable: "noneName"
  };

  return {
    ...data,
    flags: {
      ...existingFlags,
      dae: daeFlags
    }
  };
}

export function buildEffect(input: BuildEffectInput): ActiveEffectData {
  const base: ActiveEffectData = {
    label: String(input.label ?? "Effect").trim() || "Effect",
    icon: String(input.icon ?? "icons/svg/aura.svg").trim() || "icons/svg/aura.svg",
    changes: Array.isArray(input.changes) ? input.changes : [],
    disabled: false,
    duration: normalizeDuration(input),
    flags: {
      [MODULE_ID]: {
        source: "automation-bridge"
      }
    }
  };

  return withDaePreferredFlags(base);
}

function extractEffectInfo(effect: unknown): { id: string; label: string } | null {
  if (!effect || typeof effect !== "object") return null;
  const data = effect as { id?: unknown; _id?: unknown; label?: unknown; name?: unknown };
  const id = String(data.id ?? data._id ?? "").trim();
  const label = String(data.label ?? data.name ?? "").trim();
  if (!id || !label) return null;
  return { id, label };
}

export async function applyEffectToActor(actor: FoundryActorLike | null | undefined, effectData: ActiveEffectData): Promise<void> {
  if (!actor || typeof actor !== "object") return;
  if (typeof actor.createEmbeddedDocuments !== "function") return;

  const payload = withDaePreferredFlags(effectData);
  await actor.createEmbeddedDocuments("ActiveEffect", [payload]);
}

export async function removeEffectsByLabel(actor: FoundryActorLike | null | undefined, label: string): Promise<void> {
  if (!actor || typeof actor !== "object") return;
  if (typeof actor.deleteEmbeddedDocuments !== "function") return;

  const target = String(label ?? "").trim().toLowerCase();
  if (!target) return;

  const ids: string[] = [];
  for (const effect of actor.effects ?? []) {
    const info = extractEffectInfo(effect);
    if (!info) continue;
    if (info.label.trim().toLowerCase() !== target) continue;
    ids.push(info.id);
  }

  if (ids.length === 0) return;
  await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

export function buildFatiguedEffect(options: {
  durationRounds?: number;
  durationSeconds?: number;
  icon?: string;
} = {}): ActiveEffectData {
  const useDae = isDaeActive();
  const mode = getEffectModeOverride();
  const changes: ActiveEffectChangeData[] = useDae
    ? [
      {
        key: "flags.dae.partyOps.fatigued",
        mode,
        value: "true"
      }
    ]
    : [
      {
        key: "flags.party-operations.fatigued",
        mode,
        value: "true"
      }
    ];

  return buildEffect({
    label: "Fatigued",
    icon: options.icon ?? "icons/svg/downgrade.svg",
    changes,
    durationRounds: options.durationRounds,
    durationSeconds: options.durationSeconds
  });
}

export function buildEncumberedEffect(options: {
  movementPenalty?: number;
  durationRounds?: number;
  durationSeconds?: number;
  icon?: string;
} = {}): ActiveEffectData {
  const penalty = Number.isFinite(Number(options.movementPenalty)) ? Number(options.movementPenalty) : 10;
  const modeAdd = getEffectModeAdd();
  const modeOverride = getEffectModeOverride();
  const useDae = isDaeActive();
  const changes: ActiveEffectChangeData[] = useDae
    ? [
      {
        key: "flags.dae.partyOps.encumberedPenalty",
        mode: modeOverride,
        value: String(Math.max(0, penalty))
      }
    ]
    : [
      {
        key: "flags.party-operations.encumberedPenalty",
        mode: modeOverride,
        value: String(Math.max(0, penalty))
      },
      {
        key: "flags.party-operations.movementPenaltyApplied",
        mode: modeAdd,
        value: "1"
      }
    ];

  return buildEffect({
    label: "Encumbered",
    icon: options.icon ?? "icons/svg/anchor.svg",
    changes,
    durationRounds: options.durationRounds,
    durationSeconds: options.durationSeconds
  });
}
