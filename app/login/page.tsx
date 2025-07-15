"use client";

import { LoginComponent } from "@/components/LoginComponent";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
    const { token, setToken: handleLogin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // useAuthフックがlocalStorageからトークンを読み込むので、
        // トークンが存在すればリダイレクトする
        if (token) {
            router.push('/home');
        }
    }, [token, router]);

    // トークンがある場合は、リダイレクトが完了するまで何も表示しない
    if (token) {
        return null;
    }

    return <LoginComponent onLogin={handleLogin} />;
}
