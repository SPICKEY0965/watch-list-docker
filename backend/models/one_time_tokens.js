import crypto from 'crypto';
import { runQuery, getQuery } from './query.js';

/**
 * ワンタイムトークンを作成し、データベースに保存する
 * @param {string} userId - ユーザーID
 * @param {string} actionType - アクションの種類 ('delete_account' or 'logout_device')
 * @param {number|null} targetId - 操作対象のID (デバイスのtokenIdなど)
 * @returns {Promise<string>} - 生成されたワンタイムトークン
 */
export async function createOneTimeToken(userId, actionType, targetId = null) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分後に失効

    const query = `
        INSERT INTO one_time_tokens (user_id, token, action_type, target_id, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `;
    await runQuery(query, [userId, token, actionType, targetId, expiresAt.toISOString()]);

    return token;
}

/**
 * ワンタイムトークンを検証し、使用済みにする
 * @param {string} token - 検証するトークン
 * @param {string} actionType - 期待されるアクションの種類
 * @returns {Promise<{userId: string, targetId: number|null}>} - 検証に成功した場合、ユーザーIDとターゲットIDを返す
 * @throws {Error} - 検証に失敗した場合
 */
export async function verifyOneTimeToken(token, actionType) {
    const now = new Date();

    // トークンを取得
    const tokenData = await getQuery('SELECT * FROM one_time_tokens WHERE token = ?', [token]);

    if (!tokenData) {
        throw new Error('Invalid or expired token.');
    }

    // アクションタイプが一致するか確認
    if (tokenData.action_type !== actionType) {
        throw new Error('Invalid or expired token.');
    }

    // 使用済みか確認
    if (tokenData.used_at) {
        throw new Error('Invalid or expired token.');
    }

    // 有効期限を確認
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
        throw new Error('Invalid or expired token.');
    }

    // トークンを使用済みに更新
    await runQuery('UPDATE one_time_tokens SET used_at = ? WHERE id = ?', [now.toISOString(), tokenData.id]);

    return { userId: tokenData.user_id, targetId: tokenData.target_id };
}
