import { Queue, Worker, Job, QueueEvents, FlowProducer, RepeatOptions } from 'bullmq';
import IORedis from 'ioredis';
import { isRetryableError, logError } from '@/lib/logger';

type JobData = Record<string, any>;
type JobResult = Record<string, any>;

interface RedisConfig {
host: string;
port: number;
password?: string;
maxRetriesPerRequest: null;
}

interface RetryStrategy {
attempts: number;
backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
};
}

export enum QueueType {
ANALYTICS = 'analytics',
BIGQUERY = 'bigquery',
RATE_LIMIT = 'rate-limit',
INSTANT_QUERY = 'instant-query'
}

const redisConfig: RedisConfig = {
host: process.env.REDIS_HOST || 'localhost',
port: parseInt(process.env.REDIS_PORT || '6379'),
password: process.env.REDIS_PASSWORD,
maxRetriesPerRequest: null,
};

const connection = new IORedis(redisConfig);

const retryStrategies: Record<QueueType, RetryStrategy> = {
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
},
[QueueType.INSTANT_QUERY]: {
    attempts: 1,
    backoff: {
     type: 'fixed',
     delay: 1000,
    }
}
};

class QueueConfig {
private static queues = new Map<QueueType, Queue>();
private static workers = new Map<QueueType, Worker>();
private static flowProducers = new Map<QueueType, FlowProducer>();
private static queueEvents = new Map<QueueType, QueueEvents>();

static getQueue(name: QueueType): Queue {
    if (!this.queues.has(name)) {
     const queue = new Queue(name, {
        connection,
        defaultJobOptions: {
         ...retryStrategies[name],
         removeOnComplete: {
            age: 24 * 3600,
            count: 1000,
         },
         removeOnFail: {
            age: 7 * 24 * 3600,
         },
        },
     });
     this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
}

static getQueueEvents(name: QueueType): QueueEvents {
    if (!this.queueEvents.has(name)) {
     const queueEvents = new QueueEvents(name, { connection });
     this.queueEvents.set(name, queueEvents);
    }
    return this.queueEvents.get(name)!;
}

static getFlowProducer(name: QueueType): FlowProducer {
    if (!this.flowProducers.has(name)) {
     const flowProducer = new FlowProducer({
        connection,
     });
     this.flowProducers.set(name, flowProducer);
    }
    return this.flowProducers.get(name)!;
}

// Zamanlanmış iş ekleme örneği
static async scheduleJob(
    name: QueueType,
    data: JobData,
    options: { delay?: number; repeat?: RepeatOptions } = {}
) {
    const queue = this.getQueue(name);
    
    if (options?.repeat) {
     // Tekrarlanan iş
     return await queue.add('scheduled', data, {
        repeat: options.repeat
     });
    } else if (options?.delay) {
     // Gecikmeli iş
     return await queue.add('delayed', data, {
        delay: options.delay
     });
    } else {
     // Normal iş
     return await queue.add('default', data);
    }
}

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
         } catch (error: unknown) {
            await logError(error as Error, {
             queueName: name,
             jobId: job?.id,
             jobData: job.data
            });

            if (isRetryableError(error)) {
             const retryCount = job.attemptsMade + 1;
             const strategy = retryStrategies[name];
             if (!strategy) {
                throw new Error(`No retry strategy found for queue ${name}`);
             }
             const maxAttempts = strategy.attempts;
            
             if (retryCount < maxAttempts) {
                throw error;
             }
            }
            
            await job.discard();
            throw error;
         }
        },
        {
         connection,
         concurrency: 5,
         limiter: {
            max: 100,
            duration: 10000
         }
        }
     );

     worker.on('completed', (job: Job) => {
        console.log(`[${name}] Job ${job.id} completed successfully`);
     });

     worker.on('failed', (job: Job | undefined, error: Error) => {
        console.error(`[${name}] Job ${job?.id} failed:`, error);
     });

     worker.on('error', (error: Error) => {
        console.error(`[${name}] Worker error:`, error);
     });

     this.workers.set(name, worker);
    }
    return this.workers.get(name)!;
}

static async closeAll(): Promise<void> {
    try {
     await Promise.all([
        ...Array.from(this.queues.values()).map(queue => queue.close()),
        ...Array.from(this.workers.values()).map(worker => worker.close()),
        ...Array.from(this.flowProducers.values()).map(producer => producer.close()),
        ...Array.from(this.queueEvents.values()).map(events => events.close())
     ]);
    
     await connection.quit();
    } catch (error) {
     console.error('Error while closing queue resources:', error);
     throw error;
    }
}
}

export default QueueConfig;