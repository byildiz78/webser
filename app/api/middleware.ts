import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { redis } from '@/x/redis';

async function recordRateLimit(key: string, now: number): Promise<{
    allowed: boolean;
    remaining: number;
    reset: number;
    limit: number;
    windowMs: number;
}> {
    try {
        // Yeni kullanım kaydı ekle
        await redis.zadd(key, now, now.toString());
        
        // Endpoint'e göre limit ve pencere belirle
        let limit = 100;
        let windowMs = 60 * 60 * 1000; // 1 saat
        
        if (key === 'ratelimit:query') {
            limit = 50;
        } else if (key === 'ratelimit:analytics') {
            limit = 1000;
            windowMs = 24 * 60 * 60 * 1000; // 1 gün
        }

        // Zaman penceresi içindeki kullanımı say
        const windowStart = now - windowMs;
        const usage = await redis.zcount(key, windowStart, now);

        // Eski kayıtları temizle
        await redis.zremrangebyscore(key, 0, windowStart);

        return {
            allowed: usage <= limit,
            remaining: Math.max(0, limit - usage),
            reset: now + (windowMs - (now % windowMs)),
            limit,
            windowMs
        };
    } catch (error) {
        console.error('Error recording rate limit:', error);
        // Hata durumunda varsayılan değerler
        return {
            allowed: true,
            remaining: 100,
            reset: now + 3600000,
            limit: 100,
            windowMs: 3600000
        };
    }
}

export async function middleware(request: NextRequest) {
    // OPTIONS request için erken dönüş
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
                'Access-Control-Max-Age': '86400'
            }
        });
    }

    // Normal istekler için response oluştur
    const response = NextResponse.next();

    // CORS headers ekle
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key'
    };

    // Apply headers
    Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    try {
        // Redis bağlantısını kontrol et
        const isConnected = await redis.ping() === 'PONG';
        if (!isConnected) {
            console.warn('Redis connection is not available, skipping rate limit check');
            return response;
        }

        const path = request.nextUrl.pathname;
        const now = Date.now();

        // Endpoint'e göre rate limit key'i belirle
        let rateLimitKey = 'ratelimit:api';
        if (path.startsWith('/api/query')) {
            rateLimitKey = 'ratelimit:query';
        } else if (path.startsWith('/api/analytics')) {
            rateLimitKey = 'ratelimit:analytics';
        }

        // Rate limit kontrolü ve kaydı
        const rateLimit = await recordRateLimit(rateLimitKey, now);

        // Rate limit headers ekle
        response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimit.reset.toString());

        // Limit aşıldıysa 429 döndür
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    status: 'error',
                    error: 'Rate limit exceeded',
                    limit: rateLimit.limit,
                    remaining: rateLimit.remaining,
                    reset: new Date(rateLimit.reset).toISOString()
                },
                {
                    status: 429,
                    headers: {
                        ...headers,
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimit.reset.toString(),
                        'Retry-After': Math.ceil((rateLimit.reset - now) / 1000).toString()
                    }
                }
            );
        }
    } catch (error) {
        // Rate limit hatalarını log'la ama isteği engelleme
        console.error('Error in rate limit middleware:', error);
    }

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
