export async function up({ context: sequelize }) {
  await sequelize.query(`
    ALTER TABLE contents
    ADD COLUMN description TEXT;
  `);
  await sequelize.query(`
    ALTER TABLE contents
    ADD COLUMN description_embedding TEXT;
  `);
}

export async function down({ context: sequelize }) {
  // カラムを削除する処理を記述します。
  // SQLiteは単一のALTER TABLE文で複数のカラムを削除できないため、個別に実行する必要があります。
  // ただし、古いSQLiteバージョンではDROP COLUMNがサポートされていない場合があるため、
  // ここではテーブル再作成のアプローチは取らず、単純なDROP COLUMNを試みます。
  await sequelize.query(`
    ALTER TABLE contents
    DROP COLUMN description_embedding;
  `);
  await sequelize.query(`
    ALTER TABLE contents
    DROP COLUMN description;
  `);
}
