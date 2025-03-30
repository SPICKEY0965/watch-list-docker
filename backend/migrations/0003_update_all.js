export async function up({ context: sequelize }) {
  const transaction = await sequelize.transaction();
  try {
    // ────────────── Usersテーブルの移行 ──────────────
    // 既存のusersテーブルをusers_oldへリネーム
    await sequelize.query(`
      ALTER TABLE users RENAME TO users_old;
    `, { transaction });

    // v2.0.0用の新しいusersテーブルを作成
    await sequelize.query(`
      CREATE TABLE users (
        user_id TEXT PRIMARY KEY,
        user_name VARCHAR(255) UNIQUE,
        password TEXT,
        status TEXT, -- 例: 'active', 'banned'等
        is_private TEXT DEFAULT 'true' CHECK (is_private IN ('true', 'false'))
      );
    `, { transaction });

    // 旧usersから新usersへデータ移行
    await sequelize.query(`
      INSERT INTO users (user_id, user_name, password, status, is_private)
      SELECT CAST(id AS TEXT), username, password, 'active', 'true'
      FROM users_old;
    `, { transaction });

    // ────────────── Contentsテーブルの移行 ──────────────
    await sequelize.query(`
      ALTER TABLE contents RENAME TO contents_temp;
    `, { transaction });

    // v2.0.0用の新しいcontentsテーブルを作成 (外部キー制約は後で追加)
    await sequelize.query(`
      CREATE TABLE contents (
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
      );
    `, { transaction });

    // 旧contentsから新contentsへデータ移行
    await sequelize.query(`
      INSERT INTO contents (content_id, title, episodes, image, streaming_url, broadcastDate, added_by, added_at)
      SELECT id, title, episodes, image, streamingUrl, broadcastDate, user_id, datetime('now')
      FROM contents_temp;
    `, { transaction });

    // ────────────── 新規テーブルの作成 ──────────────
    // user_profilesテーブル（外部キーをDEFERRABLEに設定）
    await sequelize.query(`
      CREATE TABLE user_profiles (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        profile_image TEXT,
        settings TEXT,
        info TEXT,
        role TEXT,
        added_at DATETIME,
        updated_at DATETIME,
        last_login DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
      );
    `, { transaction });
    await sequelize.query(`
      INSERT INTO user_profiles (user_id, role, added_at)
      SELECT user_id, 'user', datetime('now')
      FROM users;
    `, { transaction });

    // watch_listsテーブル（外部キーをDEFERRABLEに設定）
    await sequelize.query(`
      CREATE TABLE watch_lists (
        watch_list_id INTEGER PRIMARY KEY,
        user_id TEXT,
        content_id INTEGER,
        status TEXT,
        rating TEXT DEFAULT 'unrated' CHECK (rating IN ('SS', 'S', 'A', 'B', 'C', 'unrated')),
        added_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
        FOREIGN KEY (content_id) REFERENCES contents (content_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
      );
    `, { transaction });
    await sequelize.query(`
      INSERT INTO watch_lists (user_id, content_id, status, rating, added_at)
      SELECT user_id, id, status, rating, datetime('now')
      FROM contents_temp;
    `, { transaction });

    // streaming_servicesテーブル
    await sequelize.query(`
      CREATE TABLE streaming_services (
        service_id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT,
        service_url TEXT,
        service_image TEXT,
        info TEXT,
        added_by TEXT,
        added_at DATETIME,
        updated_at DATETIME
      );
    `, { transaction });

    // edit_historyテーブル（外部キーをDEFERRABLEに設定）
    await sequelize.query(`
      CREATE TABLE edit_history (
        edit_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT, -- 編集を行ったユーザID
        item_type VARCHAR(255), -- 'content', 'author', 'company', 'actor' 等
        content_id INTEGER, -- 対象のコンテンツID等
        action VARCHAR(50), -- 'create', 'update', 'delete'
        changes TEXT, -- 変更後のデータ（JSON形式）
        previous_changes TEXT, -- 変更前のデータ（JSON形式）
        edited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
      );
    `, { transaction });

    // ────────────── 旧テーブルの削除 ──────────────
    await sequelize.query(`DROP TABLE contents_temp;`, { transaction });
    await sequelize.query(`DROP TABLE users_old;`, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down({ context: sequelize }) {
  const transaction = await sequelize.transaction();
  try {
    // ────────────── 新規に作成したテーブルの削除（watch_listsは後で使用するので除外） ──────────────
    await sequelize.query(`DROP TABLE IF EXISTS edit_history;`, { transaction });
    await sequelize.query(`DROP TABLE IF EXISTS streaming_services;`, { transaction });
    await sequelize.query(`DROP TABLE IF EXISTS user_profiles;`, { transaction });

    // ────────────── Usersテーブルのダウングレード ──────────────
    await sequelize.query(`ALTER TABLE users RENAME TO users_new;`, { transaction });
    await sequelize.query(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE CHECK(length(username) <= 50),
        password TEXT
      );
    `, { transaction });
    await sequelize.query(`
      INSERT INTO users (id, username, password)
      SELECT CAST(user_id AS INTEGER), user_name, password
      FROM users_new;
    `, { transaction });
    await sequelize.query(`DROP TABLE users_new;`, { transaction });

    // ────────────── Contentsテーブルのダウングレード ──────────────
    // まず、現在のcontentsテーブルを一時テーブルにリネーム
    await sequelize.query(`ALTER TABLE contents RENAME TO contents_new;`, { transaction });
    // 旧スキーマのcontentsテーブルを作成（status, rating列を含む）
    await sequelize.query(`
      CREATE TABLE contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT CHECK(length(title) <= 100),
        duration INTEGER CHECK(duration > 0),
        episodes INTEGER CHECK(episodes >= 0),
        currentEpisode INTEGER CHECK(currentEpisode >= 0),
        image TEXT,
        broadcastDate TEXT,
        updateDay TEXT,
        streamingUrl TEXT,
        status TEXT,
        rating TEXT CHECK (rating IN ('SS', 'S', 'A', 'B', 'C'))
      );
    `, { transaction });
    // contents_newにはstatusとratingの情報は存在しないため、
    // watch_listsテーブルからJOINして値を取得する
    await sequelize.query(`
      INSERT INTO contents (id, user_id, title, duration, episodes, currentEpisode, image, broadcastDate, updateDay, streamingUrl, status, rating)
      SELECT c.content_id, NULL, -- UP時にuser_idはcontents_tempから移行されましたが、旧スキーマには存在しないためNULLとする
             c.title, 1, -- durationは固定値1
             c.episodes, 0, -- currentEpisodeは固定値0
             c.image, c.broadcastDate, c.broadcastDate, -- updateDayはbroadcastDateと同じ値とする
             c.streaming_url, wl.status, wl.rating
      FROM contents_new c
      LEFT JOIN watch_lists wl ON wl.content_id = c.content_id;
    `, { transaction });
    await sequelize.query(`DROP TABLE contents_new;`, { transaction });

    // watch_listsはここで不要となるため削除
    await sequelize.query(`DROP TABLE IF EXISTS watch_lists;`, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
