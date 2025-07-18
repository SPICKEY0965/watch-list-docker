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

export async function runBatchUpdate(userId, batchJobs) {
  console.log(`Starting batch update for user ${userId}...`);
  let updatedCount = 0;
  let failedCount = 0;
  let processedCount = 0;
  
  const updateJobStatus = (status, progress, total, message) => {
    const job = batchJobs.get(userId);
    if (job) {
      job.status = status;
      job.progress = progress;
      job.total = total;
      job.message = message;
    }
  };

  try {
    const rows = await allAsync('SELECT content_id, title, streaming_url FROM contents', []);
    const total = rows.length;

    updateJobStatus('running', 0, total, `Found ${total} contents to update.`);

    if (total === 0) {
      console.log('No content to update.');
      updateJobStatus('completed', 0, 0, 'No content to update.');
      return;
    }

    console.log(`Found ${total} contents to update for user ${userId}.`);

    for (const row of rows) {
      processedCount++;
      try {
        console.log(`Processing content ID: ${row.content_id} (${row.title}) for user ${userId}`);

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
      } finally {
        // Update progress in the global map
        updateJobStatus('running', processedCount, total, `Processing ${processedCount} of ${total}...`);
      }
    }

    const message = `Batch update complete. Updated: ${updatedCount}, Failed: ${failedCount}.`;
    console.log(message);
    updateJobStatus('completed', total, total, message);

  } catch (error) {
    console.error(`An unexpected error occurred during batch update for user ${userId}:`, error);
    const message = 'An unexpected error occurred during batch update.';
    updateJobStatus('failed', processedCount, 0, message);
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
