const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get contents list (protected route)
router.get('/contents', auth, (req, res) => {
    db.all('SELECT * FROM contents WHERE user_id = ?', [req.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching contents:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }

        res.json(rows);
    });
});

// Add new content (protected route)
router.post('/contents', auth, (req, res) => {
    const { title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const query = `
        INSERT INTO contents (user_id, title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [req.userId, title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating], function (err) {
        if (err) {
            console.error('Error inserting new content:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        const insertedContent = { id: this.lastID, user_id: req.userId, title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating };
        res.status(201).json(insertedContent);
    });
});

// Update content (protected route)
router.put('/contents/:id', auth, (req, res) => {
    const { id } = req.params;
    const { title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const updatedContent = { title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating };

    const query = `
    UPDATE contents
    SET title = ?, duration = ?, episodes = ?, currentEpisode = ?, image = ?, broadcastDate = ?, updateDay = ?, streamingUrl = ?, status = ?, rating = ?
    WHERE id = ? AND user_id = ?
`;
    db.run(query, [...Object.values(updatedContent), id, req.userId], function (err) {
        if (err) {
            console.error('Error updating content:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Content not found or you do not have permission to update it.' });
        }
        const responseContent = { ...updatedContent, id, user_id: req.userId };
        res.json(responseContent);
    });
});

// Delete content (protected route)
router.delete('/contents/:id', auth, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM contents WHERE id = ? AND user_id = ?', [id, req.userId], function (err) {
        if (err) {
            console.error('Error deleting content:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Content not found or you do not have permission to delete it.' });
        }
        res.sendStatus(204);
    });
});

module.exports = router;