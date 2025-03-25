"use client";
import { useEffect } from 'react';
import { ContentsStatus, ContentsRating } from '@/components/types';

export interface LocalSettings {
    activeTab: ContentsStatus | 'All';
    activeRating: ContentsRating | 'All' | null;
    sortBy: string;
    token: string | null;
}

export function useLocalSettings(
    onSettingsLoaded: (settings: LocalSettings) => void,
    onNotAuthenticated: () => void,
    setIsLoaded: (loaded: boolean) => void
) {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedActiveTab = (localStorage.getItem('activeTab') as ContentsStatus | 'All') || 'All';
            const storedActiveRating =
                localStorage.getItem('activeRating') === 'null'
                    ? null
                    : (localStorage.getItem('activeRating') as ContentsRating | 'All') || 'All';
            const storedSortBy = localStorage.getItem('sortBy') || 'Recently Updated';
            const storedToken = localStorage.getItem('token');

            onSettingsLoaded({
                activeTab: storedActiveTab,
                activeRating: storedActiveRating,
                sortBy: storedSortBy,
                token: storedToken,
            });

            if (!storedToken) {
                onNotAuthenticated();
            }

            setIsLoaded(true);
        }
    }, [onSettingsLoaded, onNotAuthenticated, setIsLoaded]);
}
