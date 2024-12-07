import { NextRequest, NextResponse } from 'next/server';
import { QueueConfig, QueueType } from '@/lib/queue';

export async function GET(request: NextRequest) {
    try {
        const queue = QueueConfig.getQueue(QueueType.ANALYTICS);
        
        // Test job'ı ekleme
        const job = await queue.add('test-job', {
            data: 'test data',
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({ 
            message: 'Test job added successfully', 
            jobId: job.id 
        });
    } catch (error) {
        console.error('Error adding test job:', error);
        return NextResponse.json(
            { error: 'Failed to add test job' }, 
            { status: 500 }
        );
    }
}
