import { db } from '../db.js';

/**
 * Promise対応のdb.runラッパー
 * @param {string} query - SQLクエリ
 * @param {Array} params - パラメータ配列
 * @returns {Promise<object>} - 実行結果(this)
 */
function runQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                return reject(err);
            }
            resolve(this);
        });
    });
}

/**
 * Promise対応のdb.getラッパー
 * @param {string} query - SQLクエリ
 * @param {Array} params - パラメータ配列
 * @returns {Promise<object>} - 取得した1件のレコード
 */
function getQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.get(query, params, function (err, row) {
            if (err) {
                return reject(err);
            }
            resolve(row);
        });
    });
}

/**
 * Promise対応のdb.allラッパー
 * @param {string} query - SQLクエリ
 * @param {Array} params - パラメータ配列
 * @returns {Promise<Array>} - 取得したレコード群
 */
function allQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, function (err, rows) {
            if (err) {
                return reject(err);
            }
            resolve(rows);
        });
    });
}

export {
    runQuery,
    getQuery,
    allQuery
};
