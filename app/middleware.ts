import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // ルート (/) にアクセスされた場合、/login にリダイレクト
    if (request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// middleware の適用範囲を指定（すべてのリクエストに適用）
export const config = {
    matcher: '/',
};
