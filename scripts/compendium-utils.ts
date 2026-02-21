const MODULE_ID = "party-operations";

export interface Item {
  id?: string;
  name?: string;
  type?: string;
  system?: {
    description?: {
      value?: string;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface FilterItemsOptions {
  typeWhitelist?: string[];
  nameIncludes?: string[];
  rarityKeywords?: string[];
}

export interface WeightedPoolEntry<TItem extends Item = Item> {
  item: TItem;
  weight: number;
}

interface CompendiumPackLike {
  collection?: string;
  metadata?: { type?: string };
  documentName?: string;
  getDocuments?: () => Promise<unknown[]>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTerms(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((entry) => String(entry ?? "").trim().toLowerCase())
    .filter(Boolean);
}

function toLowerText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function getDescriptionText(item: Item): string {
  const html = item?.system?.description?.value;
  return stripHtml(String(html ?? "")).toLowerCase();
}

function isDebugEnabled(): boolean {
  try {
    const gameRef = (globalThis as { game?: { settings?: { get: (namespace: string, key: string) => unknown } } }).game;
    const raw = gameRef?.settings?.get?.(MODULE_ID, "debugEnabled");
    return Boolean(raw);
  } catch {
    return false;
  }
}

function debugError(message: string, details?: unknown): void {
  if (!isDebugEnabled()) return;
  if (details === undefined) {
    console.error(`${MODULE_ID}: ${message}`);
    return;
  }
  console.error(`${MODULE_ID}: ${message}`, details);
}

function getPackFromGame(packId: string): CompendiumPackLike | null {
  const gameRef = (globalThis as {
    game?: {
      packs?: {
        get: (id: string) => unknown;
      };
    };
  }).game;

  if (!gameRef?.packs?.get) return null;
  const pack = gameRef.packs.get(packId);
  if (!pack || !isPlainObject(pack)) return null;
  return pack as unknown as CompendiumPackLike;
}

function isItemPack(pack: CompendiumPackLike): boolean {
  const byDocumentName = toLowerText(pack.documentName) === "item";
  const byMetadataType = toLowerText(pack.metadata?.type) === "item";
  return byDocumentName || byMetadataType;
}

function toItemArray(documents: unknown[]): Item[] {
  return documents.filter((entry) => isPlainObject(entry)) as Item[];
}

export async function loadItemsFromPack(packId: string): Promise<Item[]> {
  const normalizedPackId = String(packId ?? "").trim();
  if (!normalizedPackId) {
    debugError("loadItemsFromPack called without a pack id.");
    return [];
  }

  const pack = getPackFromGame(normalizedPackId);
  if (!pack) {
    debugError(`Compendium pack not found: ${normalizedPackId}`);
    return [];
  }

  if (!isItemPack(pack)) {
    debugError(`Compendium pack is not an Item pack: ${normalizedPackId}`, {
      documentName: pack.documentName,
      metadataType: pack.metadata?.type
    });
    return [];
  }

  if (typeof pack.getDocuments !== "function") {
    debugError(`Compendium pack does not support getDocuments(): ${normalizedPackId}`);
    return [];
  }

  try {
    const docs = await pack.getDocuments();
    return toItemArray(Array.isArray(docs) ? docs : []);
  } catch (error) {
    debugError(`Failed to load documents from compendium pack: ${normalizedPackId}`, error);
    return [];
  }
}

export function filterItems(items: Item[], options: FilterItemsOptions = {}): Item[] {
  const source = Array.isArray(items) ? items : [];
  const typeWhitelist = normalizeTerms(options.typeWhitelist);
  const nameIncludes = normalizeTerms(options.nameIncludes);
  const rarityKeywords = normalizeTerms(options.rarityKeywords);

  return source.filter((item) => {
    const itemType = toLowerText(item?.type);
    const itemName = toLowerText(item?.name);
    const description = getDescriptionText(item);

    if (typeWhitelist.length > 0 && !typeWhitelist.includes(itemType)) return false;

    if (nameIncludes.length > 0) {
      const nameMatches = nameIncludes.some((term) => itemName.includes(term));
      if (!nameMatches) return false;
    }

    if (rarityKeywords.length > 0) {
      const rarityMatches = rarityKeywords.some((term) => itemName.includes(term) || description.includes(term));
      if (!rarityMatches) return false;
    }

    return true;
  });
}

export function buildWeightedPool<TItem extends Item>(
  items: TItem[],
  weightFn: (item: TItem) => number
): Array<WeightedPoolEntry<TItem>> {
  const source = Array.isArray(items) ? items : [];
  if (typeof weightFn !== "function") return [];

  const pool: Array<WeightedPoolEntry<TItem>> = [];
  for (const item of source) {
    const rawWeight = Number(weightFn(item));
    if (!Number.isFinite(rawWeight)) continue;
    if (rawWeight <= 0) continue;
    pool.push({ item, weight: rawWeight });
  }

  return pool;
}
