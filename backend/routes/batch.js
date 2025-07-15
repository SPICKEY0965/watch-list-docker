import { Hono } from 'hono';
import auth from '../middleware/auth.js';
import { runBatchUpdate } from '../scripts/batchUpdateDescriptions.js';

const app = new Hono();

// 全コンテンツの概要・ベクトル情報を更新するバッチ処理を開始
// 管理者権限など、より厳密なチェックを追加することが望ましい
app.post('/batch/update-descriptions', auth, async (c) => {
  const userId = c.get('userId');
  console.log(`Batch update requested by user: ${userId}`);
  
  // 非同期で実行し、すぐにレスポンスを返す
  runBatchUpdate().catch(err => {
    console.error("An error occurred in the background batch update process:", err);
  });

  return c.json({ message: 'Batch update process has been started in the background.' }, 202);
});

export default app;
