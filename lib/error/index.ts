// Özel hata sınıfları
export class QueueError extends Error {
    constructor(
        message: string,
        public readonly queueName: string,
        public readonly jobId?: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'QueueError';
    }
}

export class RetryableError extends QueueError {
    constructor(
        message: string,
        queueName: string,
        jobId?: string,
        originalError?: Error
    ) {
        super(message, queueName, jobId, originalError);
        this.name = 'RetryableError';
    }
}

export class NonRetryableError extends QueueError {
    constructor(
        message: string,
        queueName: string,
        jobId?: string,
        originalError?: Error
    ) {
        super(message, queueName, jobId, originalError);
        this.name = 'NonRetryableError';
    }
}

// Hata işleme yardımcı fonksiyonları
export function isRetryableError(error: Error): boolean {
    if (error instanceof RetryableError) return true;
    if (error instanceof NonRetryableError) return false;
    
    // Bazı yaygın hataları kontrol et
    const retryableErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ECONNRESET',
        'ESOCKETTIMEDOUT',
        'ENOTFOUND',
        'ENETUNREACH'
    ];
    
    return retryableErrors.some(errType => 
        error.message.includes(errType) || error.name.includes(errType)
    );
}

// Hata loglama
export async function logError(error: Error, context: any = {}) {
    const errorLog = {
        timestamp: new Date(),
        name: error.name,
        message: error.message,
        stack: error.stack,
        context: {
            ...context,
            queueName: error instanceof QueueError ? error.queueName : undefined,
            jobId: error instanceof QueueError ? error.jobId : undefined,
            originalError: error instanceof QueueError ? error.originalError : undefined
        }
    };

    // Hata logunu konsola yaz
    console.error('Queue Error:', errorLog);
    
    // TODO: Hata logunu veritabanına veya harici bir servise kaydet
    
    return errorLog;
}
