import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';
import { logApiRequest } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    // API key'i header'dan al
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
                endpoint: '/api/query',
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
                endpoint: '/api/query',
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
                endpoint: '/api/query',
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

        // Execute query
        const result = await executeQuery(query);

        const responseBody = { data: result };
        await logApiRequest({
            endpoint: '/api/query',
            apiKey: apiKey || '',
            method: 'POST',
            requestBody: body,
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            queryText: query,
            affectedRows: Array.isArray(result) ? result.length : 0
        });

        return NextResponse.json(responseBody);
    } catch (error: any) {
        console.error('Error in query endpoint:', error);
        const responseBody = { error: error.message };
        
        await logApiRequest({
            endpoint: '/api/query',
            apiKey: apiKey || '',
            method: 'POST',
            responseBody,
            responseTimeMs: Date.now() - startTime,
            statusCode: 500,
            errorMessage: error.message,
            clientIp,
            userAgent,
            queryText: body?.query
        });

        return NextResponse.json(responseBody, { status: 500 });
    }
}