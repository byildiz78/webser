import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/auth';
import { jobs } from '@/app/api/bigquery/route';
import { logApiRequest } from '@/lib/logger';
import archiver from 'archiver';

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
                endpoint: `/api/job/result/${jobId}`,
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
                endpoint: `/api/job/result/${jobId}`,
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

        if (job.status !== 'completed') {
            const responseBody = { error: 'Job not completed' };
            await logApiRequest({
                endpoint: `/api/job/result/${jobId}`,
                apiKey: apiKey || '',
                method: 'GET',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 400,
                clientIp,
                userAgent,
                jobId,
                jobStatus: job.status
            });
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Convert result to CSV
        const csvContent = convertToCSV(job.result);
        archive.append(Buffer.from(csvContent), { name: 'result.csv' });
        archive.finalize();

        // Create readable stream from archive
        const chunks: Buffer[] = [];
        archive.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        
        const buffer = await new Promise<Buffer>((resolve, reject) => {
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);
        });

        // Log successful download
        await logApiRequest({
            endpoint: `/api/job/result/${jobId}`,
            apiKey: apiKey || '',
            method: 'GET',
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            jobId,
            jobStatus: 'completed',
            jobDownloadLink: `/api/job/result/${jobId}`,
            affectedRows: job.result?.length
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
        const responseBody = { error: error.message };
        
        await logApiRequest({
            endpoint: `/api/job/result/${jobId}`,
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

function convertToCSV(data: any[]): string {
    if (!data || !data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] ?? '')
            ).join(',')
        )
    ];
    
    return csvRows.join('\n');
}
