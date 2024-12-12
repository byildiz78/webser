import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/x/auth';
import { QueueConfig, QueueType } from '@/x/queue';

export async function GET(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];

    try {
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            return NextResponse.json(
                { error: keyVerification.error || 'Invalid API key' },
                { status: 401 }
            );
        }

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
