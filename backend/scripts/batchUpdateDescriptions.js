import { db } from '../db.js';
import fetchContentDetails from '../utils/fetchContentDetails.js';

// Promise-based db.all
function allAsync(query, params) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Promise-based db.run
function runAsync(query, params) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

export async function runBatchUpdate() {
  console.log('Starting batch update of content descriptions and embeddings...');
  let updatedCount = 0;
  let failedCount = 0;

  try {
    const rows = await allAsync('SELECT content_id, title, streaming_url FROM contents', []);

    if (rows.length === 0) {
      console.log('No content to update.');
      return { success: true, message: 'No content to update.', updated: 0, failed: 0 };
    }

    console.log(`Found ${rows.length} contents to update.`);

    for (const row of rows) {
      try {
        console.log(`Processing content ID: ${row.content_id} (${row.title})`);

        if (!row.streaming_url) {
          console.warn(`  -> Skipping, no streaming_url.`);
          failedCount++;
          continue;
        }

        const { description, embedding } = await fetchContentDetails(row.streaming_url);

        if (description && embedding) {
          await runAsync(
            'UPDATE contents SET description = ?, description_embedding = ? WHERE content_id = ?',
            [description, embedding, row.content_id]
          );
          console.log(`  -> Successfully updated.`);
          updatedCount++;
        } else {
          console.warn(`  -> Skipping, failed to fetch details or embedding.`);
          failedCount++;
        }
      } catch (e) {
        console.error(`  -> Failed to process content ${row.title}:`, e.message);
        failedCount++;
      }
    }

    const message = `Batch update complete. Updated: ${updatedCount}, Failed: ${failedCount}.`;
    console.log(message);
    return { success: true, message, updated: updatedCount, failed: failedCount };

  } catch (error) {
    console.error('An unexpected error occurred during batch update:', error);
    return { success: false, message: 'An unexpected error occurred during batch update.', updated: updatedCount, failed: failedCount };
  }
  // DB接続はサーバー全体で管理されているため、ここでは閉じない
}

// スクリプトとして直接実行された場合のみ動作させる
if (import.meta.url.startsWith('file:') && process.argv[1] === import.meta.url.substring(7)) {
  runBatchUpdate().then(() => {
    db.close((err) => {
      if (err) {
        console.error('Error closing the database', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  });
}
