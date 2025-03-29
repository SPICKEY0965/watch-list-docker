export type ContentsStatus = 'Watching' | 'On-hold' | 'Plan to watch' | 'Dropped' | 'Completed';
export type ContentsRating = 'SS' | 'S' | 'A' | 'B' | 'C' | 'unrated' | null;
export type AiringStatus = 'Upcoming' | 'Airing' | 'Finished Airing';
export type PrivateStatus = 'false' | 'true'
export interface Contents {
    content_id: number;
    title: string;
    episodes: number;
    currentEpisode: number;
    image: string;
    rating: ContentsRating;
    broadcastDate: string;
    updateDay: string;
    streaming_url: string;
    content_type: string;
    season: number;
    cour: number;
    status: ContentsStatus;
    is_private: PrivateStatus;
}
