import { NextRequest, NextResponse } from 'next/server';
import bigqueryQueue from '@/lib/queue/bigquery.queue';
import archiver from 'archiver';
import { JobResult } from '@/types/job';



export async function GET(
    request: NextRequest,
    { params }: { params: { jobId: string } }
) {
    const { jobId } = params;

    try {
        // Get job directly by ID
        const job = await bigqueryQueue.getJob(jobId);
        
        if (!job) {
            const responseBody = { error: 'Job not found' };
            return NextResponse.json(responseBody, { status: 404 });
        }

        const state = await job.getState();
        if (state !== 'completed') {
            const responseBody = { error: `Job is not completed (state: ${state})` };
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Get job result
        const jobResult = await job.returnvalue as JobResult;
        if (!jobResult || !jobResult.success) {
            const responseBody = { 
                error: jobResult?.error || 'Job result not found or failed',
                metadata: jobResult?.metadata 
            };
            return NextResponse.json(responseBody, { status: 404 });
        }

        if (!jobResult.result || !Array.isArray(jobResult.result) || jobResult.result.length === 0) {
            const responseBody = { 
                error: 'No data found in job result',
                metadata: jobResult.metadata
            };
            return NextResponse.json(responseBody, { status: 404 });
        }

        // Create a ZIP file containing the results
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        // Buffer to store the ZIP file
        const chunks: any[] = [];
        const bufferPromise = new Promise<Buffer>((resolve, reject) => {
            archive.on('data', (chunk) => chunks.push(chunk));
            archive.on('end', () => resolve(Buffer.concat(chunks)));
            archive.on('error', reject);
        });

        // Add JSON file to ZIP
        const jsonContent = JSON.stringify(jobResult.result, null, 2);
        archive.append(jsonContent, { name: 'data.json' });

        // Add CSV file to ZIP if possible
        if (jobResult.result.length > 0) {
            const headers = Object.keys(jobResult.result[0]);
            const csvContent = [
                headers.join(','),
                ...jobResult.result.map(row =>
                    headers.map(header => JSON.stringify(row[header])).join(',')
                )
            ].join('\n');
            archive.append(csvContent, { name: 'data.csv' });
        }

        // Finalize the archive
        archive.finalize();

        const buffer = await bufferPromise;
        // Return ZIP file
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="query-result-${jobId}.zip"`
            }
        });
    } catch (error: any) {
        console.error('Error in job result endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}