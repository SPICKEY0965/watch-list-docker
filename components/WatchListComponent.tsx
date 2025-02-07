'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import {
    Button
} from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { AddEditContentsDialog } from './AddEditContentsDialog';
import { convertToUniversalLink } from './convert_universalURL';
import { Contents, ContentsRating, ContentsStatus } from './types';
import { calculateCurrentEpisode, getAiringStatus, getLastUpdateDate } from './utils';
import { Edit, Filter, Info, MoreVertical, Play, Plus, Settings, Trash2 } from 'lucide-react';

//
// IndexedDB 関連のヘルパー関数
//
async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WatchListDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('contents', { keyPath: 'id' });
        };
    });
}

async function storeDataInIndexedDB(db: IDBDatabase, data: Contents[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('contents', 'readwrite');
        const store = transaction.objectStore('contents');
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function getDataFromIndexedDB(db: IDBDatabase): Promise<Contents[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('contents', 'readonly');
        const store = transaction.objectStore('contents');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

//
// API クライアント（トークンが変わった場合にも対応）
//
function useApiClient(token: string | null, handleLogout: () => void) {
    const apiClient = useMemo(() => {
        const client = axios.create({
            baseURL: process.env.NEXT_PUBLIC_API_URL,
            headers: { Authorization: token ? `Bearer ${token}` : '' },
        });

        client.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    handleLogout();
                }
                return Promise.reject(error);
            }
        );
        return client;
    }, [token, handleLogout]);

    return apiClient;
}

//
// コンテンツカード（個別の表示部分）
//
interface ContentsCardProps {
    contents: Contents;
    onEdit: (contents: Contents) => void;
    onDelete: (id: number) => void;
    onStatusChange: (id: number, newStatus: ContentsStatus) => void;
}

function ContentsCard({ contents, onEdit, onDelete, onStatusChange }: ContentsCardProps) {
    const userAgent = navigator.userAgent;
    return (
        <div key={contents.id} className="bg-gray-800 rounded-lg overflow-hidden relative">
            <img src={contents.image} alt={contents.title} className="w-full h-48 object-cover" />
            <div className="p-4">
                <h3 className="font-bold mb-2 text-sm md:text-base line-clamp-1">{contents.title}</h3>
                <div className="flex justify-between text-xs md:text-sm text-gray-400">
                    <span>
                        <span className="bg-gray-700 px-1 rounded">
                            {contents.currentEpisode}/{contents.episodes}
                        </span>
                    </span>
                </div>
                <div className="mt-2 flex justify-between items-center">
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs md:text-sm">
                        {contents.rating || '未評価'}
                    </span>
                    <span className="text-xs md:text-sm">
                        {getAiringStatus(contents) === 'Upcoming'
                            ? '放送予定'
                            : getAiringStatus(contents) === 'Airing'
                                ? '放送中'
                                : '放送終了'}
                    </span>
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
                            <h3 className="font-bold text-lg">{contents.title}</h3>
                            <p className="text-sm"><strong>放送日:</strong> {contents.broadcastDate}</p>
                            <p className="text-sm"><strong>更新日:</strong> {contents.updateDay}</p>
                            <p className="text-sm">
                                <strong>ステータス:</strong> {
                                    {
                                        'Watching': '視聴中',
                                        'On-hold': '保留中',
                                        'Plan to watch': '視聴予定',
                                        'Dropped': '視聴中止',
                                        'Completed': '視聴完了'
                                    }[contents.status]
                                }
                            </p>
                            <p className="text-sm">
                                <strong>シェア:</strong> {
                                    {
                                        '1': '非公開',
                                        '0': '公開',
                                    }[contents.is_private]
                                }
                            </p>
                            <p className="text-sm"><strong>評価:</strong> {contents.rating || '未評価'}</p>
                            <Button className="w-full" asChild>
                                <a href={contents.streamingUrl} target="_blank" rel="noopener noreferrer">
                                    視聴する
                                </a>
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
                        <DropdownMenuItem onSelect={() => onEdit(contents)}>
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
                            <DropdownMenuItem key={value} onSelect={() => onStatusChange(contents.id, value as ContentsStatus)}>
                                <span>{label}</span>
                                {contents.status === value && <span className="ml-2">✓</span>}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onDelete(contents.id)} className="text-red-500">
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
        </div>
    );
}

//
// フィルターメニュー（モバイル版）
//
interface FilterMenuProps {
    activeTab: ContentsStatus | 'All';
    setActiveTab: (value: ContentsStatus | 'All') => void;
    activeRating: ContentsRating | 'All' | null;
    setActiveRating: (value: ContentsRating | 'All' | null) => void;
    sortBy: string;
    onSort: (criteria: string) => void;
}

