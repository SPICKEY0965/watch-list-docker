'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MoreVertical, Plus, Trash2, Edit, Info, Play, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import axios from 'axios';
import { Anime, AnimeStatus, AnimeRating, AiringStatus } from './types';
import { calculateCurrentEpisode, getAiringStatus, getLastUpdateDate } from './utils';
import { AddEditAnimeDialog } from './AddEditAnimeDialog';
import { addDays, getDay, parseISO, differenceInDays, isBefore, isAfter } from 'date-fns';

export function WatchListComponent() {
    const [animeList, setAnimeList] = useState<Anime[]>([])
    const [activeTab, setActiveTab] = useState<AnimeStatus | 'All'>('All')
    const [activeRating, setActiveRating] = useState<AnimeRating | 'All'>('All')
    const [sortBy, setSortBy] = useState('Recently Updated')
    const [animeToEdit, setAnimeToEdit] = useState<Anime | null>(null)
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false)

    const handleSort = (criteria: string) => {
        setSortBy(criteria);
        let sortedList = [...animeList];
        switch (criteria) {
            case 'Recently Updated':
                sortedList.sort((a, b) => {
                    const now = new Date();
                    const lastUpdateA = getLastUpdateDate(a);
                    const lastUpdateB = getLastUpdateDate(b);

                    // まず、放送開始日が未来のものを後ろにソート
                    if (isAfter(parseISO(a.broadcastDate), now) && !isAfter(parseISO(b.broadcastDate), now)) {
                        return 1;
                    }
                    if (!isAfter(parseISO(a.broadcastDate), now) && isAfter(parseISO(b.broadcastDate), now)) {
                        return -1;
                    }

                    // 両方とも放送済みか両方とも未放送の場合は、最終更新日で比較
                    return lastUpdateB.getTime() - lastUpdateA.getTime();
                });
                break;
            case 'Name A-Z':
                sortedList.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'Released Date':
                sortedList.sort((a, b) => new Date(b.broadcastDate).getTime() - new Date(a.broadcastDate).getTime());
                break;
            case 'Rating':
                const ratingOrder = ['SS', 'S', 'A', 'B', 'C', null];
                sortedList.sort((a, b) => ratingOrder.indexOf(a.rating) - ratingOrder.indexOf(b.rating));
                break;
        }
        setAnimeList(sortedList);
    };

    const fetchAnimeList = async () => {
        try {
            const response = await axios.get('http://192.168.1.210:5000/api/anime');
            const updatedAnimeList = response.data.map((anime: Anime) => ({
                ...anime,
                currentEpisode: calculateCurrentEpisode(anime)
            }));
            setAnimeList(updatedAnimeList);
        } catch (error) {
            console.error('Error fetching anime list', error);
        }
    }

    useEffect(() => {
        fetchAnimeList();
        //const interval = setInterval(fetchAnimeList, 60000); // Update every minute
        //return () => clearInterval(interval);
    }, [])

    const handleAddAnime = async (newAnime: Omit<Anime, 'id'>) => {
        try {
            const response = await axios.post('http://192.168.1.210:5000/api/anime', newAnime);
            setAnimeList(prevList => [...prevList, response.data]);
        } catch (error) {
            console.error('Error adding anime', error);
        }
    }

    const handleEditAnime = async (editedAnime: Anime) => {
        try {
            const response = await axios.put(`http://192.168.1.210:5000/api/anime/${editedAnime.id}`, editedAnime);
            setAnimeList(prevList => prevList.map(anime => anime.id === editedAnime.id ? response.data : anime));
            setAnimeToEdit(null);
        } catch (error) {
            console.error('Error editing anime', error);
        }
    }

    const handleDeleteAnime = async (id: number) => {
        try {
            await axios.delete(`http://192.168.1.210:5000/api/anime/${id}`);
            setAnimeList(prevList => prevList.filter(anime => anime.id !== id));
        } catch (error) {
            console.error('Error deleting anime', error);
        }
    }

    const handleStatusChange = async (id: number, newStatus: AnimeStatus) => {
        try {
            const animeToUpdate = animeList.find(anime => anime.id === id);
            if (animeToUpdate) {
                const updatedAnime = { ...animeToUpdate, status: newStatus };
                await handleEditAnime(updatedAnime);
            }
        } catch (error) {
            console.error('Error changing anime status', error);
        }
    }

    const filteredAnimeList = animeList
        .filter(anime => activeTab === 'All' || anime.status === activeTab)
        .filter(anime => activeRating === 'All' || anime.rating === activeRating)

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        ウォッチリスト
                    </h1>
                    <Button
                        variant="outline"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                        aria-label="フィルターとソートメニューを開く"
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                {isFilterMenuOpen && (
                    <div className="md:hidden mb-4 space-y-4 bg-gray-800 p-4 rounded-lg">
                        <div>
                            <h3 className="mb-2 text-sm font-medium">ステータス</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['All', 'Watching', 'On-hold', 'Plan to watch', 'Dropped', 'Completed'].map((tab) => (
                                    <Button
                                        key={tab}
                                        variant={activeTab === tab ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveTab(tab as AnimeStatus | 'All')}
                                    >
                                        {tab}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-medium">評価</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {['All', 'SS', 'S', 'A', 'B', 'C'].map((rating) => (
                                    <Button
                                        key={rating}
                                        variant={activeRating === rating ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveRating(rating as AnimeRating | 'All')}
                                    >
                                        {rating}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-medium">ソート</h3>
                            <Select value={sortBy} onValueChange={handleSort}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Recently Updated">更新日順</SelectItem>
                                    <SelectItem value="Name A-Z">タイトル順</SelectItem>
                                    <SelectItem value="Released Date">オンエア順</SelectItem>
                                    <SelectItem value="Rating">評価順</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <div className="hidden md:flex justify-between items-center mb-6">
                    <div className="flex gap-2 md:gap-4 flex-wrap">
                        {['All', 'Watching', 'On-hold', 'Plan to watch', 'Dropped', 'Completed'].map((tab) => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setActiveTab(tab as AnimeStatus | 'All')}
                            >
                                {tab}
                            </Button>
                        ))}
                    </div>
                    <Select value={sortBy} onValueChange={handleSort}>
                        <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Recently Updated">更新日順</SelectItem>
                            <SelectItem value="Name A-Z">タイトル順</SelectItem>
                            <SelectItem value="Released Date">オンエア順</SelectItem>
                            <SelectItem value="Rating">評価順</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="hidden md:flex gap-2 md:gap-4 mb-6 flex-wrap">
                    {['All', 'SS', 'S', 'A', 'B', 'C'].map((rating) => (
                        <Button
                            key={rating}
                            variant={activeRating === rating ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveRating(rating as AnimeRating | 'All')}
                        >
                            {rating}
                        </Button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredAnimeList.map((anime) => (
                        <div
                            key={anime.id}
                            className="bg-gray-800 rounded-lg overflow-hidden relative"
                        >
                            <img src={anime.image} alt={anime.title} className="w-full h-48 object-cover" />
                            <div className="p-4">
                                <h3 className="font-bold mb-2 text-sm md:text-base line-clamp-1">{anime.title}</h3>
                                <div className="flex justify-between text-xs md:text-sm text-gray-400">
                                    <span>
                                        <span className="bg-gray-700 px-1 rounded">{anime.currentEpisode}/{anime.episodes}</span>
                                    </span>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs md:text-sm">{anime.rating || 'Not Rated'}</span>
                                    <span className="text-xs md:text-sm">{getAiringStatus(anime)}</span>
                                </div>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="bg-gray-800 hover:bg-gray-700">
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80">
                                        <div className="grid gap-4">
                                            <h3 className="font-bold text-lg">{anime.title}</h3>
                                            <p className="text-sm">{anime.synopsis}</p>
                                            <p className="text-sm"><strong>Broadcast:</strong> {anime.broadcastDate}</p>
                                            <p className="text-sm"><strong>Update Day:</strong> {anime.updateDay}</p>
                                            <p className="text-sm"><strong>Status:</strong> {anime.status}</p>
                                            <p className="text-sm"><strong>Rating:</strong> {anime.rating || 'Not Rated'}</p>
                                            <p className="text-sm"><strong>Genres:</strong> {Array.isArray(anime.genres) && anime.genres.length > 0 ? anime.genres.join(', ') : 'N/A'}</p>
                                            <Button className="w-full" asChild>
                                                <a href={anime.streamingUrl} target="_blank" rel="noopener noreferrer">Watch now</a>
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="bg-gray-800 hover:bg-gray-700">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => setAnimeToEdit(anime)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            <span>Edit</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {(['Watching', 'On-hold', 'Plan to watch', 'Dropped', 'Completed'] as AnimeStatus[]).map((status) => (
                                            <DropdownMenuItem key={status} onSelect={() => handleStatusChange(anime.id, status)}>
                                                <span>{status}</span>
                                                {anime.status === status && <span className="ml-2">✓</span>}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => handleDeleteAnime(anime.id)} className="text-red-500">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Remove</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute bottom-2 right-2 bg-gray-800 hover:bg-gray-700"
                                onClick={() => window.open(anime.streamingUrl, '_blank')}
                            >
                                <Play className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <AddEditAnimeDialog onAddAnime={handleAddAnime} onEditAnime={handleEditAnime} animeToEdit={animeToEdit} />
                </div>
            </div>
        </div>
    )
}