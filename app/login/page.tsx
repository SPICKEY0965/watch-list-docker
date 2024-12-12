"use client";

import { LoginComponent } from "@/components/LoginComponent";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';  // useRouterをインポート

export default function Page() {
    const [token, setToken] = useState<string | null>(null);
    const router = useRouter();  // useRouterフックを使用

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            router.push('/home');
        }
    }, []);

    const handleLogin = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
        router.push('/home');  // ログイン成功時にhomeページへ移動
    };

    return <LoginComponent onLogin={handleLogin} />;
}
