
import { db } from '../db.js';

export async function up() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE auth_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          device_info TEXT,
          expires_at DATETIME NOT NULL,
          last_used_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

export async function down() {
  return new Promise((resolve, reject) => {
    db.run(`DROP TABLE auth_tokens`, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}
