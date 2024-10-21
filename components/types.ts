export type ContentsStatus = 'Watching' | 'On-hold' | 'Plan to watch' | 'Dropped' | 'Completed'
export type ContentsRating = 'SS' | 'S' | 'A' | 'B' | 'C' | null
export type AiringStatus = 'Upcoming' | 'Airing' | 'Finished Airing'

export interface Contents {
    id: number;
    title: string;
    duration: string;
    episodes: number;
    currentEpisode: number;
    image: string;
    rating: ContentsRating;
    broadcastDate: string;
    updateDay: string;
    streamingUrl: string;
    status: ContentsStatus;
}