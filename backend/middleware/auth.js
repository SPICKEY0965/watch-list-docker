const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token and check if the user exists in the database
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token.' });

        // Verify if the user still exists in the database
        db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (dbErr, user) => {
            if (dbErr) {
                console.error('Database error during token verification:', dbErr);
                return res.status(500).json({ error: 'Database error occurred.' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid token. User does not exist.' });
            }
            // User exists, continue to the next middleware or route handler
            req.userId = decoded.id;
            next();
        });
    });
};

module.exports = verifyToken;