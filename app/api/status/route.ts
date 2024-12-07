import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { QueueConfig, QueueType } from '@/lib/queue';

export async function GET() {
    try {
        // Redis durumunu kontrol et
        const redisStatus = {
            connected: false,
            info: null,
            error: null
        };

        try {
            const info = await redis.info();
            redisStatus.connected = true;
            redisStatus.info = info;
        } catch (error) {
            redisStatus.error = error.message;
        }

        // Queue'ları al
        const queues = {
            analytics: QueueConfig.getQueue(QueueType.ANALYTICS),
            bigQuery: QueueConfig.getQueue(QueueType.BIGQUERY),
            rateLimit: QueueConfig.getQueue(QueueType.RATE_LIMIT)
        };

        // Queue durumlarını kontrol et
        const queueStatus = {};
        for (const [name, queue] of Object.entries(queues)) {
            try {
                const [
                    activeCount,
                    completedCount,
                    failedCount,
                    delayedCount,
                    waitingCount
                ] = await Promise.all([
                    queue.getActiveCount(),
                    queue.getCompletedCount(),
                    queue.getFailedCount(),
                    queue.getDelayedCount(),
                    queue.getWaitingCount()
                ]);

                queueStatus[name] = {
                    active: activeCount,
                    completed: completedCount,
                    failed: failedCount,
                    delayed: delayedCount,
                    waiting: waitingCount,
                    error: null
                };
            } catch (error) {
                queueStatus[name] = {
                    error: error.message
                };
            }
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            redis: redisStatus,
            queues: queueStatus
        });
    } catch (error) {
        console.error('Error getting system status:', error);
        return NextResponse.json(
            { error: 'Failed to get system status' },
            { status: 500 }
        );
    }
}
