const sqlite3 = require('sqlite3').verbose();

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
                password TEXT,
                created_date TEXT,
                last_login_date TEXT DEFAULT 0
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS watch_list (
                user_id INTEGER,
                content_id INTEGER,
                status TEXT,
                rating TEXT CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', '')),
                created_date TEXT,
                PRIMARY KEY (user_id, content_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (content_id) REFERENCES contents(id)
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS contents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT CHECK(length(title) <= 100),              -- タイトルの文字数を100文字以下に制限
                episodes INTEGER CHECK(episodes >= 0),               -- episodesは0以上
                currentEpisode INTEGER, -- CHECK(currentEpisode >= 0),   -- currentEpisodeは0以上
                image TEXT CHECK(length(image) <= 255),              -- 画像URLの文字数を255文字以下に制限
                broadcastDate TEXT,
                updateDay TEXT,
                streamingUrl TEXT CHECK(length(streamingUrl) <= 255),-- URLの文字数を255文字以下に制限
                is_private INTEGER DEFAULT 0 CHECK(is_private IN (0, 1)), -- プライベートコンテンツのフラグ（0 = 公開, 1 = 非公開）
                created_date TEXT,
                updated_date TEXT DEFAULT 0,
                deleted_date TEXT DEFAULT 0
            )
        `);
    });
}

module.exports = { db, initializeDatabase };