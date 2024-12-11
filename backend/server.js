const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const contentsRoutes = require('./routes/contents');

const app = express();
const PORT = 5000;

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

// ミドルウェア
app.use(cors());
app.use(bodyParser.json());

// テーブル作成（もし存在しない場合）
db.run(`
    CREATE TABLE IF NOT EXISTS anime (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        rating REAL
    )
`);

// コンテンツリストの取得
app.get('/api/anime', (req, res) => {
    db.all('SELECT * FROM anime', [], (err, rows) => {
        if (err) {
            console.error('Error fetching anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }

        // genresを配列に戻す
        const formattedResults = rows.map(anime => ({
            ...anime,
            genres: anime.genres ? JSON.parse(anime.genres) : []
        }));

        res.json(formattedResults);
    });
});

// コンテンツの追加
app.post('/api/anime', (req, res) => {
    const { title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    // タイトルが空でないかを確認
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'タイトルは必須です。' });
    }

    const formattedGenres = JSON.stringify(genres);

    const query = `
        INSERT INTO anime (title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(query, [title, formattedGenres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating], function (err) {
        if (err) {
            console.error('Error inserting new anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        const insertedAnime = { id: this.lastID, title, genres: JSON.parse(formattedGenres), type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating };
        res.status(201).json(insertedAnime);
    });
});

// コンテンツの更新
app.put('/api/anime/:id', (req, res) => {
    const { id } = req.params;
    const { title, genres, type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating } = req.body;

    // タイトルが空でないかを確認
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'タイトルは必須です。' });
    }

    const updatedAnime = { title, genres: JSON.stringify(genres), type, duration, episodes, currentEpisode, image, synopsis, japaneseTitle, broadcastDate, updateDay, streamingUrl, status, rating };

    const query = `
        UPDATE anime
        SET title = ?, genres = ?, type = ?, duration = ?, episodes = ?, currentEpisode = ?, image = ?, synopsis = ?, japaneseTitle = ?, broadcastDate = ?, updateDay = ?, streamingUrl = ?, status = ?, rating = ?
        WHERE id = ?
    `;
    db.run(query, [updatedAnime.title, updatedAnime.genres, updatedAnime.type, updatedAnime.duration, updatedAnime.episodes, updatedAnime.currentEpisode, updatedAnime.image, updatedAnime.synopsis, updatedAnime.japaneseTitle, updatedAnime.broadcastDate, updatedAnime.updateDay, updatedAnime.streamingUrl, updatedAnime.status, updatedAnime.rating, id], function (err) {
        if (err) {
            console.error('Error updating anime:', err);
            return res.status(500).json({ error: 'Database error occurred.' });
        }
        const responseAnime = { ...updatedAnime, id, genres: JSON.parse(updatedAnime.genres) };
        res.json(responseAnime);
    });
});

// Initialize database
initializeDatabase();

// Routes
app.use('/api', authRoutes);
app.use('/api', contentsRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});