import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { runQuery, getQuery, allQuery } from './query.js';

/**
 * ユーザー登録
 * @param {object} data - 登録データ { username, password, private }
 * @returns {Promise<string>} - 登録されたユーザーID
 */
async function registerUser({ username, password, private: isPrivate }) {
    try {
        const hashedPassword = await bcrypt.hash(password, 13);
        const userId = uuidv4();

        // トランザクションを使用してユーザーとユーザープロフィールを同時に登録
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run(
                    'INSERT INTO users (user_id, user_name, password, private, status) VALUES (?, ?, ?, ?, ?)',
                    [userId, username, hashedPassword, isPrivate, 'active'],
                    function (err) {
                        if (err) {
                            db.run('ROLLBACK');
                            if (err.message.includes('UNIQUE constraint failed')) {
                                return reject({ status: 409, message: 'Username already exists.' });
                            }
                            return reject({ status: 500, message: 'Error registering new user.' });
                        }
                        db.run(
                            'INSERT INTO user_profiles (user_id, added_at) VALUES (?, datetime("now"))',
                            [userId],
                            function (err) {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return reject({ status: 500, message: 'Error creating user profile.' });
                                }
                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                        return reject({ status: 500, message: 'Transaction commit failed.' });
                                    }
                                    resolve();
                                });
                            }
                        );
                    }
                );
            });
        });
        return userId;
    } catch (error) {
        if (error.status) throw error;
        throw { status: 500, message: 'Database error occurred.' };
    }
}

/**
 * ユーザー名からユーザー情報を取得
 * @param {string} username - ユーザー名
 * @returns {Promise<object>} - ユーザー情報
 */
function getUserByUsername(username) {
    return getQuery('SELECT * FROM users WHERE user_name = ?', [username]);
}

/**
 * ユーザーIDからユーザー情報を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>} - ユーザー情報（user_id, user_name, private）
 */
function getUserById(userId) {
    return getQuery('SELECT user_id, user_name, private FROM users WHERE user_id = ?', [userId]);
}

/**
 * 最終ログイン日時を更新
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>}
 */
function updateLastLogin(userId) {
    return runQuery('UPDATE user_profiles SET last_login = datetime("now") WHERE user_id = ?', [userId]);
}

/**
 * ユーザー情報の更新（動的クエリで複数フィールドを一括更新）
 * @param {string} userId - ユーザーID
 * @param {object} data - 更新データ { username, password, private }
 * @returns {Promise<number>} - 更新件数
 */
async function updateUser(userId, { username, password, private: isPrivate }) {
    const fields = [];
    const params = [];

    if (username) {
        fields.push('user_name = ?');
        params.push(username);
    }
    if (password) {
        try {
            const hashedPassword = await bcrypt.hash(password, 13);
            fields.push('password = ?');
            params.push(hashedPassword);
        } catch (error) {
            throw { status: 500, message: 'Database error occurred.' };
        }
    }
    if (typeof isPrivate !== 'undefined') {
        fields.push('private = ?');
        params.push(isPrivate);
    }

    if (fields.length === 0) {
        throw { status: 400, message: 'No fields provided for update.' };
    }

    params.push(userId);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`;
    const result = await runQuery(query, params);
    return result.changes;
}

/**
 * ユーザー削除
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>} - 実行結果（this.changesで削除件数を確認）
 */
function deleteUser(userId) {
    return runQuery('DELETE FROM users WHERE user_id = ?', [userId]);
}

/**
 * ユーザーリスト取得（非公開でないユーザーのみ）
 * @param {number} limit - 件数上限
 * @param {number} offset - オフセット
 * @returns {Promise<Array>} - ユーザー一覧
 */
function getUserList(limit, offset) {
    // ※データベース上のprivateカラムが文字列の場合は"false"と比較
    return allQuery('SELECT user_id, user_name FROM users WHERE private = ? LIMIT ? OFFSET ?', ["false", limit, offset]);
}

/**
 * ユーザー詳細取得（ユーザーとプロフィール情報の結合）
 * @param {string} userId - ユーザーID
 * @returns {Promise<object>} - ユーザー詳細
 */
function getUserDetails(userId) {
    const query = `
    SELECT u.user_id, u.user_name, p.profile_image, p.info
    FROM users u
    JOIN user_profiles p ON u.user_id = p.user_id
    WHERE u.user_id = ? AND u.private = ?
  `;
    return getQuery(query, [userId, "false"]);
}

/**
 * ユーザー検索（名前で部分一致）
 * @param {string} userName - 検索文字列
 * @param {number} limit - 件数上限
 * @param {number} offset - オフセット
 * @returns {Promise<Array>} - 検索結果一覧
 */
function searchUsers(userName, limit, offset) {
    const query = `
    SELECT user_id, user_name FROM users
    WHERE private = ? AND user_name LIKE ?
    LIMIT ? OFFSET ?
  `;
    return allQuery(query, ["false", `%${userName}%`, limit, offset]);
}

export {
    registerUser,
    getUserByUsername,
    getUserById,
    updateLastLogin,
    updateUser,
    deleteUser,
    getUserList,
    getUserDetails,
    searchUsers,
};
