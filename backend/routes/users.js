import { Hono } from 'hono';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import { sign } from 'hono/jwt'
import auth from '../middleware/auth.js';
import { createAuthToken, deleteAuthToken, deleteAllUserAuthTokens } from '../models/auth_tokens.js';
import { registerUser, getUserByUsername, getUserById, updateUser, deleteUser, getUserList, getUserDetails, searchUsers, } from '../models/user.js';
import { analyzeUserPreferences, getUserRecommendations } from '../models/preferenceAnalysis.js';
import { verifyOneTimeToken } from '../models/one_time_tokens.js';


let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    const secret = randomBytes(32).toString('hex');
    try {
        await fs.writeFile('./.env', `JWT_SECRET=${secret}\n`, { flag: 'a+' });
        console.warn('JWT_SECRET not found in environment variables. A new secret has been generated and saved to .env. Please commit this file to your version control system.');
        JWT_SECRET = secret;
    } catch (error) {
        console.error('Error writing to .env file:', error);
        process.exit(1);
    }
}

const app = new Hono();

// ユーザー登録
app.post('/users', async (c) => {
    const { username, password, is_private } = await c.req.json();
    if (!username || !password) {
        return c.json({ error: 'Username and password are required.' }, 400);
    }
    try {
        const userId = await registerUser({ username, password, is_private });
        return c.json({ message: 'User registered successfully.', userId }, 201);
    } catch (error) {
        console.error('Registration error:', error);
        return c.json({ error: error.message || 'Error registering new user.' }, error.status || 500);
    }
});

// ユーザーログイン
app.post('/login', async (c) => {
    const { username, password } = await c.req.json();
    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return c.json({ error: 'User not found or Invalid password.' }, 404);
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }
        
        const expiresIn = 60 * 60 * 24 * 7; // 7 days
        const expiresAt = new Date(Date.now() + expiresIn * 1000);
        const payload = { id: user.user_id, exp: Math.floor(expiresAt.getTime() / 1000) };
        const token = await sign(payload, JWT_SECRET, 'HS256');
        
        const deviceInfo = c.req.header('User-Agent') || 'Unknown device';
        await createAuthToken({ userId: user.user_id, token, deviceInfo, expiresAt });

        return c.json({ auth: true, token }, 200);
    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'Error generating authentication token.' }, 500);
    }
});

// ユーザーログアウト
app.post('/logout', auth, async (c) => {
    const token = c.get('token');
    try {
        await deleteAuthToken(token);
        return c.json({ message: 'Logged out successfully.' }, 200);
    } catch (error) {
        console.error('Logout error:', error);
        return c.json({ error: 'Failed to logout.' }, 500);
    }
});

// 全てのデバイスからログアウト
app.post('/logout-all', auth, async (c) => {
    const userId = c.get('userId');
    try {
        await deleteAllUserAuthTokens(userId);
        return c.json({ message: 'Logged out from all devices successfully.' }, 200);
    } catch (error) {
        console.error('Logout-all error:', error);
        return c.json({ error: 'Failed to logout from all devices.' }, 500);
    }
});

// ユーザー情報の更新
app.put('/users', auth, async (c) => {
    const userId = c.get('userId');
    const { username, password, is_private } = await c.req.json();
    try {
        const changes = await updateUser(userId, { username, password, is_private });
        if (changes === 0) {
            return c.json({ error: 'No fields provided for update or no changes made.' }, 400);
        }
        const updatedUser = await getUserById(userId);
        return c.json({ message: 'User information updated successfully.', user: updatedUser });
    } catch (error) {
        console.error('Update error:', error);
        return c.json({ error: error.message || 'Database error occurred.' }, error.status || 500);
    }
});

