import { NextRequest, NextResponse } from 'next/server';
import { QueueConfig, QueueType } from '@/lib/queue';

export async function GET(request: NextRequest) {

    try {

        const searchParams = request.nextUrl.searchParams;
        const jobId = searchParams.get('jobId');

        if (!jobId) {
            return NextResponse.json(
                { error: 'Job ID is required' },
                { status: 400 }
            );
        }

        // Tüm queue'larda job'ı ara
        const queues = [
            QueueConfig.getQueue(QueueType.ANALYTICS),
            QueueConfig.getQueue(QueueType.BIGQUERY),
            QueueConfig.getQueue(QueueType.RATE_LIMIT)
        ];

        let job = null;
        for (const queue of queues) {
            const currentJob = await queue.getJob(jobId);
            if (currentJob) {
                job = currentJob;
                break;
            }
        }

        if (!job) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        const state = await job.getState();
        const progress = await job.progress();
        const result = job.returnvalue;
        const error = job.failedReason;

        return NextResponse.json({
            id: job.id,
            status: state,
            progress,
            result,
            error,
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            attemptsMade: job.attemptsMade
        });
    } catch (error: any) {
        console.error('Error in job status endpoint:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
