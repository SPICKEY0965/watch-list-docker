import { addDays, getDay, parseISO, differenceInDays, isBefore, isAfter } from 'date-fns';
import { Anime, AiringStatus } from './types';

export function calculateNextBroadcastDate(anime: Anime): Date {
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay();
    const broadcastDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(anime.updateDay);
    const broadcastStartDate = parseISO(anime.broadcastDate);

    if (isBefore(currentDate, broadcastStartDate)) {
        return broadcastStartDate;
    }

    let nextBroadcast = new Date(currentDate);
    if (broadcastDay > currentDayOfWeek) {
        nextBroadcast = addDays(currentDate, broadcastDay - currentDayOfWeek);
    } else if (broadcastDay < currentDayOfWeek) {
        nextBroadcast = addDays(currentDate, 7 - (currentDayOfWeek - broadcastDay));
    } else {
        // If it's the same day, check if we've passed the broadcast time
        // Assuming broadcast is at 00:00, so if it's the same day, we'll set it to next week
        nextBroadcast = addDays(currentDate, 7);
    }

    return nextBroadcast;
}

export function calculateCurrentEpisode(anime: Anime): number {
    const currentDate = new Date();
    const broadcastStartDate = parseISO(anime.broadcastDate);
    const weeksSinceBroadcast = Math.floor(differenceInDays(currentDate, broadcastStartDate) / 7);
    return Math.min(weeksSinceBroadcast + 1, anime.episodes);
}

export function getAiringStatus(anime: Anime): AiringStatus {
    const currentDate = new Date();
    const broadcastStartDate = parseISO(anime.broadcastDate);
    const broadcastEndDate = addDays(broadcastStartDate, (anime.episodes - 1) * 7);

    if (isBefore(currentDate, broadcastStartDate)) {
        return 'Upcoming';
    } else if (isAfter(currentDate, broadcastEndDate)) {
        return 'Finished Airing';
    } else {
        return 'Airing';
    }
}

export function getLastUpdateDate(anime: Anime): Date {
    const now = new Date();
    const broadcastDate = parseISO(anime.broadcastDate);

    // 放送開始日が未来の場合は、その日付を返す
    if (isAfter(broadcastDate, now)) {
        return broadcastDate;
    }

    // 放送が終了している場合は、最終エピソードの日付を返す
    const lastEpisodeDate = addDays(broadcastDate, (anime.episodes - 1) * 7);
    if (isBefore(lastEpisodeDate, now)) {
        return lastEpisodeDate;
    }

    // 放送中の場合は、最新エピソードの日付を返す
    const daysSinceBroadcast = differenceInDays(now, broadcastDate);
    const episodesAired = Math.min(Math.floor(daysSinceBroadcast / 7) + 1, anime.episodes);
    return addDays(broadcastDate, (episodesAired - 1) * 7);
}