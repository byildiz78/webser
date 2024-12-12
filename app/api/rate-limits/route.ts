import { NextResponse } from 'next/server';
import { redis } from '@/x/redis';

async function getRateLimitUsage(key: string, windowMs: number) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    try {
        // Zaman penceresi içindeki kullanımı say
        const usage = await redis.zcount(key, windowStart, now);

        // Eski kayıtları temizle
        await redis.zremrangebyscore(key, 0, windowStart);

        return usage;
    } catch (error) {
        console.error(`Error getting rate limit usage for ${key}:`, error);
        return 0;
    }
}

export async function GET() {
    try {
        // Redis bağlantısını kontrol et
        try {
            const pong = await redis.ping();
            if (pong !== 'PONG') {
                throw new Error('Redis connection failed');
            }
        } catch (error) {
            console.error('Redis connection error:', error);
            return NextResponse.json({
                status: 'error',
                error: 'Redis connection is not available',
                timestamp: new Date().toISOString()
            }, { status: 503 });
        }

        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        const dayInMs = 24 * hourInMs;

        // Rate limit ayarları
        const limits = [
            { 
                path: '/api/query', 
                limit: 50, 
                window: '1 saat',
                windowMs: hourInMs,
                description: 'SQL Sorguları',
                key: 'ratelimit:query'
            },
            { 
                path: '/api/analytics', 
                limit: 1000, 
                window: '1 gün',
                windowMs: dayInMs,
                description: 'Analiz İstekleri',
                key: 'ratelimit:analytics'
            },
            { 
                path: '/api/*', 
                limit: 100, 
                window: '1 saat',
                windowMs: hourInMs,
                description: 'Genel API İstekleri',
                key: 'ratelimit:api'
            }
        ];

        // Her limit için kullanım sayısını al
        const limitsWithUsage = await Promise.all(
            limits.map(async (limit) => {
                try {
                    const usage = await getRateLimitUsage(limit.key, limit.windowMs);
                    
                    return {
                        path: limit.path,
                        limit: limit.limit,
                        window: limit.window,
                        description: limit.description,
                        used: usage,
                        remaining: Math.max(0, limit.limit - usage)
                    };
                } catch (error) {
                    console.error(`Error processing limit for ${limit.key}:`, error);
                    return {
                        path: limit.path,
                        limit: limit.limit,
                        window: limit.window,
                        description: limit.description,
                        used: 0,
                        remaining: limit.limit,
                        error: 'Failed to get usage data'
                    };
                }
            })
        );

        return NextResponse.json({
            status: 'success',
            redis: { connected: true },
            limits: limitsWithUsage,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Error in rate limits endpoint:', error);
        return NextResponse.json(
            {
                status: 'error',
                error: error.message || 'Internal server error',
                redis: { 
                    connected: false,
                    error: error.message 
                },
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
