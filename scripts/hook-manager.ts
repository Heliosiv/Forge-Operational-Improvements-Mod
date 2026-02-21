import { registerPartyOpsSettings, type PartyOpsSettingKey, type PartyOpsSettingValueMap } from "./settings-registry";

const MODULE_ID = "party-operations";
const MARCHING_ORDER_STATE_KEY = "marchingOrderState";

type HookHandler = (...args: unknown[]) => void | Promise<void>;

interface HookApi {
  on(event: string, handler: HookHandler): number;
}

interface FoundrySettingsApi {
  get(namespace: string, key: string): unknown;
}

interface FoundryGameApi {
  user?: {
    isGM?: boolean;
  };
  settings?: FoundrySettingsApi;
}

interface PartyOpsPublicApi {
  showLauncher?: () => unknown;
}

interface InternalEventMap {
  ready: { isGM: boolean };
  settingsChanged: { key: PartyOpsSettingKey; value: PartyOpsSettingValueMap[PartyOpsSettingKey] };
  inventoryChanged: { actorId: string; changed: Record<string, unknown> };
  marchingOrderSnapshot: { combatId: string | null; snapshot: unknown };
}

type EventName = keyof InternalEventMap;
type EventListener<K extends EventName> = (payload: InternalEventMap[K]) => void;

class PartyOpsEventBus {
  private listeners = new Map<EventName, Set<(payload: unknown) => void>>();

  on<K extends EventName>(eventName: K, listener: EventListener<K>): () => void {
    const current = this.listeners.get(eventName) ?? new Set<(payload: unknown) => void>();
    this.listeners.set(eventName, current);
    current.add(listener as (payload: unknown) => void);
    return () => current.delete(listener as (payload: unknown) => void);
  }

  emit<K extends EventName>(eventName: K, payload: InternalEventMap[K]): void {
    const current = this.listeners.get(eventName);
    if (!current || current.size === 0) return;
    for (const listener of current) listener(payload);
  }
}

export const partyOpsEvents = new PartyOpsEventBus();

let hooksRegistered = false;
let settingsRegistered = false;

function getHooks(): HookApi | null {
  const candidate = (globalThis as { Hooks?: HookApi }).Hooks;
  return candidate ?? null;
}

function getGame(): FoundryGameApi {
  return (globalThis as { game?: FoundryGameApi }).game ?? {};
}

function isGmUser(): boolean {
  return Boolean(getGame().user?.isGM);
}

function getPartyOpsApi(): PartyOpsPublicApi {
  const root = globalThis as {
    partyOperations?: PartyOpsPublicApi;
    PartyOperations?: PartyOpsPublicApi;
    game?: { partyOperations?: PartyOpsPublicApi };
  };
  return root.partyOperations ?? root.PartyOperations ?? root.game?.partyOperations ?? {};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasInventoryDelta(changed: unknown): changed is Record<string, unknown> {
  if (!isPlainObject(changed)) return false;
  if (Object.prototype.hasOwnProperty.call(changed, "items")) return true;
  const system = changed.system;
  if (!isPlainObject(system)) return false;
  return Object.prototype.hasOwnProperty.call(system, "currency") || Object.prototype.hasOwnProperty.call(system, "inventory");
}

function getMarchingOrderSnapshot(): unknown {
  const settings = getGame().settings;
  if (!settings) return null;
  const value = settings.get(MODULE_ID, MARCHING_ORDER_STATE_KEY);
  if (!isPlainObject(value)) return value ?? null;
  return { ...value };
}

function onReady(): void {
  if (!settingsRegistered) {
    settingsRegistered = true;
    registerPartyOpsSettings((key, value) => {
      partyOpsEvents.emit("settingsChanged", { key, value });
    });
  }

  const gm = isGmUser();
  partyOpsEvents.emit("ready", { isGM: gm });
  if (!gm) return;

  getPartyOpsApi().showLauncher?.();
}

function onUpdateActor(actor: unknown, changed: unknown): void {
  if (!isGmUser()) return;
  if (!hasInventoryDelta(changed)) return;

  const actorLike = actor as { id?: unknown };
  const actorId = String(actorLike?.id ?? "").trim();
  if (!actorId) return;

  partyOpsEvents.emit("inventoryChanged", {
    actorId,
    changed: isPlainObject(changed) ? changed : {}
  });
}

function onCreateCombat(combat: unknown): void {
  if (!isGmUser()) return;

  const combatLike = combat as { id?: unknown };
  const combatIdRaw = String(combatLike?.id ?? "").trim();
  const combatId = combatIdRaw || null;
  const snapshot = getMarchingOrderSnapshot();

  partyOpsEvents.emit("marchingOrderSnapshot", {
    combatId,
    snapshot
  });
}

export function registerPartyOpsHooks(): void {
  if (hooksRegistered) return;
  const hooks = getHooks();
  if (!hooks) return;

  hooksRegistered = true;
  hooks.on("ready", onReady);
  hooks.on("updateActor", onUpdateActor);
  hooks.on("createCombat", onCreateCombat);
}
