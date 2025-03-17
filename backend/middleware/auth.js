import jwt from 'jsonwebtoken';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const auth = (req, res, next) => {
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
            if (err.name === 'TokenExpiredError') {
                // トークンの有効期限が切れた場合の処理
                return res.status(401).json({ error: 'Token has expired.' });
            } else if (err.name === 'JsonWebTokenError') {
                // トークンが無効な場合の処理
                return res.status(401).json({ error: 'Invalid token.' });
            } else {
                // その他の予期しないエラーをキャッチ
                console.error('Token verification error:', err);
                return res.status(500).json({ error: 'Failed to authenticate token.' });
            }
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


export default auth;
