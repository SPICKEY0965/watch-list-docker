'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';
import { Edit, Filter, Info, MoreVertical, Play, Plus, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AddEditContentsDialog } from './AddEditContentsDialog';
import { convertToUniversalLink } from './convert_universalURL';
import { Contents, ContentsRating, ContentsStatus } from './types';
import { calculateCurrentEpisode, getAiringStatus, getLastUpdateDate } from './utils';

export function WatchListComponent() {
    const [contentsList, setContentsList] = useState<Contents[]>([]);
    const [activeTab, setActiveTab] = useState<ContentsStatus | 'All'>('All');
    const [activeRating, setActiveRating] = useState<ContentsRating | 'All'>('All');
    const [sortBy, setSortBy] = useState('Recently Updated');
    const [contentsToEdit, setContentsToEdit] = useState<Contents | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const router = useRouter();
    const [isOnline, setIsOnline] = useState(true);
    const apiClient = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    apiClient.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                handleLogout();
            }
            return Promise.reject(error);
        }
    );

    // ネットワーク状態を監視し、オフライン・オンラインの変更時に状態を更新
    useEffect(() => {
        const updateOnlineStatus = (status: boolean) => setIsOnline(status);

        setIsOnline(navigator.onLine);
        window.addEventListener('online', () => updateOnlineStatus(true));
        window.addEventListener('offline', () => updateOnlineStatus(false));

        return () => {
            window.removeEventListener('online', () => updateOnlineStatus(true));
            window.removeEventListener('offline', () => updateOnlineStatus(false));
        };
    }, []);

    // アプリの初期データをローカルストレージから読み込み、初期化する
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 各状態をローカルストレージから読み込む
            const storedActiveTab = (localStorage.getItem('activeTab') as ContentsStatus | 'All') || 'All';
            const storedActiveRating = localStorage.getItem('activeRating') === 'null' ? null : (localStorage.getItem('activeRating') as ContentsRating | 'All') || 'All';
            const storedSortBy = localStorage.getItem('sortBy') || 'Recently Updated';
            const storedToken = localStorage.getItem('token');

            // 状態をセット
            setActiveTab(storedActiveTab);
            setActiveRating(storedActiveRating);
            setSortBy(storedSortBy);

            // トークンの有無を確認し、なければログインページにリダイレクト
            if (storedToken) {
                setToken(storedToken);
            } else {
                router.push('/login');
            }

            // アプリがロード済みであることを設定
            setIsLoaded(true);

            // Service Workerの登録
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
                    .catch((error) => console.error('Service Worker registration failed:', error));
            }
        }
    }, []);

    // ローカルストレージへの保存：activeTab, activeRating, sortByの状態が変更されるたびに保存
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('activeTab', activeTab);
            localStorage.setItem('activeRating', activeRating === null ? 'null' : activeRating);
            localStorage.setItem('sortBy', sortBy);
        }
    }, [activeTab, activeRating, sortBy, isLoaded]);

    // トークンが設定されたときにコンテンツリストを取得
    useEffect(() => {
        if (token) {
            fetchContentsList();
        }
    }, [token]);

    // 初期ロードが完了するまでコンポーネントのレンダリングを停止
    if (!isLoaded) return null;

    const fetchContentsList = async () => {
        try {
            if (!isOnline) {
                const db = await openDatabase();
                const storedData = await getDataFromIndexedDB(db);
                if (storedData) {
                    setContentsList(sortContentsList(storedData, sortBy));
                    return;
                }
            }

            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/contents`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const userAgent = navigator.userAgent || navigator.userAgent;

            const updatedContentsList = response.data.map((contents: Contents) => {
                const universalUrl = convertToUniversalLink(contents.streamingUrl, userAgent);
                return {
                    ...contents,
                    streamingUrl: universalUrl,
                    currentEpisode: calculateCurrentEpisode(contents)
                };
            });

            setContentsList(sortContentsList(updatedContentsList, sortBy));

            const db = await openDatabase();
            await storeDataInIndexedDB(db, updatedContentsList);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    handleLogout();
                } else {
                    console.warn('An error occurred while fetching content data.');
                }
            } else {
                console.error('Unexpected error', error);
            }
        }
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('token');
        setContentsList([]);
        router.push('/login');
    };

    const handleDeleteAccount = async () => {
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
                headers: { Authorization: token }
            });
            handleLogout();
        } catch (error) {
            console.error('Error deleting account', error);
        }
    };

    const handleAddContents = async (newContents: Omit<Contents, 'id'>) => {
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/contents`, newContents, {
                headers: { Authorization: token }
            });
            setContentsList(prevList => sortContentsList([...prevList, response.data], sortBy));
        } catch (error) {
            console.error('Error adding contents', error);
        }
    };

    const handleEditContents = async (editedContents: Contents) => {
        try {
            const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/contents/${editedContents.id}`, editedContents, {
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
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/contents/${id}`, {
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

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
            {!isOnline && (
                <div className="bg-yellow-500 text-black p-2 text-center mb-4">
                    現在オフラインです。一部の機能が制限されている可能性があります。
                </div>
            )}
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
                                {['All', 'SS', 'S', 'A', 'B', 'C', '未評価'].map((rating) => (
                                    <Button
                                        key={rating}
                                        className={`${(activeRating === rating || (rating === '未評価' && activeRating === null))
                                            ? 'bg-[#a3d3ca] text-white border-blue-500'
                                            : 'bg-gray-800 text-white border-gray-700'
                                            }`}
                                        variant={activeRating === rating || (rating === '未評価' && activeRating === null) ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setActiveRating(rating === '未評価' ? null : rating as ContentsRating | 'All')}
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
                    {['All', 'SS', 'S', 'A', 'B', 'C', '未評価'].map((rating) => (
                        <Button
                            key={rating}
                            variant={(activeRating === rating || (rating === '未評価' && activeRating === null)) ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveRating(rating === '未評価' ? null : rating as ContentsRating | 'All')}
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
    async function openDatabase() {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('WatchListDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                db.createObjectStore('contents', { keyPath: 'id' });
            };
        });
    }

    async function storeDataInIndexedDB(db: IDBDatabase, data: Contents[]) {
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction('contents', 'readwrite');
            const store = transaction.objectStore('contents');
            data.forEach(item => store.put(item));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async function getDataFromIndexedDB(db: IDBDatabase) {
        return new Promise<Contents[]>((resolve, reject) => {
            const transaction = db.transaction('contents', 'readonly');
            const store = transaction.objectStore('contents');
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }
}