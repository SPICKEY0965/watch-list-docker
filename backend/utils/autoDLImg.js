import * as cheerio from 'cheerio';

async function fetchImageUrlFromAmazonVideo(contentId) {
    const url = `https://www.amazon.co.jp/gp/video/detail/${contentId}/`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const $ = cheerio.load(html);

        // 画像のURLが含まれる可能性のある要素を特定
        let imageUrl = $('img.FHb5CR.Ah1hNY[data-testid="base-image"]').attr('src');

        if (imageUrl) {
            return imageUrl;
        }

        // data-testid="base-image"が見つからない場合、<picture>タグ内の<img>タグも検証
        const pictureTag = $('picture');
        if (pictureTag.length > 0) {
            const imgTagInPicture = pictureTag.find('img');
            if (imgTagInPicture.length > 0) {
                imageUrl = imgTagInPicture.attr('src');
                if (imageUrl) {
                    return imageUrl;
                }
            }
        }

        return null;
    } catch (error) {
        console.error(`エラーが発生しました: ${error}`);
        return null;
    }
}

export default async function extractImageUrlFromText(url) {
    if (!url) {
        console.error("テキストが提供されていません。");
        return null;
    }

    const regex = /https?:\/\/(?:www\.)?amazon\.co\.jp\/gp\/video\/detail\/(B0[A-Z0-9]+)\//;
    const match = url.match(regex);

    if (match && match[1]) {
        const contentId = match[1];
        console.log("抽出したID:", contentId);

        const imageUrl = await fetchImageUrlFromAmazonVideo(contentId);

        if (imageUrl) {
            console.log(`コンテンツID '${contentId}' の画像のURL: ${imageUrl}`);
            return imageUrl;
        } else {
            console.log(`コンテンツID '${contentId}' の画像のURLを取得できませんでした。`);
            return null;
        }
    } else {
        console.log("AmazonのURLが見つからなかったか、IDの抽出に失敗しました。");
        return null;
    }
}
