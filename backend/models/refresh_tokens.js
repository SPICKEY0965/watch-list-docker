import sql from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const REFRESH_TOKEN_VALIDITY_DAYS = 30;

/**
 * Creates a hash of a token.
 * @param {string} token - The token to hash.
 * @returns {string} The hashed token.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a new refresh token for a user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<{id: string, token: string}>} An object containing the token ID and the raw token string.
 */
export async function createRefreshToken(userId) {
  const id = uuidv4();
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_VALIDITY_DAYS);

  await sql`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (${id}, ${userId}, ${tokenHash}, ${expiresAt})
  `;

  return { id, token };
}

/**
 * Verifies a refresh token.
 * @param {string} token - The refresh token string from the client.
 * @returns {Promise<{userId: number, tokenId: string} | null>} The user ID and token ID if the token is valid, otherwise null.
 */
export async function verifyRefreshToken(token) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const results = await sql`
    SELECT user_id, id, expires_at, revoked
    FROM refresh_tokens
    WHERE token_hash = ${tokenHash}
  `;

  if (results.length === 0) {
    return null;
  }

  const tokenRecord = results[0];

  if (tokenRecord.revoked || new Date(tokenRecord.expires_at) < now) {
    return null;
  }

  return { userId: tokenRecord.user_id, tokenId: tokenRecord.id };
}

/**
 * Invalidates a refresh token by its ID.
 * @param {string} tokenId - The UUID of the token to invalidate.
 * @returns {Promise<void>}
 */
export async function invalidateRefreshToken(tokenId) {
  await sql`
    UPDATE refresh_tokens
    SET revoked = TRUE
    WHERE id = ${tokenId}
  `;
}

/**
 * Invalidates all refresh tokens for a user.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<void>}
 */
export async function invalidateAllRefreshTokensForUser(userId) {
    await sql`
        UPDATE refresh_tokens
        SET revoked = TRUE
        WHERE user_id = ${userId}
    `;
}
