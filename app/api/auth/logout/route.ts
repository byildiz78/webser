import { NextRequest } from 'next/server';
import { serialize } from 'cookie';

export async function GET(
    req: NextRequest
) {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    // Clear access token cookie
    headers.append('Set-Cookie', serialize('robotpos_realtime_api_access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0
    }));

    // Clear refresh token cookie
    headers.append('Set-Cookie', serialize('robotpos_realtime_api_refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0
    }));

    return new Response(
        JSON.stringify({ message: 'Logout successful' }),
        { 
            status: 200, 
            headers 
        }
    );
}