import { db } from '../db.js';

/**
 * 編集履歴を保存するミドルウェア
 */
function editHistoryMiddleware(action, itemType) {
    return (req, res, next) => {
        const { id } = req.params;
        const userId = req.userId;

        if (!id) {
            return next();
        }

        db.get(`SELECT * FROM ${itemType}s WHERE ${itemType}_id = ?`, [id], (err, row) => {
            if (err) {
                console.error(`Error fetching previous ${itemType}:`, err);
                return next();
            }

            const previousData = row ? { ...row } : {};

            res.on('finish', () => {
                const newData = req.body || {};
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
            });

            next();
        });
    };
}

export { editHistoryMiddleware };
