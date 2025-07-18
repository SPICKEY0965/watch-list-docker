/**
 * models/watch_lists.js
 * ユーザーのウォッチリストのデータベース操作を定義します。
 */
import { runQuery, getQuery, allQuery } from './query.js';

/**
 * getWatchlist
 * 指定されたユーザーIDに属するウォッチリストを取得します。
 * @param {number} userId - ユーザーID
 * @param {number} limit - 取得件数
 * @param {number} offset - オフセット
 * @param {string} sortBy - ソート対象 (例: 'title', 'episodes')
 * @param {string} sortOrder - ソート順 (例: 'ASC', 'DESC')
 * @param {string} airing_status - 放送ステータス
 * @param {string} content_type - コンテンツ種別
 * @param {string} status - ウォッチ状況
 * @param {string} rating - 評価
 * @param {string} searchQuery - 検索クエリ
 */
async function getWatchlist(userId, limit, offset, sortBy, sortOrder, airing_status, content_type, status, rating, searchQuery) {
    let query = `
        SELECT 
            w.content_id, w.status, 
            CASE 
                WHEN w.rating = 'SS' THEN 0 
                WHEN w.rating = 'S' THEN 1 
                WHEN w.rating = 'A' THEN 2 
                WHEN w.rating = 'B' THEN 3 
                WHEN w.rating = 'C' THEN 4 
                ELSE 5 
            END AS rating_order, 
            w.rating, 
            c.title, c.episodes, c.image, c.streaming_url, 
            c.content_type, c.season, c.cour, c.airing_status, 
            c.broadcastDate,
            CASE 
                WHEN date(c.broadcastDate) > date('now') THEN date(c.broadcastDate)
                WHEN date(c.broadcastDate, '+' || ((c.episodes - 1) * 7) || ' days') < date('now') THEN date(c.broadcastDate, '+' || ((c.episodes - 1) * 7) || ' days')
                ELSE date(c.broadcastDate, '+' || ((cast((julianday('now') - julianday(c.broadcastDate)) / 7 as integer)) * 7) || ' days')
            END AS last_update_date,
            c.is_private,
            c.description
        FROM watch_lists w
        INNER JOIN contents c ON w.content_id = c.content_id
        WHERE w.user_id = ?
    `;
    const queryParams = [userId];

    if (searchQuery) {
        query += ` AND c.title LIKE ?`;
        queryParams.push(`%${searchQuery}%`);
    }
    if (airing_status) {
        query += ' AND c.airing_status = ?';
        queryParams.push(airing_status);
    }
    if (content_type) {
        query += ' AND c.content_type = ?';
        queryParams.push(content_type);
    }
    if (status) {
        query += ' AND w.status = ?';
        queryParams.push(status);
    }
    if (rating) {
        query += ' AND w.rating = ?';
        queryParams.push(rating);
    }
    /* if (serviceId) {
        query += ' AND cs.service_id = ?';
        queryParams.push(serviceId);
    } */

    // sortBy, sortOrder はルーティング側で検証済み
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    return allQuery(query, queryParams);
}

/* function getWatchlistDetails(contentId) {
    constquery = `
        SELECT w.content_id, w.status, w.rating, c.title, c.episodes, c.image, c.streaming_url, c.content_type, c.season, c.cour, c.airing_status, c.broadcastDate
        FROM watch_lists w
        JOIN contents c ON w.content_id = c.content_id
        LEFT JOIN content_service cs ON w.content_id = cs.content_id
        WHERE w.user_id = ?
        `
} */

/**
 * Watchlistの追加
 * @param {object} data - 追加するウォッチリストデータ
 * @param {string} data.title - コンテンツタイトル
 * @param {number} data.episodes - エピソード数
 * @param {string} data.image - 画像URL
 * @param {string} data.streaming_url - ストリーミングURL
 * @param {string} data.content_type - コンテンツタイプ ('documentary', 'drama', 'anime')
 * @param {number} data.season - シーズン
 * @param {number} data.cour - クール
 * @param {string} data.airing_status - 放送ステータス ('Upcoming', 'Airing', 'Finished Airing')
 * @param {boolean} data.is_private - 非公開フラグ
 * @param {string} data.broadcastDate - ブロードキャスト開始日時
 * @param {string} data.status - 視聴ステータス('Watching', 'hold', 'Plan to watch', 'Dropped', 'Completed')
 * @param {number} data.rating - 評価 ('SS', 'S', 'A', 'B', 'C')
 * @param {string} data.added_by - 追加ユーザーのID
 * @returns {Promise<number>} - 追加されたコンテンツID
 */
