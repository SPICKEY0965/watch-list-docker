import { db } from '../db.js';

/**
 * コンテンツの private フラグがアクセスを許可するかどうかを確認するミドルウェア。
 * このフラグの所有者は自分のプライベートコンテンツにアクセスできますが、他の人はアクセスできません。
 */
const isPrivateCheck = async (c, next) => {
    const id = c.req.param('id');
    const userId = c.get('userId');

    if (!id) {
        return c.json({ error: 'Content ID is required.' }, 400);
    }

    try {
        const content = await new Promise((resolve, reject) => {
            const query = `SELECT is_private, added_by FROM contents WHERE id = ?`;
            db.get(query, [id], (err, row) => {
                if (err) return reject(new Error('Database error occurred.'));
                resolve(row);
            });
        });

        if (!content) {
            return c.json({ error: 'Content not found.' }, 404);
        }

        if (content.is_private && content.added_by !== userId) {
            return c.json({ error: 'Access denied' }, 403);
        }

        await next();

    } catch (err) {
        console.error('Error in isPrivateCheck middleware:', err);
        return c.json({ error: err.message || 'Database error occurred.' }, 500);
    }
};

export default isPrivateCheck;
