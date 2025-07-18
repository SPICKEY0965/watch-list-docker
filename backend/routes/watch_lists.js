import { Hono } from 'hono';
import { db } from '../db.js';
import auth from '../middleware/auth.js';
import { editHistoryMiddleware } from '../middleware/editHistory.js';
import { getWatchlist, addWatchlist, addWatchlistFromContent, updateWatchlist, deleteWatchlist, searchWatchlist, } from '../models/watch_lists.js';
import { getContents, addContent, updateContent, deleteContent, } from '../models/contents.js';
import { downloadImage, isExternalImage } from '../utils/imageDownload.js';

const app = new Hono();

app.get('/watchlists', auth, async (c) => {
    try {
        const limit = Math.min(parseInt(c.req.query('limit')) || 10, 50);
        const offset = parseInt(c.req.query('offset')) || 0;
        const sortByParam = (c.req.query('sortBy') || 'BROADCAST').toUpperCase();
        const sortOrder = (c.req.query('sortOrder') || 'DESC').toUpperCase();
        const protocol = c.req.url.startsWith('https') ? 'https' : 'http';
        const host = c.req.header('host');
        const userId = c.get('userId');

        if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
            return c.json({ error: 'Invalid limit or offset parameters.' }, 400);
        }

        const allowedSortByFields = {
            RECENTLY_UPDATED: 'last_update_date', // 最近更新
            TITLE: 'title', // タイトル順
            BROADCAST: 'broadcastDate', // 放送日順
            RATING: 'rating_order' // レーティング
        };

        if (!allowedSortByFields.hasOwnProperty(sortByParam)) {
            return c.json({ error: 'Invalid sortBy parameter.' }, 400);
        }

        if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
            return c.json({ error: 'Invalid sortOrder parameter. Use ASC or DESC.' }, 400);
        }

        const sortBy = allowedSortByFields[sortByParam];
        const airing_status = c.req.query('airing_status');
        const content_type = c.req.query('content_type');
        const status = c.req.query('status');
        const rating = c.req.query('rating');
        const search = c.req.query('search');

        const allowedAiringStatuses = ['Upcoming', 'Airing', 'Finished Airing'];
        if (airing_status && !allowedAiringStatuses.includes(airing_status)) {
            return c.json({ error: 'Invalid airing_status parameter.' }, 400);
        }
        const allowedContentTypes = ['documentary', 'drama', 'anime'];
        if (content_type && !allowedContentTypes.includes(content_type)) {
            return c.json({ error: 'Invalid content_type parameter.' }, 400);
        }

        const contents = await getWatchlist(
            userId,
            limit,
            offset,
            sortBy,
            sortOrder,
            airing_status,
            content_type,
            status,
            rating,
            search
        );

        const transformedRows = contents.map(row => ({
            ...row,
            image: row.image && !row.image.startsWith("data:image/") && !row.image.startsWith("http")
                ? `${protocol}://${host}/api/images/${row.image}`
                : row.image,
        }));

        return c.json(transformedRows, 200);
    } catch (err) {
        console.error('Error fetching contents:', err);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

app.post('/watchlists', auth, async (c) => {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, status, rating } = await c.req.json();
    if (!title || title.trim() === '') {
        return c.json({ error: 'Title is required.' }, 400);
    }
    const userId = c.get('userId');

    let filename = null;
    if (image && isExternalImage) {
        const result = await downloadImage(image);
        filename = result.relativePhysicalPath;
    }

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const contentQuery = `
                INSERT INTO contents (title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, added_by, broadcastDate, added_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `;

            db.run(contentQuery, [title, episodes, filename, streaming_url, content_type, season, cour, airing_status, is_private, userId, broadcastDate], function (err) {
                if (err) {
                    console.error('Error inserting content:', err);
                    db.run('ROLLBACK');
                    return resolve(c.json({ error: 'Database error occurred.' }, 500));
                }

                const contentId = this.lastID;

                const watchListQuery = `
                    INSERT INTO watch_lists (user_id, content_id, status, rating, added_at, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                `;

                db.run(watchListQuery, [userId, contentId, status, rating], function (err) {
                    if (err) {
                        console.error('Error inserting into watch list:', err);
                        db.run('ROLLBACK');
                        return resolve(c.json({ error: 'Database error occurred.' }, 500));
                    }

                    db.run('COMMIT');
                    const responseContent = {
                        id: contentId,
                        title,
                        episodes,
                        image: filename,
                        broadcastDate,
                        streaming_url,
                        airing_status,
                        status,
                        rating,
                        is_private,
                        user_id: userId
                    };
                    resolve(c.json(responseContent, 201));
                });
            });
        });
    });
});

app.put('/watchlists/:id', auth, editHistoryMiddleware('update', 'watch_list'), async (c) => {
    try {
        const id = c.req.param('id');
        const userId = c.get('userId');
        const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate, status, rating, description } = await c.req.json();

        if (!title || title.trim() === '') {
            return c.json({ error: 'Title is required.' }, 400);
        }
        if (status === undefined || rating === undefined) {
            return c.json({ error: 'Status and rating are required.' }, 400);
        }

        let filename = null;
        if (image && isExternalImage) {
            const result = await downloadImage(image);
            if (result) filename = result.relativePhysicalPath;;
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
            is_private,
            broadcastDate,
            description,
        }, userId);
        await updateWatchlist(userId, id, { status, rating });
        
        return c.json({ id, ...await c.req.json() }, 201);
    } catch (err) {
        console.error('Database error: ', err);
        return c.json({ error: 'Database error occurred. ' }, 500);
    }
});

app.delete('/watchlists/:id', auth, async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    try {
        const result = await deleteWatchlist(userId, id);
        if (result.changes === 0) {
            return c.json({ error: 'content not found.' }, 404);
        }
        console.log('content was deleted:', id);
        return c.body(null, 204);
    } catch (error) {
        console.error('Deletion error:', error);
        return c.json({ error: 'Failed to delete content.' }, 500);
    }
});

app.get('/search/watchlists', auth, async (c) => {
    const userId = c.get('userId');
    const title = c.req.query('title') || '';
    const limit = parseInt(c.req.query('limit'), 10) || 10;
    const offset = parseInt(c.req.query('offset'), 10) || 0;

    if (limit > 50) {
        return c.json({ error: 'Limit must not exceed 50.' }, 400);
    }
    if (limit <= 0 || offset < 0) {
        return c.json({ error: 'Invalid limit or offset value.' }, 400);
    }
    if (title.length <= 1) {
        return c.json({ error: 'Title must be longer than 1 character.' }, 400);
    }

    try {
        const watchlists = await searchWatchlist(userId, title, limit, offset);
        return c.json(watchlists, 200);
    } catch (error) {
        console.error('Error searching watchlist:', error);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

export default app;
