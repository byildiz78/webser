import { NextRequest, NextResponse } from "next/server";
import {Database} from '@/lib/database';
import { getApiKey } from "@/lib/settings";
import { WebserviceLogsCalculated } from "@/types/tables";

export async function GET(
    request: NextRequest,
    { params }: { params: { databaseId: string } }
) {

    const { databaseId } = params;
    const apiKey = getApiKey(request);    
    try{
        const database = new Database();
        const today = new Date().toISOString().split('T')[0];
        const query = `
            SELECT 
            COUNT(*) as total_queries,
            AVG(time_elapsed) as avg_time,
            MAX(time_elapsed) as max_time
            FROM dbo.webservice_logs
            WHERE CAST(query_datetime AS DATE) = '${today}'
        `;

        const response = await database.query<WebserviceLogsCalculated>(query, databaseId, apiKey);
        return NextResponse.json(response || null, { status: 200 });

    }catch (error: any) {
        console.error('Error in query endpoint:', error);
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}