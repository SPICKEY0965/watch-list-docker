import express from 'express';
import { getEmbeddings } from '../models/preferenceAnalysis.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// テキストを受け取り、Embeddingを返すエンドポイント
router.post('/embedding', auth, async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'A non-empty text string is required.' });
  }

  // Ollama関連の環境変数が設定されているかチェック
  if (!process.env.OLLAMA_API_URL || !process.env.OLLAMA_EMBEDDING_MODEL) {
    return res.status(503).json({ error: 'Service Unavailable: The embedding service is not configured.' });
  }

  try {
    const embeddings = await getEmbeddings([text]);
    if (embeddings.length > 0 && embeddings[0].length > 0) {
      res.status(200).json({ embedding: embeddings[0] });
    } else {
      res.status(500).json({ error: 'Failed to generate embedding for the provided text.' });
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(500).json({ error: 'An error occurred while generating the embedding.' });
  }
});

export default router;
