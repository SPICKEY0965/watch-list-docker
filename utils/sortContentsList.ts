import { Contents } from '@/components/types';
import { getLastUpdateDate } from '@/components/utils';

export function sortContentsList(list: Contents[], criteria: string): Contents[] {
    // 配列のコピーを作成
    const listCopy = [...list];
    let comparator: (a: Contents, b: Contents) => number;

    if (criteria === 'Recently Updated') {
        comparator = (a, b) => {
            const aTime = getLastUpdateDate(a).getTime();
            const bTime = getLastUpdateDate(b).getTime();
            return bTime - aTime;
        };
    } else if (criteria === 'Name A-Z') {
        comparator = (a, b) => a.title.localeCompare(b.title);
    } else if (criteria === 'Released Date') {
        comparator = (a, b) => Date.parse(b.broadcastDate) - Date.parse(a.broadcastDate);
    } else if (criteria === 'Rating') {
        const ratingPriority: { [key: string]: number } = {
            'SS': 0,
            'S': 1,
            'A': 2,
            'B': 3,
            'C': 4,
            'unrated': 5
        };
        comparator = (a, b) => {
            const aRating = a.rating ?? 'unrated';
            const bRating = b.rating ?? 'unrated';
            return ratingPriority[aRating] - ratingPriority[bRating];
        };
    } else {
        comparator = () => 0;
    }

    return listCopy.sort(comparator);
}
