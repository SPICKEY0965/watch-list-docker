const express = require('express');
const { db } = require('../db');
const auth = require('../middleware/auth');
const isPrivateCheck = require('../middleware/private');

const router = express.Router();

// Get contents list (protected route)
router.get('/contents', auth, (req, res) => {
    db.all('SELECT * FROM contents WHERE is_private = 0', (err, rows) => {
        if (err) {
            console.error('Error fetching contents:', err.message);
            return res.status(500).json({ error: 'An error occurred while fetching contents from the database.' });
        }
        res.status(200).json(rows);
    });
});

// Add new content (protected route)
router.post('/contents', auth, (req, res) => {
    const { title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating, is_private } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const query = `
        INSERT INTO contents (title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, is_private, created_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `;
    db.run(
        query,
        [title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating, is_private],
        function (err) {
            if (err) {
                console.error('Error inserting new content:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            const insertedContent = {
                id: this.lastID,
                title,
                episodes,
                currentEpisode,
                image,
                broadcastDate,
                updateDay,
                streamingUrl,
                is_private,
                created_date: new Date().toISOString(),
            };
            res.status(201).json(insertedContent);
        }
    );
});

// Update content (protected route)
router.put('/contents/:id', auth, isPrivateCheck, (req, res) => {
    const { id } = req.params;
    const { title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, is_private } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const updatedContent = { title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, is_private };

    const query = `
        UPDATE contents
        SET title = ?, episodes = ?, currentEpisode = ?, image = ?, broadcastDate = ?, updateDay = ?, streamingUrl = ?, is_private = ?, updated_date = datetime('now')
        WHERE id = ?
    `;
    db.run(query, [...Object.values(updatedContent), id], function (err) {
        if (err) {
            console.error('Error updating content:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Content not found.' });
        }
        const responseContent = { ...updatedContent, id, updated_date: new Date().toISOString() };
        res.json(responseContent);
    });
});

// Delete content (protected route)
router.delete('/contents/:id', auth, isPrivateCheck, (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM contents WHERE id = ?';

    db.run(query, id, function (err) {
        if (err) {
            console.error('Error deleting content:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Content not found.' });
        }
        res.sendStatus(204);
    });
});

module.exports = router;