// ユーザー削除
app.delete('/users', auth, async (c) => {
    const requestorId = c.get('userId');
    const { oneTimeToken } = await c.req.json();

    if (!oneTimeToken) {
        return c.json({ error: 'Invalid request. One-time token is required.' }, 400);
    }

    try {
        // Verify the one-time token
        const { userId } = await verifyOneTimeToken(oneTimeToken, 'delete_account');

        // Ensure the token was issued for the current user
        if (userId !== requestorId) {
            return c.json({ error: 'Invalid one-time token.' }, 403);
        }

        const result = await deleteUser(userId);
        if (result.changes === 0) {
            return c.json({ error: 'User not found.' }, 404);
        }
        console.log('User was deleted:', userId);
        return c.body(null, 204);
    } catch (error) {
        console.error('Deletion error:', error);
        return c.json({ error: error.message || 'Failed to delete user.' }, 500);
    }
});

// ユーザーリスト取得
app.get('/users', async (c) => {
    const limit = parseInt(c.req.query('limit'), 10) || 10;
    const offset = parseInt(c.req.query('offset'), 10) || 0;

    if (limit > 100) {
        return c.json({ error: 'Limit must not exceed 100.' }, 400);
    }
    if (limit <= 0 || offset < 0) {
        return c.json({ error: 'Invalid limit or offset value.' }, 400);
    }

    try {
        const users = await getUserList(limit, offset);
        return c.json(users, 200);
    } catch (error) {
        console.error('Error fetching user list:', error);
        return c.json({ error: 'An error occurred while fetching users from the database.' }, 500);
    }
});

// ユーザーへのおすすめコンテンツを取得
app.get('/users/recommendations', auth, async (c) => {
    const userId = c.get('userId');
    const limit = parseInt(c.req.query('limit')) || 10;

    try {
        const recommendations = await getUserRecommendations(userId, limit);
        return c.json(recommendations, 200);
    } catch (error) {
        console.error(`Error getting recommendations for user ${userId}:`, error);
        return c.json({ error: 'An error occurred while getting recommendations.' }, 500);
    }
});

// ユーザー詳細取得
app.get('/users/:id', auth, async (c) => {
    const userId = c.req.param('id');
    try {
        const userDetails = await getUserDetails(userId);
        if (!userDetails) {
            return c.json({ error: 'User not found.' }, 404);
        }
        return c.json(userDetails, 200);
    } catch (error) {
        console.error('Error fetching user details:', error);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// ユーザー検索
app.get('/search/users', auth, async (c) => {
    const userName = c.req.query('user_name') || '';
    const limit = parseInt(c.req.query('limit'), 10) || 10;
    const offset = parseInt(c.req.query('offset'), 10) || 0;

    if (limit > 100) {
        return c.json({ error: 'Limit must not exceed 100.' }, 400);
    }
    if (limit <= 0 || offset < 0) {
        return c.json({ error: 'Invalid limit or offset value.' }, 400);
    }

    try {
        const users = await searchUsers(userName, limit, offset);
        return c.json(users, 200);
    } catch (error) {
        console.error('Error searching users:', error);
        return c.json({ error: 'Database error occurred.' }, 500);
    }
});

// ユーザーの嗜好分析結果を取得
app.get('/users/:id/preference-analysis', auth, async (c) => {
    const requestedUserId = parseInt(c.req.param('id'), 10);
    const requesterId = parseInt(c.get('userId'), 10);

    // 自分自身の分析結果のみ取得可能
    if (isNaN(requestedUserId) || isNaN(requesterId) || requestedUserId !== requesterId) {
        return c.json({ error: 'Forbidden: You can only access your own preference analysis.' }, 403);
    }

    // Ollama関連の環境変数が設定されているかチェック
    if (!process.env.OLLAMA_API_URL || !process.env.OLLAMA_EMBEDDING_MODEL) {
        return c.json({ error: 'Service Unavailable: The analysis service is not configured. Please set OLLAMA_API_URL and OLLAMA_EMBEDDING_MODEL.' }, 503);
    }

    try {
        const analysisResult = await analyzeUserPreferences(requestedUserId);
        return c.json(analysisResult, 200);
    } catch (error) {
        console.error(`Error analyzing preferences for user ${requestedUserId}:`, error);
        return c.json({ error: 'An error occurred during preference analysis.' }, 500);
    }
});

export default app;
