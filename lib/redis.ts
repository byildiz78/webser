import { Redis } from '@upstash/redis';
import crypto from 'crypto';

// Cache ayarları
const CACHE_TTL = 60 * 60; // 1 saat
const MAX_CACHE_SIZE = 1000; // maksimum cache kayıt sayısı

// Redis bağlantısı için mock veriler
const mockData = {
  'ratelimit:query': new Set(),
  'ratelimit:analytics': new Set(),
  'ratelimit:api': new Set(),
  'cache:queries': new Map(),
  'cache:metadata': new Map()
};

class MockRedis {
  async zcount(key: string, min: number, max: number): Promise<number> {
    const now = Date.now();
    const set = mockData[key as keyof typeof mockData];
    // Süresi geçmiş kayıtları temizle
    set.forEach((timestamp: number) => {
      if (timestamp < min) {
        set.delete(timestamp);
      }
    });
    return set.size;
  }

  async zadd(key: string, timestamp: number, value: any): Promise<number> {
    const set = mockData[key as keyof typeof mockData] as Set<number>;
    set.add(timestamp);
    return 1;
  }

  async get(key: string): Promise<any> {
    if (key.startsWith('cache:queries:')) {
      const cache = mockData['cache:queries'] as Map<string, any>;
      return cache.get(key);
    }
    return null;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<'OK'> {
    if (key.startsWith('cache:queries:')) {
      const cache = mockData['cache:queries'] as Map<string, any>;
      cache.set(key, value);

      // Cache metadata güncelle
      const metadata = mockData['cache:metadata'] as Map<string, any>;
      metadata.set(key, {
        timestamp: Date.now(),
        ttl: options?.ex || CACHE_TTL
      });

      // Cache boyutu kontrolü
      if (cache.size > MAX_CACHE_SIZE) {
        // En eski kayıtları sil
        const sortedEntries = Array.from(metadata.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        const entriesToDelete = sortedEntries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // %20'sini sil
        entriesToDelete.forEach(([key]) => {
          cache.delete(key);
          metadata.delete(key);
        });
      }
    }
    return 'OK';
  }

  async del(key: string): Promise<number> {
    if (key.startsWith('cache:queries:')) {
      const cache = mockData['cache:queries'] as Map<string, any>;
      const metadata = mockData['cache:metadata'] as Map<string, any>;
      
      const deleted = cache.delete(key);
      metadata.delete(key);
      
      return deleted ? 1 : 0;
    }
    return 0;
  }
}

// Gerçek Redis yerine mock kullanıyoruz
export const redis = new MockRedis() as unknown as Redis;

// Cache key oluşturma fonksiyonu
export function createCacheKey(query: string, params?: Record<string, any>): string {
  const data = {
    query,
    params: params || {}
  };
  
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
  
  return `cache:queries:${hash}`;
}

// Cache'den veri alma
export async function getCachedQueryResult<T>(query: string, params?: Record<string, any>): Promise<T | null> {
  const cacheKey = createCacheKey(query, params);
  
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      // Cache metadata kontrolü
      const metadata = mockData['cache:metadata'].get(cacheKey);
      if (metadata) {
        const { timestamp, ttl } = metadata;
        if (Date.now() - timestamp < ttl * 1000) {
          console.log('Cache hit:', cacheKey);
          return JSON.parse(cachedData);
        }
      }
      // TTL süresi dolmuş, cache'i temizle
      await redis.del(cacheKey);
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
    await redis.set(cacheKey, JSON.stringify(result), { ex: ttl });
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
    console.log('Invalidated cache:', cacheKey);
  } catch (error) {
    console.error('Error invalidating cache:', error);
  }
}