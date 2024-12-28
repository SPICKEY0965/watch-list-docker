export type ContentsStatus = 'Watching' | 'On-hold' | 'Plan to watch' | 'Dropped' | 'Completed'
export type ContentsRating = 'SS' | 'S' | 'A' | 'B' | 'C' | '未評価' | null
export type AiringStatus = 'Upcoming' | 'Airing' | 'Finished Airing'
export type PrivateStatus = '0' | '1'

export interface Contents {
    id: number;
    title: string;
    episodes: number;
    currentEpisode: number;
    image: string;
    rating: ContentsRating;
    broadcastDate: string;
    updateDay: string;
    streamingUrl: string;
    status: ContentsStatus;
    is_private: PrivateStatus;
}