import { serialize } from 'cookie';
import { SignJWT } from 'jose';
import { getAppSettings } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET);
const TOKEN_AUDIENCE = process.env.TOKEN_AUDIENCE || 'robotpos_realtime_api';
const NEXT_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost';
const ACCESS_TOKEN_ALGORITHM = process.env.ACCESS_TOKEN_ALGORITHM || 'HS512';
const REFRESH_TOKEN_ALGORITHM = process.env.REFRESH_TOKEN_ALGORITHM || 'HS512';
const ACCESS_TOKEN_LIFETIME = 60 * 60; // 1 hour
const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60; // 7 days
const NODE_ENV = process.env.NODE_ENV;

export async function POST(
    req: NextRequest
) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const appSettings = getAppSettings();


        const admin = appSettings.admins.find((admin) =>
            admin.username === username && admin.password === password
        );

        if (!admin) {
            return NextResponse.json(
                { message: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const tokenPayload = {
            username: admin.username,
            aud: TOKEN_AUDIENCE
        };

        const currentTimestamp = Math.floor(Date.now() / 1000);

        const accessToken = await new SignJWT(tokenPayload)
            .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM })
            //.setExpirationTime(currentTimestamp + ACCESS_TOKEN_LIFETIME)
            .setIssuer(NEXT_PUBLIC_DOMAIN)
            .setIssuedAt(currentTimestamp)
            .sign(ACCESS_TOKEN_SECRET);


        const refreshToken = await new SignJWT(tokenPayload)
            .setProtectedHeader({ alg: REFRESH_TOKEN_ALGORITHM })
            //.setExpirationTime(currentTimestamp + REFRESH_TOKEN_LIFETIME)
            .setIssuer(NEXT_PUBLIC_DOMAIN)
            .setIssuedAt(currentTimestamp)
            .sign(REFRESH_TOKEN_SECRET);

        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        
        // Set access token cookie
        headers.append('Set-Cookie', serialize('robotpos_realtime_api_access_token', accessToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: ACCESS_TOKEN_LIFETIME
        }));
        
        // Set refresh token cookie
        headers.append('Set-Cookie', serialize('robotpos_realtime_api_refresh_token', refreshToken, {
            httpOnly: true,
            secure: NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: REFRESH_TOKEN_LIFETIME
        }));

        return new Response(
            JSON.stringify({ message: 'Login successful' }),
            { 
                status: 200, 
                headers 
            }
        );
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
        );
    }
}
