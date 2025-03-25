import * as cheerio from 'cheerio';

/**
 * 日付文字列を YYYY-MM-DD 形式に変換する
 * 対応例:
 *   "2024年2月23日"  → "2024-02-23"
 *   "2024/2/23"     → "2024-02-23"
 *   "2024-2-23"     → "2024-02-23"
 */
function formatDate(dateStr) {
    dateStr = dateStr.trim();
    // 日本語の"年", "月", "日"が含まれる形式の場合
    if (dateStr.indexOf('年') !== -1 && dateStr.indexOf('月') !== -1 && dateStr.indexOf('日') !== -1) {
        const parts = dateStr.split(/[年月日]/).filter(Boolean);
        if (parts.length >= 3) {
            let [year, month, day] = parts;
            month = month.padStart(2, '0');
            day = day.padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }

    // "/" や "-" で区切られている場合（例："2024/2/23" や "2024-2-23"）
    const normalized = dateStr.replace(/\//g, '-');
    const parts = normalized.split('-');
    if (parts.length >= 3) {
        let [year, month, day] = parts;
        month = month.padStart(2, '0');
        day = day.padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Dateオブジェクトで処理できる場合（フォールバック）
    const date = new Date(dateStr);
    if (!isNaN(date)) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return dateStr;
}

async function fetchAmazonVideoMetadata(contentId) {
    const url = `https://www.amazon.co.jp/gp/video/detail/${contentId}/`;
    const headers = {
        'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        let imageUrl = $('img.FHb5CR.Ah1hNY[data-testid="base-image"]').attr('src');
        let broadcastDate = $('[data-testid="episode-release-date"]').first().text().trim();
        let title = $('[data-automation-id="title"]').text().trim();

        if (broadcastDate) {
            broadcastDate = formatDate(broadcastDate);
        }

        if (!imageUrl) {
            const pictureTag = $('picture');
            if (pictureTag.length > 0) {
                imageUrl = pictureTag.find('img').first().attr('src');
            }
        }
        return { imageUrl, broadcastDate, title };
    } catch (error) {
        console.error(`エラーが発生しました: ${error}`);
        return { imageUrl: null, broadcastDate: null, title: null };
    }
}

export default async function extractAmazonVideoMetadataFromUrl(url) {
    if (!url) {
        console.error("テキストが提供されていません。");
        return null;
    }

    const regex = /https?:\/\/(?:www\.)?amazon\.co\.jp\/gp\/video\/detail\/(B0[A-Z0-9]+)\//;
    const match = url.match(regex);

    if (match && match[1]) {
        const contentId = match[1];
        console.log("抽出したID:", contentId);
        const { imageUrl, broadcastDate, title } = await fetchAmazonVideoMetadata(contentId);
        console.log(`コンテンツID '${contentId}' の画像のURL: ${imageUrl}`);
        console.log(`放送日時: ${broadcastDate}`);
        console.log(`タイトル: ${title}`)
        return { imageUrl, broadcastDate, title };
    } else {
        console.log("AmazonのURLが見つからなかったか、IDの抽出に失敗しました。");
        return null;
    }
}
