import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth';
import { jobs } from '@/app/api/bigquery/route';
import { logApiRequest } from '@/lib/logger';

export async function GET(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    const startTime = Date.now();
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];
    const clientIp = request.headers.get('x-forwarded-for') || request.ip;
    const userAgent = request.headers.get('user-agent');
    const { jobId } = params;

    try {
        console.log('Received headers:', Object.fromEntries(request.headers.entries()));
        
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            const responseBody = { error: keyVerification.error || 'Invalid API key' };
            await logApiRequest({
                endpoint: `/api/job/status/${jobId}`,
                apiKey: apiKey || 'invalid',
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

        const job = jobs.get(jobId);
        if (!job) {
            const responseBody = { error: 'Job not found' };
            await logApiRequest({
                endpoint: `/api/job/status/${jobId}`,
                apiKey: apiKey || '',
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

        const responseBody = {
            status: job.status,
            startTime: job.startTime,
            error: job.error,
            downloadUrl: job.status === 'completed' ? `/api/job/result/${jobId}` : null
        };

        await logApiRequest({
            endpoint: `/api/job/status/${jobId}`,
            apiKey: apiKey || '',
            method: 'GET',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            jobId,
            jobStatus: job.status,
            jobDownloadLink: responseBody.downloadUrl
        });

        return NextResponse.json(responseBody);
    } catch (error: any) {
        console.error('Error in job status endpoint:', error);
        const responseBody = { error: error.message };
        
        await logApiRequest({
            endpoint: `/api/job/status/${jobId}`,
            apiKey: apiKey || '',
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
