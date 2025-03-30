export async function up({ context: sequelize }) {
  // usersテーブルの作成
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE CHECK(length(username) <= 50),
      password TEXT
    );
  `);

  // contentsテーブルの作成
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT CHECK(length(title) <= 100),
      duration INTEGER CHECK(duration > 0),
      episodes INTEGER CHECK(episodes >= 0),
      currentEpisode INTEGER CHECK(currentEpisode >= 0),
      image TEXT CHECK(length(image) <= 255),
      broadcastDate TEXT,
      updateDay TEXT,
      streamingUrl TEXT CHECK(length(streamingUrl) <= 255),
      status TEXT,
      rating TEXT CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', '')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

export async function down({ context: sequelize }) {
  // contentsテーブルの削除
  await sequelize.query(`DROP TABLE IF EXISTS contents;`);
  // usersテーブルの削除
  await sequelize.query(`DROP TABLE IF EXISTS users;`);
}