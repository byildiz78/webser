import { NextResponse } from 'next/server';
import { redis } from '@/x/redis';
import { QueueConfig, QueueType } from '@/x/queue';

interface QueueStats {
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
    error?: string;
}

interface SystemStatus {
    timestamp: string;
    redis: {
        connected: boolean;
        info: string | null;
        error: string | null;
    };
    queues: {
        analytics: QueueStats;
        bigQuery: QueueStats;
        rateLimit: QueueStats;
        instantQuery: QueueStats;
    };
}

export async function GET(): Promise<NextResponse<SystemStatus | { error: string }>> {
    try {
        // Redis durumunu kontrol et
        let redisInfo: string | null = null;
        let redisError: string | null = null;
        let redisConnected = false;

        try {
            const pong = await redis.ping();
            redisConnected = pong === 'PONG';
            if (redisConnected) {
                redisInfo = 'Connected to Redis server';
            }
        } catch (error: any) {
            redisError = error?.message || 'Redis connection error';
        }

        // Queue'ları al
        const queues = {
            analytics: QueueConfig.getQueue(QueueType.ANALYTICS),
            bigQuery: QueueConfig.getQueue(QueueType.BIGQUERY),
            rateLimit: QueueConfig.getQueue(QueueType.RATE_LIMIT),
            instantQuery: QueueConfig.getQueue(QueueType.INSTANT_QUERY)
        };

        // Queue durumlarını kontrol et
        const queueStatus: Record<string, QueueStats> = {};
        
        await Promise.all(
            Object.entries(queues).map(async ([name, queue]) => {
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
                        waiting: waitingCount
                    };
                } catch (error: any) {
                    queueStatus[name] = {
                        active: 0,
                        completed: 0,
                        failed: 0,
                        delayed: 0,
                        waiting: 0,
                        error: error?.message || 'Queue error'
                    };
                }
            })
        );

        const response: SystemStatus = {
            timestamp: new Date().toISOString(),
            redis: {
                connected: redisConnected,
                info: redisInfo,
                error: redisError
            },
            queues: queueStatus as SystemStatus['queues']
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error getting system status:', error);
        return NextResponse.json(
            { error: error?.message || 'Failed to get system status' },
            { status: 500 }
        );
    }
}
