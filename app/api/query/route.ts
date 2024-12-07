import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';
import { logApiRequest } from '@/lib/logger';
import { getCachedQueryResult, cacheQueryResult } from '@/lib/redis';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

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

        const body = await request.json();
        const { query, parameters, skipCache } = body;

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
                userAgent
            });
            return NextResponse.json(responseBody, { status: 400 });
        }

        // Cache'den sonuç kontrolü
        let result;
        if (!skipCache) {
            result = await getCachedQueryResult(query, parameters);
            if (result) {
                const responseBody = {
                    status: 'completed',
                    result,
                    fromCache: true
                };

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
                    cacheHit: true
                });

                return NextResponse.json(responseBody, { status: 200 });
            }
        }

        // Cache'de yoksa veya cache atlanmışsa sorguyu çalıştır
        result = await executeQuery(query, parameters);

        // Sonucu cache'e kaydet (skipCache false ise)
        if (!skipCache) {
            await cacheQueryResult(query, parameters, result);
        }

        const responseBody = {
            status: 'completed',
            result,
            fromCache: false
        };

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
            cacheHit: false
        });

        return NextResponse.json(responseBody, { status: 200 });
    } catch (error: any) {
        console.error('Error in query endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        
        await logApiRequest({
            endpoint: '/api/query',
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