'use client';

import { useState, useEffect, useRef } from 'react';
import { WatchListComponent } from "@/components/WatchListComponent";
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function HomePage() {
    const { token, handleLogout } = useAuth();
    const apiClient = useApiClient(token, handleLogout);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const toastId = useRef<string | number | null>(null);

    const handleUpdateAll = async () => {
        if (isUpdating) return;
        setIsUpdating(true);

        toastId.current = toast.loading('バッチ処理を開始しています...');

        try {
            await apiClient.post('/api/batch/update-descriptions');
            setIsPolling(true);
        } catch (error: any) {
            console.error('Failed to start batch update:', error);
            if (toastId.current) {
                toast.error(error.response?.data?.message || '更新処理の開始に失敗しました。', { id: toastId.current });
            }
            setIsUpdating(false);
        }
    };

    useEffect(() => {
        if (!isPolling) return;

        const interval = setInterval(async () => {
            try {
                const { data: status } = await apiClient.get('/api/batch/status');

                if (toastId.current) {
                    if (status.status === 'running') {
                        const progress = status.total > 0 ? Math.round((status.progress / status.total) * 100) : 0;
                        toast.loading(
                            `処理中... (${status.progress}/${status.total}) ${progress}%`,
                            { id: toastId.current }
                        );
                    } else if (status.status === 'completed') {
                        toast.success(status.message || 'バッチ処理が完了しました。', { id: toastId.current });
                        setIsPolling(false);
                        setIsUpdating(false);
                    } else if (status.status === 'failed') {
                        toast.error(status.message || 'バッチ処理中にエラーが発生しました。', { id: toastId.current });
                        setIsPolling(false);
                        setIsUpdating(false);
                    } else if (status.status === 'idle') {
                        // The job might have finished between polls
                        toast.dismiss(toastId.current);
                        setIsPolling(false);
                        setIsUpdating(false);
                    }
                }
            } catch (error) {
                console.error('Failed to get batch status:', error);
                if (toastId.current) {
                    toast.error('進行状況の取得に失敗しました。', { id: toastId.current });
                }
                setIsPolling(false);
                setIsUpdating(false);
            }
        }, 2000); // 2秒ごとにポーリング

        return () => clearInterval(interval);
    }, [isPolling, apiClient]);

    return (
        <div className="space-y-4">
            <WatchListComponent onUpdateAll={handleUpdateAll} isUpdating={isUpdating} />
        </div>
    );
}
