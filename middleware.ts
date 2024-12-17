import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAppSettings } from './lib/settings';
import fs from 'fs';
import path from 'path';

function writeToLog(message: string) {
    const logPath = path.join(process.cwd(), 'middleware.log');
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    fs.appendFileSync(logPath, logMessage);
}

export const config = {
    matcher: ['/api/:path*']
};

export async function middleware(request: NextRequest) {
    // OPTIONS request için preflight response
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { 
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    // Database API rotaları için özel middleware (/api/[databaseId]/...)
    const databasePathRegex = /^\/api\/\d+\//;
    if (!databasePathRegex.test(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    // Get databaseId from URL
    const databaseId = request.nextUrl.pathname.split('/')[2];
    
    // Check if databaseId exists
    if (!databaseId) {
        return new NextResponse(
            JSON.stringify({ error: 'Database ID is required' }), 
            { 
                status: 400,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    // Check authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new NextResponse(
            JSON.stringify({ error: 'Bearer token is required' }), 
            { 
                status: 401,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    const apiKey = authHeader.replace('Bearer', '').trim();
    const appSettings = getAppSettings();
    const tenantConnection = appSettings.connections.find(
        connection => connection.databaseId === parseInt(databaseId) && connection.apiKey === apiKey
    );

    // Log bilgilerini kaydet
    writeToLog(`Database ID: ${databaseId}`);
    writeToLog(`API Key: ${apiKey}`);
    writeToLog(`Connections: ${JSON.stringify(appSettings.connections)}`);
    writeToLog(`Found Connection: ${JSON.stringify(tenantConnection)}`);

    if (!tenantConnection) {
        return new NextResponse(
            JSON.stringify({ error: 'Not Authorized for this database' }), 
            { 
                status: 401,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    // Clone the request headers and add CORS headers
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return response;
}
