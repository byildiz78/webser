import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// Her istek için rate limit kaydı ekle
async function recordUsage(key: string) {
  const now = Date.now();
  await redis.zadd(key, now, now.toString());
}

export async function GET() {
  try {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const dayInMs = 24 * hourInMs;

    // Test için kullanım ekleyelim
    await recordUsage('ratelimit:query');
    await recordUsage('ratelimit:analytics');
    await recordUsage('ratelimit:api');

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
        const usage = await redis.zcount(limit.key, now - limit.windowMs, now);
        return {
          ...limit,
          used: usage,
          remaining: Math.max(0, limit.limit - usage)
        };
      })
    );

    return NextResponse.json({
      defaultLimit: 100,
      defaultWindow: '1 saat',
      limits: limitsWithUsage
    });
  } catch (error) {
    console.error('Rate limit error:', error);
    return NextResponse.json({ error: 'Rate limit bilgileri alınamadı' }, { status: 500 });
  }
}
