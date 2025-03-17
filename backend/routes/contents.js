const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs').promises;
const { downloadImage, isExternalImage } = require('../utils/imageDownload');

const router = express.Router();
const imageDir = path.join(__dirname, '../images');

// GET /contents (protected route)
router.get('/contents', auth, (req, res) => {
    const protocol = req.protocol;
    const host = req.get('host');

    db.all(
        'SELECT * FROM contents WHERE user_id = ?',
        [req.userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching contents:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            const transformedRows = rows.map(row => {
                if (row.image && !row.image.startsWith("data:image/") && !row.image.startsWith("http")) {
                    row.image = `${protocol}://${host}/api/images/${row.image}`;
                }
                return row;
            });

            res.json(transformedRows);
        }
    );
});

router.get('/images/:hashDir1/:hashDir2/:filename', async (req, res) => {
    const { hashDir1, hashDir2, filename } = req.params;

    // 絶対パスを生成
    const imagePath = path.join(imageDir, hashDir1, hashDir2, filename);
    const resolvedImagePath = path.resolve(imagePath);
    const resolvedBaseDir = path.resolve(imageDir);

    // セキュリティ対策：リクエストされたファイルがIMAGE_DIR内にあるかチェック
    if (!resolvedImagePath.startsWith(resolvedBaseDir)) {
        return res.status(404).json({ error: 'image not found' });
    }

    try {
        await fs.access(resolvedImagePath, fs.constants.F_OK);
        res.sendFile(resolvedImagePath, err => {
            if (err) {
                console.error('ファイル送信エラー:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: '画像ファイルの送信に失敗しました。' });
                }
            }
        });
    } catch (err) {
        console.error('画像取得失敗:', err);
        return res.status(404).json({ error: 'image not found' });
    }
});

// POST /contents (protected route)
router.post('/contents', auth, async (req, res) => {
    const {
        title,
        episodes,
        currentEpisode,
        image,
        broadcastDate,
        updateDay,
        streamingUrl,
        status,
        rating,
    } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
        let filename = null;
        if (image && isExternalImage) {
            const result = await downloadImage(image);
            filename = result.relativePhysicalPath;
        }

        const query = `
            INSERT INTO contents
            (user_id, title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(
            query,
            [
                req.userId,
                title,
                episodes,
                currentEpisode,
                filename,
                broadcastDate,
                updateDay,
                streamingUrl,
                status,
                rating,
            ],
            function (err) {
                if (err) {
                    console.error('Error inserting new content:', err);
                    return res.status(500).json({ error: 'Database error occurred.' });
                }

                const insertedContent = {
                    id: this.lastID,
                    user_id: req.userId,
                    title,
                    episodes,
                    currentEpisode,
                    image: filename,
                    broadcastDate,
                    updateDay,
                    streamingUrl,
                    status,
                    rating,
                };

                res.status(201).json(insertedContent);
            }
        );
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});

// PUT /contents/:id (protected route)
router.put('/contents/:id', auth, async (req, res) => {
    const { id } = req.params;
    const {
        title,
        episodes,
        currentEpisode,
        image,
        broadcastDate,
        updateDay,
        streamingUrl,
        status,
        rating,
    } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    let localImage = image;
    if (image && isExternalImage(image)) {
        try {
            const result = await downloadImage(image);
            const filename = result.relativePhysicalPath;
            const selectedDomain = req.get('host');

            localImage = `${req.protocol}://${selectedDomain}/api/images/${filename}`;
        } catch (err) {
            console.error('Error downloading image:', err);
            return res.status(500).json({ error: 'Failed to download external image.' });
        }
    }

    const updatedContent = {
        title,
        episodes,
        currentEpisode,
        localImage,
        broadcastDate,
        updateDay,
        streamingUrl,
        status,
        rating,
    };

    const query = `
    UPDATE contents
    SET title = ?, episodes = ?, currentEpisode = ?, image = ?, broadcastDate = ?, updateDay = ?, streamingUrl = ?, status = ?, rating = ?
    WHERE id = ? AND user_id = ?
  `;
    db.run(
        query,
        [...Object.values(updatedContent), id, req.userId],
        function (err) {
            if (err) {
                console.error('Error updating content:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ error: 'Content not found or you do not have permission to update it.' });
            }
            const responseContent = { ...updatedContent, id, user_id: req.userId };
            res.json(responseContent);
        }
    );
});

// DELETE /contents/:id (protected route)
router.delete('/contents/:id', auth, (req, res) => {
    const { id } = req.params;
    db.run(
        'DELETE FROM contents WHERE id = ? AND user_id = ?',
        [id, req.userId],
        function (err) {
            if (err) {
                console.error('Error deleting content:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            if (this.changes === 0) {
                return res
                    .status(404)
                    .json({ error: 'Content not found or you do not have permission to delete it.' });
            }
            res.sendStatus(204);
        }
    );
});

module.exports = router;
