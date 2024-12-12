import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from '@/x/auth';
import { logApiRequest } from '@/x/logger';
import { instantQueryQueue } from '@/x/queue/instantquery.queue';
import { rateLimit } from '@/x/rate-limit';
import QueueConfig, { QueueType } from '@/x/queue/config';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1] || '';
    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    
    try {
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            const responseBody = { error: keyVerification.error || 'Invalid API key' };
            await logApiRequest({
                endpoint: '/api/instantquery',
                apiKey,
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
                endpoint: '/api/instantquery',
                apiKey,
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

        if (!body.query) {
            const responseBody = { error: 'Query is required' };
            await logApiRequest({
                endpoint: '/api/instantquery',
                apiKey,
                method: 'POST',
                requestBody: body,
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 400,
                clientIp,
                userAgent
            });
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Get queue events instance
        const queueEvents = QueueConfig.getQueueEvents(QueueType.INSTANT_QUERY);

        // Add job to queue and wait for result
        const job = await instantQueryQueue.add('instant-query', {
            query: body.query,
            parameters: body.parameters,
            requestInfo: {
                apiKey,
                clientIp,
                userAgent,
                timestamp: new Date(),
            }
        }, {
            attempts: 1,
            removeOnComplete: {
                age: 24 * 3600, // 24 saat sonra tamamlanan işleri sil
                count: 1000 // En fazla 1000 tamamlanan iş tut
            },
            removeOnFail: {
                age: 24 * 3600 // 24 saat sonra başarısız işleri sil
            }
        });

        // Wait for job completion
        const result = await job.waitUntilFinished(queueEvents);

        if (!result || !result.success) {
            const responseBody = {
                error: result?.error || 'Query execution failed',
                metadata: result?.metadata
            };
            await logApiRequest({
                endpoint: '/api/instantquery',
                apiKey,
                method: 'POST',
                requestBody: body,
                responseBody,
                responseTimeMs: Date.now() - startTime,
                statusCode: 500,
                clientIp,
                userAgent,
                queryText: body.query,
                errorMessage: result?.error
            });
            return NextResponse.json(responseBody, { status: 500 });
        }

        const responseBody = {
            success: true,
            result: result.result,
            metadata: {
                ...result.metadata,
                executionTime: Date.now() - startTime
            }
        };

        await logApiRequest({
            endpoint: '/api/instantquery',
            apiKey,
            method: 'POST',
            requestBody: body,
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            queryText: body.query,
            affectedRows: result.metadata.rowCount
        });

        return NextResponse.json(responseBody);
    } catch (error: any) {
        console.error('Error in instantquery endpoint:', error);
        
        const responseBody = { error: error.message || 'Internal server error' };
        await logApiRequest({
            endpoint: '/api/instantquery',
            apiKey,
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
