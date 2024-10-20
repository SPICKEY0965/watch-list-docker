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
                username TEXT UNIQUE,
                password TEXT
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS contents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT,
                duration INTEGER,
                episodes INTEGER,
                currentEpisode INTEGER,
                image TEXT,
                broadcastDate TEXT,
                updateDay TEXT,
                streamingUrl TEXT,
                status TEXT,
                rating REAL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);
    });
}

module.exports = { db, initializeDatabase };