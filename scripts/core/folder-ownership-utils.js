export function parseFolderOwnershipBatchLevelsFromSubmitData(submitData = {}, options = {}) {
  const constDocOwnershipLevels = options.constDocOwnershipLevels ?? {};
  const source = submitData && typeof submitData === "object" ? submitData : {};
  const levels = {};
  for (const [key, rawValue] of Object.entries(source)) {
    const textKey = String(key ?? "").trim();
    if (!textKey.startsWith("ownership.")) continue;
    const ownershipKey = textKey.slice("ownership.".length).trim();
    if (!ownershipKey) continue;
    const levelRaw = Number(rawValue);
    if (!Number.isFinite(levelRaw) || levelRaw < 0) continue;
    const level = Math.max(
      Number(constDocOwnershipLevels?.NONE ?? 0),
      Math.min(Number(constDocOwnershipLevels?.OWNER ?? 3), Math.trunc(levelRaw))
    );
    levels[ownershipKey] = level;
  }
  return levels;
}
