import Redis from 'ioredis';
import crypto from 'crypto';

// Cache ayarları
const CACHE_TTL = 60 * 60; // 1 saat
const MAX_CACHE_SIZE = 1000; // maksimum cache kayıt sayısı

// Redis bağlantısı
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Bağlantı durumunu izle
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis server');
});

// Cache key oluşturma fonksiyonu
export function createCacheKey(query: string, params?: Record<string, any>): string {
  const data = JSON.stringify({
    query,
    params: params || {}
  });
  
  return `cache:queries:${crypto.createHash('sha256').update(data).digest('hex')}`;
}

// Cache'den veri alma
export async function getCachedQueryResult<T>(query: string, params?: Record<string, any>): Promise<T | null> {
  const cacheKey = createCacheKey(query, params);
  
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Cache metadata kontrolü
      const metadata = await redis.get(`${cacheKey}:metadata`);
      if (metadata) {
        const { timestamp, ttl } = JSON.parse(metadata);
        if (Date.now() - timestamp < ttl * 1000) {
          console.log('Cache hit:', cacheKey);
          return JSON.parse(cachedData);
        }
      }
      // TTL süresi dolmuş, cache'i temizle
      await redis.del(cacheKey);
      await redis.del(`${cacheKey}:metadata`);
    }
  } catch (error) {
    console.error('Error getting cached data:', error);
  }
  
  return null;
}

// Sorgu sonucunu cache'e kaydetme
export async function cacheQueryResult<T>(
  query: string,
  params: Record<string, any> | undefined,
  result: T,
  ttl: number = CACHE_TTL
): Promise<void> {
  const cacheKey = createCacheKey(query, params);
  
  try {
    await redis.set(cacheKey, JSON.stringify(result));
    await redis.set(`${cacheKey}:metadata`, JSON.stringify({
      timestamp: Date.now(),
      ttl
    }));
    await redis.expire(cacheKey, ttl);
    await redis.expire(`${cacheKey}:metadata`, ttl);
    console.log('Cached result:', cacheKey);
  } catch (error) {
    console.error('Error caching result:', error);
  }
}

// Cache'i temizleme
export async function invalidateQueryCache(query: string, params?: Record<string, any>): Promise<void> {
  const cacheKey = createCacheKey(query, params);
  
  try {
    await redis.del(cacheKey);
    await redis.del(`${cacheKey}:metadata`);
    console.log('Invalidated cache:', cacheKey);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}

// Rate limit işlemleri
export async function recordRateLimit(key: string, timestamp: number): Promise<void> {
  try {
    // Yeni kayıt ekle
    await redis.zadd(key, timestamp, timestamp.toString());
    console.log(`Recorded rate limit for ${key} at ${timestamp}`);
  } catch (error) {
    console.error('Error recording rate limit:', error);
  }
}

export async function getRateLimitCount(key: string, windowStart: number, windowEnd: number): Promise<number> {
  try {
    const count = await redis.zcount(key, windowStart, windowEnd);
    console.log(`Rate limit count for ${key}: ${count} (${windowStart} - ${windowEnd})`);
    return count;
  } catch (error) {
    console.error('Error getting rate limit count:', error);
    return 0;
  }
}

export async function cleanupRateLimits(key: string, olderThan: number): Promise<void> {
  try {
    const deleted = await redis.zremrangebyscore(key, 0, olderThan);
    console.log(`Cleaned up ${deleted} old rate limit records for ${key}`);
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
  }
}

// Redis bağlantı durumunu kontrol etme
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
}

export { redis };
