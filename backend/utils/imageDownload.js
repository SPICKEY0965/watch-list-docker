const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const crypto = require('crypto');
require('dotenv').config();
const { sanitizeImage } = require('./imageSanitizer');

const imageDir = path.join(imageDir, '../images');

// 必要なディレクトリを作成
async function ensureDirectories() {
    await fs.mkdir(imageDir, { recursive: true }).catch(console.error);
}
ensureDirectories();

/**
 * ファイルが存在するかチェックする
 * @param {string} filePath - ファイルパス
 * @returns {Promise<boolean>} ファイルが存在すればtrue
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * コンテンツタイプとURLパスから適切なファイル拡張子を取得
 * @param {string} contentType - コンテンツタイプ
 * @param {string} originalPath - 元のURLパス
 * @returns {string} 拡張子
 */
function getFileExtension(contentType, originalPath) {
    if (contentType) {
        if (contentType.includes('png')) return '.png';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
        if (contentType.includes('gif')) return '.gif';
        if (contentType.includes('webp')) return '.webp';
        if (contentType.includes('svg')) return '.svg';
    }

    const extension = path.extname(originalPath);
    if (extension && /^\.(jpg|jpeg|png|gif|webp|svg)$/i.test(extension)) {
        return extension.toLowerCase();
    }

    return '.jpg';
}

/**
 * 現在の日付情報を取得
 * @returns {Object} 年月日の情報
 */
function getDateInfo() {
    const now = new Date();
    return {
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        day: String(now.getDate()).padStart(2, '0'),
        timestamp: now.getTime()
    };
}

/**
 * 元のURLからソースディレクトリ名を取得
 * @param {string} urlString - 画像のURL
 * @returns {string} ソースディレクトリ名
 */
function getSourceDirectory(urlString) {
    try {
        const url = new URL(urlString);
        return url.hostname.replace(/[^\w.-]/g, '_');
    } catch {
        return 'unknown_source';
    }
}

/**
 * 指定されたURLから画像をダウンロードし、ハッシュベースの構造で保存します。
 *
 * @async
 * @param {string} imageUrl - ダウンロードする画像のURL。
 * @param {Object} options - オプション設定
 * @param {boolean} options.useOriginalName - 可能であれば元のファイル名を使用するか
 * @throws {Error} URLが不正である場合、または画像の取得や保存に失敗した場合。
 * @returns {Object} ダウンロード情報（ファイルパスなど）
 */
