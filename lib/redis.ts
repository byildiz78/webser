import { Redis } from '@upstash/redis';

// Redis bağlantısı için mock veriler kullanacağız
const mockData = {
  'ratelimit:query': new Set(),
  'ratelimit:analytics': new Set(),
  'ratelimit:api': new Set()
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

  async zadd(key: string, score: number, member: string): Promise<number> {
    const set = mockData[key as keyof typeof mockData];
    set.add(score);
    return 1;
  }

  async get(key: string): Promise<string | null> {
    return null;
  }

  async setex(key: string, ttl: number, value: string): Promise<'OK'> {
    return 'OK';
  }

  async set(key: string, value: string): Promise<'OK'> {
    return 'OK';
  }
}

// Gerçek Redis yerine mock kullanıyoruz
export const redis = new MockRedis() as unknown as Redis;

export async function getCachedData(key: string) {
  return await redis.get(key);
}

export async function setCachedData(key: string, value: any, ttl?: number) {
  if (ttl) {
    await redis.setex(key, ttl, value);
  } else {
    await redis.set(key, value);
  }
}