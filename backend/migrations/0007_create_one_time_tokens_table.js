import { db } from '../db.js';

export async function up() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE one_time_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        action_type TEXT NOT NULL,
        target_id INTEGER,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT (datetime('now', 'utc')),
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
      );
    `, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

export async function down() {
  return new Promise((resolve, reject) => {
    db.run('DROP TABLE one_time_tokens;', (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