async function downloadImage(imageUrl, options = {}) {
    const { useOriginalName = true } = options;

    const whiteList = getWhiteList();
    const safeUrl = await sanitizeUrl(imageUrl);
    const url = new URL(safeUrl);

    if (whiteList.length > 0 && !whiteList.some(allowedUrl => safeUrl.startsWith(allowedUrl))) {
        throw new Error(`URL is not in the whitelist: ${safeUrl}`);
    }

    const response = await fetch(safeUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${safeUrl} with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';

    // 画像の検証と変換
    const sanitizedBuffer = await sanitizeImage(buffer, contentType.includes('png') ? 'png' : 'jpeg');

    const contentHash = crypto.createHash('sha256').update(sanitizedBuffer).digest('hex');

    const hashDir1 = contentHash.substring(0, 2);
    const hashDir2 = contentHash.substring(2, 4);
    const hashPath = path.join(hashDir1, hashDir2);

    const extension = getFileExtension(contentType, url.pathname);

    // オリジナル名を取得
    let originalName = '';
    if (useOriginalName) {
        try {
            const fileName = path.basename(url.pathname).split('.')[0];
            originalName = fileName.replace(/[^\w-]/g, '_').substring(0, 50);
        } catch {
            originalName = '';
        }
    }

    // ファイル名を決定（オリジナル名+ハッシュを使用）
    const prefix = originalName ? `${originalName}_` : '';
    const contentFileName = `${prefix}${contentHash.substring(0, 8)}${extension}`;

    // 物理ファイルのパス
    const physicalDir = path.join(imageDir, hashPath);
    const physicalFilePath = path.join(physicalDir, contentFileName);
    const relativePhysicalPathTemp = path.relative(imageDir, physicalFilePath);
    const relativePhysicalPath = relativePhysicalPathTemp.replace(/\\/g, '/');

    // 物理ファイルがまだ存在しない場合のみ保存
    const exists = await fileExists(physicalFilePath);
    if (!exists) {
        await fs.mkdir(physicalDir, { recursive: true });
        await fs.writeFile(physicalFilePath, sanitizedBuffer);
        console.log(`Saved new image: ${contentFileName} (hash: ${contentHash})`);
    } else {
        console.log(`Image with hash ${contentHash} already exists, skipping save`);
    }

    // メタデータを準備して返す
    const dateInfo = getDateInfo();

    return {
        contentHash,
        physicalPath: physicalFilePath,
        relativePhysicalPath,
        fileSize: sanitizedBuffer.length,
        contentType,
        sourceUrl: safeUrl,
        sourceHost: url.hostname,
        fileExists: exists,
        originalName: originalName || null,
        savedAt: new Date(),
        dateInfo
    };
}

async function sanitizeUrl(urlStr) {
    try {
        const urlObj = new URL(urlStr);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
            throw new Error('Invalid URL protocol: Only http and https are allowed.');
        }

        urlObj.search = '';

        const pathname = urlObj.pathname;
        if (pathname.includes(';base64,')) {
            throw new Error('URL contains Base64 encoded data, which is not allowed for security reasons.');
        }

        const disallowedChars = /[<>"'&]/g;
        if (disallowedChars.test(urlObj.hostname) || disallowedChars.test(urlObj.pathname)) {
            throw new Error('URL contains disallowed characters.');
        }

        return urlObj.toString();
    } catch (e) {
        throw new Error(`Invalid or unsafe URL: ${urlStr} - ${e.message}`);
    }
}

function getInternalDomains() {
    return process.env.INTERNAL_DOMAINS
        ? process.env.INTERNAL_DOMAINS.split(',').map(d => d.trim()).filter(d => d)
        : [];
}

function getWhiteList() {
    const list = process.env.WHITE_LIST
        ? process.env.WHITE_LIST.split(',').map(d => d.trim()).filter(d => d)
        : [];
    return list;
}

// 画像URLが外部かどうか判定する
function isExternalImage(imageUrl) {
    try {
        const parsedImageUrl = new URL(imageUrl);
        const internalDomains = getInternalDomains();
        return !internalDomains.includes(parsedImageUrl.hostname);
    } catch (e) {
        return false;
    }
}

/**
 * コンテンツハッシュに基づいて画像を検索する
 * @param {string} contentHash - 検索する画像のハッシュ値
 * @param {string} [extension] - オプションの拡張子
 * @returns {Promise<string|null>} 見つかったファイルのパス、または null
 */
async function findImageByHash(contentHash, extension = null) {
    if (!contentHash || contentHash.length < 4) {
        throw new Error('Invalid content hash provided');
    }

    const hashDir1 = contentHash.substring(0, 2);
    const hashDir2 = contentHash.substring(2, 4);
    const hashDir = path.join(imageDir, hashDir1, hashDir2);

    try {
        const files = await fs.readdir(hashDir);

        // ハッシュの最初の8文字をファイル名に含むファイルを探す
        const hashPrefix = contentHash.substring(0, 8);
        const matchingFiles = files.filter(file => {
            // 拡張子が指定されている場合は、拡張子も一致するものを探す
            if (extension) {
                return file.includes(hashPrefix) && file.endsWith(extension);
            }
            return file.includes(hashPrefix);
        });

        if (matchingFiles.length > 0) {
            return path.join(hashDir, matchingFiles[0]);
        }

        return null;
    } catch (err) {
        // ディレクトリが存在しない場合など
        return null;
    }
}

module.exports = {
    downloadImage,
    sanitizeUrl,
    isExternalImage,
    getInternalDomains,
    getWhiteList,
    findImageByHash,
};
