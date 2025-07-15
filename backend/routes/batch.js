import express from 'express';
import auth from '../middleware/auth.js';
import { runBatchUpdate } from '../scripts/batchUpdateDescriptions.js';

const router = express.Router();

// 全コンテンツの概要・ベクトル情報を更新するバッチ処理を開始
// 管理者権限など、より厳密なチェックを追加することが望ましい
router.post('/batch/update-descriptions', auth, async (req, res) => {
  console.log(`Batch update requested by user: ${req.userId}`);
  
  // 非同期で実行し、すぐにレスポンスを返す
  runBatchUpdate().catch(err => {
    console.error("An error occurred in the background batch update process:", err);
  });

  res.status(202).json({ message: 'Batch update process has been started in the background.' });
});

export default router;
