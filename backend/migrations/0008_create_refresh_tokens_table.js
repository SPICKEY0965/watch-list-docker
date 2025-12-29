export async function up(sql) {
  await sql`
    CREATE TABLE refresh_tokens (
      id TEXT PRIMARY KEY,                 -- UUID
      user_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,     -- 保存はハッシュ化推奨
      expires_at TIMESTAMP NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
  `;
  console.log('Migration 0008 up: refresh_tokens table created');
}

export async function down(sql) {
  await sql`
    DROP TABLE refresh_tokens;
  `;
  console.log('Migration 0008 down: refresh_tokens table dropped');
}
