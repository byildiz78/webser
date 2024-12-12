import { Database } from '@/lib/database';
import { getApiKey } from '@/lib/settings';
import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {

    try {
        const { databaseId } = params;
        const body = await request.json();
        const { query, parameters, skipCache } = body;

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }
        const database = new Database();
        const apiKey = getApiKey(request);
        const response = await database.query(query, databaseId, apiKey, parameters, skipCache);
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Error in query endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}
