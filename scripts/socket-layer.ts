import type { LootGenerationInput, LootGenerationOutput } from "./loot-generation-engine";

export const PARTY_OPS_SOCKET_CHANNEL = "module.party-operations";

export const PARTY_OPS_SOCKET_MESSAGE_TYPE = {
  REQUEST_SNAPSHOT: "REQUEST_SNAPSHOT",
  RESPONSE_SNAPSHOT: "RESPONSE_SNAPSHOT",
  REQUEST_GENERATE_LOOT: "REQUEST_GENERATE_LOOT",
  RESPONSE_GENERATE_LOOT: "RESPONSE_GENERATE_LOOT"
} as const;

type PartyOpsSocketMessageType = typeof PARTY_OPS_SOCKET_MESSAGE_TYPE[keyof typeof PARTY_OPS_SOCKET_MESSAGE_TYPE];

export interface PartyOpsSnapshotPayload {
  restWatch: unknown;
  marchingOrder: unknown;
}

interface SocketEnvelopeBase {
  type: PartyOpsSocketMessageType;
  requestId: string;
  requesterUserId: string;
  responderUserId?: string;
}

interface RequestSnapshotMessage extends SocketEnvelopeBase {
  type: typeof PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_SNAPSHOT;
}

interface ResponseSnapshotMessage extends SocketEnvelopeBase {
  type: typeof PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_SNAPSHOT;
  payload: PartyOpsSnapshotPayload | null;
  error?: string;
}

interface RequestGenerateLootMessage extends SocketEnvelopeBase {
  type: typeof PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_GENERATE_LOOT;
  payload: LootGenerationInput;
}

interface ResponseGenerateLootMessage extends SocketEnvelopeBase {
  type: typeof PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_GENERATE_LOOT;
  payload: LootGenerationOutput | null;
  error?: string;
}

type PartyOpsSocketMessage =
  | RequestSnapshotMessage
  | ResponseSnapshotMessage
  | RequestGenerateLootMessage
  | ResponseGenerateLootMessage;

interface SocketApi {
  on(channel: string, handler: (message: PartyOpsSocketMessage) => void): void;
  emit(channel: string, message: PartyOpsSocketMessage): void;
}

interface FoundryGameLike {
  user?: {
    id?: string;
    isGM?: boolean;
  };
  socket?: SocketApi;
  settings?: {
    get(namespace: string, key: string): unknown;
  };
}

type SnapshotProvider = () => Promise<PartyOpsSnapshotPayload> | PartyOpsSnapshotPayload;
type LootProvider = (payload: LootGenerationInput) => Promise<LootGenerationOutput> | LootGenerationOutput;

const pendingSnapshotRequests = new Map<string, {
  resolve: (value: PartyOpsSnapshotPayload | null) => void;
  reject: (reason?: unknown) => void;
}>();

const pendingLootRequests = new Map<string, {
  resolve: (value: LootGenerationOutput | null) => void;
  reject: (reason?: unknown) => void;
}>();

let socketInitialized = false;
let snapshotProvider: SnapshotProvider = () => ({ restWatch: {}, marchingOrder: {} });
let lootProvider: LootProvider = () => ({ gold: 0, items: [] });

function getGame(): FoundryGameLike {
  return (globalThis as { game?: FoundryGameLike }).game ?? {};
}

function getCurrentUserId(): string {
  return String(getGame().user?.id ?? "").trim();
}

function isCurrentUserGm(): boolean {
  return Boolean(getGame().user?.isGM);
}

function randomId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `po-${Date.now()}-${randomPart}`;
}

function emitSocket(message: PartyOpsSocketMessage): void {
  getGame().socket?.emit(PARTY_OPS_SOCKET_CHANNEL, message);
}

function handleSnapshotResponse(message: ResponseSnapshotMessage): void {
  const pending = pendingSnapshotRequests.get(message.requestId);
  if (!pending) return;
  pendingSnapshotRequests.delete(message.requestId);
  if (message.error) {
    pending.reject(new Error(message.error));
    return;
  }
  pending.resolve(message.payload ?? null);
}

