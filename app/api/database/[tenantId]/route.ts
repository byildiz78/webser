import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { getApiKey, getAppSettings } from '@/lib/settings';

export async function GET(
    request: NextRequest,
    { params }: { params: { tenantId: string } }
) {
    try {
        const { tenantId } = params;
        const apiKey = getApiKey(request);
        if (!tenantId || !apiKey) {
            return NextResponse.json(
                { error: `tenantId and apiKey cannot be empty` },
                { status: 404 }
            );
        }
        const settings = getAppSettings();
        const tenantConnection = settings.connections.find(connection => connection.tenantId === tenantId && connection.apiKey === apiKey);

        if (!tenantConnection) {
            return NextResponse.json(
                { error: `Tenant ID '${tenantId}' not found` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            tenantId: tenantId,
            databaseId: tenantConnection.databaseId
        });

    } catch (error: any) {
        return NextResponse.json(
            { status: 500 }
        );
    }
}
