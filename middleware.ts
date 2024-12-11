import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    // Skip if it's an API request (handled by app/api/middleware.ts)
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Create base response
    const response = NextResponse.next();

    // Add CORS headers for non-API routes
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    };

    // Apply headers
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * 1. /api/ (API routes - handled by app/api/middleware.ts)
         * 2. /_next/ (Next.js internals)
         * 3. /_static (inside /public)
         * 4. /_vercel (Vercel internals)
         * 5. all root files inside /public (e.g. /favicon.ico)
         */
        '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
    ],
};
