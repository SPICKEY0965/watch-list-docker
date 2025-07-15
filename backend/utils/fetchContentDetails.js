import extractAmazonVideoMetadataFromUrl from './autoFetchMeta.js';
import { getEmbeddings } from '../models/preferenceAnalysis.js';

async function fetchContentDetails(url) {
  console.log(`Fetching details for: ${url}`);
  let description = null;

  // Check if it's an Amazon Prime Video URL
  const amazonRegex = /https?:\/\/(?:www\.)?amazon\.co\.jp\/gp\/video\/detail\/(B0[A-Z0-9]+)\//;
  if (amazonRegex.test(url)) {
    try {
      const metadata = await extractAmazonVideoMetadataFromUrl(url);
      description = metadata.description || 'No description found.';
    } catch (error) {
      console.error('Error fetching Amazon Prime Video details:', error);
      description = 'Error fetching description from Amazon Prime Video.';
    }
  } else {
    // Placeholder for non-Amazon URLs
    description = `This is a placeholder description for ${url}.`;
  }

  // 概要からEmbeddingを取得
  let embedding = null;
  try {
    const embeddings = await getEmbeddings([description]);
    if (embeddings && embeddings[0] && embeddings[0].length > 0) {
      embedding = JSON.stringify(embeddings[0]);
    }
  } catch (error) {
    console.error('Failed to get embedding in fetchContentDetails:', error.message);
  }

  return { description, embedding };
}

export default fetchContentDetails;
