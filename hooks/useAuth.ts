"use client";
import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

interface User {
  id: number;
  iat: number;
  exp: number;
}

export function useAuth() {
    const [token, setToken] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    });
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUser(payload);
                localStorage.setItem('token', token);
            } catch (error) {
                console.error("Failed to decode token:", error);
                setUser(null);
                localStorage.removeItem('token');
            }
        } else {
            setUser(null);
            localStorage.removeItem('token');
        }
    }, [token]);

    const handleLogout = useCallback(() => {
        setToken(null);
    }, []);

    const handleLogin = useCallback((newToken: string) => {
        setToken(newToken);
        router.push('/home');
    }, [router]);

    return { token, user, setToken: handleLogin, handleLogout };
}
