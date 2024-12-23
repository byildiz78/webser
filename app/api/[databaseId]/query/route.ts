import { Database } from '@/lib/database';
import { logApiRequest } from '@/lib/logger';
import { getApiKey } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {
    const apiKey = getApiKey(request);
    const body = await request.json();
    const startTime = Date.now();
    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const { databaseId } = params;

    try {
        const { query, parameters, skipCache } = body;

        if (!query) {
            logApiRequest({
                endpoint: '/api/query',
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
        const database = new Database();
        const response = await database.query(query, databaseId, apiKey, parameters, skipCache);
        
        logApiRequest({
            endpoint: '/api/query',
            apiKey: apiKey || '',
            method: 'POST',
            requestBody: body,
            responseBody: "",
            responseTimeMs: Date.now() - startTime,
            statusCode: 200,
            clientIp,
            userAgent,
            queryText: body.query,
            databaseId,
            errorMessage: "",
            jobDownloadLink: "",
            jobId: "",
            jobStatus: ""
        });

        return NextResponse.json(response);
    } catch (error: any) {
        const responseBody = { error: error.message || 'Internal server error' };

        logApiRequest({
            endpoint: '/api/query',
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
            errorMessage: "",
            jobDownloadLink: "",
            jobId: "",
            jobStatus: ""
        });

        return NextResponse.json(responseBody, { status: 500 });
    }
}