function FilterMenu({ activeTab, setActiveTab, activeRating, setActiveRating, sortBy, onSort }: FilterMenuProps) {
    return (
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
                            variant={activeTab === value ? "secondary" : "outline"}
                            size="sm"
                            className={activeTab === value ? 'bg-[#a3d3ca] text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}
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
                            variant={(activeRating === rating || (rating === '未評価' && activeRating === null)) ? "secondary" : "outline"}
                            size="sm"
                            className={(activeRating === rating || (rating === '未評価' && activeRating === null))
                                ? 'bg-[#a3d3ca] text-white border-blue-500'
                                : 'bg-gray-800 text-white border-gray-700'}
                            onClick={() => setActiveRating(rating === '未評価' ? null : rating as ContentsRating | 'All')}
                        >
                            {rating === 'All' ? 'すべて' : rating}
                        </Button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="mb-2 text-sm font-medium">並び替え</h3>
                <Select value={sortBy} onValueChange={onSort}>
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
    );
}

//
// ヘッダーコンポーネント（モバイルとデスクトップ）
//
interface HeaderProps {
    activeTab: ContentsStatus | 'All';
    setActiveTab: (value: ContentsStatus | 'All') => void;
    activeRating: ContentsRating | 'All' | null;
    setActiveRating: (value: ContentsRating | 'All' | null) => void;
    sortBy: string;
    onSort: (criteria: string) => void;
    onAdd: () => void;
    onLogout: () => void;
    onOpenFilter: () => void;
}

function Header({
    activeTab, setActiveTab, activeRating, setActiveRating,
    sortBy, onSort, onAdd, onLogout, onOpenFilter
}: HeaderProps) {
    // 共通の設定ボタン
    const renderSettingsButton = () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="bg-gray-800 text-white border-gray-700">
                    <Settings className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
                <div className="grid gap-4">
                    <Button variant="ghost" className="w-full justify-start" onClick={onLogout}>
                        ログアウト
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-500" onClick={() => {
                        // アカウント削除のトリガーは親コンポーネントで管理
                        document.dispatchEvent(new CustomEvent('openDeleteAccountDialog'));
                    }}>
                        アカウント削除
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );

    return (
        <>
            {/* モバイル版 */}
            <div className="flex justify-between items-center mb-4 md:hidden">
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">ウォッチリスト</h1>
                <div className="bg-gray-800 text-white border-gray-700 flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={onOpenFilter} aria-label="フィルターとソートメニューを開く" className="bg-gray-800 text-white border-gray-700">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={onAdd} className="bg-gray-800 text-white border-gray-700">
                        <Plus className="h-4 w-4" />
                    </Button>
                    {renderSettingsButton()}
                </div>
            </div>
            {/* デスクトップ版 */}
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
                    <Select value={sortBy} onValueChange={onSort}>
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
                    <Button variant="outline" size="icon" onClick={onAdd} className="bg-gray-800 text-white border-gray-700">
                        <Plus className="h-4 w-4" />
                    </Button>
                    {renderSettingsButton()}
                </div>
            </div>
            {/* デスクトップ版評価フィルター */}
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
        </>
    );
}

