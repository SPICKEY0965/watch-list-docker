import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
// import { getUserAuthTokens, deleteAuthTokenById } from '../models/auth_tokens.js'; // Legacy
import { getUserByUsername, updateLastLogin, verifyPassword as verifyUserPassword } from '../models/user.js';
import { createRefreshToken, verifyRefreshToken, invalidateRefreshToken } from '../models/refresh_tokens.js';
import { createOneTimeToken, verifyOneTimeToken } from '../models/one_time_tokens.js';

const app = new Hono();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your-access-token-secret';
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_COOKIE_NAME = 'jid';

// --- New Authentication Endpoints ---

// Login with username and password
app.post('/auth/login', async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: 'Username and password are required.' }, 400);
    }

    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return c.json({ error: 'Invalid credentials.' }, 401);
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return c.json({ error: 'Invalid credentials.' }, 401);
        }

        // Create Access Token
        const accessToken = jwt.sign(
            { userId: user.user_id, username: user.user_name },
            ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        // Create Refresh Token
        const { token: refreshToken } = await createRefreshToken(user.user_id);

        // Set Refresh Token in HttpOnly Cookie
        setCookie(c, REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        await updateLastLogin(user.user_id);

        return c.json({
            accessToken,
            expiresIn: 15 * 60, // 15 minutes in seconds
        });

    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'Internal server error.' }, 500);
    }
});

// Refresh Access Token
app.post('/auth/refresh', async (c) => {
    const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE_NAME);

    if (!refreshToken) {
        return c.json({ error: 'Refresh token not found.' }, 401);
    }

    try {
        const payload = await verifyRefreshToken(refreshToken);
        if (!payload) {
            return c.json({ error: 'Invalid or expired refresh token.' }, 403);
        }

        const user = { user_id: payload.userId }; // Assuming verifyRefreshToken returns userId

        const accessToken = jwt.sign(
            { userId: user.user_id },
            ACCESS_TOKEN_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
        );

        return c.json({
            accessToken,
            expiresIn: 15 * 60,
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        return c.json({ error: 'Internal server error.' }, 500);
    }
});

// Logout
app.post('/auth/logout', async (c) => {
    const refreshToken = getCookie(c, REFRESH_TOKEN_COOKIE_NAME);

    if (refreshToken) {
        try {
            const payload = await verifyRefreshToken(refreshToken);
            if (payload) {
                await invalidateRefreshToken(payload.tokenId);
            }
        } catch (error) {
            // Ignore errors, just clear the cookie
            console.error('Error invalidating refresh token during logout:', error);
        }
    }

    deleteCookie(c, REFRESH_TOKEN_COOKIE_NAME, {
        path: '/',
    });

    return c.json({ message: 'Logged out successfully.' }, 200);
});


// --- Existing Endpoints (Adapted for new auth model) ---

// Get all active sessions for the current user
app.get('/auth/devices', auth, async (c) => {
    const userId = c.get('userId');
    // const currentToken = c.req.header('Authorization')?.split(' ')[1]; // This logic needs rethinking with refresh tokens
    try {
        // TODO: Implement fetching active refresh tokens for the user
        // const tokens = await getRefreshTokensForUser(userId);
        // const devices = tokens.map(t => ({ ... }));
        return c.json([]); // Placeholder until implemented
    } catch (error) {
        console.error('Error fetching user devices:', error);
        return c.json({ error: 'Failed to fetch devices.' }, 500);
    }
});

// Log out a specific device by its token ID
app.delete('/auth/tokens/:id', auth, async (c) => {
    const requestorId = c.get('userId');
    const tokenIdToDelete = c.req.param('id'); // This is now a UUID string
    const { oneTimeToken } = await c.req.json();

    if (!tokenIdToDelete || !oneTimeToken) {
        return c.json({ error: 'Invalid request.' }, 400);
    }

    try {
        // Verify the one-time token
        const { userId, targetId } = await verifyOneTimeToken(oneTimeToken, 'logout_device');

        // Ensure the token was issued for the current user and the correct target device
        if (userId !== requestorId || targetId !== tokenIdToDelete) {
            return c.json({ error: 'Invalid one-time token.' }, 403);
        }

        await invalidateRefreshToken(tokenIdToDelete);
        
        return c.json({ message: 'Device logged out successfully.' }, 200);
    } catch (error) {
        console.error('Error invalidating refresh token:', error);
        return c.json({ error: error.message || 'Failed to invalidate token.' }, 500);
    }
});

// Verify password and issue a one-time token for sensitive actions
app.post('/auth/verify-password', auth, async (c) => {
    const userId = c.get('userId');
    const { password, actionType, targetId } = await c.req.json();

    if (!password || !actionType) {
        return c.json({ error: 'Password and actionType are required.' }, 400);
    }

    try {
        const isValid = await verifyUserPassword(userId, password);
        if (!isValid) {
            return c.json({ success: false, error: 'Invalid password.' }, 401);
        }

        // Issue a one-time token
        const oneTimeToken = await createOneTimeToken(userId, actionType, targetId);

        return c.json({ success: true, oneTimeToken });
    } catch (error) {
        console.error('Error during password verification and token issuance:', error);
        return c.json({ error: 'An error occurred.' }, 500);
    }
});

export default app;
