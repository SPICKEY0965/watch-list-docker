const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = 5000;

// SQLite connection setup
const db = new sqlite3.Database('./anime.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined', { stream: fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' }) }));

// Error logging middleware
app.use((err, req, res, next) => {
    fs.appendFile('error.log', `${new Date().toISOString()} - ${err.message}\n`, (fsErr) => {
        if (fsErr) {
            console.error('Error logging to file', fsErr);
        }
    });
    next(err);
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS anime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            genres TEXT,
            type TEXT,
            duration INTEGER,
            episodes INTEGER,
            currentEpisode INTEGER,
            image TEXT,
            synopsis TEXT,
            japaneseTitle TEXT,
            broadcastDate TEXT,
            updateDay TEXT,
            streamingUrl TEXT,
            status TEXT,
            rating REAL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
});

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(500).json({ error: 'Failed to authenticate token.' });
        req.userId = decoded.id;
        next();
    });
};

// Register new user
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username already exists.' });
                }
                return res.status(500).json({ error: 'Error registering new user.' });
            }
            res.status(201).json({ message: 'User registered successfully.' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error hashing password.' });
    }
});

// Login user
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'An internal server error occurred.' });  // より一般的なエラーメッセージ
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found or Invalid password.' });
        }
        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'User not found or Invalid password.' });

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: 86400 }); // 24 hours
        res.status(200).json({ auth: true, token: token });
    });
});

// Delete user account (protected route)
app.delete('/api/user', verifyToken, (req, res) => {
    const userId = req.userId;

    // トランザクションを使用して、ユーザーと関連するアニメを一緒に削除する
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // まずanimeテーブルのデータを削除
        db.run('DELETE FROM anime WHERE user_id = ?', [userId], function (err) {
            if (err) {
                console.error('Error deleting user\'s anime:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete user\'s anime.' });
            }
        });

        // 次にusersテーブルからユーザーを削除
        db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
            if (err) {
                console.error('Error deleting user:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to delete user.' });
            }

            // ユーザーが見つからなかった場合
            if (this.changes === 0) {
                db.run('ROLLBACK');
                return res.status(404).json({ error: 'User not found.' });
            }

            // 成功した場合はコミット
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Transaction commit error:', err);
                    return res.status(500).json({ error: 'Transaction error occurred.' });
                }

                // 成功のレスポンスを送信
                res.sendStatus(204);
            });
        });
    });
});


// Get anime list (protected route)
app.get('/api/anime', verifyToken, (req, res) => {
    db.all('SELECT * FROM anime WHERE user_id = ?', [req.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }

        const formattedResults = rows.map(anime => ({
            ...anime,
            genres: anime.genres ? JSON.parse(anime.genres) : []
        }));

        res.json(formattedResults);
    });
});

// Add new anime (protected route)
app.post('/api/anime', verifyToken, (req, res) => {
    const { title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const formattedGenres = JSON.stringify(genres);

    const query = `
        INSERT INTO anime (user_id, title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [req.userId, title, formattedGenres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating], function (err) {
        if (err) {
            console.error('Error inserting new anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        const insertedAnime = { id: this.lastID, user_id: req.userId, title, genres: JSON.parse(formattedGenres), type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating };
        res.status(201).json(insertedAnime);
    });
});

// Update anime (protected route)
app.put('/api/anime/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required.' });
    }

    const updatedAnime = { title, genres: JSON.stringify(genres), type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating };

    const query = `
    UPDATE anime
    SET title = ?, genres = ?, type = ?, duration = ?, episodes = ?, currentEpisode = ?, image = ?, synopsis = ?, japaneseTitle = ?, broadcastDate = ?, updateDay = ?, streamingUrl = ?, status = ?, rating = ?
    WHERE id = ? AND user_id = ?
`;
    db.run(query, [...Object.values(updatedAnime), id, req.userId], function (err) {
        if (err) {
            console.error('Error updating anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Anime not found or you do not have permission to update it.' });
        }
        const responseAnime = { ...updatedAnime, id, user_id: req.userId, genres: JSON.parse(updatedAnime.genres) };
        res.json(responseAnime);
    });
});

// Delete anime (protected route)
app.delete('/api/anime/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM anime WHERE id = ? AND user_id = ?', [id, req.userId], function (err) {
        if (err) {
            console.error('Error deleting anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Anime not found or you do not have permission to delete it.' });
        }
        res.sendStatus(204);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});