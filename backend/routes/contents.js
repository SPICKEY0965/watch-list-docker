import { Hono } from 'hono';
import { db } from '../db.js';
import auth from '../middleware/auth.js';
import { downloadImage, isExternalImage } from '../utils/imageDownload.js';
import fetchContentDetails from '../utils/fetchContentDetails.js';
import { getContents, addContent, updateContent, deleteContent, findSimilarContents } from '../models/contents.js';
import { analyzeUserPreferences, getEmbeddings } from '../models/preferenceAnalysis.js';
import isPrivateCheck from '../middleware/private.js';
import { editHistoryMiddleware } from '../middleware/editHistory.js'

const app = new Hono();

// GET /contents (protected route)
app.get('/contents', async (c) => {
    try {
        const limit = Math.min(parseInt(c.req.query('limit')) || 10, 50);
        const offset = parseInt(c.req.query('offset')) || 0;
        const sortByParam = (c.req.query('sortBy') || 'BROADCAST').toUpperCase();
        const sortOrder = (c.req.query('sortOrder') || 'ASC').toUpperCase();
        const protocol = c.req.url.startsWith('https') ? 'https' : 'http';
        const host = c.req.header('host');

        if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
            return c.json({ error: 'Invalid limit or offset parameters.' }, 400);
        }

        const allowedSortByFields = {
            BROADCAST: 'broadcastDate',
            TITLE: 'title',
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
        const allowedAiringStatuses = ['Upcoming', 'Airing', 'Finished Airing'];
        if (airing_status && !allowedAiringStatuses.includes(airing_status)) {
            return c.json({ error: 'Invalid airing_status parameter.' }, 400);
        }
        const allowedContentTypes = ['documentary', 'drama', 'anime'];
        if (content_type && !allowedContentTypes.includes(content_type)) {
            return c.json({ error: 'Invalid content_type parameter.' }, 400);
        }

        const contents = await getContents({
            limit,
            offset,
            sortBy,
            sortOrder,
            airing_status,
            content_type,
        });

        const transformedRows = contents.map(row => ({
            ...row,
            image: row.image && !row.image.startsWith("data:image/") && !row.image.startsWith("http") ?
                `${protocol}://${host}/api/images/${row.image}` : row.image,
        }));

        return c.json(transformedRows, 200);
    } catch (err) {
        console.error('Error fetching contents:', err);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// POST /contents (protected route)
app.post('/contents', auth, editHistoryMiddleware('create', 'content'), async (c) => {
    try {
        const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate } = await c.req.json();
        if (!title || title.trim() === '') {
            return c.json({ error: 'Title is required.' }, 400);
        }
        const added_by = c.get('userId');

        let filename = null;
        if (image && isExternalImage) {
            const result = await downloadImage(image);
            if (result) filename = result.relativePhysicalPath;;
        }

        // Fetch description and embedding
        const { description, embedding } = await fetchContentDetails(streaming_url);

        const newContentId = await addContent({
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
            added_by,
            description,
            description_embedding: embedding,
        });
        c.set('newContentId', newContentId);
        c.set('id', newContentId); // for editHistoryMiddleware

        return c.json({ id: newContentId }, 201);
    } catch (error) {
        console.error('Database error:', error);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// PUT /contents/:id: コンテンツ更新
app.put('/contents/:id', auth, isPrivateCheck, editHistoryMiddleware('update', 'content'), async (c) => {
    try {
        const id = c.req.param('id');
        const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate } = await c.req.json();
        if (!title || title.trim() === '') {
            return c.json({ error: 'Title is required.' }, 400);
        }

        let filename = null;
        if (image && isExternalImage) {
            const result = await downloadImage(image);
            filename = result.relativePhysicalPath;
        }

        // Fetch description and embedding
        const { description, embedding } = await fetchContentDetails(streaming_url);

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
            description_embedding: embedding,
        });

        return c.json({ id, ...await c.req.json() }, 201);
    } catch (err) {
        console.error('Database error:', err);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// DELETE /contents/:id: コンテンツ削除
app.delete('/contents/:id', auth, isPrivateCheck, async (c) => {
    try {
        const id = c.req.param('id');
        const userId = c.get('userId');
        const previousContent = await deleteContent(id, userId);
        if (!previousContent) {
            return c.json({ error: 'Content not found.' }, 404);
        }

        const historyQuery = `
      INSERT INTO edit_history (user_id, item_type, content_id, action, changes, previous_changes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        db.run(
            historyQuery,
            [userId, 'content', id, 'delete', '{}', JSON.stringify(previousContent)],
            (historyErr) => {
                if (historyErr) {
                    console.error('Error inserting delete history:', historyErr);
                }
            }
        );

        return c.body(null, 204);
    } catch (err) {
        console.error('Error deleting content:', err);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// GET /contents/:id/similar: 類似コンテンツを取得
app.get('/contents/:id/similar', async (c) => {
    try {
        const id = c.req.param('id');
        const limit = parseInt(c.req.query('limit')) || 10;
        const similarContents = await findSimilarContents(id, limit);
        return c.json(similarContents, 200);
    } catch (err) {
        console.error('Error finding similar contents:', err);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// POST /contents/predict-rating: おすすめ度を予測
app.post('/contents/predict-rating', auth, async (c) => {
    const { description } = await c.req.json();
    const userId = c.get('userId');

    if (!description) {
        return c.json({ error: 'Description is required.' }, 400);
    }

    try {
        // 1. ユーザーの嗜好ベクトルを取得
        const { userPreferenceVector } = await analyzeUserPreferences(userId);
        if (!userPreferenceVector || userPreferenceVector.length === 0) {
            return c.json({ prediction: 0, message: 'Not enough data for prediction.' }, 200);
        }

        // 2. 新しい説明文のEmbeddingを生成
        const newEmbeddings = await getEmbeddings([description]);
        if (!newEmbeddings || newEmbeddings.length === 0 || newEmbeddings[0].length === 0) {
            return c.json({ error: 'Failed to generate embedding for the description.' }, 500);
        }
        const newVector = newEmbeddings[0];

        // 3. コサイン類似度を計算して予測スコアとする
        const similarity = cosineSimilarity(userPreferenceVector, newVector);

        // 予測スコアを0-100の範囲に正規化して返す
        const predictionScore = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

        return c.json({ prediction: predictionScore }, 200);

    } catch (error) {
        console.error('Error predicting rating:', error);
        return c.json({ error: 'An error occurred during prediction.' }, 500);
    }
});

// コサイン類似度を計算するヘルパー関数
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (normA * normB);
}


export default app;
