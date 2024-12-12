import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/x/auth';
import { logApiRequest } from '@/x/logger';
import { bigqueryQueue } from '@/x/queue';
import archiver from 'archiver';

interface JobResult {
    success: boolean;
    processedAt: Date;
    result?: any[];
    error?: string;
    metadata: {
        rowCount?: number;
        query: string;
        executionTime?: number;
        jobId: string;
    };
}

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
                endpoint: `/api/job/result/${jobId}`,
                apiKey,
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

        // Get job directly by ID
        const job = await bigqueryQueue.getJob(jobId);
        
        if (!job) {
            const responseBody = { error: 'Job not found' };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
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

        // Check job state
        const state = await job.getState();
        if (state !== 'completed') {
            const responseBody = { error: 'Job not completed' };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
                apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 400,
                clientIp,
                userAgent,
                jobId,
                jobStatus: state
            });
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Get job result
        const jobResult = await job.returnvalue as JobResult;
        if (!jobResult) {
            const responseBody = { error: 'Job result not found' };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
                apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 404,
                clientIp,
                userAgent,
                jobId,
                errorMessage: 'Job result not found'
            });
            return NextResponse.json(responseBody, { status: 404 });
        }

        // Check if job failed
        if (!jobResult.success) {
            const responseBody = { 
                error: jobResult.error || 'Query execution failed',
                metadata: jobResult.metadata 
            };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
                apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 500,
                clientIp,
                userAgent,
                jobId,
                errorMessage: jobResult.error
            });
            return NextResponse.json(responseBody, { status: 500 });
        }

        // Check if result exists and is an array
        if (!jobResult.result || !Array.isArray(jobResult.result)) {
            const responseBody = { error: 'Invalid query result format' };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
                apiKey,
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 500,
                clientIp,
                userAgent,
                jobId,
                errorMessage: 'Invalid query result format'
            });
            return NextResponse.json(responseBody, { status: 500 });
        }

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Add metadata file
        const metadata = {
            ...jobResult.metadata,
            processedAt: jobResult.processedAt,
            downloadedAt: new Date()
        };
        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Add results as JSON file
        archive.append(JSON.stringify(jobResult.result, null, 2), { name: 'result.json' });

        // Create buffer from archive
        const bufferPromise = new Promise<Buffer>((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            archive.on('data', (chunk: Uint8Array) => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);
        });

        archive.finalize();

        const buffer = await bufferPromise;

        // Log successful download
        await logApiRequest({
            endpoint: `/api/job/result/${jobId}`,
            apiKey,
            method: 'GET',
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            jobId,
            jobStatus: 'completed',
            jobDownloadLink: `/api/job/result/${jobId}`,
            affectedRows: jobResult.metadata.rowCount
        });

        // Return ZIP file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="query-result-${jobId}.zip"`,
            },
        });
    } catch (error: any) {
        console.error('Error in job result endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        
        await logApiRequest({
            endpoint: `/api/job/result/${jobId}`,
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
