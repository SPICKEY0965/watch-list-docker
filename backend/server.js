const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const os = require('os');

const { initializeDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const contentsRoutes = require('./routes/contents');

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
app.use('/api', authRoutes);
app.use('/api', contentsRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://${ipAddress}:${PORT}`);
});