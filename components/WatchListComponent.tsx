'use client';

import React, { useState, useEffect } from 'react';
import { Heart, MoreVertical, Plus, Trash2, Edit, Info, Play, Filter, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import axios from 'axios';
import { Contents, ContentsStatus, ContentsRating, AiringStatus } from './types';
import { calculateCurrentEpisode, getAiringStatus, getLastUpdateDate } from './utils';
import { AddEditContentsDialog } from './AddEditContentsDialog';
import { LoginComponent } from './LoginComponent';
import { useRouter } from 'next/navigation';

export function WatchListComponent() {
    const [contentsList, setContentsList] = useState<Contents[]>([]);
    const [activeTab, setActiveTab] = useState<ContentsStatus | 'All'>('All');
    const [activeRating, setActiveRating] = useState<ContentsRating | 'All'>('All');
    const [sortBy, setSortBy] = useState('Recently Updated');
    const [contentsToEdit, setContentsToEdit] = useState<Contents | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchContentsList();
        }
    }, [token]);

    const fetchContentsList = async () => {
        try {
            const response = await axios.get('http://192.168.1.210:5000/api/contents', {
                headers: { Authorization: token }
            });
            const updatedContentsList = response.data.map((contents: Contents) => ({
                ...contents,
                currentEpisode: calculateCurrentEpisode(contents)
            }));
            setContentsList(sortContentsList(updatedContentsList, sortBy));
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching contents list', error.message);
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
        setContentsList([]);
        router.push('/login');
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

    const handleAddContents = async (newContents: Omit<Contents, 'id'>) => {
        try {
            const response = await axios.post('http://192.168.1.210:5000/api/contents', newContents, {
                headers: { Authorization: token }
            });
            setContentsList(prevList => sortContentsList([...prevList, response.data], sortBy));
        } catch (error) {
            console.error('Error adding contents', error);
        }
    };

    const handleEditContents = async (editedContents: Contents) => {
        try {
            const response = await axios.put(`http://192.168.1.210:5000/api/contents/${editedContents.id}`, editedContents, {
                headers: { Authorization: token }
            });
            setContentsList(prevList => sortContentsList(prevList.map(contents => contents.id === editedContents.id ? response.data : contents), sortBy));
            setContentsToEdit(null);
        } catch (error) {
            console.error('Error editing contents', error);
        }
    };

    const handleDeleteContents = async (id: number) => {
        try {
            await axios.delete(`http://192.168.1.210:5000/api/contents/${id}`, {
                headers: { Authorization: token }
            });
            setContentsList(prevList => sortContentsList(prevList.filter(contents => contents.id !== id), sortBy));
        } catch (error) {
            console.error('Error deleting contents', error);
        }
    };

    const handleStatusChange = async (id: number, newStatus: ContentsStatus) => {
        try {
            const contentsToUpdate = contentsList.find(contents => contents.id === id);
            if (contentsToUpdate) {
                const updatedContents = { ...contentsToUpdate, status: newStatus };
                await handleEditContents(updatedContents);
            }
        } catch (error) {
            console.error('Error changing contents status', error);
        }
    };

    const sortContentsList = (list: Contents[], criteria: string): Contents[] => {
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
        setContentsList(prevList => sortContentsList(prevList, criteria));
    };

    const filteredContentsList = contentsList
        .filter(contents => activeTab === 'All' || contents.status === activeTab)
        .filter(contents => activeRating === 'All' || contents.rating === activeRating);

    const renderContentsCard = (contents: Contents) => (
        <div key={contents.id} className="bg-gray-800 rounded-lg overflow-hidden relative">
            <img src={contents.image} alt={contents.title} className="w-full h-48 object-cover" />
            <div className="p-4">
                <h3 className="font-bold mb-2 text-sm md:text-base line-clamp-1">{contents.title}</h3>
                <div className="flex justify-between text-xs md:text-sm text-gray-400">
                    <span>
                        <span className="bg-gray-700 px-1 rounded">{contents.currentEpisode}/{contents.episodes}</span>
                    </span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs md:text-sm">{contents.rating || '未評価'}</span>
                    <span className="text-xs md:text-sm">{getAiringStatus(contents) === 'Upcoming' ? '放送予定' : getAiringStatus(contents) === 'Airing' ? '放送中' : '放送終了'}</span>
                </div>
            </div>
            {renderContentsCardActions(contents)}
        </div>
    );

    const renderContentsCardActions = (contents: Contents) => (
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
                            <h3 className="font-bold text-lg">{contents.title}</h3>
                            <p className="text-sm"><strong>放送日:</strong> {contents.broadcastDate}</p>
                            <p className="text-sm"><strong>更新日:</strong> {contents.updateDay}</p>
                            <p className="text-sm"><strong>ステータス:</strong> {
                                {
                                    'Watching': '視聴中',
                                    'On-hold': '保留中',
                                    'Plan to watch': '視聴予定',
                                    'Dropped': '視聴中止',
                                    'Completed': '視聴完了'
                                }[contents.status]
                            }</p>
                            <p className="text-sm"><strong>評価:</strong> {contents.rating || '未評価'}</p>
                            <Button className="w-full" asChild>
                                <a href={contents.streamingUrl} target="_blank" rel="noopener noreferrer">視聴する</a>
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
                        <DropdownMenuItem onSelect={() => setContentsToEdit(contents)}>
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
                            <DropdownMenuItem key={value} onSelect={() => handleStatusChange(contents.id, value as ContentsStatus)}>
                                <span>{label}</span>
                                {contents.status === value && <span className="ml-2">✓</span>}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => handleDeleteContents(contents.id)} className="text-red-500">
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
                onClick={() => window.open(contents.streamingUrl, '_blank')}
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
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className="bg-gray-800 text-white border-gray-700"
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
                        {renderSettingsButton()}
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
                                        onClick={() => setActiveTab(value as ContentsStatus | 'All')}
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
                                        onClick={() => setActiveRating(rating as ContentsRating | 'All')}
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
                                onClick={() => setActiveTab(value as ContentsStatus | 'All')}
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
                            onClick={() => setActiveRating(rating as ContentsRating | 'All')}
                        >
                            {rating === 'All' ? 'すべて' : rating}
                        </Button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredContentsList.map(renderContentsCard)}
                </div>
            </div>
            <AddEditContentsDialog
                onAddContents={handleAddContents}
                onEditContents={handleEditContents}
                contentsToEdit={contentsToEdit}
                isOpen={isAddDialogOpen || contentsToEdit !== null}
                onOpenChange={(open) => {
                    setIsAddDialogOpen(open);
                    if (!open) setContentsToEdit(null);
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