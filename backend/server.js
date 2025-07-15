import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
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

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined', { stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) }));
app.use(morgan('combined'));

// Error logging middleware
app.use((err, req, res, next) => {
    fs.appendFile('error.log', `${new Date().toISOString()} - ${err.message}\n`, (fsErr) => {
        if (fsErr) {
            console.error('Error logging to file', fsErr);
        }
    });
    next(err);
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

const ipAddress = getLocalIpAddress();

// マイグレーションを実行
import('./migrate.js').then(() => {
    // Routes
    app.use('', rootRoutes);
    app.use('/api', contentsRoutes);
    app.use('/api', imagesRoutes);
    app.use('/api', metadataRoutes);
    app.use('/api', watchlistsRoutes);
    app.use('/api', usersRoutes);
    app.use('/api', batchRoutes);
    app.use('/api', embeddingRoutes);

    // Start the server
    app.listen(PORT, () => {
        console.log(`Server running on http://${ipAddress}:${PORT}`);
    });
}).catch(err => {
    console.error('Migration failed:', err);
});
