import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { addRateLimitJob } from '@/lib/queue';

// Her istek için rate limit kaydı ekle
async function recordUsage(key: string) {
  const now = Date.now();
  const job = await addRateLimitJob({
    key,
    timestamp: now,
    action: 'record'
  });
  await redis.zadd(key, now, now.toString());
  return job;
}

export async function GET() {
  try {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;
    const dayInMs = 24 * hourInMs;

    // Test için kullanım ekleyelim ve işleri kuyruğa alalım
    const jobs = await Promise.all([
      recordUsage('ratelimit:query'),
      recordUsage('ratelimit:analytics'),
      recordUsage('ratelimit:api')
    ]);

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

    // Her limit için kullanım sayısını al ve kuyruğa ekle
    const limitsWithUsage = await Promise.all(
      limits.map(async (limit) => {
        // Belirtilen süre penceresindeki kullanımları say
        const usage = await redis.zcount(
          limit.key,
          now - limit.windowMs,
          now
        );

        // Kullanım bilgisini kuyruğa ekle
        const job = await addRateLimitJob({
          key: limit.key,
          usage,
          limit: limit.limit,
          window: limit.window,
          timestamp: now,
          action: 'check'
        });

        return {
          ...limit,
          currentUsage: usage,
          remaining: Math.max(0, limit.limit - usage),
          jobId: job.id
        };
      })
    );

    return NextResponse.json({
      limits: limitsWithUsage,
      jobs: jobs.map(job => job.id)
    });
  } catch (error: any) {
    console.error('Error in rate limits endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
