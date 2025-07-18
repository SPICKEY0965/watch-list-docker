import { db } from '../db.js';
import { runQuery, getQuery, allQuery } from './query.js';

/**
 * Creates a new authentication token.
 * @param {string} userId - The user's ID.
 * @param {string} token - The JWT.
 * @param {string} deviceInfo - Information about the user's device.
 * @param {Date} expiresAt - The token's expiration date.
 * @returns {Promise<object>}
 */
function createAuthToken({ userId, token, deviceInfo, expiresAt }) {
  const sql = `
    INSERT INTO auth_tokens (user_id, token, device_info, expires_at, last_used_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `;
  return runQuery(sql, [userId, token, deviceInfo, expiresAt]);
}

/**
 * Finds an authentication token by the token string.
 * @param {string} token - The JWT.
 * @returns {Promise<object|null>}
 */
function findAuthToken(token) {
  const sql = 'SELECT * FROM auth_tokens WHERE token = ?';
  return getQuery(sql, [token]);
}

/**
 * Updates the last used timestamp for a token.
 * @param {string} token - The JWT.
 * @returns {Promise<object>}
 */
function updateLastUsed(token) {
  const sql = "UPDATE auth_tokens SET last_used_at = datetime('now') WHERE token = ?";
  return runQuery(sql, [token]);
}

/**
 * Deletes a specific authentication token.
 * @param {string} token - The JWT to delete.
 * @returns {Promise<object>}
 */
function deleteAuthToken(token) {
  const sql = 'DELETE FROM auth_tokens WHERE token = ?';
  return runQuery(sql, [token]);
}

/**
 * Deletes all authentication tokens for a specific user.
 * @param {string} userId - The user's ID.
 * @returns {Promise<object>}
 */
function deleteAllUserAuthTokens(userId) {
  const sql = 'DELETE FROM auth_tokens WHERE user_id = ?';
  return runQuery(sql, [userId]);
}

/**
 * Retrieves all authentication tokens for a specific user.
 * @param {string} userId - The user's ID.
 * @returns {Promise<Array>}
 */
function getUserAuthTokens(userId) {
  const sql = 'SELECT id, device_info, last_used_at, created_at, token FROM auth_tokens WHERE user_id = ?';
  return allQuery(sql, [userId]);
}

/**
 * Deletes a specific authentication token by its ID.
 * @param {number} id - The ID of the token to delete.
 * @param {string} userId - The user's ID for authorization.
 * @returns {Promise<object>}
 */
function deleteAuthTokenById(id, userId) {
  const sql = 'DELETE FROM auth_tokens WHERE id = ? AND user_id = ?';
  return runQuery(sql, [id, userId]);
}

export {
  createAuthToken,
  findAuthToken,
  updateLastUsed,
  deleteAuthToken,
  deleteAllUserAuthTokens,
  getUserAuthTokens,
  deleteAuthTokenById,
};
