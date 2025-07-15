import { Hono } from 'hono';
import { getEmbeddings } from '../models/preferenceAnalysis.js';
import auth from '../middleware/auth.js';

const app = new Hono();

// テキストを受け取り、Embeddingを返すエンドポイント
app.post('/embedding', auth, async (c) => {
  const { text } = await c.req.json();

  if (!text || typeof text !== 'string' || text.trim() === '') {
    return c.json({ error: 'A non-empty text string is required.' }, 400);
  }

  // Ollama関連の環境変数が設定されているかチェック
  if (!process.env.OLLAMA_API_URL || !process.env.OLLAMA_EMBEDDING_MODEL) {
    return c.json({ error: 'Service Unavailable: The embedding service is not configured.' }, 503);
  }

  try {
    const embeddings = await getEmbeddings([text]);
    if (embeddings.length > 0 && embeddings[0].length > 0) {
      return c.json({ embedding: embeddings[0] }, 200);
    } else {
      return c.json({ error: 'Failed to generate embedding for the provided text.' }, 500);
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    return c.json({ error: 'An error occurred while generating the embedding.' }, 500);
  }
});

export default app;
