import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { logApiRequest } from '../../../lib/logger'
import { getAppSettings } from '../../../lib/settings'

export const config = {
    matcher: '/api/:databaseId*'
}

export async function middleware(request: NextRequest) {
    const startTime = Date.now()
    
    // Get tenantId from URL
    const databaseId = request.nextUrl.pathname.split('/')[2]
    
    // Check if databaseId exists
    if (!databaseId) {
        return new NextResponse(JSON.stringify({ error: 'Tenant ID is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Check authorization header
    const apiKey = request.headers.get('authorization')
    if (!apiKey) {
        return new NextResponse(JSON.stringify({ error: 'Authorization header is required' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    const appSettings = getAppSettings();
    const tenantConnection = appSettings.connections.find(connection => connection.databaseId === parseInt(databaseId) && connection.apiKey === apiKey);
    if (!tenantConnection) {
        return new NextResponse(JSON.stringify({ error: 'Not Authorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }
    // Clone the request to read its body
    const requestClone = request.clone()
    let requestBody
    try {
        requestBody = await requestClone.json()
    } catch {
        requestBody = null
    }

    // Continue to the actual request
    const response = await NextResponse.next()
    
    // Calculate response time
    const responseTimeMs = Date.now() - startTime

    // Get response body
    const responseClone = response.clone()
    let responseBody
    try {
        responseBody = await responseClone.json()
    } catch {
        responseBody = null
    }

    await logApiRequest({
        endpoint: request.nextUrl.pathname,
        apiKey: apiKey,
        databaseId: databaseId,
        method: request.method,
        requestBody,
        responseBody,
        responseTimeMs,
        statusCode: response.status,
        clientIp: request.headers.get('x-forwarded-for') || request.ip,
        userAgent: request.headers.get('user-agent')
    })

    return response
}