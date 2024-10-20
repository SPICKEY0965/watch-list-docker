'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MoreVertical, Plus, Trash2, Edit, Info, Play, Filter, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import axios from 'axios';
import { Anime, AnimeStatus, AnimeRating, AiringStatus } from './types';
import { calculateCurrentEpisode, getAiringStatus, getLastUpdateDate } from './utils';
import { AddEditAnimeDialog } from './AddEditAnimeDialog';
import { LoginComponent } from './LoginComponent';

export function WatchListComponent() {
    const [animeList, setAnimeList] = useState<Anime[]>([]);
    const [activeTab, setActiveTab] = useState<AnimeStatus | 'All'>('All');
    const [activeRating, setActiveRating] = useState<AnimeRating | 'All'>('All');
    const [sortBy, setSortBy] = useState('Recently Updated');
    const [animeToEdit, setAnimeToEdit] = useState<Anime | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchAnimeList();
        }
    }, [token]);

    const fetchAnimeList = async () => {
        try {
            const response = await axios.get('http://192.168.1.210:5000/api/contents', {
                headers: { Authorization: token }
            });
            const updatedAnimeList = response.data.map((anime: Anime) => ({
                ...anime,
                currentEpisode: calculateCurrentEpisode(anime)
            }));
            setAnimeList(sortAnimeList(updatedAnimeList, sortBy));
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching anime list', error.message);
                if (error.response && error.response.status === 403) {
                    // Token is invalid or expired
                    handleLogout();
                }
            } else {
                console.error('Unexpected error', error);
            }
        }
    };

    const handleLogin = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setAnimeList([]);
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete('http://192.168.1.210:5000/api/user', {
                headers: { Authorization: token }
            });
            handleLogout();
        } catch (error) {
            console.error('Error deleting account', error);
        }
    };

    const handleAddAnime = async (newAnime: Omit<Anime, 'id'>) => {
        try {
            const response = await axios.post('http://192.168.1.210:5000/api/contents', newAnime, {
                headers: { Authorization: token }
            });
            setAnimeList(prevList => sortAnimeList([...prevList, response.data], sortBy));
        } catch (error) {
            console.error('Error adding anime', error);
        }
    };

    const handleEditAnime = async (editedAnime: Anime) => {
        try {
            const response = await axios.put(`http://192.168.1.210:5000/api/contents/${editedAnime.id}`, editedAnime, {
                headers: { Authorization: token }
            });
            setAnimeList(prevList => sortAnimeList(prevList.map(anime => anime.id === editedAnime.id ? response.data : anime), sortBy));
            setAnimeToEdit(null);
        } catch (error) {
            console.error('Error editing anime', error);
        }
    };

    const handleDeleteAnime = async (id: number) => {
        try {
            await axios.delete(`http://192.168.1.210:5000/api/contents/${id}`, {
                headers: { Authorization: token }
            });
            setAnimeList(prevList => sortAnimeList(prevList.filter(anime => anime.id !== id), sortBy));
        } catch (error) {
            console.error('Error deleting anime', error);
        }
    };

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
    };

    const sortAnimeList = (list: Anime[], criteria: string): Anime[] => {
        return [...list].sort((a, b) => {
            switch (criteria) {
                case 'Recently Updated':
                    return getLastUpdateDate(b).getTime() - getLastUpdateDate(a).getTime();
                case 'Name A-Z':
                    return a.title.localeCompare(b.title);
                case 'Released Date':
                    return new Date(b.broadcastDate).getTime() - new Date(a.broadcastDate).getTime();
                case 'Rating':
                    const ratingOrder = ['SS', 'S', 'A', 'B', 'C', null];
                    return ratingOrder.indexOf(a.rating) - ratingOrder.indexOf(b.rating);
                default:
                    return 0;
            }
        });
    };

    const handleSort = (criteria: string) => {
        setSortBy(criteria);
        setAnimeList(prevList => sortAnimeList(prevList, criteria));
    };

    const filteredAnimeList = animeList
        .filter(anime => activeTab === 'All' || anime.status === activeTab)
        .filter(anime => activeRating === 'All' || anime.rating === activeRating);

    const renderAnimeCard = (anime: Anime) => (
        <div key={anime.id} className="bg-gray-800 rounded-lg overflow-hidden relative">
            <img src={anime.image} alt={anime.title} className="w-full h-48 object-cover" />
            <div className="p-4">
                <h3 className="font-bold mb-2 text-sm md:text-base line-clamp-1">{anime.title}</h3>
                <div className="flex justify-between text-xs md:text-sm text-gray-400">
                    <span>
                        <span className="bg-gray-700 px-1 rounded">{anime.currentEpisode}/{anime.episodes}</span>
                    </span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs md:text-sm">{anime.rating || '未評価'}</span>
                    <span className="text-xs md:text-sm">{getAiringStatus(anime) === 'Upcoming' ? '放送予定' : getAiringStatus(anime) === 'Airing' ? '放送中' : '放送終了'}</span>
                </div>
            </div>
            {renderAnimeCardActions(anime)}
        </div>
    );

    const renderAnimeCardActions = (anime: Anime) => (
        <>
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
                            <p className="text-sm"><strong>放送日:</strong> {anime.broadcastDate}</p>
                            <p className="text-sm"><strong>更新日:</strong> {anime.updateDay}</p>
                            <p className="text-sm"><strong>ステータス:</strong> {
                                {
                                    'Watching': '視聴中',
                                    'On-hold': '保留中',
                                    'Plan to watch': '視聴予定',
                                    'Dropped': '視聴中止',
                                    'Completed': '視聴完了'
                                }[anime.status]
                            }</p>
                            <p className="text-sm"><strong>評価:</strong> {anime.rating || '未評価'}</p>
                            <Button className="w-full" asChild>
                                <a href={anime.streamingUrl} target="_blank" rel="noopener noreferrer">視聴する</a>
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
                            <span>編集</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {[
                            ['Watching', '視聴中'],
                            ['On-hold', '保留中'],
                            ['Plan to watch', '視聴予定'],
                            ['Dropped', '視聴中止'],
                            ['Completed', '視聴完了']
                        ].map(([value, label]) => (
                            <DropdownMenuItem key={value} onSelect={() => handleStatusChange(anime.id, value as AnimeStatus)}>
                                <span>{label}</span>
                                {anime.status === value && <span className="ml-2">✓</span>}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDeleteAnime(anime.id)} className="text-red-500">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>削除</span>
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
        </>
    );

    const renderSettingsButton = () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="bg-gray-800 text-white border-gray-700"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
                <div className="grid gap-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={handleLogout}
                    >
                        ログアウト
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500"
                        onClick={() => setIsDeleteAccountDialogOpen(true)}
                    >
                        アカウント削除
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );

    if (!token) {
        return <LoginComponent onLogin={handleLogin} />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        ウォッチリスト
                    </h1>
                    <div className="md:hidden bg-gray-800 text-white border-gray-700 flex items-center gap-2">
                        {renderSettingsButton()}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            aria-label="フィルターとソートメニューを開く"
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="bg-gray-800 text-white border-gray-700"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {isFilterMenuOpen && (
                    <div className="md:hidden mb-4 space-y-4 bg-gray-800 p-4 rounded-lg">
                        <div>
                            <h3 className="mb-2 text-sm font-medium">ステータス</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    ['All', 'すべて'],
                                    ['Watching', '視聴中'],
                                    ['On-hold', '保留中'],
                                    ['Plan to watch', '視聴予定'],
                                    ['Dropped', '視聴中止'],
                                    ['Completed', '視聴完了']
                                ].map(([value, label]) => (
                                    <Button
                                        key={value}
                                        className={`${activeTab === value ? 'bg-[#a3d3ca] text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}`}
                                        variant={activeTab === value ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveTab(value as AnimeStatus | 'All')}
                                    >
                                        {label}
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
                                        className={`${activeRating === rating ? 'bg-[#a3d3ca] text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}`}
                                        variant={activeRating === rating ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveRating(rating as AnimeRating | 'All')}
                                    >
                                        {rating === 'All' ? 'すべて' : rating}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-2 text-sm font-medium">並び替え</h3>
                            <Select value={sortBy} onValueChange={handleSort}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="並び替え" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Recently Updated">更新日順</SelectItem>
                                    <SelectItem value="Name A-Z">タイトル順</SelectItem>
                                    <SelectItem value="Released Date">放送日順</SelectItem>
                                    <SelectItem value="Rating">評価順</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                )}

                <div className="hidden md:flex justify-between items-center mb-6">
                    <div className="flex gap-2 md:gap-4 flex-wrap">
                        {[
                            ['All', 'すべて'],
                            ['Watching', '視聴中'],
                            ['On-hold', '保留中'],
                            ['Plan to watch', '視聴予定'],
                            ['Dropped', '視聴中止'],
                            ['Completed', '視聴完了']
                        ].map(([value, label]) => (
                            <Button
                                key={value}
                                variant={activeTab === value ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setActiveTab(value as AnimeStatus | 'All')}
                            >
                                {label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Select value={sortBy} onValueChange={handleSort}>
                            <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
                                <SelectValue placeholder="並び替え" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Recently Updated">更新日順</SelectItem>
                                <SelectItem value="Name A-Z">タイトル順</SelectItem>
                                <SelectItem value="Released Date">放送日順</SelectItem>
                                <SelectItem value="Rating">評価順</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="bg-gray-800 text-white border-gray-700"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        {renderSettingsButton()}
                    </div>
                </div>

                <div className="hidden md:flex gap-2 md:gap-4 mb-6 flex-wrap">
                    {['All', 'SS', 'S', 'A', 'B', 'C'].map((rating) => (
                        <Button
                            key={rating}
                            variant={activeRating === rating ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveRating(rating as AnimeRating | 'All')}
                        >
                            {rating === 'All' ? 'すべて' : rating}
                        </Button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredAnimeList.map(renderAnimeCard)}
                </div>
            </div>
            <AddEditAnimeDialog
                onAddAnime={handleAddAnime}
                onEditAnime={handleEditAnime}
                animeToEdit={animeToEdit}
                isOpen={isAddDialogOpen || animeToEdit !== null}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) setAnimeToEdit(null);
                }}
            />
            <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>アカウント削除の確認</DialogTitle>
                        <DialogDescription>
                            本当にアカウントを削除しますか？この操作は取り消せません。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteAccountDialogOpen(false)}>
                            キャンセル
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAccount}>
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}