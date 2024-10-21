const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: 'No token provided.' });
    }

    let token;
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        token = authHeader;
    }

    if (!token) {
        return res.status(403).json({ error: 'Malformed token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to authenticate token.' });
        }

        // データベースでユーザーの存在を確認
        db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (dbErr, user) => {
            if (dbErr) {
                console.error('Database error during token verification:', dbErr);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid token. User does not exist.' });
            }

            req.userId = decoded.id;
            next();
        });
    });
};

module.exports = verifyToken;
