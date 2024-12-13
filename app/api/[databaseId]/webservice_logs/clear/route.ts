import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';
import { getApiKey } from '@/lib/settings';

export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {

    try {
        const { databaseId } = params;
        const apiKey = getApiKey(request);   

        const database = new Database();
        const query = `
            TRUNCATE TABLE webservice_logs
        `;

        await database.query(query, databaseId, apiKey);
        return NextResponse.json({ 
            success: true,
            message: 'Log table cleared successfully'
        });
    } catch (error: any) {
        console.error('Error clearing logs:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
