const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ユーザー登録
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createdDate = new Date().toISOString();

        db.run(
            'INSERT INTO users (username, password, created_date) VALUES (?, ?, ?)',
            [username, hashedPassword, createdDate],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ error: 'Username already exists.' });
                    }
                    return res.status(500).json({ error: 'Error registering new user.' });
                }
                res.status(201).json({ message: 'User registered successfully.' });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Error hashing password.' });
    }
});

// ユーザーログイン
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'An internal server error occurred.' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found or Invalid password.' });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid username or password.' });

        const lastLoginDate = new Date().toISOString();
        db.run('UPDATE users SET last_login_date = ? WHERE id = ?', [lastLoginDate, user.id], (updateErr) => {
            if (updateErr) {
                console.error('Error updating last login date:', updateErr);
            }
        });

        const token = jwt.sign(
            { id: user.id },
            JWT_SECRET,
            {
                expiresIn: '86400',
                algorithm: 'HS256'
            }
        );
        res.status(200).json({ auth: true, token: token });
    });
});

// ユーザー削除
router.delete('/user', require('../middleware/auth'), (req, res) => {
    const userId = req.userId;
    const deletedDate = new Date().toISOString();

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
            'UPDATE contents SET deleted_date = ? WHERE id IN (SELECT content_id FROM watch_list WHERE user_id = ?)',
            [deletedDate, userId],
            function (err) {
                if (err) {
                    console.error('Error marking user\'s contents as deleted:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete user\'s contents.' });
                }
            }
        );

        db.run(
            'DELETE FROM users WHERE id = ?',
            [userId],
            function (err) {
                if (err) {
                    console.error('Error deleting user:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete user.' });
                }

                if (this.changes === 0) {
                    db.run('ROLLBACK');
                    return res.status(404).json({ error: 'User not found.' });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Transaction commit error:', err);
                        return res.status(500).json({ error: 'Transaction error occurred.' });
                    }

                    res.sendStatus(204);
                });
            }
        );
    });
});

module.exports = router;