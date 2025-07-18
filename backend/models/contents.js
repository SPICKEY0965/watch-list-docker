import { db } from '../db.js';
import { runQuery, getQuery, allQuery } from './query.js';
import { analyzeUserPreferences, getEmbeddings } from './preferenceAnalysis.js';

// --- Utilities ---
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}


/**
 * コンテンツ一覧を取得する
 * @param {Object} options - 検索条件
 * @param {number} options.limit - 取得件数上限
 * @param {number} options.offset - オフセット
 * @param {string} options.sortBy - ソート対象カラム名
 * @param {string} options.sortOrder - ソート順 ('ASC' | 'DESC')
 * @param {string} [options.airing_status] - 放送ステータス ('Upcoming', 'Airing', 'Finished Airing')
 * @param {string} [options.content_type] - コンテンツタイプ ('documentary', 'drama', 'anime')
 * @returns {Promise<Array>} - コンテンツ一覧
 */
function getContents({ limit, offset, sortBy, sortOrder, airing_status, content_type }) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT content_id, title, episodes, image, streaming_url, content_type, season, cour, airing_status, broadcastDate, is_private, description
            FROM contents
            WHERE is_private = FALSE
        `;
        const queryParams = [];

        if (airing_status) {
            query += ' AND airing_status = ?';
            queryParams.push(airing_status);
        }
        if (content_type) {
            query += ' AND content_type = ?';
            queryParams.push(content_type);
        }

        // ※ sortBy, sortOrder はルーティング側で厳密に検証済みと想定
        query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        queryParams.push(limit, offset);

        db.all(query, queryParams, (err, rows) => {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
}

/**
 * 新しいコンテンツを追加する
 * @param {Object} data - コンテンツデータ
 * @param {string} data.title - タイトル
 * @param {number} data.episodes - エピソード数
 * @param {string} data.image - 画像URL
 * @param {string} data.streaming_url - 配信URL
 * @param {string} data.content_type - コンテンツタイプ
 * @param {string} data.season - シーズン
 * @param {string} data.cour - クール
 * @param {string} data.airing_status - 放送ステータス
 * @param {string} data.is_private - 非公開フラグ
 * @param {string} data.broadcastDate - 放送開始日時
 * @param {number} data.added_by - 追加ユーザーのID
 * @param {string} [data.description] - 概要
 * @param {string} [data.description_embedding] - 概要のベクトル
 * @returns {Promise<number>} - 挿入されたコンテンツのID
 */
function addContent(data) {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, added_by, description, description_embedding } = data;
    return new Promise((resolve, reject) => {
        const query = `
      INSERT INTO contents 
      (title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, added_by, broadcastDate, description, description_embedding, added_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
        db.run(
            query,
            [title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, added_by, broadcastDate, description, description_embedding],
            function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            }
        );
    });
}

/**
 * コンテンツを更新する
 * @param {number} id - コンテンツID
 * @param {Object} data - 更新データ
 * @param {string} data.title
 * @param {number} data.episodes
 * @param {string} data.image
 * @param {string} data.streaming_url
 * @param {string} data.content_type
 * @param {string} data.season
 * @param {string} data.cour
 * @param {string} data.airing_status
 * @param {string} data.is_private
 * @param {string} data.broadcastDate
 * @param {string} [data.description] - 概要
 * @param {string} [data.description_embedding] - 概要のベクトル
 * @param {number} userId - 更新を行うユーザーのID
 * @returns {Promise<number>} - 更新されたレコード数
 */
function updateContent(id, data, userId) {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, description, description_embedding } = data;
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE contents
            SET title = ?, episodes = ?, image = ?, streaming_url = ?, content_type = ?, season = ?, cour = ?, airing_status = ?, is_private = ?, broadcastDate = ?, description = ?, description_embedding = ?, updated_at = datetime('now')
            WHERE content_id = ? AND added_by = ?
        `;
        db.run(query, [title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, description, description_embedding, id, userId], function (err) {
            if (err) {
                return reject(err);
            }
            resolve(this.changes);
        });

    });
}

/**
 * コンテンツを削除する
 * @param {number} id - コンテンツID
 * @param {string} added_by - 追加したユーザーID
 * @returns {Promise<Object|null>} - 削除前のコンテンツデータ。存在しなければ null を返す。
 */
function deleteContent(id, added_by) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM contents WHERE content_id = ? AND added_by = ?`, [id, added_by], (err, row) => {
            if (err) {
                return reject(err);
            }
            if (!row) {
                return resolve(null);
            }
            const deleteQuery = `DELETE FROM contents WHERE content_id = ?`;
            db.run(deleteQuery, [id], function (deleteErr) {
                if (deleteErr) {
                    return reject(deleteErr);
                }
                resolve(row);
            });
        });
    });
}

/**
 * 指定されたコンテンツに類似したコンテンツを検索する
 * @param {number} contentId - 基準となるコンテンツID
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} - 類似コンテンツの配列
 */
async function findSimilarContents(contentId, limit = 10) {
    // 1. 基準となるコンテンツのEmbeddingを取得
    const targetContent = await getQuery('SELECT description_embedding FROM contents WHERE content_id = ?', [contentId]);
    if (!targetContent || !targetContent.description_embedding) {
        return []; // Embeddingがなければ空配列を返す
    }
    const targetVector = JSON.parse(targetContent.description_embedding);

    // 2. 全てのコンテンツのEmbeddingを取得
    const allContents = await allQuery('SELECT content_id, title, image, description_embedding FROM contents WHERE content_id != ? AND description_embedding IS NOT NULL', [contentId]);

    // 3. コサイン類似度を計算
    const similarContents = allContents.map(content => {
        const contentVector = JSON.parse(content.description_embedding);
        const similarity = cosineSimilarity(targetVector, contentVector);
        return {
            content_id: content.content_id,
            title: content.title,
            image: content.image,
            similarity: similarity
        };
    });

    // 4. 類似度でソートし、上位N件を返す
    similarContents.sort((a, b) => b.similarity - a.similarity);
    return similarContents.slice(0, limit);
}


export {
    getContents,
    addContent,
    updateContent,
    deleteContent,
    findSimilarContents,
};