function handleLootResponse(message: ResponseGenerateLootMessage): void {
  const pending = pendingLootRequests.get(message.requestId);
  if (!pending) return;
  pendingLootRequests.delete(message.requestId);
  if (message.error) {
    pending.reject(new Error(message.error));
    return;
  }
  pending.resolve(message.payload ?? null);
}

async function handleSnapshotRequest(message: RequestSnapshotMessage): Promise<void> {
  if (!isCurrentUserGm()) return;

  try {
    const payload = await snapshotProvider();
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_SNAPSHOT,
      requestId: message.requestId,
      requesterUserId: message.requesterUserId,
      responderUserId: getCurrentUserId(),
      payload
    });
  } catch (error) {
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_SNAPSHOT,
      requestId: message.requestId,
      requesterUserId: message.requesterUserId,
      responderUserId: getCurrentUserId(),
      payload: null,
      error: String(error instanceof Error ? error.message : error)
    });
  }
}

async function handleGenerateLootRequest(message: RequestGenerateLootMessage): Promise<void> {
  if (!isCurrentUserGm()) return;

  try {
    const payload = await lootProvider(message.payload);
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_GENERATE_LOOT,
      requestId: message.requestId,
      requesterUserId: message.requesterUserId,
      responderUserId: getCurrentUserId(),
      payload
    });
  } catch (error) {
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_GENERATE_LOOT,
      requestId: message.requestId,
      requesterUserId: message.requesterUserId,
      responderUserId: getCurrentUserId(),
      payload: null,
      error: String(error instanceof Error ? error.message : error)
    });
  }
}

function handleIncomingSocketMessage(message: PartyOpsSocketMessage): void {
  if (!message || typeof message !== "object") return;

  const currentUserId = getCurrentUserId();
  const isRequester = message.requesterUserId === currentUserId;

  if (message.type === PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_SNAPSHOT) {
    void handleSnapshotRequest(message);
    return;
  }

  if (message.type === PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_GENERATE_LOOT) {
    void handleGenerateLootRequest(message);
    return;
  }

  if (!isRequester) return;

  if (message.type === PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_SNAPSHOT) {
    handleSnapshotResponse(message);
    return;
  }

  if (message.type === PARTY_OPS_SOCKET_MESSAGE_TYPE.RESPONSE_GENERATE_LOOT) {
    handleLootResponse(message);
  }
}

export function initSocket(options: {
  provideSnapshot?: SnapshotProvider;
  provideGenerateLoot?: LootProvider;
} = {}): void {
  if (options.provideSnapshot) snapshotProvider = options.provideSnapshot;
  if (options.provideGenerateLoot) lootProvider = options.provideGenerateLoot;

  if (socketInitialized) return;
  const socket = getGame().socket;
  if (!socket?.on) return;

  socketInitialized = true;
  socket.on(PARTY_OPS_SOCKET_CHANNEL, handleIncomingSocketMessage);
}

export async function requestSnapshot(): Promise<PartyOpsSnapshotPayload | null> {
  const requestId = randomId();
  const requesterUserId = getCurrentUserId();

  return new Promise<PartyOpsSnapshotPayload | null>((resolve, reject) => {
    pendingSnapshotRequests.set(requestId, { resolve, reject });
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_SNAPSHOT,
      requestId,
      requesterUserId
    });
  });
}

export async function requestGenerateLoot(payload: LootGenerationInput): Promise<LootGenerationOutput | null> {
  const requestId = randomId();
  const requesterUserId = getCurrentUserId();

  return new Promise<LootGenerationOutput | null>((resolve, reject) => {
    pendingLootRequests.set(requestId, { resolve, reject });
    emitSocket({
      type: PARTY_OPS_SOCKET_MESSAGE_TYPE.REQUEST_GENERATE_LOOT,
      requestId,
      requesterUserId,
      payload
    });
  });
}
