export const DEFAULT_MARCH_ACTOR_IMAGE = "icons/svg/mystery-man.svg";

const ACTOR_PORTRAIT_PATHS = Object.freeze([
  "img",
  "_source.img",
  "thumbnail",
  "thumb",
  "portrait",
  "system.details.image",
  "system.details.avatar"
]);

const TOKEN_TEXTURE_PATHS = Object.freeze([
  "document.texture.src",
  "document._source.texture.src",
  "texture.src",
  "_source.texture.src",
  "object.document.texture.src",
  "object.document._source.texture.src",
  "object.texture.src",
  "prototypeToken.texture.src",
  "prototypeToken._source.texture.src",
  "token.texture.src",
  "token._source.texture.src"
]);

export function isDefaultFoundryActorImagePath(value = "") {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .split(/[?#]/, 1)[0]
    .toLowerCase();
  if (!normalized) return true;
  return (
    normalized.endsWith("icons/svg/mystery-man.svg") ||
    normalized.includes("/icons/svg/mystery-man.") ||
    normalized.endsWith("icons/svg/unknown.svg") ||
    normalized.includes("/icons/svg/unknown.")
  );
}

function readPath(source, path) {
  if (!source || typeof source !== "object") return "";
  let cursor = source;
  for (const segment of String(path ?? "").split(".")) {
    if (!segment) continue;
    cursor = cursor?.[segment];
    if (cursor === null || cursor === undefined) return "";
  }
  if (typeof cursor === "string") return cursor;
  if (cursor && typeof cursor === "object" && typeof cursor.src === "string") return cursor.src;
  return "";
}

function getActorSourceSnapshot(actor = null) {
  if (!actor || typeof actor?.toObject !== "function") return null;
  for (const args of [[false], []]) {
    try {
      const snapshot = actor.toObject(...args);
      if (snapshot && typeof snapshot === "object") return snapshot;
    } catch {
      // Try the next Foundry-version signature.
    }
  }
  return null;
}

function collectPathCandidates(source, paths) {
  if (!source || typeof source !== "object") return [];
  return paths.map((path) => readPath(source, path)).filter(Boolean);
}

function getActiveTokenTextureSources(actor = null) {
  if (!actor || typeof actor?.getActiveTokens !== "function") return [];
  const calls = [() => actor.getActiveTokens(true, true), () => actor.getActiveTokens()];
  for (const call of calls) {
    let tokens;
    try {
      tokens = call();
    } catch {
      continue;
    }
    if (!Array.isArray(tokens) || tokens.length <= 0) continue;
    return tokens
      .flatMap((token) => collectPathCandidates(token, TOKEN_TEXTURE_PATHS))
      .map((entry) => String(entry ?? "").trim())
      .filter(Boolean);
  }
  return [];
}

export function resolveMarchActorImage(
  actor = null,
  {
    normalizeImagePath = (value, { fallback = "" } = {}) => String(value ?? fallback ?? "").trim(),
    fallback = DEFAULT_MARCH_ACTOR_IMAGE
  } = {}
) {
  const actorSource = getActorSourceSnapshot(actor);
  const portraitCandidates = [
    ...collectPathCandidates(actor, ACTOR_PORTRAIT_PATHS),
    ...collectPathCandidates(actorSource, ACTOR_PORTRAIT_PATHS)
  ];
  const tokenCandidates = [
    ...getActiveTokenTextureSources(actor),
    ...collectPathCandidates(actor, TOKEN_TEXTURE_PATHS),
    ...collectPathCandidates(actorSource, TOKEN_TEXTURE_PATHS)
  ];
  const normalizeCandidates = (candidates) =>
    candidates
      .map((candidate) => normalizeImagePath(candidate, { fallback: "" }))
      .map((candidate) => String(candidate ?? "").trim())
      .filter(Boolean);

  const normalizedPortraits = normalizeCandidates(portraitCandidates);
  const preferredPortrait = normalizedPortraits.find((candidate) => !isDefaultFoundryActorImagePath(candidate));
  if (preferredPortrait) return preferredPortrait;

  const normalizedTokenCandidates = normalizeCandidates(tokenCandidates);
  const preferredToken = normalizedTokenCandidates.find((candidate) => !isDefaultFoundryActorImagePath(candidate));
  if (preferredToken) return preferredToken;

  const normalizedCandidates = [...normalizedPortraits, ...normalizedTokenCandidates];
  const firstCandidate = normalizedCandidates[0] ?? "";
  return normalizeImagePath(firstCandidate, { fallback }) || fallback;
}
