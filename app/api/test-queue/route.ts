import { NextResponse } from 'next/server';
import { QueueConfig, QueueType } from '@/x/queue';
import { Job } from 'bullmq';

interface TestJobData {
    message: string;
    timestamp: number;
}

interface TestJobResult {
    success: boolean;
    processedAt: Date;
    jobId: string;
    data: TestJobData;
    processingTime?: number;
}

export async function GET() {
    try {
        // Test queue'sunu oluştur
        const queue = QueueConfig.getQueue(QueueType.ANALYTICS);

        // Test işi ekle
        const job = await queue.add('test-job', {
            message: 'Test job',
            timestamp: Date.now()
        } as TestJobData);

        // Worker oluştur
        const worker = QueueConfig.createWorker(
            QueueType.ANALYTICS,
            async (job: Job<TestJobData>): Promise<TestJobResult> => {
                console.log('Processing test job:', job.data);
                // Simüle edilmiş işlem süresi
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                if (!job.id) {
                    throw new Error('Job ID is missing');
                }

                return {
                    success: true,
                    processedAt: new Date(),
                    jobId: job.id,
                    data: job.data
                };
            }
        );

        // QueueEvents oluştur
        const queueEvents = QueueConfig.getQueueEvents(QueueType.ANALYTICS);

        // İşin tamamlanmasını bekle
        const result = await job.waitUntilFinished(queueEvents);

        // Worker'ı kapat
        await worker.close();

        return NextResponse.json({
            status: 'success',
            job: {
                id: job.id,
                name: job.name,
                data: job.data,
                timestamp: job.timestamp,
                result
            }
        });
    } catch (error: any) {
        console.error('Error in test queue:', error);
        return NextResponse.json(
            {
                status: 'error',
                error: error?.message || 'Failed to process test job'
            },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        // Test queue'sunu oluştur
        const queue = QueueConfig.getQueue(QueueType.ANALYTICS);

        // 5 test işi ekle
        const jobs = await Promise.all(
            Array.from({ length: 5 }, (_, i) => 
                queue.add('test-job', {
                    message: `Test job ${i + 1}`,
                    timestamp: Date.now()
                } as TestJobData)
            )
        );

        // Worker oluştur
        const worker = QueueConfig.createWorker(
            QueueType.ANALYTICS,
            async (job: Job<TestJobData>): Promise<TestJobResult> => {
                console.log('Processing test job:', job.data);
                // Rastgele işlem süresi (1-3 saniye)
                const delay = Math.floor(Math.random() * 2000) + 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Rastgele hata üret (%20 olasılık)
                if (Math.random() < 0.2) {
                    throw new Error('Random job failure');
                }

                if (!job.id) {
                    throw new Error('Job ID is missing');
                }

                return {
                    success: true,
                    processedAt: new Date(),
                    jobId: job.id,
                    data: job.data,
                    processingTime: delay
                };
            }
        );

        return NextResponse.json({
            status: 'success',
            message: 'Added 5 test jobs to the queue',
            jobs: jobs.map(job => ({
                id: job.id,
                name: job.name,
                data: job.data,
                timestamp: job.timestamp
            }))
        });
    } catch (error: any) {
        console.error('Error in test queue:', error);
        return NextResponse.json(
            {
                status: 'error',
                error: error?.message || 'Failed to add test jobs'
            },
            { status: 500 }
        );
    }
}
