'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddEditContentsDialog } from '@/components/AddEditContentsDialog';
import { convertToUniversalLink } from '@/components/convert_universalURL';
import { Contents, ContentsRating, ContentsStatus } from '@/components/types';
import { calculateCurrentEpisode, getLastUpdateDate } from '@/components/utils';
import Header from '@/components/layout/header';
import FilterMenu from '@/components/layout/filtermenu';
import ContentsCard from '@/components/ContentsCard';

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

            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/contents`, {
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
        // コピーを作成
        const listCopy = [...list];

        // 基準ごとの比較関数（comparator）を生成する
        let comparator: (a: Contents, b: Contents) => number;

        if (criteria === 'Recently Updated') {
            comparator = (a, b) => {
                // getLastUpdateDate は必要な計算をカプセル化していると仮定
                const aTime = getLastUpdateDate(a).getTime();
                const bTime = getLastUpdateDate(b).getTime();
                return bTime - aTime;
            };
        } else if (criteria === 'Name A-Z') {
            comparator = (a, b) => a.title.localeCompare(b.title);
        } else if (criteria === 'Released Date') {
            comparator = (a, b) => Date.parse(b.broadcastDate) - Date.parse(a.broadcastDate);
        } else if (criteria === 'Rating') {
            // ルックアップ用のオブジェクトを事前に定義
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
            fetchContentsList();
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
            fetchContentsList();
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
    let filteredContentsList = contentsList;
    if (activeTab !== 'All' || activeRating !== 'All') {
        filteredContentsList = contentsList.filter(item =>
            (activeTab === 'All' || item.status === activeTab) &&
            (activeRating === 'All' || item.rating === activeRating)
        );
    }

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
