'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddEditContentsDialog } from '@/components/AddEditContentsDialog';
import Header from '@/components/layout/header';
import FilterMenu from '@/components/layout/filtermenu';
import ContentsCard from '@/components/ContentsCard';
import { Contents, ContentsRating, ContentsStatus } from '@/components/types';
import { calculateCurrentEpisode } from '@/components/utils';
import { openDatabase, storeDataInIndexedDB, getDataFromIndexedDB } from '@/utils/indexedDB';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/hooks/useAuth';
import { LocalSettings, useLocalSettings } from '@/hooks/useLocalSettings';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import { useRouter } from 'next/navigation';

const sortMappings: Record<string, { sortBy: string; sortOrder: string }> = {
    'Recently Updated': { sortBy: 'RECENTLY_UPDATED', sortOrder: 'DESC' },
    'Name A-Z': { sortBy: 'TITLE', sortOrder: 'ASC' },
    'Released Date': { sortBy: 'BROADCAST', sortOrder: 'DESC' },
    'Rating': { sortBy: 'RATING', sortOrder: 'ASC' }
};

interface WatchListComponentProps {
    onUpdateAll?: () => void;
    isUpdating?: boolean;
}

export function WatchListComponent({ onUpdateAll, isUpdating }: WatchListComponentProps) {
    const [contentsList, setContentsList] = useState<Contents[]>([]);
    const [activeTab, setActiveTab] = useState<ContentsStatus | 'All'>('All');
    const [activeRating, setActiveRating] = useState<ContentsRating | 'All' | null>('All');
    const [sortBy, setSortBy] = useState('Recently Updated');
    const [contentsToEdit, setContentsToEdit] = useState<Contents | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [totalLoaded, setTotalLoaded] = useState(0);
    const observerTarget = useRef<HTMLDivElement>(null);
    const pageSize = 20;

    const { token, setToken, handleLogout } = useAuth();
    const router = useRouter();

    // APIクライアントの作成
    const apiClient = useApiClient(token, handleLogout);

    // オンライン状態の監視
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

    const onSettingsLoaded = useCallback((settings: LocalSettings) => {
        setActiveTab(settings.activeTab || 'All');
        setActiveRating(settings.activeRating || 'All');
        setSortBy(settings.sortBy || 'Recently Updated');
        if (settings.token) {
            setToken(settings.token);
        }
    }, [setToken]);

    const onNotAuthenticated = useCallback(() => {
        router.push('/login');
    }, [router]);

    useLocalSettings(onSettingsLoaded, onNotAuthenticated, setIsLoaded);
    useServiceWorker();

    // ローカルストレージへの状態保存
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('activeTab', activeTab);
            localStorage.setItem('activeRating', activeRating === null ? 'null' : activeRating);
            localStorage.setItem('sortBy', sortBy);
        }
    }, [activeTab, activeRating, sortBy, isLoaded]);

    // Intersection Observerによる無限スクロールの監視
    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !isLoading && isOnline) {
                setPage(prevPage => prevPage + 1);
            }
        }, options);

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, isLoading, isOnline]);

    useEffect(() => {
        if (isLoaded) {
            setContentsList([]);
            setPage(0);
            setTotalLoaded(0);
            setHasMore(true);
        }
    }, [sortBy, activeTab, activeRating, isLoaded]);

    useEffect(() => {
        if (page === 0) {
            setPage(1);
        }
    }, [page]);

    // ページが変更されたらデータを取得
    useEffect(() => {
        if (token && page > 0 && isOnline) {
            fetchContentsList();
        }
    }, [page, token, isOnline]);

    // 初回ロード時にデータ取得
    useEffect(() => {
        if (token && isLoaded && contentsList.length === 0) {
            setPage(1);
        }
    }, [token, isLoaded, contentsList.length]);

    // コンテンツリストの取得（APIバックエンド側のソート・フィルター結果をそのまま使用）
    const fetchContentsList = useCallback(async () => {
        if (isLoading || !token) return;
        try {
            setIsLoading(true);
            if (!isOnline) {
                const db = await openDatabase();
                const storedData = await getDataFromIndexedDB(db);
                if (storedData) {
                    setContentsList(storedData);
                    setHasMore(false);
                }
                setIsLoading(false);
                return;
            }
            const offset = (page - 1) * pageSize;
            const sort = sortMappings[sortBy] || sortMappings['Recently Updated'];
            const params: any = {
                limit: pageSize,
                offset,
                sortBy: sort.sortBy,
                sortOrder: sort.sortOrder
            };
            if (activeTab !== 'All') {
                params.status = activeTab;
            }
            if (activeRating !== 'All' && activeRating !== null) {
                params.rating = activeRating;
            }
            const response = await apiClient.get('/api/watchlists', { params });
            const newItems: Contents[] = response.data.map((contents: Contents) => ({
                ...contents,
                currentEpisode: calculateCurrentEpisode(contents)
            }));
            if (page === 1) {
                setContentsList(newItems);
            } else {
                setContentsList(prev => {
                    const existingIds = new Set(prev.map(item => item.content_id));
                    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.content_id));
                    return [...prev, ...uniqueNewItems];
                });
            }
            setHasMore(newItems.length === pageSize);
            setTotalLoaded(prev => prev + newItems.length);
            if (page === 1) {
                const db = await openDatabase();
                await storeDataInIndexedDB(db, newItems);
            }
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
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, token, isOnline, page, pageSize, sortBy, activeTab, activeRating, apiClient, handleLogout]);

    // 各種ハンドラ
    const handleSort = (criteria: string) => {
        setSortBy(criteria);
    };

    const handleAddContents = async (newContents: Omit<Contents, "content_id">) => {
        try {
            const response = await apiClient.post('/api/watchlists', newContents);
            // API追加後は再度最初のページを取得（またはレスポンスの内容をそのまま先頭に追加）
            setContentsList(prev => [response.data, ...prev]);
            // IndexedDB更新
            const db = await openDatabase();
            const storedData = await getDataFromIndexedDB(db);
            if (storedData) {
                await storeDataInIndexedDB(db, [response.data, ...storedData]);
            }
        } catch (error) {
            console.error('コンテンツ追加時にエラーが発生しました。', error);
        }
    };

    const handleEditContents = async (editedContents: Contents) => {
        try {
            await apiClient.put(`/api/watchlists/${editedContents.content_id}`, editedContents);
            setContentsList(prev =>
                prev.map(item =>
                    item.content_id === editedContents.content_id ? editedContents : item
                )
            );
            setContentsToEdit(null);
            // IndexedDB更新
            const db = await openDatabase();
            const storedData = await getDataFromIndexedDB(db);
            if (storedData) {
                const updatedData = storedData.map(item =>
                    item.content_id === editedContents.content_id ? editedContents : item
                );
                await storeDataInIndexedDB(db, updatedData);
            }
        } catch (error) {
            console.error('コンテンツ編集時にエラーが発生しました。', error);
        }
    };

    const handleDeleteContents = async (id: number) => {
        try {
            await apiClient.delete(`/api/watchlists/${id}`);
            setContentsList(prev => prev.filter(item => item.content_id !== id));
            // IndexedDB更新
            const db = await openDatabase();
            const storedData = await getDataFromIndexedDB(db);
            if (storedData) {
                const updatedData = storedData.filter(item => item.content_id !== id);
                await storeDataInIndexedDB(db, updatedData);
            }
        } catch (error) {
            console.error('コンテンツ削除時にエラーが発生しました。', error);
        }
    };

    const handleStatusChange = async (id: number, newStatus: ContentsStatus) => {
        const item = contentsList.find(item => item.content_id === id);
        if (item) {
            const updated = { ...item, status: newStatus };
            await handleEditContents(updated);
        }
    };

    // APIでフィルター済みのデータをそのまま表示
    const displayedContentsList = contentsList;

    // グローバルイベント：アカウント削除ダイアログを開くためのカスタムイベント
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
                    onUpdateAll={onUpdateAll}
                    isUpdating={isUpdating}
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
                    {displayedContentsList.map(item => (
                        <ContentsCard
                            key={item.content_id}
                            contents={item}
                            onEdit={(content) => setContentsToEdit(content)}
                            onDelete={handleDeleteContents}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>

                {/* 無限スクロール用のローディングインジケータ */}
                {hasMore && (
                    <div ref={observerTarget} className="flex justify-center items-center py-4 mt-4">
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        ) : (
                            <div className="h-8 w-8"></div>
                        )}
                    </div>
                )}

                {!hasMore && contentsList.length > 0 && (
                    <p className="text-center text-gray-400 mt-4 mb-8">すべてのコンテンツを表示しました</p>
                )}

                {contentsList.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center mt-12 mb-8">
                        <p className="text-xl text-gray-400 mb-4">コンテンツがありません</p>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            コンテンツを追加する
                        </Button>
                    </div>
                )}
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
                                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
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
