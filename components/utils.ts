import { addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { Contents, AiringStatus } from './types';

/**
 * broadcastDate 文字列を正規化する
 * - "YYYY-MM-DDTHH:mm" の形式（長さ16文字）なら末尾に ":00" を付与
 * - それ以外はそのまま返す
 */
function normalizeBroadcastDate(str: string): string {
    return str.includes('T') && str.length === 16
        ? `${str}:00`
        : str;
}

/**
 * 次回放送日を計算する
 * ・放送開始前 → 開始日を返す
 * ・放送中/終了後 → contents.updateDay の曜日に合わせて次回日を返す
 */
export function calculateNextBroadcastDate(contents: Contents): Date {
    const now = new Date();
    const startDate = new Date(normalizeBroadcastDate(contents.broadcastDate));

    // 放送開始前
    if (isBefore(now, startDate)) {
        return startDate;
    }

    // 曜日インデックス（0=日曜…6=土曜）
    const currentDow = now.getDay();
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    let targetDow: number;
    if (contents.updateDay && weekdays.includes(contents.updateDay)) {
        targetDow = weekdays.indexOf(contents.updateDay);
    } else {
        targetDow = startDate.getDay();
    }

    let next = new Date(now);
    if (targetDow > currentDow) {
        next = addDays(now, targetDow - currentDow);
    } else if (targetDow < currentDow) {
        next = addDays(now, 7 - (currentDow - targetDow));
    } else {
        // 同じ曜日 → 来週
        next = addDays(now, 7);
    }

    return next;
}

/**
 * 現在放送中のエピソード数（1～episodes）を返す
 * ・放送開始日を 1 話目と数え、以降は 7 日ごとに +1
 */
export function calculateCurrentEpisode(contents: Contents): number {
    const now = new Date();
    const start = new Date(normalizeBroadcastDate(contents.broadcastDate));
    const days = differenceInDays(now, start);
    return Math.min(Math.floor(days / 7) + 1, contents.episodes);
}

/**
 * 放送ステータスを返す
 * - Upcoming        ：放送開始前
 * - Airing          ：放送期間中
 * - Finished Airing ：放送終了後
 */
export function getAiringStatus(contents: Contents): AiringStatus {
    const now = new Date();
    const start = new Date(normalizeBroadcastDate(contents.broadcastDate));
    const end = addDays(start, (contents.episodes - 1) * 7);

    if (isBefore(now, start)) {
        return 'Upcoming';
    } else if (isAfter(now, end)) {
        return 'Finished Airing';
    } else {
        return 'Airing';
    }
}

/**
 * 最終更新日（最新放送日）を返す
 * ・放送開始前 → 開始日
 * ・放送中     → 現時点で消化済みの最新話の放送日
 * ・放送終了後 → 最終話の放送日
 */
export function getLastUpdateDate(contents: Contents): Date {
    const now = new Date();
    const start = new Date(normalizeBroadcastDate(contents.broadcastDate));

    // まだ放送開始前
    if (isAfter(start, now)) {
        return start;
    }

    // 放送終了日を計算
    const end = addDays(start, (contents.episodes - 1) * 7);
    if (isBefore(end, now)) {
        return end;
    }

    // 放送中 → 経過日数÷7 を切り上げた話数分だけ日付を進める
    const days = differenceInDays(now, start);
    const aired = Math.min(Math.ceil((days + 1) / 7), contents.episodes);
    return addDays(start, (aired - 1) * 7);
}
