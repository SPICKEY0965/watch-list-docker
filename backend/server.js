import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { useSession } from '@hono/session';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import 'dotenv/config';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { sequelize } from './db.js';
import rootRoutes from './routes/root.js';
import contentsRoutes from './routes/contents.js';
import imagesRoutes from './routes/images.js';
import metadataRoutes from './routes/metadata.js';
import watchlistsRoutes from './routes/watch_lists.js';
import usersRoutes from './routes/users.js';
import batchRoutes from './routes/batch.js';
import embeddingRoutes from './routes/embedding.js';
import authRoutes from './routes/auth.js';
import { seedTags } from './models/preferenceAnalysis.js';

const app = new Hono();
const PORT = 5000;

// Middleware
app.use('*', cors());
app.use('*', logger((str) => fs.appendFileSync(path.join(__dirname, 'access.log'), str)));
app.use('*', logger());
app.use(useSession({
    secret: process.env.SESSION_SECRET || 'a-secure-secret-for-development-only',
}));

// Error logging middleware
app.onError((err, c) => {
    fs.appendFile('error.log', `${new Date().toISOString()} - ${err.message}\n`, (fsErr) => {
        if (fsErr) {
            console.error('Error logging to file', fsErr);
        }
    });
    console.error('Error:', err);
    return c.text('Internal Server Error', 500);
});


function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            // IPv4 かつ内部アドレスではない場合
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    // 見つからなかった場合は 'localhost' を返す
    return 'localhost';
}

import { runMigrations } from './migrate.js';

const ipAddress = getLocalIpAddress();

const startServer = async () => {
    try {
        // 1. マイグレーションを実行
        await runMigrations();

        // 2. タグの初期データを登録
        await seedTags();
        console.log('Tag seeding completed.');

        // 3. ルーティングを設定
        app.route('/', rootRoutes);
        app.route('/api', contentsRoutes);
        app.route('/api', imagesRoutes);
        app.route('/api', metadataRoutes);
        app.route('/api', watchlistsRoutes);
        app.route('/api', usersRoutes);
        app.route('/api', batchRoutes);
        app.route('/api', embeddingRoutes);
        app.route('/api', authRoutes);

        // 4. サーバーを起動
        serve({
            fetch: app.fetch,
            port: PORT
        }, (info) => {
            console.log(`Server running on http://${ipAddress}:${info.port}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
