import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key');
    
    console.log('Bull Board middleware:', {
        apiKey,
        path: request.nextUrl.pathname,
        method: request.method
    });

    // API key kontrolü
    if (apiKey !== '123') {
        console.log('Invalid API key:', apiKey);
        return NextResponse.json(
            { error: 'Invalid API key' },
            { status: 401 }
        );
    }

    // İsteği devam ettir
    return NextResponse.next();
}

export const config = {
    matcher: '/api/bull-board/:path*',
}
