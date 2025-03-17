import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./contents.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

function initializeDatabase() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE CHECK(length(username) <= 50),  -- ユーザー名の文字数を50文字以下に制限
                password TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS contents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT CHECK(length(title) <= 100),              -- タイトルの文字数を100文字以下に制限
                episodes INTEGER CHECK(episodes >= 0),               -- episodesは0以上
                currentEpisode INTEGER CHECK(currentEpisode >= 0),   -- currentEpisodeは0以上
                image TEXT CHECK(length(image) <= 255),              -- 画像URLの文字数を255文字以下に制限
                broadcastDate TEXT,
                updateDay TEXT,
                streamingUrl TEXT CHECK(length(streamingUrl) <= 255),-- URLの文字数を255文字以下に制限
                status TEXT,
                rating TEXT DEFAULT 'unrated' CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', 'unrated')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
    });
}

export { db, initializeDatabase };