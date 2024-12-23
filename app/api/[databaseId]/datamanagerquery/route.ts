import { Database } from '@/lib/database';
import { getApiKey } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';
import { SqlQueryProcessor } from '@/lib/sql-helper';
import { JsonValue } from 'type-fest';
import { logApiRequest } from '@/lib/logger';

export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {
    const startTime = Date.now();
    const apiKey = getApiKey(request);

    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const { databaseId } = params;
    const body = await request.json();
    const { query, parameters, skipCache } = body;
    try {

        if (!body.query) {
            logApiRequest({
                endpoint: '/api/datamanagerquery',
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

        // Process the query using our SQL helper
        const processedQuery = SqlQueryProcessor.processQuery(
            query,
            parameters as Record<string, JsonValue>
        );

        const database = new Database();

        // Use the processed query and parameters
        const response = await database.query(
            processedQuery.query,
            databaseId,
            apiKey,
            processedQuery.parameters,
            skipCache
        );

        logApiRequest({
            endpoint: '/api/datamanagerquery',
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
            endpoint: '/api/datamanagerquery',
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
