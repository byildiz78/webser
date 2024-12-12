import QueueConfig, { QueueType } from './config';
import { Job, JobsOptions } from 'bullmq';

interface AnalyticsJobData {
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    timestamp: number;
    clientInfo?: {
        ip?: string;
        userAgent?: string;
    };
    error?: string;
}

interface AnalyticsJobResult {
    success: boolean;
    processedAt: Date;
    jobId: string;
    data: AnalyticsJobData;
    error?: string;
}

// Analytics işlerini işleyen worker
const analyticsProcessor = async (job: Job<AnalyticsJobData>): Promise<AnalyticsJobResult> => {
    const { data } = job;
    
    try {
        console.log(`Processing analytics data: ${JSON.stringify(data)}`);
        
        // Simüle edilmiş işlem süresi (100-300ms)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));

        if (!job.id) {
            throw new Error('Job ID is missing');
        }

        return {
            success: true,
            processedAt: new Date(),
            jobId: job.id,
            data
        };
    } catch (error: any) {
        console.error(`Error processing analytics data: ${error}`);
        throw error;
    }
};

// Analytics queue'sunu ve worker'ını oluştur
const analyticsQueue = QueueConfig.getQueue(QueueType.ANALYTICS);
const analyticsWorker = QueueConfig.createWorker(QueueType.ANALYTICS, analyticsProcessor);

// Analytics işi ekleme fonksiyonu
export const addAnalyticsJob = async (data: AnalyticsJobData) => {
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

    return await analyticsQueue.add('process-analytics', data, jobOptions);
};

export default analyticsQueue;
