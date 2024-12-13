import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { addBigQueryJob } from '@/lib/queue';

export async function POST(request: NextRequest,
    { params }: { params: { databaseId: string } }) {
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.split(' ')[1] || '';
    const clientIp = request.headers.get('x-forwarded-for') || request.ip || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const { databaseId } = params;
    
    try {

        const identifier = clientIp || 'anonymous';
        const { success } = await rateLimit(identifier);
        if (!success) {
            const responseBody = { error: 'Too many requests' };
            return NextResponse.json(responseBody, { status: 429 });
        }

        const body = await request.json();

        const job = await addBigQueryJob({
            query: body.query,
            parameters: body.parameters,
            requestInfo: {
                apiKey,
                databaseId,
                clientIp,
                userAgent,
                timestamp: new Date(),
            }
        });

        const responseBody = {
            jobId: job.id,
            status: 'queued',
            message: 'Query has been queued for processing'
        };

        return NextResponse.json(responseBody, { status: 202 });
    } catch (error: any) {
        const responseBody = { error: error.message || 'Internal server error' };
        return NextResponse.json(responseBody, { status: 500 });
    }
}
