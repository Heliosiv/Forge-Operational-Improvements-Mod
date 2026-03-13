export const LOOT_PREVIEW_BASE_TARGET_GP_BY_MODE = Object.freeze({
  defeated: Object.freeze({ low: 24, mid: 90, high: 320, epic: 980 }),
  encounter: Object.freeze({ low: 45, mid: 180, high: 700, epic: 2200 }),
  // Keep horde brackets monotonic after raising the CR 0-4 baseline.
  horde: Object.freeze({ low: 780, mid: 1000, high: 1250, epic: 3800 })
});

export function getLootPreviewBaseTargetGp(mode = "horde", challenge = "mid") {
  const normalizedMode = String(mode ?? "horde").trim().toLowerCase();
  const modeKey = normalizedMode === "defeated" || normalizedMode === "encounter" || normalizedMode === "horde"
    ? normalizedMode
    : "horde";
  const normalizedChallenge = String(challenge ?? "mid").trim().toLowerCase();
  const byMode = LOOT_PREVIEW_BASE_TARGET_GP_BY_MODE[modeKey] ?? LOOT_PREVIEW_BASE_TARGET_GP_BY_MODE.horde;
  return Math.max(1, Number(byMode[normalizedChallenge] ?? byMode.mid) || byMode.mid);
}
