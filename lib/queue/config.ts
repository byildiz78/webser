import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import IORedis from 'ioredis';
import { isRetryableError, logError } from '@/lib/error';

// Redis bağlantı yapılandırması
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

// Queue tipleri için enum
export enum QueueType {
  ANALYTICS = 'analytics',
  BIGQUERY = 'bigquery',
  RATE_LIMIT = 'rate-limit'
}

// Retry stratejileri
const retryStrategies = {
  [QueueType.ANALYTICS]: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    }
  },
  [QueueType.BIGQUERY]: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    }
  },
  [QueueType.RATE_LIMIT]: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 1000,
    }
  }
};

// Queue yapılandırma sınıfı
class QueueConfig {
  private static queues: Map<string, Queue> = new Map();
  private static workers: Map<string, Worker> = new Map();
  private static schedulers: Map<string, QueueScheduler> = new Map();

  // Queue oluşturma veya var olan queue'yu getirme
  static getQueue(name: QueueType): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
          ...retryStrategies[name],
          removeOnComplete: {
            age: 24 * 3600, // 24 saat sonra tamamlanan işleri sil
            count: 1000, // En fazla 1000 tamamlanan iş tut
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // 7 gün sonra başarısız işleri sil
          },
        },
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  // Worker oluşturma
  static createWorker(
    name: QueueType,
    processor: (job: Job) => Promise<any>
  ): Worker {
    if (!this.workers.has(name)) {
      const worker = new Worker(
        name,
        async (job: Job) => {
          try {
            return await processor(job);
          } catch (error: any) {
            // Hata logla
            await logError(error, {
              queueName: name,
              jobId: job.id,
              jobData: job.data
            });

            // Hatanın türüne göre retry yap
            if (isRetryableError(error)) {
              const retryCount = job.attemptsMade + 1;
              const maxAttempts = retryStrategies[name].attempts;
              
              if (retryCount < maxAttempts) {
                throw error; // BullMQ otomatik olarak retry yapacak
              }
            }
            
            // Non-retryable hata veya max retry sayısına ulaşıldı
            job.discard();
            throw error;
          }
        },
        { 
          connection,
          concurrency: 5, // Aynı anda işlenecek maksimum iş sayısı
          limiter: {
            max: 100, // Her 10 saniyede maksimum 100 iş
            duration: 10000
          }
        }
      );

      // Worker event'lerini dinle
      worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed in queue ${name}`);
      });

      worker.on('failed', (job, error) => {
        console.error(`Job ${job?.id} failed in queue ${name}:`, error);
      });

      worker.on('error', (error) => {
        console.error(`Worker error in queue ${name}:`, error);
      });

      this.workers.set(name, worker);
    }
    return this.workers.get(name)!;
  }

  // Scheduler oluşturma (tekrarlanan işler için)
  static createScheduler(name: QueueType): QueueScheduler {
    if (!this.schedulers.has(name)) {
      const scheduler = new QueueScheduler(name, { connection });
      this.schedulers.set(name, scheduler);
    }
    return this.schedulers.get(name)!;
  }

  // Tüm queue'ları kapatma
  static async closeAll() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const scheduler of this.schedulers.values()) {
      await scheduler.close();
    }
    await connection.quit();
  }
}

export default QueueConfig;
