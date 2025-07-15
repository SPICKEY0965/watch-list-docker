import { Hono } from 'hono';
import path from 'path';
import { dirname } from 'path';
import * as fs from 'node:fs/promises';
import { fileURLToPath } from 'url';
import mime from 'mime-types';

const app = new Hono();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const imageDir = path.join(__dirname, '../images');

app.get('/images/:hashDir1/:hashDir2/:filename', async (c) => {
    const { hashDir1, hashDir2, filename } = c.req.param();

    // 絶対パスを生成
    const imagePath = path.join(imageDir, hashDir1, hashDir2, filename);
    const resolvedImagePath = path.resolve(imagePath);
    const resolvedBaseDir = path.resolve(imageDir);

    // セキュリティ対策：リクエストされたファイルがIMAGE_DIR内にあるかチェック
    if (!resolvedImagePath.startsWith(resolvedBaseDir)) {
        return c.json({ error: 'Image not found' }, 404);
    }

    try {
        await fs.access(resolvedImagePath, fs.constants.F_OK);
        const file = await fs.readFile(resolvedImagePath);
        const contentType = mime.lookup(filename) || 'application/octet-stream';
        c.header('Content-Type', contentType);
        return c.body(file);
    } catch (err) {
        console.error('Failed to retrieve image:', err);
        return c.json({ error: 'Image not found' }, 404);
    }
});

export default app;
