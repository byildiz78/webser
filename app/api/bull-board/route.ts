import { NextRequest, NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueConfig, QueueType } from '@/lib/queue';

// Initialize queues first
const analyticsQueue = QueueConfig.getQueue(QueueType.ANALYTICS);
const bigQueryQueue = QueueConfig.getQueue(QueueType.BIGQUERY);
const rateLimitQueue = QueueConfig.getQueue(QueueType.RATE_LIMIT);

// Create Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/bull-board');

// Initialize Bull Board
const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [
        new BullMQAdapter(analyticsQueue),
        new BullMQAdapter(bigQueryQueue),
        new BullMQAdapter(rateLimitQueue)
    ],
    serverAdapter,
});

// API route handler
export async function GET(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key');
    
    // Check API key
    if (apiKey !== '123') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the path from the URL
        const path = request.nextUrl.pathname.replace('/api/bull-board', '') || '/';

        // Create a mock Express request object
        const mockReq = {
            ...request,
            baseUrl: '/api/bull-board',
            path,
            url: path,
            originalUrl: request.nextUrl.pathname,
            headers: Object.fromEntries(request.headers.entries()),
            query: Object.fromEntries(request.nextUrl.searchParams.entries()),
            method: request.method,
        };

        // Create a mock Express response object
        const mockRes = {
            setHeader: (name: string, value: string) => {},
            getHeader: (name: string) => null,
            end: (content: string) => {
                return new NextResponse(content, {
                    headers: {
                        'Content-Type': 'text/html',
                    },
                });
            },
        };

        return await serverAdapter.getRouter()(mockReq as any, mockRes as any);
    } catch (error) {
        console.error('Bull Board error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Also handle POST requests for Bull Board operations
export async function POST(request: NextRequest) {
    const apiKey = request.headers.get('x-api-key');
    
    // Check API key
    if (apiKey !== '123') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the path from the URL
        const path = request.nextUrl.pathname.replace('/api/bull-board', '') || '/';

        // Create a mock Express request object
        const mockReq = {
            ...request,
            baseUrl: '/api/bull-board',
            path,
            url: path,
            originalUrl: request.nextUrl.pathname,
            headers: Object.fromEntries(request.headers.entries()),
            query: Object.fromEntries(request.nextUrl.searchParams.entries()),
            method: request.method,
        };

        // Create a mock Express response object
        const mockRes = {
            setHeader: (name: string, value: string) => {},
            getHeader: (name: string) => null,
            end: (content: string) => {
                return new NextResponse(content, {
                    headers: {
                        'Content-Type': 'text/html',
                    },
                });
            },
        };

        return await serverAdapter.getRouter()(mockReq as any, mockRes as any);
    } catch (error) {
        console.error('Bull Board error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
