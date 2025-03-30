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
        db.run('PRAGMA foreign_keys = ON');

        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                user_name VARCHAR(255) UNIQUE,
                password TEXT,
                status TEXT, -- active, banned等
                is_private TEXT DEFAULT 'true' CHECK (is_private IN ('true', 'false'))
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                email TEXT,
                profile_image TEXT,
                settings TEXT,
                info TEXT,
                role TEXT,
                added_at DATETIME,
                updated_at DATETIME,
                last_login DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS watch_lists (
                watch_list_id INTEGER PRIMARY KEY,
                user_id TEXT,
                content_id INTEGER,
                status TEXT,
                rating TEXT DEFAULT 'unrated' CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', 'unrated')),
                added_at DATETIME,
                updated_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
                FOREIGN KEY (content_id) REFERENCES contents (content_id) ON DELETE CASCADE
            );
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS contents (
                content_id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT CHECK(length(title) <= 100),
                episodes INTEGER CHECK(episodes >= 0),
                image TEXT,
                streaming_url TEXT,
                content_type TEXT,
                season TEXT,
                cour TEXT,
                airing_status TEXT,
                is_private TEXT DEFAULT 'true' CHECK (is_private IN ('true', 'false')),
                added_by TEXT,
                broadcastDate DATETIME,
                added_at DATETIME,
                updated_at DATETIME,
                deleted_at DATETIME
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS streaming_services (
                service_id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT,
                service_url TEXT,
                service_image TEXT,
                info TEXT,
                added_by TEXT,
                added_at DATETIME,
                updated_at DATETIME
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS edit_history(
                edit_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT, --編集を行ったユーザID
                item_type VARCHAR(255), -- 'content', 'author', 'company', 'actor' 等
                content_id INTEGER, --対象のコンテンツID等
                action VARCHAR(50), -- 'create', 'update', 'delete'
                changes TEXT, --変更後のデータ（JSON形式で保存）
                previous_changes TEXT, --変更前のデータ（JSON形式で保存）
                edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(user_id)  ON DELETE CASCADE
            )
        `);
    });

}

export { db, initializeDatabase };