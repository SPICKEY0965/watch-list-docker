'use client';

import { useState } from 'react';
import Link from 'next/link';
import { WatchListComponent } from "@/components/WatchListComponent";
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function HomePage() {
    const { token, handleLogout } = useAuth();
    const apiClient = useApiClient(token, handleLogout);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdateAll = async () => {
        setIsUpdating(true);
        try {
            const response = await apiClient.post('/api/batch/update-descriptions');
            toast.success(response.data.message || '全コンテンツの更新処理を開始しました。処理はバックグラウンドで実行されます。');
        } catch (error) {
            console.error('Failed to start batch update:', error);
            toast.error('更新処理の開始に失敗しました。');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-4">
            <WatchListComponent onUpdateAll={handleUpdateAll} isUpdating={isUpdating} />
        </div>
    );
}
