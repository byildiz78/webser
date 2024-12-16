import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { getApiKey, getAppSettings } from '@/lib/settings';
import { ApiResponse } from '@/types/tables';
import path from 'path';
import fs from 'fs';

// API route'u dinamik olarak işaretleyelim
export const dynamic = 'force-dynamic';

interface DbResponse {
    tenantId: string;
    databaseId: string;
    apiKey: string;
}

export async function GET(
    request: NextRequest
) {
    try {
        const apiKey = getApiKey(request);
        if (!apiKey) {
            return NextResponse.json(
                { error: `apiKey cannot be empty` },
                { status: 404 }
            );
        }
        const settings = getAppSettings();
        if (settings.admin.apiKey.toString() !== apiKey.toString()) {
            return NextResponse.json(
                { error: `Not Authorized` },
                { status: 401 });
        }

        const tenantConnection = settings.connections.map((item) => {
            return {
                tenantId: item.tenantId,
                databaseId: item.databaseId.toString(),
                apiKey: item.apiKey
            } as DbResponse
        });

        return NextResponse.json({
            data: tenantConnection
        } as ApiResponse<DbResponse>, { status: 200 });

    } catch (error: any) {
        const errorMessage = `Database API Error: ${error.message || error}`;
        const logPath = path.join(process.cwd(), 'app.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `${timestamp} - ${errorMessage}\n`);
        
        return NextResponse.json(
            { error: error.message || 'Internal Server Error', status: 500 }
        );
    }
}
