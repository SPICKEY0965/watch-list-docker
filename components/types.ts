export type AnimeStatus = 'Watching' | 'On-hold' | 'Plan to watch' | 'Dropped' | 'Completed'
export type AnimeRating = 'SS' | 'S' | 'A' | 'B' | 'C' | null
export type AiringStatus = 'Upcoming' | 'Airing' | 'Finished Airing'

export interface Anime {
    id: number;
    title: string;
    duration: string;
    episodes: number;
    currentEpisode: number;
    image: string;
    rating: AnimeRating;
    broadcastDate: string;
    updateDay: string;
    streamingUrl: string;
    status: AnimeStatus;
}