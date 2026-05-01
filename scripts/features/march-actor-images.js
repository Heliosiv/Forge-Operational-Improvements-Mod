export const DEFAULT_MARCH_ACTOR_IMAGE = "icons/svg/mystery-man.svg";

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
      .flatMap((token) => [
        token?.document?.texture?.src,
        token?.texture?.src,
        token?.object?.document?.texture?.src,
        token?.object?.texture?.src
      ])
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
  const portraitCandidates = [actor?.img];
  const tokenCandidates = [
    ...getActiveTokenTextureSources(actor),
    actor?.prototypeToken?.texture?.src,
    actor?.token?.texture?.src
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
