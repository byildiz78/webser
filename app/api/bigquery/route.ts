import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { logApiRequest } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';
import { addBigQueryJob } from '@/lib/queue';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];
    const clientIp = request.headers.get('x-forwarded-for') || request.ip;
    const userAgent = request.headers.get('user-agent');
    
    try {
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            const responseBody = { error: keyVerification.error || 'Invalid API key' };
            await logApiRequest({
                endpoint: '/api/bigquery',
                apiKey: apiKey || 'invalid',
                method: 'POST',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 401,
                clientIp,
                userAgent,
                errorMessage: keyVerification.error
            });
            return NextResponse.json(responseBody, { status: 401 });
        }

        // Rate limiting
        const identifier = clientIp || 'anonymous';
        const { success } = await rateLimit(identifier);
        if (!success) {
            const responseBody = { error: 'Too many requests' };
            await logApiRequest({
                endpoint: '/api/bigquery',
                apiKey: apiKey || '',
                method: 'POST',
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 429,
                clientIp,
                userAgent
            });
            return NextResponse.json(responseBody, { status: 429 });
        }

        const body = await request.json();
        const jobId = randomUUID();

        // BigQuery işini kuyruğa ekle
        const job = await addBigQueryJob({
            jobId,
            query: body.query,
            parameters: body.parameters,
            requestInfo: {
                apiKey,
                clientIp,
                userAgent,
                timestamp: new Date(),
            }
        });

        const responseBody = {
            jobId: job.id,
            status: 'queued',
            message: 'Query has been queued for processing'
        };

        await logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 202,
            clientIp,
            userAgent
        });

        return NextResponse.json(responseBody, { status: 202 });
    } catch (error: any) {
        console.error('Error in bigquery endpoint:', error);
        
        const responseBody = { error: error.message || 'Internal server error' };
        await logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 500,
            clientIp,
            userAgent,
            errorMessage: error.message
        });
        
        return NextResponse.json(responseBody, { status: 500 });
    }
}
