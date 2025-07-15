import { db } from '../db.js';

/**
 * 編集履歴を保存するミドルウェア
 */
function editHistoryMiddleware(action, itemType) {
    return async (c, next) => {
        const id = c.req.param('id') || c.get('id');
        const userId = c.get('userId');

        if (!id) {
            return await next();
        }

        const previousData = await new Promise((resolve, reject) => {
            // watch_listの場合はwatch_listsテーブルから、contentの場合はcontentsテーブルから取得
            const tableName = itemType === 'watch_list' ? 'watch_lists' : 'contents';
            const idColumn = itemType === 'watch_list' ? 'content_id' : 'id';

            db.get(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`, [id], (err, row) => {
                if (err) {
                    console.error(`Error fetching previous ${itemType}:`, err);
                    return resolve({}); // エラーでも処理を続行
                }
                resolve(row ? { ...row } : {});
            });
        });

        await next();

        // レスポンスが確定した後に実行
        const body = await c.req.json().catch(() => ({})); // bodyがない場合もある
        const newData = body || {};
        const query = `
            INSERT INTO edit_history (user_id, item_type, content_id, action, changes, previous_changes)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        db.run(
            query,
            [userId, itemType, id, action, JSON.stringify(newData), JSON.stringify(previousData)],
            (historyErr) => {
                if (historyErr) {
                    console.error(`Error inserting ${itemType} history:`, historyErr);
                }
            }
        );
    };
}

export { editHistoryMiddleware };
