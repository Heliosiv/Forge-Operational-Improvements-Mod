/**
 * Socket write policy validation functions.
 * Determines what settings can be written via socket messages and who has permission to write them.
 */

import { MODULE_ID } from "./constants.js";
import { SETTINGS } from "./settings-keys.js";

/**
 * Validate that a setting key can be written via socket messages.
 * A setting is writable if it exists in the SETTINGS constant map.
 * @param {string} settingKeyInput - The setting key to validate
 * @returns {boolean} True if the key is a valid, writable module setting
 */
export function isWritableModuleSettingKey(settingKeyInput) {
  const settingKey = String(settingKeyInput ?? "").trim();
  if (!settingKey) return false;
  return Object.values(SETTINGS).includes(settingKey);
}

/**
 * Check if a user has permission to write all player-accessible settings.
 * Admins (GMs) always have full access. Non-admins only have access if the shared permission is enabled.
 * @param {Object} user - The user object (defaults to game.user)
 * @returns {boolean} True if the user can write player-accessible settings
 */
export function canAccessAllPlayerOps(user = globalThis.game?.user) {
  if (!user) return false;
  if (user?.isGM) return true;
  try {
    return Boolean(globalThis.game?.settings?.get?.(MODULE_ID, SETTINGS.SHARED_GM_PERMISSIONS));
  } catch {
    return false;
  }
}

/**
 * Check if there is an active GM client connected.
 * Used to determine if settings should be refreshed immediately or queued.
 * @returns {boolean} True if at least one active GM user is connected
 */
export function hasActiveGmClient() {
  const users = globalThis.game?.users?.contents ?? globalThis.game?.users ?? [];
  return users.some((user) => Boolean(user?.active) && Boolean(user?.isGM));
}

/**
 * Check whether a specific user id belongs to an active GM client.
 * @param {string} userIdInput - Candidate user id
 * @param {Object} gameRef - Foundry game object
 * @returns {boolean} True if the id resolves to an active GM user
 */
export function isActiveGmUserId(userIdInput, gameRef = globalThis.game) {
  const userId = String(userIdInput ?? "").trim();
  if (!userId) return false;
  const usersCollection = gameRef?.users;
  const directUser = usersCollection?.get?.(userId) ?? null;
  if (directUser) return Boolean(directUser.active && directUser.isGM);
  const users = usersCollection?.contents ?? usersCollection ?? [];
  return users.some((user) => String(user?.id ?? "").trim() === userId && Boolean(user?.active) && Boolean(user?.isGM));
}
