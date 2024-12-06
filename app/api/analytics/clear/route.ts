import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1];

    try {
        // Verify API key
        const keyVerification = await verifyApiKey(apiKey);
        if (!keyVerification.isValid) {
            return NextResponse.json(
                { error: keyVerification.error || 'Invalid API key' },
                { status: 401 }
            );
        }

        // Truncate logs table
        await executeQuery('TRUNCATE TABLE webservice_logs');

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
