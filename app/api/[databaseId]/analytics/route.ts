import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';
import { addAnalyticsJob } from '@/lib/queue';
import { getApiKey, getUserAgent } from '@/lib/settings';

interface DateRange {
    startDate: string;
    endDate: string;
}

async function getAnalytics(range: string | DateRange, databaseId: string, apiKey: string) {
    let dateFilter = '';
    let params: Record<string, any> = {};

    const database = new Database();


    if (typeof range === 'string') {
        switch (range) {
            case 'today':
                dateFilter = 'WHERE CONVERT(date, request_timestamp) = CONVERT(date, GETDATE())';
                break;
            case 'week':
                dateFilter = 'WHERE request_timestamp >= DATEADD(week, -1, GETDATE())';
                break;
            case 'month':
                dateFilter = 'WHERE request_timestamp >= DATEADD(month, -1, GETDATE())';
                break;
            default:
                dateFilter = '';
        }
    } else {
        dateFilter = 'WHERE request_timestamp BETWEEN @startDate AND DATEADD(day, 1, @endDate)';
        params.startDate = range.startDate;
        params.endDate = range.endDate;
    }

    const queries = {
        totalRequests: {
            query: `
                SELECT COUNT(*) as count
                FROM webservice_logs
                ${dateFilter}
            `,
            params
        },
        requestsByEndpoint: {
            query: `
                SELECT endpoint, COUNT(*) as count
                FROM webservice_logs
                ${dateFilter}
                GROUP BY endpoint
                ORDER BY count DESC
            `,
            params
        },
        requestsByStatus: {
            query: `
                SELECT status_code, COUNT(*) as count
                FROM webservice_logs
                ${dateFilter}
                GROUP BY status_code
                ORDER BY count DESC
            `,
            params
        },
        averageResponseTime: {
            query: `
                SELECT AVG(CAST(response_time_ms as float)) as avg_response_time
                FROM webservice_logs
                ${dateFilter}
            `,
            params
        },
        errorRates: {
            query: `
                SELECT 
                    endpoint,
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
                    CAST(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS FLOAT) / 
                         NULLIF(CAST(COUNT(*) AS FLOAT), 0) * 100 AS DECIMAL(5,2)) as error_rate
                FROM webservice_logs
                ${dateFilter}
                GROUP BY endpoint
                ORDER BY error_rate DESC
            `,
            params
        },
        topQueries: {
            query: `
                SELECT TOP 10
                    query_text,
                    COUNT(*) as execution_count,
                    AVG(CAST(response_time_ms as float)) as avg_response_time
                FROM webservice_logs
                ${dateFilter} AND query_text IS NOT NULL
                GROUP BY query_text
                ORDER BY execution_count DESC
            `,
            params
        },
        jobStatuses: {
            query: `
                SELECT 
                    job_status,
                    COUNT(*) as count
                FROM webservice_logs
                ${dateFilter} AND job_status IS NOT NULL
                GROUP BY job_status
                ORDER BY count DESC
            `,
            params
        },
        allLogs: {
            query: `
                SELECT 
                    id,
                    request_timestamp,
                    endpoint,
                    request_method as method,
                    status_code,
                    response_time_ms,
                    query_text,
                    job_id,
                    job_status,
                    error_message
                FROM webservice_logs
                ${dateFilter}
                ORDER BY request_timestamp DESC
            `,
            params
        }
    };

    try {
        const results = {
            totalRequests: await database.query(queries.totalRequests.query, databaseId, apiKey, queries.totalRequests.params),
            requestsByEndpoint: await database.query(queries.requestsByEndpoint.query, databaseId, apiKey, queries.requestsByEndpoint.params),
            requestsByStatus: await database.query(queries.requestsByStatus.query, databaseId, apiKey, queries.requestsByStatus.params),
            averageResponseTime: await database.query(queries.averageResponseTime.query, databaseId, apiKey, queries.averageResponseTime.params),
            errorRates: await database.query(queries.errorRates.query, databaseId, apiKey, queries.errorRates.params),
            topQueries: await database.query(queries.topQueries.query, databaseId, apiKey, queries.topQueries.params),
            jobStatuses: await database.query(queries.jobStatuses.query, databaseId, apiKey, queries.jobStatuses.params),
            allLogs: await database.query(queries.allLogs.query, databaseId, apiKey, queries.allLogs.params),
        };

        return results;
    } catch (error) {
        console.error('Error fetching analytics:', error);
        throw error;
    }
}

export async function GET(request: NextRequest, { params }: { params: { databaseId: string } }) {
    const clientIp = request.headers.get('x-forwarded-for') || request.ip;

    try {
        const searchParams = request.nextUrl.searchParams;
        const range = searchParams.get('range');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const apiKey = getApiKey(request);
        const userAgent = getUserAgent(request);

        let dateRange: string | DateRange = range || '';
        if (startDate && endDate) {
            dateRange = { startDate, endDate };
        }

        // Analytics işini kuyruğa ekle
        const jobData = {
            range: dateRange,
            requestInfo: {
                apiKey,
                clientIp,
                userAgent,
                timestamp: new Date(),
            }
        };

        const job = await addAnalyticsJob(jobData);

        // Analitik verilerini getir
        const results = await getAnalytics(dateRange, params.databaseId, apiKey);

        return NextResponse.json({
            ...results,
            jobId: job.id, // İş takibi için jobId döndür
        });
    } catch (error: any) {
        console.error('Error in analytics endpoint:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { databaseId: string } }) {
    try {
        const apiKey = getApiKey(request)
        const database = new Database();
        const query = 'DELETE FROM webservice_logs';
        await database.query(query, params.databaseId, apiKey);
        return NextResponse.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        console.error('Error clearing logs:', error);
        return NextResponse.json(
            { error: 'Failed to clear logs' },
            { status: 500 }
        );
    }
}
