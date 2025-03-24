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

import { initializeDatabase } from './db.js';
import rootRoutes from './routes/root.js';
import authRoutes from './routes/auth.js';
import contentsRoutes from './routes/contents.js';
import imagesRoutes from './routes/images.js';

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined', { stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) }));

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

// Initialize database
initializeDatabase();

// Routes
app.use('', rootRoutes);
app.use('/api', authRoutes);
app.use('/api', contentsRoutes);
app.use('/api', imagesRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://${ipAddress}:${PORT}`);
});
