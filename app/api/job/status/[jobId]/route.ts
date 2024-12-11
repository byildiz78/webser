import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth';
import { logApiRequest } from '@/lib/logger';
import { bigqueryQueue } from '@/lib/queue';

export async function GET(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    const startTime = Date.now();
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1] || '';
    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const { jobId } = params;

    try {
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            const responseBody = { error: keyVerification.error || 'Invalid API key' };
            await logApiRequest({
                endpoint: `/api/job/status/${jobId}`,
                apiKey: apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 401,
                clientIp,
                userAgent,
                jobId,
                errorMessage: keyVerification.error
            });
            return NextResponse.json(responseBody, { status: 401 });
        }

        // Get job from queue
        const job = await bigqueryQueue.getJob(jobId);
        
        if (!job) {
            const responseBody = { error: 'Job not found' };
            await logApiRequest({
                endpoint: `/api/job/status/${jobId}`,
                apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 404,
                clientIp,
                userAgent,
                jobId
            });
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
            downloadUrl: state === 'completed' ? `/api/job/result/${jobId}` : undefined
        };

        await logApiRequest({
            endpoint: `/api/job/status/${jobId}`,
            apiKey,
            method: 'GET',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            jobId,
            jobStatus: state,
            jobDownloadLink: responseBody.downloadUrl
        });

        return NextResponse.json(responseBody);
    } catch (error: any) {
        console.error('Error in job status endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        
        await logApiRequest({
            endpoint: `/api/job/status/${jobId}`,
            apiKey,
            method: 'GET',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 500,
            errorMessage: error.message,
            clientIp,
            userAgent,
            jobId
        });

        return NextResponse.json(responseBody, { status: 500 });
    }
}
