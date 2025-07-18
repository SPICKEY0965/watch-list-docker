import { Hono } from 'hono';
import auth from '../middleware/auth.js';
import { runBatchUpdate } from '../scripts/batchUpdateDescriptions.js';

const app = new Hono();

// グローバルなMapでジョブの状態を管理（本番環境ではRedisなどの永続ストアを検討）
const batchJobs = new Map();

// 全コンテンツの概要・ベクトル情報を更新するバッチ処理を開始
app.post('/batch/update-descriptions', auth, async (c) => {
  const userId = c.get('userId');
  const existingJob = batchJobs.get(userId);

  if (existingJob && existingJob.status === 'running') {
    return c.json({ message: 'Batch update is already in progress.' }, 409);
  }

  console.log(`Batch update requested by user: ${userId}`);
  
  const jobStatus = { 
    status: 'running', 
    progress: 0, 
    total: 0, 
    message: 'Starting batch update...' 
  };
  batchJobs.set(userId, jobStatus);

  // 非同期で実行し、すぐにレスポンスを返す
  runBatchUpdate(userId, batchJobs).catch(err => {
    console.error(`An error occurred in the background batch update process for user ${userId}:`, err);
    const failedJob = batchJobs.get(userId);
    if (failedJob) {
      failedJob.status = 'failed';
      failedJob.message = 'An unexpected error occurred.';
    }
  });

  return c.json({ message: 'Batch update process has been started.' }, 202);
});

// バッチ処理のステータスを取得
app.get('/batch/status', auth, async (c) => {
  const userId = c.get('userId');
  const jobStatus = batchJobs.get(userId);
  
  if (!jobStatus) {
    return c.json({ status: 'idle', message: 'No batch process running.' });
  }

  // ジョブが完了または失敗したら、Mapから削除する（任意）
  if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
    setTimeout(() => batchJobs.delete(userId), 5 * 60 * 1000); // 5分後に削除
  }

  return c.json(jobStatus);
});

export default app;
