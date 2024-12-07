import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyApiKey } from '@/lib/auth';

export async function middleware(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];

    // API key kontrolü
    const keyVerification = await verifyApiKey(apiKey);
    if (!keyVerification.isValid) {
        return NextResponse.json(
            { error: keyVerification.error || 'Invalid API key' },
            { status: 401 }
        );
    }

    // İsteği devam ettir
    return NextResponse.next();
}

export const config = {
    matcher: '/api/bull-board/:path*',
}
