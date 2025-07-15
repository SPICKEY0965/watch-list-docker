import { db } from '../db.js';

/**
 * コンテンツの private フラグがアクセスを許可するかどうかを確認するミドルウェア。
 * このフラグの所有者は自分のプライベートコンテンツにアクセスできますが、他の人はアクセスできません。
 */
function isPrivateCheck(req, res, next) {
    const { id } = req.params;
    const userId = req.userId;

    if (!id) {
        return res.status(400).json({ error: 'Content ID is required.' });
    }

    const query = `SELECT private FROM contents WHERE content_id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error checking private:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Content not found.' });
        }

        // Allow access if the content is public (private === false)
        // if (row.private === false) {
        //     return next();
        // }

        // Check ownership for private content
        const ownerCheckQuery = `
            SELECT added_by
            FROM contents
            WHERE content_id = ? AND added_by = ?
        `;

        db.get(ownerCheckQuery, [id, userId], (err, ownershipRow) => {
            if (err) {
                console.error('Error checking ownership:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }

            if (ownershipRow) {
                return next(); // The user is the owner of this private content
            } else {
                return res.status(403).json({ error: 'Access denied' });
            }
        });
    });
}

export default isPrivateCheck;
