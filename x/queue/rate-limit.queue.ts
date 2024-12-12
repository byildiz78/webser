import QueueConfig, { QueueType } from './config';
import { Job, JobsOptions } from 'bullmq';
import { redis } from '@/x/redis';

interface RateLimitJobData {
    key: string;
    timestamp: number;
    action: 'record' | 'cleanup';
    limit?: number;
    window?: string;
}

interface RateLimitJobResult {
    success: boolean;
    processedAt: Date;
    jobId: string;
    data: RateLimitJobData;
    usage?: number;
    remaining?: number;
    error?: string;
}

// Rate limit işlerini işleyen worker
const rateLimitProcessor = async (job: Job<RateLimitJobData>): Promise<RateLimitJobResult> => {
    const { data } = job;
    
    try {
        console.log(`Processing rate limit data: ${JSON.stringify(data)}`);

        if (!job.id) {
            throw new Error('Job ID is missing');
        }
        
        switch (data.action) {
            case 'record':
                // Yeni rate limit kaydı ekle
                await redis.zadd(data.key, data.timestamp, data.timestamp.toString());
                
                // 24 saatten eski kayıtları temizle
                const dayInMs = 24 * 60 * 60 * 1000;
                const cleanupTime = Date.now() - dayInMs;
                await redis.zremrangebyscore(data.key, 0, cleanupTime);

                // Mevcut kullanımı kontrol et
                const usage = await redis.zcount(data.key, data.timestamp - (data.limit || dayInMs), data.timestamp);
                
                return {
                    success: true,
                    processedAt: new Date(),
                    jobId: job.id,
                    data,
                    usage,
                    remaining: data.limit ? Math.max(0, data.limit - usage) : undefined
                };
                
            case 'cleanup':
                // Eski kayıtları temizle
                await redis.zremrangebyscore(data.key, 0, data.timestamp);
                
                return {
                    success: true,
                    processedAt: new Date(),
                    jobId: job.id,
                    data
                };
                
            default:
                throw new Error(`Unknown action: ${data.action}`);
        }
    } catch (error: any) {
        console.error(`Error processing rate limit data: ${error}`);
        throw error;
    }
};

// Rate limit queue'sunu ve worker'ını oluştur
const rateLimitQueue = QueueConfig.getQueue(QueueType.RATE_LIMIT);
const rateLimitWorker = QueueConfig.createWorker(QueueType.RATE_LIMIT, rateLimitProcessor);

// Rate limit işi ekleme fonksiyonu
export const addRateLimitJob = async (data: RateLimitJobData) => {
    const jobOptions: JobsOptions = {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600, // 24 saat sonra tamamlanan işleri sil
            count: 10000 // En fazla 10000 tamamlanan iş tut
        },
        removeOnFail: {
            age: 7 * 24 * 3600 // 7 gün sonra başarısız işleri sil
        }
    };

    return await rateLimitQueue.add('process-rate-limit', data, jobOptions);
};

export default rateLimitQueue;
