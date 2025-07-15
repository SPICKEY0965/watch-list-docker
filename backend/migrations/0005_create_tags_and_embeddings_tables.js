export async function up({ context: sequelize }) {
  const transaction = await sequelize.transaction();
  try {
    // tagsテーブルの作成
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tags (
        tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, { transaction });

    // tag_embeddingsテーブルの作成
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS tag_embeddings (
        embedding_id INTEGER PRIMARY KEY AUTOINCREMENT,
        tag_id INTEGER NOT NULL,
        model_name TEXT NOT NULL,
        embedding TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tag_id) REFERENCES tags (tag_id) ON DELETE CASCADE,
        UNIQUE (tag_id, model_name)
      );
    `, { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function down({ context: sequelize }) {
  const transaction = await sequelize.transaction();
  try {
    await sequelize.query(`DROP TABLE IF EXISTS tag_embeddings;`, { transaction });
    await sequelize.query(`DROP TABLE IF EXISTS tags;`, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error('Rollback failed:', error);
    throw error;
  }
}
