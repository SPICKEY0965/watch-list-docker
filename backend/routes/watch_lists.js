import express from 'express';
import { db } from '../db.js';
import auth from '../middleware/auth.js';
import { editHistoryMiddleware } from '../middleware/editHistory.js';
import isPrivateCheck from '../middleware/private.js';
import { getWatchlist, addWatchlist, addWatchlistFromContent, updateWatchlist, deleteWatchlist, searchWatchlist, } from '../models/watch_lists.js';
import { getContents, addContent, updateContent, deleteContent, } from '../models/contents.js';
import { downloadImage, isExternalImage } from '../utils/imageDownload.js';
const router = express.Router();

router.get('/watchlists', auth, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const offset = parseInt(req.query.offset) || 0;
    const sortByParam = req.query.sortBy ? req.query.sortBy.toUpperCase() : 'BROADCAST';
    const sortOrder = req.query.sortOrder?.toUpperCase() || 'ASC';

    if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
        return res.status(400).json({ error: 'Invalid limit or offset parameters.' });
    }

    const allowedSortByFields = {
        'BROADCAST': 'broadcastDate',
        'TITLE': 'title'
    };

    if (!allowedSortByFields.hasOwnProperty(sortByParam)) {
        return res.status(400).json({ error: 'Invalid sortBy parameter.' });
    }
    if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
        return res.status(400).json({ error: 'Invalid sortOrder parameter. Use ASC or DESC.' });
    }

    const sortBy = allowedSortByFields[sortByParam];

    const query = `
        SELECT w.content_id, w.status, w.rating, c.title, c.episodes, c.image, c.streaming_url, 
        c.content_type, c.season, c.cour, c.airing_status, c.broadcastDate
        FROM watch_lists w
        JOIN contents c ON w.content_id = c.content_id
        WHERE w.user_id = ?
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
    `;

    db.all(query, [req.userId, limit, offset], (err, rows) => {
        if (err) {
            console.error('Error fetching watch list:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        res.json(rows);
    });
});

router.post('/watchlists', auth, (req, res) => {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, private: isPrivate, broadcastDate, status, rating } = req.body;
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const contentQuery = `
            INSERT INTO contents (title, episodes, image, streaming_url, content_type, season, cour, airing_status, private, added_by, broadcastDate, added_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;

        db.run(contentQuery, [title, episodes, image, streaming_url, content_type, season, cour, airing_status, isPrivate, req.userId, broadcastDate], function (err) {
            if (err) {
                console.error('Error inserting content:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Database error occurred.' });
            }

            const contentId = this.lastID;

            const watchListQuery = `
                INSERT INTO watch_lists (user_id, content_id, status, rating, added_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `;

            db.run(watchListQuery, [req.userId, contentId, status, rating], function (err) {
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
                    image,
                    broadcastDate,
                    streaming_url,
                    airing_status,
                    status,
                    rating,
                    isPrivate,
                    user_id: req.userId
                };
                res.status(201).json(responseContent);
            });
        });
    });
});

/* router.post('/watchlists/:id', auth, (req, res) => {
    const { id } = req.params;
    const { status, rating } = req.body;

    //if (!status || !rating) {
    //    return res.status(400).json({ error: 'Status and rating are required.' });
    //}

    db.get(`SELECT * FROM watch_lists WHERE content_id = ? AND user_id = ? `, [id, req.userId], (err, row) => {
        if (err) {
            console.error('Error checking watch list ownership:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (!row) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const query = `
            UPDATE watch_lists 
            SET status = ?, rating = ?, updated_at = datetime('now') 
            WHERE user_id = ? AND content_id = ?
    `;
        db.run(query, [status, rating, req.userId, id], function (err) {
            if (err) {
                console.error('Error updating watch list:', err);
                return res.status(500).json({ error: 'Database error occurred.' });
            }

            db.get(`
                SELECT w.*, c.*
    FROM watch_lists w
                JOIN contents c ON w.content_id = c.id
                WHERE w.user_id = ? AND w.content_id = ?
    `, [req.userId, id], (err, row) => {
                if (err) {
                    console.error('Error fetching updated content:', err);
                    return res.status(500).json({ error: 'Database error occurred.' });
                }
                res.status(200).json(row);
            });
        });
    });
}); */

router.put('/watchlists/:id', auth, async (req, res, next) => {
    const { id } = req.params;
    const userId = req.userId;
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, private: isPrivate, broadcastDate, status, rating } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }
    // Validate request body
    if (status === undefined || rating === undefined) {
        return res.status(400).json({ error: 'Status and rating are required.' });
    }

    try{
        let filename = null;
        if (image && isExternalImage) {
            const result = await downloadImage(image);
            filename = result.relativePhysicalPath;
        }

        await updateContent(id, {
            title,
            episodes,
            image: filename,
            streaming_url,
            content_type,
            season,
            cour,
            airing_status,
            private: isPrivate,
            broadcastDate,
        });
        await updateWatchlist(userId, id, {status, rating});
        next();
    }catch(err){
        console.error('Database error: ', err);
        res.status(500).json({error: 'Database error occurred. '});
    }
}, editHistoryMiddleware('update', 'watch_list'), (req, res) => {
    const { id } = req.params;
    res.status(201).json({ id, ...req.body });
});

router.delete('/watchlists/:id', auth, async (req, res) => {
    const userId = parseInt(req.userId);
    const { id } = req.params;
    try {
        const result = await deleteWatchlist(userId, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'content not found.' });
        }
        console.log('content was deleted:', id);
        res.sendStatus(204);
    } catch (error) {
        console.error('Deletion error:', error);
        res.status(500).json({ error: 'Failed to delete content.' });
    }
});

router.get('/search/watchlists', auth, async (req, res) => {
    const userId = req.userId;
    const title = req.query.title || '';
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (limit > 50) {
        return res.status(400).json({ error: 'Limit must not exceed 50.' });
    }
    if (limit <= 0 || offset < 0) {
        return res.status(400).json({ error: 'Invalid limit or offset value.' });
    }
    if (title.length <= 1) {
        return res.status(400).json({ error: 'Title must be longer than 1 character.' });
    }

    try {
        const watchlists = await searchWatchlist(userId, title, limit, offset);
        res.status(200).json(watchlists);
    } catch (error) {
        cosole.error('Error searching watchlist:', error);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

export default router;
