import { verify } from 'hono/jwt'
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;

const auth = async (c, next) => {
    const authHeader = c.req.header('authorization');
    if (!authHeader) {
        return c.json({ error: 'No token provided.' }, 403);
    }

    let token;
    if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else {
        token = authHeader;
    }

    if (!token) {
        return c.json({ error: 'Malformed token.' }, 403);
    }

    try {
        const decoded = await verify(token, JWT_SECRET, 'HS256');
        if (!decoded || !decoded.id) {
            return c.json({ error: 'Invalid token.' }, 401);
        }

        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE user_id = ?', [decoded.id], (dbErr, user) => {
                if (dbErr) {
                    console.error('Database error during token verification:', dbErr);
                    return reject(new Error('Database error occurred.'));
                }
                resolve(user);
            });
        });

        if (!user) {
            return c.json({ error: 'Invalid token. User does not exist.' }, 401);
        }

        c.set('userId', decoded.id);
        await next();
    } catch (err) {
        if (err.name === 'JwtTokenExpired') {
            return c.json({ error: 'Token has expired.' }, 401);
        }
        if (err.name === 'JwtTokenInvalid') {
            return c.json({ error: 'Invalid token.' }, 401);
        }
        console.error('Token verification error:', err);
        return c.json({ error: 'Failed to authenticate token.' }, 500);
    }
};


export default auth;
