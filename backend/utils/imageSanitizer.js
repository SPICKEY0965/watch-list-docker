import sharp from 'sharp';

/**
 * 画像をサニタイズ（再エンコードし、メタデータを除去）する関数
 * @param {Buffer} buffer - 画像データのバッファ
 * @param {String} outputFormat - 出力する画像フォーマット（例: 'jpeg', 'png'）
 * @returns {Promise<Buffer>} サニタイズされた画像データのバッファ
 */
async function sanitizeImage(buffer, outputFormat = 'jpeg') {
    try {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (!['jpeg', 'jpg', 'png', 'gif', 'webm'].includes(metadata.format)) {
            throw new Error('Unsupported image format');
        }

        const sanitizedBuffer = await image
            .toFormat(outputFormat, { quality: 60 })
            .withMetadata({})
            .toBuffer();
        return sanitizedBuffer;
    } catch (error) {
        throw new Error(`Sanitization failed: ${error.message}`);
    }
}

export {
    sanitizeImage,
};
