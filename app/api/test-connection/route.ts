import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const result = await testConnection();
        return NextResponse.json(result);
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
