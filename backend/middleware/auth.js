import { verify } from 'hono/jwt'
import { findAuthToken, updateLastUsed } from '../models/auth_tokens.js';

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
        const storedToken = await findAuthToken(token);
        if (!storedToken) {
            return c.json({ error: 'Invalid token or session expired.' }, 401);
        }

        const decoded = await verify(token, JWT_SECRET, 'HS256');
        if (!decoded || !decoded.id) {
            return c.json({ error: 'Invalid token.' }, 401);
        }

        if (new Date(storedToken.expires_at) < new Date()) {
            return c.json({ error: 'Token has expired.' }, 401);
        }

        await updateLastUsed(token);

        c.set('userId', decoded.id);
        c.set('token', token);
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
