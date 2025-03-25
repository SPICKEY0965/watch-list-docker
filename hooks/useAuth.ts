"use client";
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export function useAuth() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();

    const handleLogout = useCallback(() => {
        setToken(null);
        localStorage.removeItem('token');
        router.push('/login');
    }, [router]);

    return { token, setToken, handleLogout };
}
