import { Database } from '@/lib/database';
import { getApiKey } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';
import { SqlQueryProcessor } from '@/lib/sql-helper';
import { JsonValue } from 'type-fest';

export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {

    try {
        const { databaseId } = params;
        const body = await request.json();
        const { query, parameters, skipCache } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        // Process the query using our SQL helper
        const processedQuery = SqlQueryProcessor.processQuery(
            query, 
            parameters as Record<string, JsonValue>
        );

        const database = new Database();
        const apiKey = getApiKey(request);
        
        // Use the processed query and parameters
        const response = await database.query(
            processedQuery.query, 
            databaseId, 
            apiKey, 
            processedQuery.parameters, 
            skipCache
        );

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in datamanagerquery endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}