async function addWatchlist(data) {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, status, rating, added_by } = data;

    try {
        await runQuery('BEGIN TRANSACTION');

        const insertContentQuery = `
            INSERT INTO contents (title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, added_by, broadcastDate, added_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        const contentResult = await runQuery(insertContentQuery, [title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, added_by, broadcastDate]);
        const contentId = contentResult.lastID;

        const insertWatchlistQuery = `
            INSERT INTO watch_lists (user_id, content_id, status, rating, added_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        await runQuery(insertWatchlistQuery, [added_by, contentId, status, rating]);

        await runQuery('COMMIT');
        return contentId;
    } catch (err) {
        await runQuery('ROLLBACK');
        throw { status: 500, message: 'Database error occurred.', error: err };
    }
}


/**
 * Watchlistにコンテンツを追加
 * @param {number} userId - ユーザーID
 * @param {number} contentId - コンテンツID
 * @param {string} status - 視聴ステータス
 * @param {string} rating - 評価
 * @returns {Promise<number>} - コンテンツID
 */
async function addWatchlistFromContent(userId, contentId, status, rating) {
    const query = `
        INSERT INTO watch_lists (user_id, content_id, status, rating, added_at, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    try {
        const result = await runQuery(query, [userId, contentId, status, rating]);
        return result.lastID;
    } catch (err) {
        throw { status: 500, message: 'Error adding content to watchlist.', error: err };
    }
}

/**
 * Watchlistの更新
 * @param {number} userId - ユーザーID
 * @param {number} contentId - コンテンツID
 * @param {object} updates - 更新するフィールドと値
 * @param {string} [updates.status] - 視聴ステータス
 * @param {string} [updates.rating] - 評価
 * @returns {Promise<number>} - 更新されたレコード数
 */
async function updateWatchlist(userId, contentId, { status, rating }) {
    const fields = [];
    const params = [];

    if (status) {
        fields.push('status = ?');
        params.push(status);
    }

    if (rating) {
        fields.push('rating = ?');
        params.push(rating);
    }
    if (fields.length === 0) {
        throw { status: 400, message: 'No fields provided for update.' };
    }
    params.push(userId, contentId);
    const query = `UPDATE watch_lists SET  ${fields.join(', ')} WHERE user_id = ? AND content_id = ?`;
    const result = await runQuery(query, params);
    return result.changes;
}

/**
 * Watchlistからコンテンツを削除
 * @param {string} userId - ユーザーID
 * @param {number} contentId - コンテンツID
 * @returns {Promise<object>} - 実行結果（this.changesで削除件数を確認）
 */
async function deleteWatchlist(userId, contentId) {
    try {
        const row = await getQuery(`SELECT * FROM watch_lists WHERE user_id = ? AND content_id = ?`, [userId, contentId]);
        if (!row) {
            console.log('No content found to delete.');
            return { message: 'No content found to delete.' };
        }

        const deleteQuery = `DELETE FROM watch_lists WHERE user_id = ? AND content_id = ?`;
        const result = await runQuery(deleteQuery, [userId, contentId]);

        return { deleted: result.changes };
    } catch (err) {
        console.log(err);
        throw { status: 500, message: 'Error deleting from watchlist.', error: err };
    }
}

/**
 * Watchlistの検索
 * @param {number} userId - ユーザーID
 * @param {string} title - 検索キーワード
 * @param {number} limit - 件数上限
 * @param {number} offset - オフセット
 * @returns {Promise<Array>} - 検索結果のウォッチリスト一覧
 */
async function searchWatchlist(userId, title, limit, offset) {
    const query = `
        SELECT w.content_id, w.status, w.rating, c.title, c.episodes, c.image, c.streaming_url, c.content_type, c.season, c.cour, c.airing_status, c.broadcastDate
        FROM watch_lists w
        JOIN contents c ON w.content_id = c.content_id
        WHERE w.user_id = ? AND c.title LIKE ?
        ORDER BY c.title
        LIMIT ? OFFSET ?
    `;
    const queryParams = [userId, `%${title}%`, limit, offset];

    try {
        const results = await allQuery(query, queryParams);
        return results;
    } catch (err) {
        throw { status: 500, message: 'Error searching watchlist.', error: err };
    }
}

export {
    getWatchlist,
    //getWatchlistDetails,
    addWatchlist,
    addWatchlistFromContent,
    updateWatchlist,
    deleteWatchlist,
    searchWatchlist,
};
