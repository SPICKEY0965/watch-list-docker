import express from 'express';
import { db } from '../db.js';
import auth from '../middleware/auth.js';
import { downloadImage, isExternalImage } from '../utils/imageDownload.js';
import fetchContentDetails from '../utils/fetchContentDetails.js';
import { getContents, addContent, updateContent, deleteContent, findSimilarContents } from '../models/contents.js';
import { analyzeUserPreferences, getEmbeddings } from '../models/preferenceAnalysis.js';
import isPrivateCheck from '../middleware/private.js';
import { editHistoryMiddleware } from '../middleware/editHistory.js'

const router = express.Router();

// GET /contents (protected route)
router.get('/contents', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const offset = parseInt(req.query.offset) || 0;
        const sortByParam = (req.query.sortBy || 'BROADCAST').toUpperCase();
        const sortOrder = (req.query.sortOrder || 'ASC').toUpperCase();
        const protocol = req.protocol;
        const host = req.get('host');

        if (isNaN(limit) || isNaN(offset) || limit <= 0 || offset < 0) {
            return res.status(400).json({ error: 'Invalid limit or offset parameters.' });
        }

        const allowedSortByFields = {
            BROADCAST: 'broadcastDate',
            TITLE: 'title',
        };
        if (!allowedSortByFields.hasOwnProperty(sortByParam)) {
            return res.status(400).json({ error: 'Invalid sortBy parameter.' });
        }
        if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
            return res.status(400).json({ error: 'Invalid sortOrder parameter. Use ASC or DESC.' });
        }

        const sortBy = allowedSortByFields[sortByParam];
        const { airing_status, content_type } = req.query;
        const allowedAiringStatuses = ['Upcoming', 'Airing', 'Finished Airing'];
        if (airing_status && !allowedAiringStatuses.includes(airing_status)) {
            return res.status(400).json({ error: 'Invalid airing_status parameter.' });
        }
        const allowedContentTypes = ['documentary', 'drama', 'anime'];
        if (content_type && !allowedContentTypes.includes(content_type)) {
            return res.status(400).json({ error: 'Invalid content_type parameter.' });
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

        res.status(200).json(transformedRows);
    } catch (err) {
        console.error('Error fetching contents:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// POST /contents (protected route)
router.post('/contents', auth, async (req, res, next) => {
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate } = req.body;
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }
    const added_by = req.userId;

    try {
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
        req.newContentId = newContentId;

        next();
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error occurred.' });
    }
}, editHistoryMiddleware('create', 'content'), (req, res) => {
    return res.status(201).json({ id: req.newContentId });
});

// PUT /contents/:id: コンテンツ更新
router.put('/contents/:id', auth, isPrivateCheck, async (req, res, next) => {
    const { id } = req.params;
    const { title, episodes, image, streaming_url, content_type, season, cour, airing_status, is_private, broadcastDate } = req.body;
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    try {
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

        next();
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
}, editHistoryMiddleware('update', 'content'), (req, res) => {
    const { id } = req.params;
    res.status(201).json({ id, ...req.body });
});

// DELETE /contents/:id: コンテンツ削除
router.delete('/contents/:id', auth, isPrivateCheck, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const previousContent = await deleteContent(id, userId);
        if (!previousContent) {
            return res.status(404).json({ error: 'Content not found.' });
        }

        const historyQuery = `
      INSERT INTO edit_history (user_id, item_type, content_id, action, changes, previous_changes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        db.run(
            historyQuery,
            [req.userId, 'content', id, 'delete', '{}', JSON.stringify(previousContent)],
            (historyErr) => {
                if (historyErr) {
                    console.error('Error inserting delete history:', historyErr);
                }
            }
        );

        res.sendStatus(204);
    } catch (err) {
        console.error('Error deleting content:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// GET /contents/:id/similar: 類似コンテンツを取得
router.get('/contents/:id/similar', async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const similarContents = await findSimilarContents(id, limit);
        res.status(200).json(similarContents);
    } catch (err) {
        console.error('Error finding similar contents:', err);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// POST /contents/predict-rating: おすすめ度を予測
router.post('/contents/predict-rating', auth, async (req, res) => {
    const { description } = req.body;
    const userId = req.userId;

    if (!description) {
        return res.status(400).json({ error: 'Description is required.' });
    }

    try {
        // 1. ユーザーの嗜好ベクトルを取得
        const { userPreferenceVector } = await analyzeUserPreferences(userId);
        if (!userPreferenceVector || userPreferenceVector.length === 0) {
            return res.status(200).json({ prediction: 0, message: 'Not enough data for prediction.' });
        }

        // 2. 新しい説明文のEmbeddingを生成
        const newEmbeddings = await getEmbeddings([description]);
        if (!newEmbeddings || newEmbeddings.length === 0 || newEmbeddings[0].length === 0) {
            return res.status(500).json({ error: 'Failed to generate embedding for the description.' });
        }
        const newVector = newEmbeddings[0];

        // 3. コサイン類似度を計算して予測スコアとする
        const similarity = cosineSimilarity(userPreferenceVector, newVector);

        // 予測スコアを0-100の範囲に正規化して返す
        const predictionScore = Math.round(Math.max(0, Math.min(1, similarity)) * 100);

        res.status(200).json({ prediction: predictionScore });

    } catch (error) {
        console.error('Error predicting rating:', error);
        res.status(500).json({ error: 'An error occurred during prediction.' });
    }
});


export default router;
