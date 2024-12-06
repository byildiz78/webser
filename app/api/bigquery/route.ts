import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { logApiRequest } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

// In-memory job storage (should be replaced with Redis or DB in production)
const jobs = new Map<string, any>();

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];
    const clientIp = request.headers.get('x-forwarded-for') || request.ip;
    const userAgent = request.headers.get('user-agent');
    
    try {
        console.log('Received headers:', Object.fromEntries(request.headers.entries()));
        
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
        const { query } = body;

        if (!query) {
            const responseBody = { error: 'Query is required' };
            await logApiRequest({
                endpoint: '/api/bigquery',
                apiKey: apiKey || '',
                method: 'POST',
                requestBody: body,
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 400,
                clientIp,
                userAgent,
                queryText: query
            });
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Generate a unique job ID
        const jobId = randomUUID();

        // Store job information
        jobs.set(jobId, {
            status: 'pending',
            query,
            startTime: new Date(),
            result: null,
            error: null
        });

        // Execute query asynchronously
        executeQuery(query)
            .then(result => {
                jobs.set(jobId, {
                    status: 'completed',
                    query,
                    startTime: new Date(),
                    result,
                    error: null
                });
            })
            .catch(error => {
                jobs.set(jobId, {
                    status: 'failed',
                    query,
                    startTime: new Date(),
                    result: null,
                    error: error.message
                });
            });

        const responseBody = { jobId };
        await logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            requestBody: body,
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 202,
            clientIp,
            userAgent,
            jobId,
            jobStatus: 'pending',
            queryText: query
        });

        return NextResponse.json(responseBody, { status: 202 });
    } catch (error: any) {
        console.error('Error in bigquery endpoint:', error);
        const responseBody = { error: error.message };
        
        await logApiRequest({
            endpoint: '/api/bigquery',
            apiKey: apiKey || '',
            method: 'POST',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 500,
            errorMessage: error.message,
            clientIp,
            userAgent
        });

        return NextResponse.json(responseBody, { status: 500 });
    }
}

// Export jobs map for other routes to access
export { jobs };
