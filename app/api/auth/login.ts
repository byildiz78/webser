import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import { SignJWT } from 'jose';
import { getAppSettings } from '@/lib/settings';

const ACCESS_TOKEN_SECRET = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
const REFRESH_TOKEN_SECRET = new TextEncoder().encode(process.env.REFRESH_TOKEN_SECRET);
const NEXT_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'http://localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';
const ACCESS_TOKEN_LIFETIME = parseInt(process.env.ACCESS_TOKEN_LIFETIME || '900');
const REFRESH_TOKEN_LIFETIME = parseInt(process.env.REFRESH_TOKEN_LIFETIME || '129600');
const ACCESS_TOKEN_ALGORITHM = process.env.ACCESS_TOKEN_ALGORITHM || 'HS512';
const REFRESH_TOKEN_ALGORITHM = process.env.REFRESH_TOKEN_ALGORITHM || 'HS512';

// Extract hostname from NEXT_PUBLIC_DOMAIN for cookie domain
const getDomainForCookie = () => {
    try {
        const url = new URL(NEXT_PUBLIC_DOMAIN);
        return url.hostname;
    } catch {
        return 'localhost';
    }
};


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { username, password } = req.body;
        const appSettings = getAppSettings();

        const admin = appSettings.admins.find((admin) => {
            if (admin.username === username && admin.password === password) {
                return admin;
            }
        });
        if (admin) {
            let tokenPayload = {
                username: admin.username,
                apiKey: admin.apiKey,
                aud: "robotpos_realtime_api"
            };

            const currentTimestamp = Math.floor(Date.now() / 1000);
            //const cookieDomain = NODE_ENV === 'production' ? getDomainForCookie() : undefined;

            const accessToken = await new SignJWT(tokenPayload)
                .setProtectedHeader({ alg: ACCESS_TOKEN_ALGORITHM })
                //.setExpirationTime(currentTimestamp + ACCESS_TOKEN_LIFETIME)
                .setIssuer(NEXT_PUBLIC_DOMAIN)
                .setAudience("robotpos_realtime_api")
                .setIssuedAt(currentTimestamp)
                .sign(ACCESS_TOKEN_SECRET);
            const accessTokenCookie = serialize(`robotpos_realtime_api_access_token`, accessToken, {
                httpOnly: true,
                //secure: NODE_ENV === 'production',
                //sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                //...(cookieDomain ? { domain: cookieDomain } : {})
            });

            const refreshToken = await new SignJWT(tokenPayload)
                .setProtectedHeader({ alg: REFRESH_TOKEN_ALGORITHM })
                //.setExpirationTime(currentTimestamp + REFRESH_TOKEN_LIFETIME)
                .setIssuer(NEXT_PUBLIC_DOMAIN)
                .setAudience("robotpos_realtime_api")
                .setIssuedAt(currentTimestamp)
                .sign(REFRESH_TOKEN_SECRET);
            const refreshTokenCookie = serialize(`robotpos_realtime_api_refresh_token`, refreshToken, {
                httpOnly: true,
                //secure: NODE_ENV === 'production',
                //sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
                path: '/',
                //...(cookieDomain ? { domain: cookieDomain } : {})
            });

            res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);
            return res.status(200).json({ 
                message: 'Login successful' 
            });
        }

        return res.status(401).json({ message: 'Invalid credentials' });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}