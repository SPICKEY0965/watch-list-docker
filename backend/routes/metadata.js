import { Hono } from 'hono';
import extractAmazonVideoMetadataFromUrl from '../utils/autoFetchMeta.js';

const app = new Hono();

app.post('/metadata', async (c) => {
    try {
        const { url } = await c.req.json();
        if (!url) {
            return c.json({ error: 'Invalid request: Missing URL.' }, 400);
        }

        const { imageUrl, broadcastDate, title, description } = await extractAmazonVideoMetadataFromUrl(url);
        if (!imageUrl && !broadcastDate && !title) {
            return c.json({ error: 'Image URL or broadcast Date extraction failed.' }, 404);
        }

        return c.json({ imageUrl, broadcastDate, title, description }, 200);
    } catch (err) {
        console.error('Web scraping failed:', err);
        return c.json({ error: 'Internal server error.' }, 500);
    }
});

export default app;
