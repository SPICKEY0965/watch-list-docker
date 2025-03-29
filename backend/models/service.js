/**
 * models/service.js
 * 配信サービスのデーターベース操作を定義します
 */
const { runQuery, getQuery, allQuery } = require('./query')

/**
 * 配信サービスのリストを取得します
 * @param {object} options - オプションオブジェクト
 * @param {number} options.limit - 取得するレコード数
 * @param {number} options.offset - スキップするレコード数
 * @returns {Promise<Array>} - 配信サービスのリスト
 */
async function getService({ limit, offset }) {
    try {
        const query = `
        SELECT service_id, service_name, service_url, service_image
        FROM services
        LIMIT ? OFFSET ?
        `;
        return allQuery(query, [limit, offset]);
    } catch (err) {
        throw { status: 500, message: 'Error getting service list.', error: err };
    }
}

/**
 * 配信サービスの詳細情報を取得します
 * @param {object} options - オプションオブジェクト
 * @param {number} options.service_id - 取得するサービスID
 * @returns {Promise<object|string>} - 配信サービスの詳細情報、またはエラーメッセージ
 */
async function getServiceDetailsById({ service_id }) {
    try {
        const query = `
        SELECT service_id, service_name, service_url, service_image, info
        FROM services WHERE service_id = ?
        `;
        const result = await getQuery(query, [service_id]);
        if (!result) {
            return { message: 'No service found.' };
        }
        return result;
    } catch (err) {
        throw { status: 500, message: 'Error getting service details.', error: err };
    }
}

/**
 * 新しい配信サービスを追加します
 * @param {object} options - オプションオブジェクト
 * @param {number} options.userId - 追加したユーザーID
 * @param {string} options.service_name - 配信サービス名
 * @param {string} options.service_url - 配信サービスURL
 * @param {string} options.service_image - 配信サービス画像URL
 * @returns {Promise<object>} - 実行結果(this) or エラーオブジェクト
 */
async function addService({ userId, service_name, service_url, service_image }) {
    try {
        const query = `
    INSERT INTO services (service_name, service_url, service_image, added_by, added_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
        const result = await runQuery(query, [service_name, service_url, service_image, userId]);
        return result;
    } catch (err) {
        throw { status: 500, message: 'Error adding new service.', error: err };
    }
}

/**
 * 配信サービス情報を更新します。
 * 引数で指定されたフィールドのみ更新します。
 * @param {number} service_Id - 更新するサービスID
 * @param {object} options - 更新するフィールド名と値のオブジェクト
 * @param {string} options.serviceName - 配信サービス名
 * @param {string} options.serviceUrl - 配信サービスURL
 * @param {string} options.serviceImage - 配信サービス画像URL
 * @returns {Promise<object>} - 実行結果(this) or エラーオブジェクト
 */
async function updateService(service_Id, { serviceName, serviceUrl, serviceImage }) {
    try {
        const fields = [];
        const params = [];

        if (serviceName) {
            fields.push('service_name = ?');
            params.push(serviceName);
        }
        if (serviceUrl) {
            fields.push('service_url = ?');
            params.push(serviceUrl);
        }
        if (serviceImage) {
            fields.push('service_image = ?');
            params.push(serviceImage);
        }
        if (fields.length === 0) return { message: 'No fields provided for update.' };

        fields.push('updated_at = datetime(\'now\')');
        params.push(service_Id);

        const query = `
            UPDATE services
            SET ${fields.join(', ')}
            WHERE service_id = ?
        `;

        const result = await runQuery(query, params);
        if (result.changes === 0) {
            return { message: 'No service found to update.' };
        }
        return result;
    } catch (err) {
        throw { status: 500, message: 'Error updating service.', error: err };
    }
}

/**
 * 配信サービスを削除します
 * @param {object} options - オプションオブジェクト
 * @param {number} options.serviceId - 削除するサービスID
 * @returns {Promise<object>} - 実行結果(this.changesで削除件数を確認)
 */
async function deleteService({ serviceId }) {
    try {
        const result = await runQuery(`DELETE FROM services WHERE service_id = ?`, [serviceId]);
        if (result.changes === 0) {
            return { message: 'No service found to delete.' };
        }
        return { deleted: result.changes };
    } catch (err) {
        throw { status: 500, message: 'Error deleting from services.', error: err };
    }
}

/**
 * 配信サービス名を検索します
 * @param {string} serviceName - 検索するサービス名
 * @returns {Promise<Array>} - 検索結果の配列
 */
async function searchServiceByName(serviceName) {
    try {
        const query = `
            SELECT service_id, service_name, service_url, service_image
            FROM services
            WHERE service_name LIKE ?
        `;
        return allQuery(query, [`%${serviceName}%`]);
    } catch (err) {
        throw { status: 500, message: 'Error searching services by name.', error: err };
    }
}

module.exports = {
    getService,
    getServiceDetailsById,
    addService,
    updateService,
    deleteService,
    searchServiceByName,
}