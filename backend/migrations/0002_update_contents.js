export async function up({ context: sequelize }) {
    // 1. 既存のcontentsテーブルをcontents_oldへリネーム
    await sequelize.query(`
      ALTER TABLE contents RENAME TO contents_old;
    `);
  
    // 2. version1.0.0用の新しいcontentsテーブルを作成
    await sequelize.query(`
      CREATE TABLE contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT CHECK(length(title) <= 100),
        episodes INTEGER CHECK(episodes >= 0),
        currentEpisode INTEGER CHECK(currentEpisode >= 0),
        image TEXT, --CHECK(length(image) <= 255),
        broadcastDate TEXT,
        updateDay TEXT,
        streamingUrl TEXT, --CHECK(length(streamingUrl) <= 255),
        status TEXT,
        rating TEXT DEFAULT 'unrated' CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', 'unrated')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  
    // 3. 古いcontents_oldから新しいcontentsへ、共通カラムのみデータ移行
    // ※旧スキーマにはdurationカラムが存在するため、移行対象から除外しています。
    await sequelize.query(`
      INSERT INTO contents (id, user_id, title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating)
      SELECT id, user_id, title, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating
      FROM contents_old;
    `);
  
    // 4. 古いテーブルの削除
    await sequelize.query(`
      DROP TABLE contents_old;
    `);
  }
  
  export async function down({ context: sequelize }) {
    // down処理：version1.0.0からversion0.1.0へ戻す
    // 1. 現在のcontentsテーブルをcontents_newにリネーム
    await sequelize.query(`
      ALTER TABLE contents RENAME TO contents_new;
    `);
  
    // 2. version0.1.0用のcontentsテーブルを作成
    // ※durationカラムは必須のため、デフォルト値として1を設定
    await sequelize.query(`
      CREATE TABLE contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT CHECK(length(title) <= 100),
        duration INTEGER CHECK(duration > 0),
        episodes INTEGER CHECK(episodes >= 0),
        currentEpisode INTEGER CHECK(currentEpisode >= 0),
        image TEXT, --CHECK(length(image) <= 255),
        broadcastDate TEXT,
        updateDay TEXT,
        streamingUrl TEXT, --CHECK(length(streamingUrl) <= 255),
        status TEXT,
        rating TEXT CHECK (rating IN ('SS', 'S', 'A', 'B', 'C')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);
  
    // 3. contents_newから新しいcontentsへデータ移行
    // durationカラムは存在しなかったため、デフォルト値1を設定して挿入
    await sequelize.query(`
      INSERT INTO contents (id, user_id, title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating)
      SELECT id, user_id, title, 1, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, 
             CASE WHEN rating = 'unrated' THEN '' ELSE rating END
      FROM contents_new;
    `);
  
    // 4. 一時テーブルの削除
    await sequelize.query(`
      DROP TABLE contents_new;
    `);
  }