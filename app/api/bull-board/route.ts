import { NextRequest, NextResponse } from 'next/server';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QueueConfig, QueueType } from '@/x/queue';

// Initialize queues first
const analyticsQueue = QueueConfig.getQueue(QueueType.ANALYTICS);
const bigQueryQueue = QueueConfig.getQueue(QueueType.BIGQUERY);
const rateLimitQueue = QueueConfig.getQueue(QueueType.RATE_LIMIT);
const instantQueryQueue = QueueConfig.getQueue(QueueType.INSTANT_QUERY);

// Create Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/bull-board');

// Initialize Bull Board
createBullBoard({
    queues: [
        new BullMQAdapter(analyticsQueue),
        new BullMQAdapter(bigQueryQueue),
        new BullMQAdapter(rateLimitQueue),
        new BullMQAdapter(instantQueryQueue)
    ],
    serverAdapter,
});

// API route handler
export async function GET(request: NextRequest) {
    console.log('Bull Board GET request:', {
        path: request.nextUrl.pathname,
        headers: Object.fromEntries(request.headers.entries())
    });

    try {
        // Get the path from the URL
        const path = request.nextUrl.pathname.replace('/api/bull-board', '') || '/';
        console.log('Processed path:', path);

        // Create a mock Express request object
        const mockReq = {
            baseUrl: '/api/bull-board',
            path,
            url: path,
            originalUrl: request.nextUrl.pathname,
            headers: Object.fromEntries(request.headers.entries()),
            query: Object.fromEntries(request.nextUrl.searchParams.entries()),
            method: request.method,
        };

        console.log('Mock request:', mockReq);

        // Create a mock Express response object with a promise to get the content
        return new Promise((resolve, reject) => {
            const mockRes = {
                setHeader: (name: string, value: string) => {
                    console.log('Setting header:', name, value);
                },
                getHeader: (name: string) => null,
                end: (content: string) => {
                    console.log('Response content length:', content.length);
                    resolve(new NextResponse(content, {
                        headers: {
                            'Content-Type': 'text/html',
                        },
                    }));
                },
            };

            try {
                serverAdapter.getRouter()(mockReq as any, mockRes as any);
            } catch (error) {
                console.error('Router error:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('Bull Board error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// Also handle POST requests for Bull Board operations
export async function POST(request: NextRequest) {
    console.log('Bull Board POST request:', {
        path: request.nextUrl.pathname,
        headers: Object.fromEntries(request.headers.entries())
    });

    try {
        // Get the path from the URL
        const path = request.nextUrl.pathname.replace('/api/bull-board', '') || '/';
        console.log('Processed path:', path);

        // Create a mock Express request object
        const mockReq = {
            baseUrl: '/api/bull-board',
            path,
            url: path,
            originalUrl: request.nextUrl.pathname,
            headers: Object.fromEntries(request.headers.entries()),
            query: Object.fromEntries(request.nextUrl.searchParams.entries()),
            method: request.method,
            body: await request.json().catch(() => ({})),
        };

        console.log('Mock request:', mockReq);

        // Create a mock Express response object with a promise to get the content
        return new Promise((resolve, reject) => {
            const mockRes = {
                setHeader: (name: string, value: string) => {
                    console.log('Setting header:', name, value);
                },
                getHeader: (name: string) => null,
                end: (content: string) => {
                    console.log('Response content length:', content.length);
                    resolve(new NextResponse(content, {
                        headers: {
                            'Content-Type': 'text/html',
                        },
                    }));
                },
            };

            try {
                serverAdapter.getRouter()(mockReq as any, mockRes as any);
            } catch (error) {
                console.error('Router error:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('Bull Board error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
