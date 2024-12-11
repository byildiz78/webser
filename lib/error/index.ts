interface ErrorLogContext {
    queueName: string;
    jobId: string;
    jobData: any;
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
