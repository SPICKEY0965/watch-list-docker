import express from 'express';
import extractAmazonVideoMetadataFromUrl from '../utils/autoFetchMeta.js';

const router = express.Router();

router.post('/metadata', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'Invalid request: Missing URL.' });
        }

        const { imageUrl, broadcastDate, title } = await extractAmazonVideoMetadataFromUrl(url);
        if (!imageUrl && !broadcastDate && title) {
            return res.status(404).json({ error: 'Image URL or broadcast Date extraction failed.' });
        }

        return res.status(200).json({ imageUrl, broadcastDate, title });
    } catch (err) {
        console.error('Web scraping failed:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
