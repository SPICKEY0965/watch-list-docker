import { db } from '../db.js';
import axios from 'axios';

// --- Embedding API & ベクトル計算 ---

let tagEmbeddingsCache = null;
const PREDEFINED_TAG_TEXTS = [
  // ジャンルの拡張
  'SF', 'アクション', '感動', 'コメディ', 'サスペンス', '恋愛', 'ファンタジー', '日常',
  'ミステリー', 'ホラー', 'パロディ', 'メカ',
  'スポーツ', '学園', 'アイドル', 'ギャグ', 'ドラマ', '心理', '戦争', '歴史', '未来',
  '古代', '異世界', '超能力', '魔法', '妖怪', '都市伝説', '宗教', '哲学', '社会',

  // サブジャンルの追加
  'ラブコメ', 'ラブロマンス', 'ヒーロー', '冒険', '探求', '成長', '人生',
  '家族', '友情', '絆', '孤独', '死', '希望', '夢', '現実', '虚実', '時間旅行', 'パラレルワールド',
  '超常現象', 'サイバーパンク', 'ハードSF', '努力', '中世',

  // テーマの拡張
  '環境', '政治', '経済', '教育', '医療', '技術', 'AI', '宇宙', '地球', '進化', '退化',
  '倫理', '道徳', '自由', '権力', '不平等', '差別', '多様性', '文化', '芸術', '音楽', '料理',
  'ファッション', 'ライフスタイル', '旅行', '観光', '自然', '動物', '植物', '生態系',
  '気候変動', '災害', '危機', 'リスク', '安全', '防衛', '戦略', '計画', '戦術', '戦争', '平和'
];

/**
 * 複数のテキストからEmbeddingを取得する (Ollama対応)
 * @param {string[]} texts - テキストの配列
 * @returns {Promise<number[][]>} - ベクトルの配列
 */
export async function getEmbeddings(texts) {
  const apiUrl = process.env.OLLAMA_API_URL;
  const model = process.env.OLLAMA_EMBEDDING_MODEL;

  if (!apiUrl || !model) {
    throw new Error('OLLAMA_API_URL and OLLAMA_EMBEDDING_MODEL must be set in environment variables.');
  }
  if (!texts || texts.length === 0) {
    return [];
  }

  const embeddings = [];
  for (const text of texts) {
    try {
      // 空のテキストはスキップ
      if (!text || text.trim() === '') {
        embeddings.push([]);
        continue;
      }
      const response = await axios.post(
        apiUrl,
        { model: model, prompt: text },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.data && response.data.embedding) {
        embeddings.push(response.data.embedding);
      } else {
        console.warn(`Could not get embedding for text: ${text.substring(0, 30)}...`);
        embeddings.push([]);
      }
    } catch (error) {
      console.error(`Error fetching embedding for text "${text.substring(0, 30)}...":`, error.response ? error.response.data : error.message);
      embeddings.push([]);
    }
  }
  return embeddings;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (normA * normB);
}

const RATING_WEIGHTS = {
  'SS': 50,
  'S': 1.8,
  'A': 1.2,
  'B': 1.0,
  'C': 0.1,
};

