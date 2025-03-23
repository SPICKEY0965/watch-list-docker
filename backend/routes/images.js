import express from 'express';
import path from 'path';
import { dirname } from 'path';
import * as fs from 'node:fs/promises';
import extractImageUrlFromText from '../utils/autoDLImg.js';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imageDir = path.join(__dirname, '../images');

router.get('/images/:hashDir1/:hashDir2/:filename', async (req, res) => {
    const { hashDir1, hashDir2, filename } = req.params;

    // 絶対パスを生成
    const imagePath = path.join(imageDir, hashDir1, hashDir2, filename);
    const resolvedImagePath = path.resolve(imagePath);
    const resolvedBaseDir = path.resolve(imageDir);

    // セキュリティ対策：リクエストされたファイルがIMAGE_DIR内にあるかチェック
    if (!resolvedImagePath.startsWith(resolvedBaseDir)) {
        return res.status(404).json({ error: 'Image not found' });
    }

    try {
        await fs.access(resolvedImagePath, fs.constants.F_OK);
        res.sendFile(resolvedImagePath, err => {
            if (err) {
                console.error('File transmission error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to send image file.' });
                }
            }
        });
    } catch (err) {
        console.error('Failed to retrieve image:', err);
        return res.status(404).json({ error: 'Image not found' });
    }
});

router.post('/images', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'Invalid request: Missing URL.' });
        }

        const imageUrl = await extractImageUrlFromText(url);
        if (!imageUrl) {
            return res.status(404).json({ error: 'Image URL extraction failed.' });
        }

        return res.status(200).json({ imageUrl });
    } catch (err) {
        console.error('Failed to retrieve image:', err);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

export default router;
