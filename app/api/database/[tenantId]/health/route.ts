import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';
import { getApiKey } from '@/lib/settings';


export async function GET(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;
        const apiKey = getApiKey(request);

        if (!tenantId || !apiKey) {
            return NextResponse.json(
                { error: `databaseId and apiKey cannot be empty` },
                { status: 404 }
            );
        }

        const database = new Database();
        const databaseResult = await database.testDatabaseConnection(tenantId, apiKey);
        const serverResult = await database.testServerConnection(tenantId, apiKey);

        return NextResponse.json({
            databaseConnection: databaseResult,
            serverConnection: serverResult
        });
    } catch (error: any) {
        console.error('Error testing connection:', error);
        return NextResponse.json(
            { 
                success: false, 
                message: error.message 
            },
            { status: 500 }
        );
    }
}