function weightedAverageVectors(vectorsWithRatings) {
  const vecLength = vectorsWithRatings.find(item => Array.isArray(item.embedding) && item.embedding.length > 0)?.embedding.length;
  if (!vecLength) return [];

  const weightedSum = new Array(vecLength).fill(0);
  let totalWeight = 0;

  vectorsWithRatings.forEach(item => {
    const weight = RATING_WEIGHTS[item.rating] || 0;
    if (weight > 0 && Array.isArray(item.embedding) && item.embedding.length === vecLength) {
      for (let i = 0; i < vecLength; i++) {
        weightedSum[i] += item.embedding[i] * weight;
      }
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return [];
  return weightedSum.map(val => val / totalWeight);
}

/**
 * ユーザーの嗜好を分析する
 * @param {number} userId - ユーザーID
 * @returns {Promise<Object>} - 分析結果
 */
export async function analyzeUserPreferences(userId) {
  // 1. 属性分析用のデータを取得 (descriptionがなくてもOK)
  const attributeRows = await new Promise((resolve, reject) => {
    const query = `
      SELECT c.content_type, c.season, wl.rating
      FROM contents c
      JOIN watch_lists wl ON c.content_id = wl.content_id
      WHERE wl.user_id = ? AND wl.rating IS NOT NULL AND wl.rating NOT IN ('D', 'E', '未評価')`;
    db.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows));
  });

  const attributeAnalysis = attributeRows.reduce((acc, row) => {
    const weight = RATING_WEIGHTS[row.rating] || 0;
    if (weight > 0) {
      if (row.content_type) {
        if (!acc.contentType) acc.contentType = {};
        acc.contentType[row.content_type] = (acc.contentType[row.content_type] || 0) + weight;
      }
      if (row.season) {
        if (!acc.season) acc.season = {};
        acc.season[row.season] = (acc.season[row.season] || 0) + weight;
      }
    }
    return acc;
  }, {});

  // 2. キーワード分析用のデータを取得 (descriptionが必須)
  const keywordRows = await new Promise((resolve, reject) => {
    const query = `
      SELECT c.description_embedding, wl.rating
      FROM contents c
      JOIN watch_lists wl ON c.content_id = wl.content_id
      WHERE wl.user_id = ? AND wl.rating IS NOT NULL AND wl.rating NOT IN ('D', 'E', '未評価') AND c.description_embedding IS NOT NULL`;
    db.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows));
  });

  let keywordAnalysis = [];
  let userPreferenceVector = [];

  if (keywordRows.length > 0) {
    // タグのベクトルを準備 (キャッシュがあれば利用)
    if (!tagEmbeddingsCache) {
      console.log('Fetching and caching tag embeddings...');
      const embeddings = await getEmbeddings(PREDEFINED_TAG_TEXTS);
      tagEmbeddingsCache = PREDEFINED_TAG_TEXTS.map((text, i) => ({ text, embedding: embeddings[i] }));
    }

    const vectorsWithRatings = keywordRows.map(row => {
      try {
        return {
          embedding: JSON.parse(row.description_embedding),
          rating: row.rating
        };
      }
      catch (e) { return null; }
    }).filter(v => v);


    if (vectorsWithRatings.length > 0) {
      userPreferenceVector = weightedAverageVectors(vectorsWithRatings);
      const validTags = tagEmbeddingsCache.filter(tag => tag.embedding && tag.embedding.length > 0);

      keywordAnalysis = validTags.map(tag => ({
        text: tag.text,
        score: cosineSimilarity(userPreferenceVector, tag.embedding),
      }));
      keywordAnalysis.sort((a, b) => b.score - a.score);
    }
  }

  return { keywordAnalysis, attributeAnalysis, userPreferenceVector };
}


/**
 * ユーザーへのおすすめコンテンツを取得する
 * @param {number} userId - ユーザーID
 * @param {number} limit - 取得件数
 * @returns {Promise<Array>} - おすすめコンテンツの配列
 */
export async function getUserRecommendations(userId, limit = 10) {
  // 1. ユーザーの嗜好ベクトルを取得
  const { userPreferenceVector } = await analyzeUserPreferences(userId);
  if (!userPreferenceVector || userPreferenceVector.length === 0) {
    return [];
  }

  // 2. ユーザーがまだ評価していない、Embeddingを持つコンテンツを取得
  const query = `
    SELECT c.content_id, c.title, c.image, c.description_embedding
    FROM contents c
    LEFT JOIN watch_lists wl ON c.content_id = wl.content_id AND wl.user_id = ?
    WHERE c.description_embedding IS NOT NULL AND wl.watch_list_id IS NULL
  `;
  const unratedContents = await new Promise((resolve, reject) => {
    db.all(query, [userId], (err, rows) => err ? reject(err) : resolve(rows));
  });

  // 3. コサイン類似度を計算
  const recommendations = unratedContents.map(content => {
    try {
      const contentVector = JSON.parse(content.description_embedding);
      const similarity = cosineSimilarity(userPreferenceVector, contentVector);
      return {
        content_id: content.content_id,
        title: content.title,
        image: content.image,
        similarity: similarity
      };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  // 4. 類似度でソートし、上位N件を返す
  recommendations.sort((a, b) => b.similarity - a.similarity);
  return recommendations.slice(0, limit);
}
