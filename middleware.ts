import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import appSettings from './appSettings.json'
import { jwtVerify, SignJWT, decodeJwt } from 'jose';

export const config = {
    matcher: ['/api/:path*', '/((?!api|_next/static|_next/image|favicon.ico).*)']
};
const textEncoder = new TextEncoder();
const ACCESS_TOKEN_SECRET = textEncoder.encode(process.env.ACCESS_TOKEN_SECRET);
const REFRESH_TOKEN_SECRET = textEncoder.encode(process.env.REFRESH_TOKEN_SECRET);
const NEXT_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost';
const TOKEN_AUDIENCE = process.env.TOKEN_AUDIENCE || 'robotpos_realtime_api';

async function verifyToken(token: string, secret: Uint8Array, options?: any): Promise<boolean> {
    try {
        await jwtVerify(token, secret, options);
        return true;
    } catch {
        return false;
    }
}

async function createNewAccessToken(): Promise<string> {
    const date = Date.now();
    return await new SignJWT()
        .setIssuedAt(Math.floor(date / 1000))
        .setIssuer(NEXT_PUBLIC_DOMAIN)
        .setAudience(TOKEN_AUDIENCE)
        .sign(ACCESS_TOKEN_SECRET);
}


export async function middleware(request: NextRequest) {
    // API routes middleware
    if (request.nextUrl.pathname.startsWith('/api')) {
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, { 
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // Database API rotaları için özel middleware (/api/[databaseId]/...)
        const databasePathRegex = /^\/api\/\d+\//;
        if (!databasePathRegex.test(request.nextUrl.pathname)) {
            return NextResponse.next();
        }

        // Get databaseId from URL
        const databaseId = request.nextUrl.pathname.split('/')[2];
        
        // Check if databaseId exists
        if (!databaseId) {
            return new NextResponse(
                JSON.stringify({ error: 'Database ID is required' }), 
                { 
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Check authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new NextResponse(
                JSON.stringify({ error: 'Bearer token is required' }), 
                { 
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        const apiKey = authHeader.replace('Bearer', '').trim();
        const tenantConnection = appSettings.connections.find(
            connection => connection.databaseId === parseInt(databaseId) && connection.apiKey === apiKey
        );

        if (!tenantConnection) {
            return new NextResponse(
                JSON.stringify({ error: 'Not Authorized for this database' }), 
                { 
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Clone the request headers and add CORS headers
        const response = NextResponse.next();
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        return response;
    }
    
    else {
        const accessToken = request.cookies.get(`robotpos_realtime_api_access_token`)?.value;
        const refreshToken = request.cookies.get(`robotpos_realtime_api_refresh_token`)?.value;
        const isLoginRoute = request.nextUrl.pathname.includes("login");
        const baseTokenOptions = {
            audience: TOKEN_AUDIENCE,
            issuer: NEXT_PUBLIC_DOMAIN,
        };

        if (!accessToken || !refreshToken) {
        
            if (isLoginRoute) {
                return NextResponse.next();
            }
            const response = NextResponse.redirect(new URL(`/login`, request.url));
            response.cookies.set(`robotpos_realtime_api_access_token`, '', { maxAge: 0 });
            response.cookies.set(`robotpos_realtime_api_refresh_token`, '', { maxAge: 0 });
            return response;
        }

        

        const isValidRefresh = await verifyToken(refreshToken, REFRESH_TOKEN_SECRET, {...baseTokenOptions});
        console.log('Middleware:', {
            accessToken,
            refreshToken,
            isLoginRoute,
            isValidRefresh
        });
        if (!isValidRefresh) {
            const response = NextResponse.redirect(new URL(`/login`, request.url));
            response.cookies.set(`robotpos_realtime_api_access_token`, '', { maxAge: 0 });
            response.cookies.set(`robotpos_realtime_api_refresh_token`, '', { maxAge: 0 });
            return response;
        }


        const isValidAccess = await verifyToken(accessToken, ACCESS_TOKEN_SECRET);
    
        if (!isValidAccess) {
            const decodedToken = decodeJwt(refreshToken);
            if (!decodedToken) {
                return NextResponse.redirect(new URL(`/login`, request.url));
            }
            const newAccessToken = await createNewAccessToken();
            const response = NextResponse.next();
            
            response.cookies.set(`robotpos_realtime_api_access_token`, newAccessToken, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
            });
    
            return response;
        }

        if (isLoginRoute) {
            return NextResponse.redirect(new URL(`/`, request.url));
        }

        return NextResponse.next();
    }
}