//
// WatchListComponent 本体
//
export function WatchListComponent() {
    const [contentsList, setContentsList] = useState<Contents[]>([]);
    const [activeTab, setActiveTab] = useState<ContentsStatus | 'All'>('All');
    const [activeRating, setActiveRating] = useState<ContentsRating | 'All' | null>('All');
    const [sortBy, setSortBy] = useState('Recently Updated');
    const [contentsToEdit, setContentsToEdit] = useState<Contents | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const router = useRouter();

    //
    // ログアウト処理
    //
    const handleLogout = useCallback(() => {
        setToken(null);
        localStorage.removeItem('token');
        setContentsList([]);
        router.push('/login');
    }, [router]);

    //
    // API クライアントの作成
    //
    const apiClient = useApiClient(token, handleLogout);

    //
    // オンライン状態の監視
    //
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

    //
    // 初期データの読み込みとサービスワーカーの登録
    //
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedActiveTab = (localStorage.getItem('activeTab') as ContentsStatus | 'All') || 'All';
            const storedActiveRating = localStorage.getItem('activeRating') === 'null'
                ? null
                : (localStorage.getItem('activeRating') as ContentsRating | 'All') || 'All';
            const storedSortBy = localStorage.getItem('sortBy') || 'Recently Updated';
            const storedToken = localStorage.getItem('token');

            setActiveTab(storedActiveTab);
            setActiveRating(storedActiveRating);
            setSortBy(storedSortBy);

            if (storedToken) {
                setToken(storedToken);
            } else {
                router.push('/login');
            }

            setIsLoaded(true);

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => console.log('Service Worker registered with scope:', registration.scope))
                    .catch(error => console.error('Service Worker registration failed:', error));
            }
        }
    }, [router]);

    //
    // ローカルストレージへの状態保存
    //
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('activeTab', activeTab);
            localStorage.setItem('activeRating', activeRating === null ? 'null' : activeRating);
            localStorage.setItem('sortBy', sortBy);
        }
    }, [activeTab, activeRating, sortBy, isLoaded]);

    //
    // コンテンツリストの取得
    //
    const fetchContentsList = useCallback(async () => {
        try {
            if (!isOnline) {
                const db = await openDatabase();
                const storedData = await getDataFromIndexedDB(db);
                if (storedData) {
                    setContentsList(sortContentsList(storedData, sortBy));
                    return;
                }
            }

            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const updatedContentsList: Contents[] = response.data.map((contents: Contents) => {
                const universalUrl = convertToUniversalLink(contents.streamingUrl, navigator.userAgent);
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
                    console.warn('コンテンツデータ取得中にエラーが発生しました。');
                }
            } else {
                console.error('予期せぬエラー', error);
            }
        }
    }, [isOnline, sortBy, token, handleLogout]);

    useEffect(() => {
        if (token) {
            fetchContentsList();
        }
    }, [token, fetchContentsList]);

    //
    // コンテンツリストのソート処理
    //
    const sortContentsList = useCallback((list: Contents[], criteria: string): Contents[] => {
        return [...list].sort((a, b) => {
            switch (criteria) {
                case 'Recently Updated':
                    return getLastUpdateDate(b).getTime() - getLastUpdateDate(a).getTime();
                case 'Name A-Z':
                    return a.title.localeCompare(b.title);
                case 'Released Date':
                    return new Date(b.broadcastDate).getTime() - new Date(a.broadcastDate).getTime();
                case 'Rating': {
                    const ratingOrder = ['SS', 'S', 'A', 'B', 'C', null];
                    return ratingOrder.indexOf(a.rating) - ratingOrder.indexOf(b.rating);
                }
                default:
                    return 0;
            }
        });
    }, []);

    //
    // 各種ハンドラ
    //
    const handleSort = (criteria: string) => {
        setSortBy(criteria);
        setContentsList(prev => sortContentsList(prev, criteria));
    };

    const handleAddContents = async (newContents: Omit<Contents, 'id'>) => {
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/contents`, newContents, {
                headers: { Authorization: token }
            });
            setContentsList(prev => sortContentsList([...prev, response.data], sortBy));
        } catch (error) {
            console.error('コンテンツ追加時にエラーが発生しました。', error);
        }
    };

    const handleEditContents = async (editedContents: Contents) => {
        try {
            const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/contents/${editedContents.id}`, editedContents, {
                headers: { Authorization: token }
            });
            setContentsList(prev => sortContentsList(prev.map(item => item.id === editedContents.id ? response.data : item), sortBy));
            setContentsToEdit(null);
        } catch (error) {
            console.error('コンテンツ編集時にエラーが発生しました。', error);
        }
    };

    const handleDeleteContents = async (id: number) => {
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/contents/${id}`, {
                headers: { Authorization: token }
            });
            setContentsList(prev => sortContentsList(prev.filter(item => item.id !== id), sortBy));
        } catch (error) {
            console.error('コンテンツ削除時にエラーが発生しました。', error);
        }
    };

    const handleStatusChange = async (id: number, newStatus: ContentsStatus) => {
        const item = contentsList.find(item => item.id === id);
        if (item) {
            const updated = { ...item, status: newStatus };
            await handleEditContents(updated);
        }
    };

    //
    // フィルタリング（タブ、評価）
    //
    const filteredContentsList = contentsList
        .filter(item => activeTab === 'All' || item.status === activeTab)
        .filter(item => activeRating === 'All' || activeRating === null || item.rating === activeRating);

    //
    // グローバルイベント（アカウント削除ダイアログを開くためのカスタムイベント）
    //
    useEffect(() => {
        const openDeleteAccountDialog = () => setIsDeleteAccountDialogOpen(true);
        document.addEventListener('openDeleteAccountDialog', openDeleteAccountDialog);
        return () => document.removeEventListener('openDeleteAccountDialog', openDeleteAccountDialog);
    }, []);

    if (!isLoaded) return null;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
            {!isOnline && (
                <div className="bg-yellow-500 text-black p-2 text-center mb-4">
                    現在オフラインです。一部の機能が制限されている可能性があります。
                </div>
            )}
            <div className="max-w-6xl mx-auto">
                <Header
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    activeRating={activeRating}
                    setActiveRating={setActiveRating}
                    sortBy={sortBy}
                    onSort={handleSort}
                    onAdd={() => setIsAddDialogOpen(true)}
                    onLogout={handleLogout}
                    onOpenFilter={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                />

                {isFilterMenuOpen && (
                    <FilterMenu
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        activeRating={activeRating}
                        setActiveRating={setActiveRating}
                        sortBy={sortBy}
                        onSort={handleSort}
                    />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {filteredContentsList.map(item => (
                        <ContentsCard
                            key={item.id}
                            contents={item}
                            onEdit={(content) => setContentsToEdit(content)}
                            onDelete={handleDeleteContents}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
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
                        <Button variant="destructive" onClick={async () => {
                            try {
                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/auth`, {
                                    headers: { Authorization: token }
                                });
                                handleLogout();
                            } catch (error) {
                                console.error('アカウント削除時のエラー', error);
                            }
                        }}>
                            削除する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
