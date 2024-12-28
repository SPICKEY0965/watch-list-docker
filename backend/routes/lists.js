const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ウォッチリストの取得
router.get('/lists', auth, (req, res) => {
    const query = `
        SELECT w.*, c.* 
        FROM watch_list w
        JOIN contents c ON w.content_id = c.id
        WHERE w.user_id = ?
    `;

    db.all(query, [req.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching watch list:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.json(rows);
    });
});

// 新規コンテンツの追加とウォッチリストへの登録
router.post('/lists', auth, (req, res) => {
    const { title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating, is_private } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    // トランザクション開始
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // contentsテーブルに追加
        const contentQuery = `
            INSERT INTO contents (title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating, is_private, created_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;

        db.run(contentQuery, [title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating, is_private], function (err) {
            if (err) {
                console.error('Error inserting content:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error occurred.' });
            }

            const contentId = this.lastID;

            // watch_listテーブルに追加
            const watchListQuery = `
                INSERT INTO watch_list (user_id, content_id, created_date)
                VALUES (?, ?, datetime('now'))
            `;

            db.run(watchListQuery, [req.userId, contentId], function (err) {
                if (err) {
                    console.error('Error inserting into watch list:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Database error occurred.' });
                }

                db.run('COMMIT');
                const responseContent = {
                    id: contentId,
                    title,
                    episodes,
                    currentEpisode,
                    image,
                    broadcastDate,
                    updateDay,
                    streamingUrl,
                    status,
                    rating,
                    is_private,
                    user_id: req.userId
                };
                res.status(201).json(responseContent);
            });
        });
    });
});

// 既存コンテンツをウォッチリストに追加
router.post('/lists/:id', auth, (req, res) => {
    const { id } = req.params;

    const query = `
        INSERT INTO watch_list (user_id, content_id, created_date)
        VALUES (?, ?, datetime('now'))
    `;

    db.run(query, [req.userId, id], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Content already in watch list.' });
            }
            console.error('Error adding to watch list:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }

        // 追加したコンテンツの情報を取得して返す
        db.get(`
            SELECT w.*, c.* 
            FROM watch_list w
            JOIN contents c ON w.content_id = c.id
            WHERE w.user_id = ? AND w.content_id = ?
        `, [req.userId, id], (err, row) => {
            if (err) {
                console.error('Error fetching added content:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            res.status(201).json(row);
        });
    });
});

// ウォッチリストからコンテンツを削除
router.delete('/lists/:id', auth, (req, res) => {
    const { id } = req.params;

    const query = `
        DELETE FROM watch_list 
        WHERE user_id = ? AND content_id = ?
    `;

    db.run(query, [req.userId, id], function (err) {
        if (err) {
            console.error('Error deleting from watch list:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Content not found in watch list.' });
        }
        res.sendStatus(204);
    });
});

module.exports = router;