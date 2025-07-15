import express from 'express';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import { registerUser, getUserByUsername, getUserById, updateLastLogin, updateUser, deleteUser, getUserList, getUserDetails, searchUsers, } from '../models/user.js';
import { analyzeUserPreferences, getUserRecommendations } from '../models/preferenceAnalysis.js';


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

const router = express.Router();

// ユーザー登録
router.post('/users', async (req, res) => {
    const { username, password, is_private } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    try {
        const userId = await registerUser({ username, password, is_private });
        res.status(201).json({ message: 'User registered successfully.', userId });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Error registering new user.' });
    }
});

// ユーザーログイン
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: 'User not found or Invalid password.' });
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        await updateLastLogin(user.user_id);
        const token = jwt.sign(
            { id: user.user_id },
            JWT_SECRET,
            {
                expiresIn: '7d',
                algorithm: 'HS256'
            }
        );
        res.status(200).json({ auth: true, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error generating authentication token.' });
    }
});

// ユーザー情報の更新
router.put('/users', auth, async (req, res) => {
    const userId = req.userId;
    const { username, password, is_private } = req.body;
    try {
        const changes = await updateUser(userId, { username, password, is_private });
        if (changes === 0) {
            return res.status(400).json({ error: 'No fields provided for update or no changes made.' });
        }
        // 更新後のユーザー情報を取得して返す
        const updatedUser = await getUserById(userId);
        res.json({ message: 'User information updated successfully.', user: updatedUser });
    } catch (error) {
        console.error('Update error:', error);
        res.status(error.status || 500).json({ error: error.message || 'Database error occurred.' });
    }
});

// ユーザー削除
router.delete('/users', auth, async (req, res) => {
    const userId = req.userId;
    try {
        const result = await deleteUser(userId);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        console.log('User was deleted:', userId);
        res.sendStatus(204);
    } catch (error) {
        console.error('Deletion error:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

// ユーザーリスト取得
router.get('/users', async (req, res) => {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (limit > 100) {
        return res.status(400).json({ error: 'Limit must not exceed 100.' });
    }
    if (limit <= 0 || offset < 0) {
        return res.status(400).json({ error: 'Invalid limit or offset value.' });
    }

    try {
        const users = await getUserList(limit, offset);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching user list:', error);
        res.status(500).json({ error: 'An error occurred while fetching users from the database.' });
    }
});

// ユーザーへのおすすめコンテンツを取得
router.get('/users/recommendations', auth, async (req, res) => {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const recommendations = await getUserRecommendations(userId, limit);
        res.status(200).json(recommendations);
    } catch (error) {
        console.error(`Error getting recommendations for user ${userId}:`, error);
        res.status(500).json({ error: 'An error occurred while getting recommendations.' });
    }
});

// ユーザー詳細取得
router.get('/users/:id', auth, async (req, res) => {
    const userId = req.params.id;
    try {
        const userDetails = await getUserDetails(userId);
        if (!userDetails) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.status(200).json(userDetails);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// ユーザー検索
router.get('/search/users', auth, async (req, res) => {
    const userName = req.query.user_name || '';
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (limit > 100) {
        return res.status(400).json({ error: 'Limit must not exceed 100.' });
    }
    if (limit <= 0 || offset < 0) {
        return res.status(400).json({ error: 'Invalid limit or offset value.' });
    }

    try {
        const users = await searchUsers(userName, limit, offset);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ error: 'Database error occurred.' });
    }
});

// ユーザーの嗜好分析結果を取得
router.get('/users/:id/preference-analysis', auth, async (req, res) => {
    const requestedUserId = parseInt(req.params.id, 10);
    const requesterId = parseInt(req.userId, 10);

    // 自分自身の分析結果のみ取得可能
    if (isNaN(requestedUserId) || isNaN(requesterId) || requestedUserId !== requesterId) {
        return res.status(403).json({ error: 'Forbidden: You can only access your own preference analysis.' });
    }

    // Ollama関連の環境変数が設定されているかチェック
    if (!process.env.OLLAMA_API_URL || !process.env.OLLAMA_EMBEDDING_MODEL) {
        return res.status(503).json({ error: 'Service Unavailable: The analysis service is not configured. Please set OLLAMA_API_URL and OLLAMA_EMBEDDING_MODEL.' });
    }

    try {
        const analysisResult = await analyzeUserPreferences(requestedUserId);
        res.status(200).json(analysisResult);
    } catch (error) {
        console.error(`Error analyzing preferences for user ${requestedUserId}:`, error);
        res.status(500).json({ error: 'An error occurred during preference analysis.' });
    }
});

export default router;
