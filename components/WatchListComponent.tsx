'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { sortContentsList } from '@/utils/sortContentsList';
import { useAuth } from '@/hooks/useAuth';
import { LocalSettings, useLocalSettings } from '@/hooks/useLocalSettings';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import router from 'next/router';

export function WatchListComponent() {
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
    const { token, setToken, handleLogout } = useAuth();

    // API クライアントの作成
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
    }, []);

    const onNotAuthenticated = useCallback(() => {
        router.push('/login');
    }, [router]);

    useLocalSettings(
        onSettingsLoaded,
        onNotAuthenticated,
        setIsLoaded
    );

    useServiceWorker();

    // ローカルストレージへの状態保存
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('activeTab', activeTab);
            localStorage.setItem('activeRating', activeRating === null ? 'null' : activeRating);
            localStorage.setItem('sortBy', sortBy);
        }
    }, [activeTab, activeRating, sortBy, isLoaded]);

    // コンテンツリストの取得
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

            const response = await apiClient.get('/api/contents');

            const updatedContentsList: Contents[] = response.data.map((contents: Contents) => {
                return {
                    ...contents,
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

    // 各種ハンドラ
    const handleSort = (criteria: string) => {
        setSortBy(criteria);
        setContentsList(prev => sortContentsList(prev, criteria));
    };

    const handleAddContents = async (newContents: Omit<Contents, 'id'>) => {
        try {
            const response = await apiClient.post('/api/contents', newContents);
            setContentsList(prev => sortContentsList([...prev, response.data], sortBy));
            fetchContentsList();
        } catch (error) {
            console.error('コンテンツ追加時にエラーが発生しました。', error);
        }
    };

    const handleEditContents = async (editedContents: Contents) => {
        try {
            const response = await apiClient.put(`/api/contents/${editedContents.id}`, editedContents);
            setContentsList(prev =>
                sortContentsList(
                    prev.map(item => item.id === editedContents.id ? response.data : item),
                    sortBy
                )
            );
            setContentsToEdit(null);
            fetchContentsList();
        } catch (error) {
            console.error('コンテンツ編集時にエラーが発生しました。', error);
        }
    };

    const handleDeleteContents = async (id: number) => {
        try {
            await apiClient.delete(`/api/contents/${id}`);
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

    // フィルタリング（タブ、評価）
    let filteredContentsList = contentsList;
    if (activeTab !== 'All' || activeRating !== 'All') {
        filteredContentsList = contentsList.filter(item =>
            (activeTab === 'All' || item.status === activeTab) &&
            (activeRating === 'All' || item.rating === activeRating)
        );
    }

    // グローバルイベント（アカウント削除ダイアログを開くためのカスタムイベント）
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
