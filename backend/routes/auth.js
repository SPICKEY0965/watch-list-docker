import { Hono } from 'hono';
import auth from '../middleware/auth.js';
import { getUserAuthTokens, deleteAuthTokenById } from '../models/auth_tokens.js';
import { verifyPassword } from '../models/user.js';
import { createOneTimeToken, verifyOneTimeToken } from '../models/one_time_tokens.js';

const app = new Hono();

// Get all active sessions for the current user
app.get('/auth/devices', auth, async (c) => {
    const userId = c.get('userId');
    const currentToken = c.req.header('Authorization')?.split(' ')[1];
    try {
        const tokens = await getUserAuthTokens(userId);
        const devices = tokens.map(t => ({
            ...t,
            is_current_session: t.token === currentToken
        }));
        return c.json(devices);
    } catch (error) {
        console.error('Error fetching user devices:', error);
        return c.json({ error: 'Failed to fetch devices.' }, 500);
    }
});

// Log out a specific device by its token ID
app.delete('/auth/tokens/:id', auth, async (c) => {
    const requestorId = c.get('userId');
    const tokenIdToDelete = parseInt(c.req.param('id'), 10);
    const { oneTimeToken } = await c.req.json();

    if (isNaN(tokenIdToDelete) || !oneTimeToken) {
        return c.json({ error: 'Invalid request.' }, 400);
    }

    try {
        // Verify the one-time token
        const { userId, targetId } = await verifyOneTimeToken(oneTimeToken, 'logout_device');

        // Ensure the token was issued for the current user and the correct target device
        if (userId !== requestorId || targetId !== tokenIdToDelete) {
            return c.json({ error: 'Invalid one-time token.' }, 403);
        }

        const result = await deleteAuthTokenById(tokenIdToDelete, userId);
        if (result.changes === 0) {
            return c.json({ error: 'Token not found or you do not have permission to delete it.' }, 404);
        }
        return c.json({ message: 'Device logged out successfully.' }, 200);
    } catch (error) {
        console.error('Error deleting auth token:', error);
        return c.json({ error: error.message || 'Failed to delete token.' }, 500);
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
        const isValid = await verifyPassword(userId, password);
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
