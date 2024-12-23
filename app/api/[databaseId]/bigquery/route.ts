import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { addBigQueryJob } from '@/lib/queue';
import { logApiRequest } from '@/lib/logger';

export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1] || '';
    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const { databaseId } = params;
    const body = await request.json();
    const { callBackUrl } = body;
    const startTime = Date.now();
    let job = null;
    try {

        const identifier = clientIp || 'anonymous';
        const { success } = await rateLimit(identifier);

        if (!body.query) {
            logApiRequest({
                endpoint: '/api/bigquery',
                apiKey: apiKey || '',
                method: 'POST',
                requestBody: body,
                responseBody: "",
                responseTimeMs: Date.now() - startTime,
                statusCode: 400,
                clientIp,
                userAgent,
                queryText: body.query,
                databaseId,
                errorMessage: "Empty query",
                jobDownloadLink: "",
                jobId: "",
                jobStatus: ""
            });
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        if (!success) {
            const responseBody = { error: 'Too many requests' };

            logApiRequest({
                endpoint: '/api/bigquery',
                apiKey: apiKey || '',
                method: 'POST',
                requestBody: body,
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 429,
                clientIp,
                userAgent,
                queryText: body.query,
                databaseId,
                errorMessage: "Rate Limit Error",
                jobDownloadLink: "",
                jobId: "",
                jobStatus: ""
            });
            return NextResponse.json(responseBody, { status: 429 });
        }

        
        job = await addBigQueryJob({
            query: body.query,
            parameters: body.parameters,
            requestInfo: {
                apiKey,
                databaseId,
                clientIp,
                userAgent,
                timestamp: new Date(),
            }
        });


        if(callBackUrl !== '' && callBackUrl !== undefined && callBackUrl !== null && callBackUrl) {
            // iş bittiğinde callBackUrl'e mesaj gönderecek bir yapı kurulması lazım
        }

        const responseBody = {
            jobId: job.id,
            status: 'queued',
            message: 'Query has been queued for processing'
        };

        logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            requestBody: body,
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 202,
            clientIp,
            userAgent,
            queryText: body.query,
            databaseId,
            errorMessage: "",
            jobDownloadLink: job?.id ? `/job/result/${job?.id}` : "",
            jobId: job?.id,
            jobStatus: (await job?.getState())?.toString()
        });

        return NextResponse.json(responseBody, { status: 202 });
    } catch (error: any) {
        const responseBody = { error: error.message || 'Internal server error' };

        logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            requestBody: body,
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 500,
            clientIp,
            userAgent,
            queryText: body.query,
            databaseId,
            errorMessage: error.message,
            jobDownloadLink: job?.id ? `/job/result/${job?.id}` : "",
            jobId: job?.id,
            jobStatus: (await job?.getState())?.toString()
        });

        return NextResponse.json(responseBody, { status: 500 });
    }
}
