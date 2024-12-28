const { db } = require('../db');

/**
 * コンテンツの is_private フラグがアクセスを許可するかどうかを確認するミドルウェア。
 * このフラグの所有者は自分のプライベートコンテンツにアクセスできますが、他の人はアクセスできません。
 */
function isPrivateCheck(req, res, next) {
    const { id } = req.params;
    const userId = req.userId;

    if (!id) {
        return res.status(400).json({ error: 'Content ID is required.' });
    }

    const query = `SELECT is_private, id FROM contents WHERE id = ?`;
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Error checking is_private:', err);
            return res.status(500).json({ error: 'An error occurred while checking the content.' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Content not found.' });
        }

        // Allow access if the content is public (is_private === 0)
        if (row.is_private === 0) {
            return next();
        }

        // Check ownership for private content
        const ownerCheckQuery = `
            SELECT 1 
            FROM watch_list 
            WHERE content_id = ? AND user_id = ?
        `;

        db.get(ownerCheckQuery, [id, userId], (err, ownershipRow) => {
            if (err) {
                console.error('Error checking ownership:', err);
                return res.status(500).json({ error: 'An error occurred while verifying ownership.' });
            }

            if (ownershipRow) {
                return next(); // The user is the owner of this private content
            } else {
                return res.status(403).json({ error: 'You are not authorized to access this private content.' });
            }
        });
    });
}

module.exports = isPrivateCheck;
