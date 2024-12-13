import { NextRequest, NextResponse } from 'next/server';
import { bigqueryQueue } from '@/lib/queue';

export async function GET(
    request: NextRequest,
    { params }: { params: { jobId: string, databaseId:string } }
) {
    const { jobId, databaseId } = params;

    try {
        // Get job from queue
        const job = await bigqueryQueue.getJob(jobId);
        
        if (!job) {
            const responseBody = { error: 'Job not found' };
            return NextResponse.json(responseBody, { status: 404 });
        }

        // Get job state and other details
        const [state, progress] = await Promise.all([
            job.getState(),
            job.progress
        ]);

        const responseBody = {
            jobId: job.id,
            status: state,
            progress: progress,
            startTime: job.processedOn,
            finishTime: job.finishedOn,
            error: job.failedReason,
            downloadUrl: state === 'completed' ? `/api/${databaseId}/job/result/${jobId}` : undefined
        };

        return NextResponse.json(responseBody);
    } catch (error: any) {
        console.error('Error in job status endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}
