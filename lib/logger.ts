import { Database } from "./database";
import { Q_INSERT_WEBSERVICELOG_TABLE, Q_CREATE_WEBSERVICELOG_TABLE } from "./queries";

interface ErrorLogContext {
    queueName: string;
    jobId?: string;
    jobData: any;
}

export async function initializeLogTable(databaseId: string, apiKey: string) {
    try {
        const database = new Database();
        await database.query(Q_CREATE_WEBSERVICELOG_TABLE, databaseId, apiKey);
    } catch (error) {
        console.error('Error Creating Log Table', error);
        throw error;
    }
}


export async function logApiRequest({
    endpoint,
    apiKey,
    databaseId,
    method,
    requestBody,
    responseBody,
    responseTimeMs,
    statusCode,
    errorMessage,
    clientIp,
    jobId,
    jobStatus,
    jobDownloadLink,
    queryText,
    affectedRows,
    userAgent
}: {
    endpoint: string;
    apiKey: string;
    databaseId: string;
    method: string;
    requestBody?: any;
    responseBody?: any;
    responseTimeMs: number;
    statusCode: number;
    errorMessage?: string;
    clientIp?: string;
    jobId?: string;
    jobStatus?: string;
    jobDownloadLink?: string;
    queryText?: string;
    affectedRows?: number;
    userAgent?: string | null;
}) {
    try {
        await initializeLogTable(databaseId, apiKey);
        const params = {
            endpoint,
            apiKey,
            method,
            requestBody: requestBody ? JSON.stringify(requestBody) : null,
            responseBody: responseBody ? JSON.stringify(responseBody) : null,
            responseTimeMs,
            statusCode,
            errorMessage: errorMessage || null,
            clientIp: clientIp || null,
            jobId: jobId || null,
            jobStatus: jobStatus || null,
            jobDownloadLink: jobDownloadLink || null,
            queryText: queryText || null,
            affectedRows: affectedRows || null,
            userAgent: userAgent || null
        };
        const database = new Database();

        await database.query(Q_INSERT_WEBSERVICELOG_TABLE, databaseId, apiKey, params);
    } catch (error) {
        console.error('Error logging API request:', error);
    }
}

// Yeniden denenebilir hataları belirle
export function isRetryableError(error: any): boolean {
    // Redis bağlantı hataları
    if (error.name === 'RedisError' || error.name === 'ReplyError') {
        return true;
    }

    // Ağ hataları
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        return true;
    }

    // Timeout hataları
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        return true;
    }

    // Rate limit hataları
    if (error.status === 429 || error.message?.includes('rate limit')) {
        return true;
    }

    return false;
}

// Hata logla
export async function logError(error: any, context: ErrorLogContext): Promise<void> {
    const errorLog = {
        timestamp: new Date().toISOString(),
        queueName: context.queueName,
        jobId: context.jobId,
        jobData: context.jobData,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
            status: error.status
        }
    };

    // Hata logunu konsola yaz
    console.error('Queue Error:', errorLog);

    // TODO: Hataları bir log servisine veya veritabanına kaydet
    // Örneğin: await logToDatabase(errorLog);
}
