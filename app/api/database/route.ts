import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { getApiKey, getAppSettings } from '@/lib/settings';

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
                databaseId: item.databaseId,
                apiKey: item.apiKey
            }
        });

        return NextResponse.json(tenantConnection);

    } catch (error: any) {
        return NextResponse.json(
            { status: 500 }
        );
    }
}
